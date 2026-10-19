import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const seedArticles = require('../data/articles.json')
const STORAGE_PATH = 'yho-news/articles.json'
const ARTICLE_CATEGORIES = new Set(['Business', 'Technology', 'Sports', 'Entertainment', 'Education', 'Lifestyle'])
const NEWS_DOMAINS = [
  'aajtak.in', 'abplive.com', 'business-standard.com', 'deccanherald.com',
  'economictimes.indiatimes.com', 'financialexpress.com', 'hindustantimes.com',
  'indianexpress.com', 'indiatoday.in', 'livemint.com', 'moneycontrol.com',
  'ndtv.com', 'newindianexpress.com', 'news18.com', 'pib.gov.in',
  'scroll.in', 'thehindu.com', 'thehindubusinessline.com', 'theprint.in',
  'timesofindia.indiatimes.com',
]
const TOPICS = [
  { category: 'Sports', pattern: /\b(sports?|cricket|football|tennis|hockey|olympics?|ipl|f1|formula 1|athlete|tournament|match|world cup|championship|league)\b/i },
  { category: 'Entertainment', pattern: /\b(entertainment|film|movie|bollywood|actor|actress|music|album|concert|ott|streaming|netflix|cinema|celebrity|singer|box office|trailer)\b/i },
  { category: 'Education', pattern: /\b(education|school|college|university|exam|student|teacher|scholarship|campus|classroom|admission|curriculum|cbse|neet|jee)\b/i },
  { category: 'Lifestyle', pattern: /\b(lifestyle|fashion|travel|food|wellness|diet|recipe|restaurant|beauty|fitness|nutrition|vegetarian|yoga|skincare|home decor)\b/i },
  { category: 'Technology', pattern: /\b(technology|tech|artificial intelligence|ai|software|apps?|cyber|digital|internet|smartphones?|chips?|data centers?|robotics?|computer|semiconductor)\b/i },
  { category: 'Business', pattern: /\b(business|markets?|economy|finance|financial|banks?|stocks?|trade|companies|corporate|industry|investments?|investors?|startups?|revenue|earnings|ipo|inflation|rupee|rbi|gdp|exports?|imports?|merger|acquisition)\b/i },
]
const INDIA_SEARCH_QUERY = 'India AND (sports OR cricket OR football OR tennis OR hockey OR entertainment OR film OR Bollywood OR actor OR school OR university OR education OR lifestyle OR fashion OR wellness OR technology OR software OR cybersecurity OR artificial intelligence OR business OR markets OR economy OR finance OR stocks OR rupee)'
const translationCache = new Map()

function sendJson(response, status, body, headers = {}) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
  response.end(JSON.stringify(body))
}

function readJson(request) {
  if (request.body && typeof request.body === 'object') return request.body
  const body = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : String(request.body || '')
  try {
    return JSON.parse(body || '{}')
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 })
  }
}

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

