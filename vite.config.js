import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const TOPICS = [
	{ category: 'Sports', pattern: /\b(sports?|cricket|football|tennis|hockey|olympics?|ipl|f1|formula 1|athlete|tournament|match|world cup|championship|league)\b/i },
	{ category: 'Entertainment', pattern: /\b(entertainment|film|movie|bollywood|actor|actress|music|album|concert|ott|streaming|netflix|cinema|celebrity|singer|box office|trailer)\b/i },
	{ category: 'Education', pattern: /\b(education|school|college|university|exam|student|teacher|scholarship|campus|classroom|admission|curriculum|cbse|neet|jee)\b/i },
	{ category: 'Lifestyle', pattern: /\b(lifestyle|fashion|travel|food|wellness|diet|recipe|restaurant|beauty|fitness|nutrition|vegetarian|yoga|skincare|home decor)\b/i },
	{ category: 'Technology', pattern: /\b(technology|tech|artificial intelligence|ai|software|apps?|cyber|digital|internet|smartphones?|chips?|data centers?|robotics?|computer|semiconductor)\b/i },
	{ category: 'Business', pattern: /\b(business|markets?|economy|finance|financial|banks?|stocks?|trade|companies|corporate|industry|investments?|investors?|startups?|revenue|earnings|ipo|inflation|rupee|rbi|gdp|exports?|imports?|merger|acquisition)\b/i },
]

const INDIA_SEARCH_QUERY = 'India AND (sports OR cricket OR football OR tennis OR hockey OR entertainment OR film OR Bollywood OR actor OR school OR university OR education OR lifestyle OR fashion OR wellness OR technology OR software OR cybersecurity OR artificial intelligence OR business OR markets OR economy OR finance OR stocks OR rupee)'
const INDIA_NEWS_DOMAINS = [
	'aajtak.in', 'abplive.com', 'business-standard.com', 'deccanherald.com',
	'economictimes.indiatimes.com', 'financialexpress.com', 'hindustantimes.com',
	'indianexpress.com', 'indiatoday.in', 'livemint.com', 'moneycontrol.com',
	'ndtv.com', 'newindianexpress.com', 'news18.com', 'pib.gov.in',
	'scroll.in', 'thehindu.com', 'thehindubusinessline.com', 'theprint.in',
	'timesofindia.indiatimes.com',
]

function articleCategory(article) {
	const text = `${article.title || ''} ${article.description || ''}`
	return TOPICS.find(({ pattern }) => pattern.test(text))?.category
}

function isIndiaPublisher(url) {
	try {
		const hostname = new URL(url).hostname.toLowerCase()
		return INDIA_NEWS_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
	} catch {
		return false
	}
}

const hindiTranslationCache = new Map()

async function translateTextToHindi(text) {
	if (hindiTranslationCache.has(text)) return hindiTranslationCache.get(text)

	const params = new URLSearchParams({ q: text, langpair: 'en|hi' })
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 15000)
	try {
		const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: controller.signal })
		if (!response.ok) throw new Error('Translation service unavailable')
		const payload = await response.json()
		const translated = payload.responseStatus === 200 ? payload.responseData?.translatedText || '' : ''
		if (!translated) throw new Error('Translation response was empty')
		if (hindiTranslationCache.size >= 300) hindiTranslationCache.delete(hindiTranslationCache.keys().next().value)
		hindiTranslationCache.set(text, translated)
		return translated
	} finally {
		clearTimeout(timeout)
	}
}

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

