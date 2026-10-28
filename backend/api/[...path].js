import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createSitemapXml } from '../sitemap.js'
import { PUBLISHABLE_CATEGORIES } from '../../database/categories.js'
import { articleData, execute, mysqlDate, query } from '../../database/database.js'
import { fileURLToPath } from 'node:url'

const ARTICLE_CATEGORIES = new Set(PUBLISHABLE_CATEGORIES)
const DATABASE_IMAGE_SQL = "CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data, '$.image')) LIKE 'data:image/%' THEN 1 ELSE JSON_UNQUOTE(JSON_EXTRACT(data, '$.image')) END"
const seedArticlesFile = fileURLToPath(new URL('../../database/articles.json', import.meta.url))
let seedArticlesPromise

function sendJson(response, status, body, headers = {}) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
  response.end(JSON.stringify(body))
}

function sendImage(response, image) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(String(image || ''))
  if (!match) return sendJson(response, 404, { message: 'Article image not found.' })
  const body = Buffer.from(match[2], 'base64')
  response.statusCode = 200
  response.setHeader('Content-Type', match[1])
  response.setHeader('Content-Length', body.length)
  response.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(body)
}

function sendSitemap(response, body) {
  response.statusCode = 200
  response.setHeader('Content-Type', 'application/xml; charset=utf-8')
  response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
  response.end(body)
}

function publicImageUrl(id, image, updatedAt) {
  return image === 1 || image === true || String(image || '').startsWith('data:image/')
    ? publicImagePath(id, updatedAt)
    : image || ''
}

function publicImagePath(id, updatedAt) {
  return `/api/articles/${encodeURIComponent(id)}/image?v=${encodeURIComponent(updatedAt || '1')}`
}

function hasDatabaseConfiguration(configuration = process.env) {
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']
  return required.every((name) => Boolean(configuration[name]))
}

async function fallbackPublishedArticles() {
  if (!seedArticlesPromise) {
    seedArticlesPromise = readFile(seedArticlesFile, 'utf8')
      .then((contents) => JSON.parse(contents))
      .catch((error) => {
        seedArticlesPromise = null
        throw error
      })
  }
  const seedArticles = await seedArticlesPromise
  return (Array.isArray(seedArticles) ? seedArticles : [])
    .filter((article) => article && article.status !== 'Draft' && ARTICLE_CATEGORIES.has(String(article.category || '')))
    .map((article) => toPublicArticle({
      ...article,
      viewCount: Number(article.viewCount) || 0,
      publishedAt: article.publishedAt || article.createdAt || new Date().toISOString(),
      updatedAt: article.updatedAt || article.createdAt || article.publishedAt || new Date().toISOString(),
    }, article.image))
}

function toPublicArticle(article, image = article.image) {
  const content = String(article.content || '').trim()
  const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const { content: _content, image: _image, ...details } = article
  return {
    ...details,
    image: publicImageUrl(article.id, image, article.updatedAt || article.createdAt),
    summary: article.summary || article.meta?.description || contentText.slice(0, 280),
    read: Number(article.read) || Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 200)),
  }
}

function readJson(request) {
  if (Buffer.isBuffer(request.body)) {
    try {
      return JSON.parse(request.body.toString('utf8') || '{}')
    } catch {
      throw Object.assign(new Error('Invalid JSON body'), { status: 400 })
    }
  }
  if (request.body && typeof request.body === 'object') return request.body
  try {
    return JSON.parse(String(request.body || ''))
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 })
  }
}

function secureEquals(first, second) {
  const firstBuffer = Buffer.from(String(first))
  const secondBuffer = Buffer.from(String(second))
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer)
}

function getApiError(error) {
  if (error.status) return { status: error.status, message: error.message }

  console.error('Article API request failed:', error)
  return { status: 500, message: 'News is temporarily unavailable. Please try again shortly.' }
}

async function readArticles() {
  const rows = await query('SELECT data, view_count FROM yho_news_articles ORDER BY updated_at DESC')
  return rows.map(({ data, view_count }) => ({ ...articleData(data), viewCount: view_count }))
}

async function readPublishedArticleAndCountView(id) {
  const categories = [...ARTICLE_CATEGORIES]
  const placeholders = categories.map(() => '?').join(', ')
  const result = await execute(
    `UPDATE yho_news_articles SET view_count = view_count + 1
     WHERE id = ? AND status = 'Published' AND category IN (${placeholders})`,
    [id, ...categories],
  )
  if (!result.affectedRows) return null

  const rows = await query(
    `SELECT JSON_REMOVE(data, '$.image') AS data, ${DATABASE_IMAGE_SQL} AS image, view_count
     FROM yho_news_articles WHERE id = ?`,
    [id],
  )
  const row = rows[0]
  if (!row) return null
  const article = articleData(row.data)
  return {
    ...article,
    image: publicImageUrl(article.id, row.image, article.updatedAt || article.createdAt),
    viewCount: row.view_count,
  }
}

async function readPublishedArticleImage(id) {
  const categories = [...ARTICLE_CATEGORIES]
  const placeholders = categories.map(() => '?').join(', ')
  const rows = await query(
    `SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.image')) AS image
     FROM yho_news_articles
     WHERE id = ? AND status = 'Published' AND category IN (${placeholders})`,
    [id, ...categories],
  )
  return rows[0]?.image || null
}