async function readArticles() {
  if (!blobConfigured()) throw Object.assign(new Error('Connect a Vercel Blob store to enable article storage.'), { status: 503 })
  const { get, list, put } = await import('@vercel/blob')
  const existing = await list({ prefix: STORAGE_PATH, limit: 1 })
  if (existing.blobs.length) {
    const result = await get(STORAGE_PATH, { access: 'private' })
    if (!result || result.statusCode !== 200) throw new Error('Could not read stored articles.')
    const articles = JSON.parse(await new Response(result.stream).text())
    if (!Array.isArray(articles)) throw new Error('Stored article data is invalid.')
    return articles
  }

  const initialArticles = Array.isArray(seedArticles) ? seedArticles : []
  await put(STORAGE_PATH, JSON.stringify(initialArticles), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
  return initialArticles
}

async function writeArticles(articles) {
  const { put } = await import('@vercel/blob')
  await put(STORAGE_PATH, JSON.stringify(articles), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

function isAuthenticated(request) {
  const cookie = (request.headers.cookie || '').split('; ').find((part) => part.startsWith('yhu_admin_session='))
  if (!cookie || !process.env.ADMIN_SESSION_SECRET) return false
  const [expires, signature] = cookie.slice('yhu_admin_session='.length).split('.')
  if (!Number.isFinite(Number(expires)) || Number(expires) <= Date.now() || !signature) return false
  const expected = createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(expires).digest()
  const actual = Buffer.from(signature, 'base64url')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function saveArticle(input, previous = {}) {
  const title = String(input.title || '').trim()
  const category = String(input.category || '')
  const image = String(input.image || '')
  const content = String(input.content || '').trim()
  if (!title || title.length > 240) throw Object.assign(new Error('Enter a valid article title.'), { status: 400 })
  if (!ARTICLE_CATEGORIES.has(category)) throw Object.assign(new Error('Select a supported category.'), { status: 400 })
  if (!image || image.length > 3 * 1024 * 1024) throw Object.assign(new Error('Upload a valid image under 2 MB.'), { status: 400 })
  if (!content || content.length > 250000) throw Object.assign(new Error('Enter valid article content.'), { status: 400 })

  const now = new Date()
  const status = input.status === 'Draft' ? 'Draft' : 'Published'
  return {
    ...previous,
    id: previous.id || randomUUID(),
    title,
    category,
    image,
    content,
    summary: String(input.summary || input.meta?.description || '').slice(0, 5000),
    author: String(input.author || 'Editorial Desk').slice(0, 120),
    status,
    meta: input.meta && typeof input.meta === 'object' ? input.meta : {},
    date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(now),
    createdAt: previous.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    publishedAt: status === 'Published' ? (previous.status === 'Published' ? previous.publishedAt : now.toISOString()) : null,
  }
}

function isIndiaPublisher(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return NEWS_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

async function getNews() {
  if (!process.env.NEWS_API_KEY) throw Object.assign(new Error('NEWS_API_KEY is not configured.'), { status: 503 })
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    q: INDIA_SEARCH_QUERY,
    language: 'en',
    from,
    sortBy: 'publishedAt',
    pageSize: '100',
    domains: NEWS_DOMAINS.join(','),
  })
  const upstream = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    headers: { 'X-Api-Key': process.env.NEWS_API_KEY },
  })
  const newsResponse = await upstream.json()
  if (!upstream.ok || newsResponse.status !== 'ok') throw Object.assign(new Error(newsResponse.message || 'News request failed.'), { status: 502 })
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const articles = new Map()
  for (const article of newsResponse.articles || []) {
    const text = `${article.title || ''} ${article.description || ''}`
    const category = TOPICS.find(({ pattern }) => pattern.test(text))?.category
    const publishedAt = new Date(article.publishedAt).getTime()
    if (!category || !article.url || !isIndiaPublisher(article.url) || article.url.includes('access.workspace.google.com/remediate') || !Number.isFinite(publishedAt) || publishedAt < cutoff) continue
    if (!articles.has(article.url)) articles.set(article.url, { ...article, category })
  }
  const result = [...articles.values()].sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt))
  responseCache = { expiresAt: Date.now() + 30 * 60 * 1000, articles: result }
  return result
}

let responseCache = { expiresAt: 0, articles: [] }