function newsApiProxy(apiKey) {
	let cachedNews = ''
	let cacheExpiresAt = 0
	let cachedStatus = 200
	let pendingNews = null
	const cacheDuration = 30 * 60 * 1000

	const middleware = async (request, response) => {
		response.setHeader('Content-Type', 'application/json')

		if (request.method !== 'GET') {
			response.statusCode = 405
			response.end(JSON.stringify({ status: 'error', message: 'Method not allowed' }))
			return
		}

		if (!apiKey) {
			response.statusCode = 500
			response.end(JSON.stringify({ status: 'error', message: 'NEWS_API_KEY is not configured' }))
			return
		}

		if (cachedNews && Date.now() < cacheExpiresAt) {
			response.statusCode = cachedStatus
			response.setHeader('Cache-Control', 'private, max-age=1800')
			response.end(cachedNews)
			return
		}

		if (!pendingNews) {
			pendingNews = (async () => {
				try {
					const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
					const params = new URLSearchParams({
						q: INDIA_SEARCH_QUERY,
						language: 'en',
						from,
						sortBy: 'publishedAt',
						pageSize: '100',
						domains: INDIA_NEWS_DOMAINS.join(','),
					})
					const upstream = await fetch(`https://newsapi.org/v2/everything?${params}`, {
						headers: { 'X-Api-Key': apiKey },
					})
					const newsResponse = await upstream.json()
					if (!upstream.ok || newsResponse.status !== 'ok') throw new Error(newsResponse.message || 'News request failed')

					const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
					const uniqueArticles = new Map()
					for (const article of newsResponse.articles || []) {
						const category = articleCategory(article)
						const publishedAt = new Date(article.publishedAt).getTime()
						if (!category || !article.url || !isIndiaPublisher(article.url) || article.url.includes('access.workspace.google.com/remediate') || !Number.isFinite(publishedAt) || publishedAt < cutoff) continue
						if (!uniqueArticles.has(article.url)) uniqueArticles.set(article.url, { ...article, category })
					}

					const body = JSON.stringify({
						status: 'ok',
						totalResults: uniqueArticles.size,
						articles: [...uniqueArticles.values()].sort((first, second) => new Date(second.publishedAt) - new Date(first.publishedAt)),
					})
					cachedNews = body
					cacheExpiresAt = Date.now() + cacheDuration
					cachedStatus = 200
					return { status: 200, body }
				} catch (error) {
					const body = JSON.stringify({ status: 'error', message: error.message || 'Unable to retrieve category news' })
					cachedNews = body
					cacheExpiresAt = Date.now() + cacheDuration
					cachedStatus = 502
					return { status: 502, body }
				}
			})()
		}

		const result = await pendingNews
		pendingNews = null
		response.statusCode = result.status
		if (result.status < 400) response.setHeader('Cache-Control', 'private, max-age=1800')
		response.end(result.body)
	}

	return {
		name: 'news-api-proxy',
		configureServer(server) {
			server.middlewares.use('/api/news', middleware)
		},
		configurePreviewServer(server) {
			server.middlewares.use('/api/news', middleware)
		},
	}
}