async function insertArticle(article) {
  await execute(
    `INSERT INTO yho_news_articles (id, data, status, category, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [article.id, JSON.stringify(article), article.status, article.category, mysqlDate(article.publishedAt), mysqlDate(article.updatedAt)],
  )
}

async function updateArticle(article) {
  const result = await execute(
    `UPDATE yho_news_articles
     SET data = ?, status = ?, category = ?, published_at = ?, updated_at = ?
     WHERE id = ?`,
    [JSON.stringify(article), article.status, article.category, mysqlDate(article.publishedAt), mysqlDate(article.updatedAt), article.id],
  )
  return result.affectedRows > 0
}

async function deleteArticle(id) {
  const result = await execute('DELETE FROM yho_news_articles WHERE id = ?', [id])
  return result.affectedRows > 0
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

export default async function handler(request, response) {
  try {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname
    const publicItem = pathname.match(/^\/api\/articles\/([^/]+)$/)
    const publicImage = pathname.match(/^\/api\/articles\/([^/]+)\/image$/)
    const adminArticles = pathname.match(/^\/api\/admin\/articles(?:\/([^/]+))?$/)

    if (pathname === '/api/sitemap' && request.method === 'GET') {
      const categories = [...ARTICLE_CATEGORIES]
      const placeholders = categories.map(() => '?').join(', ')
      const rows = await query(
        `SELECT id, updated_at AS updatedAt, published_at AS publishedAt
         FROM yho_news_articles
         WHERE status = 'Published' AND category IN (${placeholders})
         ORDER BY published_at DESC`,
        categories,
      )
      return sendSitemap(response, createSitemapXml(rows))
    }

    if (pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, 200, { status: 'ok' })
    }

    if (publicImage && request.method === 'GET') {
      if (!hasDatabaseConfiguration()) {
        const fallbackArticle = (await fallbackPublishedArticles()).find((article) => article.id === decodeURIComponent(publicImage[1]))
        if (!fallbackArticle?.image) return sendJson(response, 404, { message: 'Article image not found.' })
        const image = String(fallbackArticle.image || '')
        if (!image.startsWith('data:image/')) return sendJson(response, 404, { message: 'Article image not found.' })
        const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(image)
        if (!match) return sendJson(response, 404, { message: 'Article image not found.' })
        const body = Buffer.from(match[2], 'base64')
        response.statusCode = 200
        response.setHeader('Content-Type', match[1])
        response.setHeader('Content-Length', body.length)
        response.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        return response.end(body)
      }
      const image = await readPublishedArticleImage(decodeURIComponent(publicImage[1]))
      return image ? sendImage(response, image) : sendJson(response, 404, { message: 'Article image not found.' })
    }

    if (pathname === '/api/admin/login' && request.method === 'POST') {
      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
        return sendJson(response, 503, { message: 'Admin credentials are not configured.' })
      }
      const credentials = readJson(request)
      const email = String(credentials.email || '').trim().toLowerCase()
      const password = String(credentials.password || '')
      if (!secureEquals(email, process.env.ADMIN_EMAIL.trim().toLowerCase()) || !secureEquals(password, process.env.ADMIN_PASSWORD)) {
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
      if (!hasDatabaseConfiguration()) {
        return sendJson(response, 200, { articles: await fallbackPublishedArticles() }, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' })
      }
      const categories = [...ARTICLE_CATEGORIES]
      const placeholders = categories.map(() => '?').join(', ')
      const rows = await query(
        `SELECT JSON_REMOVE(data, '$.image') AS data, ${DATABASE_IMAGE_SQL} AS image, view_count
         FROM yho_news_articles
         WHERE status = 'Published' AND category IN (${placeholders})
         ORDER BY updated_at DESC`,
        categories,
      )
      const articles = rows.map(({ data, image, view_count }) => {
        const article = articleData(data)
        return toPublicArticle({ ...article, image, viewCount: view_count }, image)
      })
      return sendJson(response, 200, { articles }, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' })
    }

    if (publicItem && request.method === 'GET') {
      const id = decodeURIComponent(publicItem[1])
      if (!hasDatabaseConfiguration()) {
        const fallbackArticle = (await fallbackPublishedArticles()).find((article) => article.id === id)
        return fallbackArticle ? sendJson(response, 200, { article: fallbackArticle }) : sendJson(response, 404, { message: 'Article not found.' })
      }
      const article = await readPublishedArticleAndCountView(id)
      return article ? sendJson(response, 200, { article }) : sendJson(response, 404, { message: 'Article not found.' })
    }

    if (adminArticles) {
      if (!isAuthenticated(request)) return sendJson(response, 401, { message: 'Admin sign in required.' })
      const articles = await readArticles()
      const id = adminArticles[1] ? decodeURIComponent(adminArticles[1]) : null
      if (request.method === 'GET' && !id) return sendJson(response, 200, { articles })
      if (request.method === 'POST' && !id) {
        const article = saveArticle(readJson(request))
        await insertArticle(article)
        return sendJson(response, 201, { article })
      }
      if (request.method === 'PUT' && id) {
        const index = articles.findIndex((article) => article.id === id)
        if (index < 0) return sendJson(response, 404, { message: 'Article not found.' })
        const article = saveArticle(readJson(request), articles[index])
        if (!await updateArticle(article)) return sendJson(response, 404, { message: 'Article not found.' })
        return sendJson(response, 200, { article })
      }
      if (request.method === 'DELETE' && id) {
        if (!await deleteArticle(id)) return sendJson(response, 404, { message: 'Article not found.' })
        return sendJson(response, 200, { deleted: true })
      }
    }

    return sendJson(response, 405, { message: 'Method not allowed.' }, { Allow: 'GET, POST, PUT, DELETE' })
  } catch (error) {
    const apiError = getApiError(error)
    return sendJson(response, apiError.status, { message: apiError.message })
  }
}