function splitTranslationText(text) {
  const chunks = []
  let remaining = text.trim()
  while (remaining.length > 450) {
    const sentenceEnd = Math.max(remaining.lastIndexOf('. ', 450), remaining.lastIndexOf('! ', 450), remaining.lastIndexOf('? ', 450))
    const splitAt = sentenceEnd >= 250 ? sentenceEnd + 1 : remaining.lastIndexOf(' ', 450)
    const boundary = splitAt > 0 ? splitAt : 450
    chunks.push(remaining.slice(0, boundary).trim())
    remaining = remaining.slice(boundary).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

async function translateTextToHindi(text) {
  if (translationCache.has(text)) return translationCache.get(text)
  const params = new URLSearchParams({ q: text, langpair: 'en|hi' })
  const upstream = await fetch(`https://api.mymemory.translated.net/get?${params}`)
  if (!upstream.ok) throw Object.assign(new Error('Translation service unavailable.'), { status: 502 })
  const payload = await upstream.json()
  const translated = payload.responseStatus === 200 ? payload.responseData?.translatedText || '' : ''
  if (!translated) throw Object.assign(new Error('Translation response was empty.'), { status: 502 })
  if (translationCache.size >= 300) translationCache.delete(translationCache.keys().next().value)
  translationCache.set(text, translated)
  return translated
}

async function translateTextsToHindi(texts) {
  const translations = new Array(texts.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(3, texts.length) }, async () => {
    while (nextIndex < texts.length) {
      const index = nextIndex++
      const chunks = splitTranslationText(texts[index])
      const translatedChunks = []
      for (const chunk of chunks) translatedChunks.push(await translateTextToHindi(chunk))
      translations[index] = translatedChunks.join(' ')
    }
  })
  await Promise.all(workers)
  return translations
}

export default async function handler(request, response) {
  try {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname
    const publicItem = pathname.match(/^\/api\/articles\/([^/]+)$/)
    const adminArticles = pathname.match(/^\/api\/admin\/articles(?:\/([^/]+))?$/)
    if (pathname === '/api/news' && request.method === 'GET') {
      const articles = Date.now() < responseCache.expiresAt ? responseCache.articles : await getNews()
      return sendJson(response, 200, { status: 'ok', totalResults: articles.length, articles }, {
        'Cache-Control': 'private, max-age=1800',
      })
    }

    if (pathname === '/api/translate' && request.method === 'POST') {
      const { texts } = readJson(request)
      if (!Array.isArray(texts) || !texts.length || texts.length > 80 || texts.some((text) => typeof text !== 'string' || !text.trim() || text.length > 4000) || texts.reduce((total, text) => total + text.length, 0) > 24000) {
        return sendJson(response, 400, { message: 'Article text is too long to translate.' })
      }
      return sendJson(response, 200, { translations: await translateTextsToHindi(texts) })
    }

    if (pathname === '/api/admin/login' && request.method === 'POST') {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
        return sendJson(response, 503, { message: 'Admin credentials are not configured.' })
      }
      const credentials = readJson(request)
      const email = String(credentials.email || '').trim().toLowerCase()
      const password = String(credentials.password || '')
      if (email !== process.env.ADMIN_EMAIL.toLowerCase() || password !== process.env.ADMIN_PASSWORD) {
        return sendJson(response, 401, { message: 'Email or password is incorrect.' })
      }
      const expires = String(Date.now() + 8 * 60 * 60 * 1000)
      const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(expires).digest('base64url')
      return sendJson(response, 200, { authenticated: true }, {
        'Set-Cookie': `yhu_admin_session=${expires}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800; Secure`,
      })
    }

    if (pathname === '/api/admin/logout' && request.method === 'POST') {
      return sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': 'yhu_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure' })
    }

    if (pathname === '/api/admin/session' && request.method === 'GET') {
      const authenticated = isAuthenticated(request)
      return sendJson(response, authenticated ? 200 : 401, { authenticated })
    }

    if (pathname === '/api/articles' && request.method === 'GET') {
      const articles = (await readArticles()).filter((article) => article.status === 'Published' && ARTICLE_CATEGORIES.has(article.category))
      return sendJson(response, 200, { articles })
    }

    if (publicItem && request.method === 'GET') {
      const id = decodeURIComponent(publicItem[1])
      const article = (await readArticles()).find((item) => item.id === id && item.status === 'Published' && ARTICLE_CATEGORIES.has(item.category))
      return article ? sendJson(response, 200, { article }) : sendJson(response, 404, { message: 'Article not found.' })
    }

    if (adminArticles) {
      if (!isAuthenticated(request)) return sendJson(response, 401, { message: 'Admin sign in required.' })
      const articles = await readArticles()
      const id = adminArticles[1] ? decodeURIComponent(adminArticles[1]) : null
      if (request.method === 'GET' && !id) return sendJson(response, 200, { articles })
      if (request.method === 'POST' && !id) {
        const article = saveArticle(readJson(request))
        await writeArticles([article, ...articles])
        return sendJson(response, 201, { article })
      }
      if (request.method === 'PUT' && id) {
        const index = articles.findIndex((article) => article.id === id)
        if (index < 0) return sendJson(response, 404, { message: 'Article not found.' })
        const article = saveArticle(readJson(request), articles[index])
        const updated = [...articles]
        updated[index] = article
        await writeArticles(updated)
        return sendJson(response, 200, { article })
      }
      if (request.method === 'DELETE' && id) {
        const updated = articles.filter((article) => article.id !== id)
        if (updated.length === articles.length) return sendJson(response, 404, { message: 'Article not found.' })
        await writeArticles(updated)
        return sendJson(response, 200, { deleted: true })
      }
    }

    return sendJson(response, 405, { message: 'Method not allowed.' }, { Allow: 'GET, POST, PUT, DELETE' })
  } catch (error) {
    return sendJson(response, error.status || 500, {
      message: error.status ? error.message : 'Unable to process the request.',
    })
  }
}