function adminApiPlugin({ adminEmail, adminPassword, sessionSecret, requiredEnv = [] }) {
	const storageFile = path.resolve(process.cwd(), 'data/articles.json')
	const allowedCategories = new Set(['Business', 'Technology', 'Sports', 'Entertainment', 'Education', 'Lifestyle'])
	let writeQueue = Promise.resolve()

	const sendJson = (response, status, body, headers = {}) => {
		response.statusCode = status
		response.setHeader('Content-Type', 'application/json; charset=utf-8')
		response.setHeader('Cache-Control', 'no-store')
		for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
		response.end(JSON.stringify(body))
	}

	const readArticles = async () => {
		try {
			return JSON.parse(await readFile(storageFile, 'utf8'))
		} catch (error) {
			if (error.code === 'ENOENT') return []
			throw error
		}
	}

	const writeArticles = async (articles) => {
		await mkdir(path.dirname(storageFile), { recursive: true })
		const tempFile = `${storageFile}.tmp`
		await writeFile(tempFile, JSON.stringify(articles, null, 2), 'utf8')
		await rename(tempFile, storageFile)
	}

	const mutateArticles = (mutate) => {
		const operation = writeQueue.then(async () => {
			const current = await readArticles()
			const result = mutate(current)
			if (result.write !== false) await writeArticles(result.articles)
			return result.value
		})
		writeQueue = operation.catch(() => undefined)
		return operation
	}

	const readJson = async (request) => {
		let size = 0
		const chunks = []
		for await (const chunk of request) {
			size += chunk.length
			if (size > 4 * 1024 * 1024) throw Object.assign(new Error('Request is too large'), { status: 413 })
			chunks.push(chunk)
		}
		try {
			return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
		} catch {
			throw Object.assign(new Error('Invalid JSON body'), { status: 400 })
		}
	}

	const isAuthenticated = (request) => {
		const cookie = (request.headers.cookie || '').split('; ').find((part) => part.startsWith('yhu_admin_session='))
		if (!cookie) return false
		const [expires, signature] = cookie.slice('yhu_admin_session='.length).split('.')
		if (!Number.isFinite(Number(expires)) || Number(expires) <= Date.now() || !signature) return false
		const expected = createHmac('sha256', sessionSecret).update(expires).digest()
		const actual = Buffer.from(signature, 'base64url')
		return actual.length === expected.length && timingSafeEqual(actual, expected)
	}

	const saveArticle = (input, previous = {}) => {
		const title = String(input.title || '').trim()
		const category = String(input.category || '')
		const image = String(input.image || '')
		const content = String(input.content || '').trim()
		if (!title || title.length > 240) throw Object.assign(new Error('Enter a valid article title.'), { status: 400 })
		if (!allowedCategories.has(category)) throw Object.assign(new Error('Select a supported category.'), { status: 400 })
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

	const handle = async (request, response, next) => {
		const url = new URL(request.url || '/', 'http://localhost')
		const { pathname } = url
		const publicCollection = pathname === '/api/articles'
		const publicItem = pathname.match(/^\/api\/articles\/([^/]+)$/)
		const translation = pathname === '/api/translate'
		const adminSession = pathname === '/api/admin/session'
		const adminLogin = pathname === '/api/admin/login'
		const adminLogout = pathname === '/api/admin/logout'
		const adminArticles = pathname.match(/^\/api\/admin\/articles(?:\/([^/]+))?$/)
		if (!publicCollection && !publicItem && !translation && !adminSession && !adminLogin && !adminLogout && !adminArticles) return next()

		try {
			if (translation && request.method === 'POST') {
				const { texts } = await readJson(request)
				if (!Array.isArray(texts) || !texts.length || texts.length > 80 || texts.some((text) => typeof text !== 'string' || !text.trim() || text.length > 4000) || texts.reduce((total, text) => total + text.length, 0) > 24000) {
					return sendJson(response, 400, { message: 'Article text is too long to translate.' })
				}
				return sendJson(response, 200, { translations: await translateTextsToHindi(texts) })
			}

			if (adminLogin && request.method === 'POST') {
				const credentials = await readJson(request)
				const email = String(credentials.email || '').trim().toLowerCase()
				const password = String(credentials.password || '')
				if (email !== adminEmail.toLowerCase() || password !== adminPassword) return sendJson(response, 401, { message: 'Email or password is incorrect.' })
				const expires = String(Date.now() + 8 * 60 * 60 * 1000)
				const signature = createHmac('sha256', sessionSecret).update(expires).digest('base64url')
				const secure = request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
				return sendJson(response, 200, { authenticated: true }, {
					'Set-Cookie': `yhu_admin_session=${expires}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`,
				})
			}

			if (adminLogout && request.method === 'POST') {
				return sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': 'yhu_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
			}

			if (adminSession && request.method === 'GET') {
				return sendJson(response, isAuthenticated(request) ? 200 : 401, { authenticated: isAuthenticated(request) })
			}

			if (publicCollection && request.method === 'GET') {
				const articles = (await readArticles()).filter((article) => article.status === 'Published' && allowedCategories.has(article.category))
				return sendJson(response, 200, { articles })
			}

			if (publicItem && request.method === 'GET') {
				const id = decodeURIComponent(publicItem[1])
				const article = (await readArticles()).find((item) => item.id === id && item.status === 'Published' && allowedCategories.has(item.category))
				return article ? sendJson(response, 200, { article }) : sendJson(response, 404, { message: 'Article not found.' })
			}

			if (adminArticles) {
				if (!isAuthenticated(request)) return sendJson(response, 401, { message: 'Admin sign in required.' })
				if (request.method === 'GET' && !adminArticles[1]) return sendJson(response, 200, { articles: await readArticles() })
				if (request.method === 'POST' && !adminArticles[1]) {
					const article = saveArticle(await readJson(request))
					const created = await mutateArticles((articles) => ({ articles: [article, ...articles], value: article }))
					return sendJson(response, 201, { article: created })
				}
				const id = decodeURIComponent(adminArticles[1])
				if (request.method === 'PUT') {
					const input = await readJson(request)
					const updated = await mutateArticles((articles) => {
						const index = articles.findIndex((article) => article.id === id)
						if (index < 0) return { articles, value: null, write: false }
						const article = saveArticle(input, articles[index])
						const next = [...articles]
						next[index] = article
						return { articles: next, value: article }
					})
					return updated ? sendJson(response, 200, { article: updated }) : sendJson(response, 404, { message: 'Article not found.' })
				}
				if (request.method === 'DELETE') {
					const deleted = await mutateArticles((articles) => {
						const next = articles.filter((article) => article.id !== id)
						return { articles: next, value: next.length !== articles.length, write: next.length !== articles.length }
					})
					return deleted ? sendJson(response, 200, { deleted: true }) : sendJson(response, 404, { message: 'Article not found.' })
				}
			}

			return sendJson(response, 405, { message: 'Method not allowed.' }, { Allow: 'GET, POST, PUT, DELETE' })
		} catch (error) {
			return sendJson(response, error.status || 500, { message: error.status ? error.message : 'Unable to process the article request.' })
		}
	}

	const install = (server) => {
		if (requiredEnv.length) throw new Error(`Missing required production environment variables: ${requiredEnv.join(', ')}`)
		server.middlewares.use(handle)
	}
	return { name: 'admin-articles-api', configureServer: install, configurePreviewServer: install }
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	return {
		plugins: [
			react(),
			newsApiProxy(env.NEWS_API_KEY),
			adminApiPlugin({
				adminEmail: env.ADMIN_EMAIL || 'yhoindia@gmail.com',
				adminPassword: env.ADMIN_PASSWORD || 'Uttarpradesh@123',
				sessionSecret: env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex'),
				requiredEnv: mode === 'production'
					? ['NEWS_API_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'].filter((name) => !env[name])
					: [],
			}),
		],
	}
})
