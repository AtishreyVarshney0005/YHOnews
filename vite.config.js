import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { translateTextsToHindi } from './server/translation.js'
import { createSitemapXml } from './server/sitemap.js'
import { PUBLISHABLE_CATEGORIES } from './shared/categories.js'
import { articleData, execute, getDatabase as getMysqlDatabase, mysqlDate, query } from './server/database.js'

function getApiError(error) {
	if (error.status) return { status: error.status, message: error.message }

	console.error('Article API request failed:', error)
	return { status: 500, message: 'News is temporarily unavailable. Please try again shortly.' }
}

function adminApiPlugin({ adminEmail, adminPassword, sessionSecret, databaseConfig, requiredEnv = [] }) {
	const storageFile = path.resolve(process.cwd(), 'data/articles.json')
	const allowedCategories = new Set(PUBLISHABLE_CATEGORIES)
	let writeQueue = Promise.resolve()

	const sendJson = (response, status, body, headers = {}) => {
		response.statusCode = status
		response.setHeader('Content-Type', 'application/json; charset=utf-8')
		response.setHeader('Cache-Control', 'no-store')
		for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
		response.end(JSON.stringify(body))
	}

	const sendSitemap = (response, body) => {
		response.statusCode = 200
		response.setHeader('Content-Type', 'application/xml; charset=utf-8')
		response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
		response.end(body)
	}

	const sendImage = (response, image) => {
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

	const publicImageUrl = (id, image, updatedAt) => String(image || '').startsWith('data:image/')
		? publicImagePath(id, updatedAt)
		: image || ''
	const publicImagePath = (id, updatedAt) => `/api/articles/${encodeURIComponent(id)}/image?v=${encodeURIComponent(updatedAt || '1')}`

	const toPublicArticle = (article) => {
		const content = String(article.content || '').trim()
		const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
		const { content: _content, image, ...details } = article
		return {
			...details,
			image: publicImageUrl(article.id, image, article.updatedAt || article.createdAt),
			summary: article.summary || article.meta?.description || contentText.slice(0, 280),
			read: Number(article.read) || Math.max(1, Math.ceil(contentText.split(/\s+/).filter(Boolean).length / 200)),
		}
	}

	const readLocalArticles = async () => {
		try {
			return JSON.parse(await readFile(storageFile, 'utf8'))
		} catch (error) {
			if (error.code === 'ENOENT') return []
			throw error
		}
	}

	const getDatabase = async () => {
		const configured = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'].some((name) => databaseConfig[name])
		return configured ? getMysqlDatabase(databaseConfig) : null
	}

	const readArticles = async () => {
		const database = await getDatabase()
		if (!database) return readLocalArticles()
		const rows = await query('SELECT data, view_count FROM yho_news_articles ORDER BY updated_at DESC')
		return rows.map(({ data, view_count }) => ({ ...articleData(data), viewCount: view_count }))
	}

	const readPublishedArticles = async () => {
		const database = await getDatabase()
		if (!database) {
			return (await readLocalArticles())
				.filter((article) => article.status === 'Published' && allowedCategories.has(article.category))
				.map(toPublicArticle)
		}
		const categories = [...allowedCategories]
		const placeholders = categories.map(() => '?').join(', ')
		const rows = await query(
			`SELECT data, view_count FROM yho_news_articles
			 WHERE status = 'Published' AND category IN (${placeholders})
			 ORDER BY updated_at DESC`,
			categories,
		)
		return rows.map(({ data, view_count }) => {
			const article = articleData(data)
			const image = article.image
			delete article.image
			return toPublicArticle({ ...article, viewCount: view_count, image })
		})
	}

	const readPublishedArticleImage = async (id) => {
		const database = await getDatabase()
		if (database) {
			const categories = [...allowedCategories]
			const placeholders = categories.map(() => '?').join(', ')
			const rows = await query(
				`SELECT data FROM yho_news_articles
				 WHERE id = ? AND status = 'Published' AND category IN (${placeholders})`,
				[id, ...categories],
			)
			return rows[0] ? articleData(rows[0].data).image || null : null
		}
		const article = (await readLocalArticles()).find((item) => item.id === id && item.status === 'Published' && allowedCategories.has(item.category))
		return article?.image || null
	}

	const readPublishedArticleAndCountView = async (id) => {
		const database = await getDatabase()
		if (database) {
			const categories = [...allowedCategories]
			const placeholders = categories.map(() => '?').join(', ')
			const result = await execute(
				`UPDATE yho_news_articles SET view_count = view_count + 1
				 WHERE id = ? AND status = 'Published' AND category IN (${placeholders})`,
				[id, ...categories],
			)
			if (!result.affectedRows) return null
			const rows = await query('SELECT data, view_count FROM yho_news_articles WHERE id = ?', [id])
			const row = rows[0]
			if (!row) return null
			const article = articleData(row.data)
			const image = article.image || ''
			return {
				...article,
				image: image.startsWith('data:image/')
					? publicImagePath(article.id, article.updatedAt || article.createdAt)
					: image,
				viewCount: row.view_count,
			}
		}
		const article = (await readLocalArticles()).find((item) => item.id === id && item.status === 'Published' && allowedCategories.has(item.category))
		return article ? { ...article, image: publicImageUrl(article.id, article.image, article.updatedAt || article.createdAt) } : null
	}

	const writeArticles = async (articles, previous = []) => {
		const database = await getDatabase()
		if (database) {
			const currentIds = new Set(articles.map(({ id }) => id))
			const previousById = new Map(previous.map((article) => [article.id, article]))
			const writes = articles.filter((article) => JSON.stringify(previousById.get(article.id)) !== JSON.stringify(article))
			await Promise.all([
				...previous.filter(({ id }) => !currentIds.has(id)).map(({ id }) => execute('DELETE FROM yho_news_articles WHERE id = ?', [id])),
				...writes.map((article) => execute(
					`INSERT INTO yho_news_articles (id, data, status, category, published_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?)
					 ON DUPLICATE KEY UPDATE data = VALUES(data), status = VALUES(status), category = VALUES(category),
					 published_at = VALUES(published_at), updated_at = VALUES(updated_at)`,
					[article.id, JSON.stringify(article), article.status, article.category, mysqlDate(article.publishedAt), mysqlDate(article.updatedAt)],
				)),
			])
			return
		}
		await mkdir(path.dirname(storageFile), { recursive: true })
		const tempFile = `${storageFile}.tmp`
		await writeFile(tempFile, JSON.stringify(articles, null, 2), 'utf8')
		await rename(tempFile, storageFile)
	}

	const mutateArticles = (mutate) => {
		const operation = writeQueue.then(async () => {
			const current = await readArticles()
			const result = mutate(current)
			if (result.write !== false) await writeArticles(result.articles, current)
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
		if (!sessionSecret) return false
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
		if (pathname === '/api/health' && request.method === 'GET') {
			return sendJson(response, 200, { status: 'ok' })
		}
		const sitemap = pathname === '/sitemap.xml'
		const publicCollection = pathname === '/api/articles'
		const publicItem = pathname.match(/^\/api\/articles\/([^/]+)$/)
		const publicImage = pathname.match(/^\/api\/articles\/([^/]+)\/image$/)
		const translation = pathname === '/api/translate'
		const adminSession = pathname === '/api/admin/session'
		const adminLogin = pathname === '/api/admin/login'
		const adminLogout = pathname === '/api/admin/logout'
		const adminArticles = pathname.match(/^\/api\/admin\/articles(?:\/([^/]+))?$/)
		if (!sitemap && !publicCollection && !publicItem && !publicImage && !translation && !adminSession && !adminLogin && !adminLogout && !adminArticles) return next()

		try {
			if (sitemap && request.method === 'GET') {
				const database = await getDatabase()
				const categories = [...allowedCategories]
				const placeholders = categories.map(() => '?').join(', ')
				const articles = database
					? await query(
						`SELECT id, updated_at AS updatedAt, published_at AS publishedAt
						 FROM yho_news_articles
						 WHERE status = 'Published' AND category IN (${placeholders})
						 ORDER BY published_at DESC`,
						categories,
					)
					: (await readLocalArticles())
						.filter((article) => article.status === 'Published' && allowedCategories.has(article.category))
						.map(({ id, updatedAt, publishedAt }) => ({ id, updatedAt, publishedAt }))
				return sendSitemap(response, createSitemapXml(articles))
			}

			if (translation && request.method === 'POST') {
				const { texts } = await readJson(request)
				return sendJson(response, 200, { translations: await translateTextsToHindi(texts) })
			}

			if (publicImage && request.method === 'GET') {
				const image = await readPublishedArticleImage(decodeURIComponent(publicImage[1]))
				return image ? sendImage(response, image) : sendJson(response, 404, { message: 'Article image not found.' })
			}

			if (adminLogin && request.method === 'POST') {
				if (!adminEmail || !adminPassword || !sessionSecret) return sendJson(response, 503, { message: 'Admin credentials are not configured.' })
				const credentials = await readJson(request)
				const email = String(credentials.email || '').trim().toLowerCase()
				const password = String(credentials.password || '')
				const suppliedEmail = Buffer.from(email)
				const expectedEmail = Buffer.from(adminEmail.trim().toLowerCase())
				const suppliedPassword = Buffer.from(password)
				const expectedPassword = Buffer.from(adminPassword)
				if (suppliedEmail.length !== expectedEmail.length || !timingSafeEqual(suppliedEmail, expectedEmail) || suppliedPassword.length !== expectedPassword.length || !timingSafeEqual(suppliedPassword, expectedPassword)) return sendJson(response, 401, { message: 'Email or password is incorrect.' })
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
				return sendJson(response, 200, {
					articles: await readPublishedArticles(),
				}, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' })
			}

			if (publicItem && request.method === 'GET') {
				const id = decodeURIComponent(publicItem[1])
				const article = await readPublishedArticleAndCountView(id)
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
			const apiError = getApiError(error)
			return sendJson(response, apiError.status, { message: apiError.message })
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
			adminApiPlugin({
				adminEmail: env.ADMIN_EMAIL,
				adminPassword: env.ADMIN_PASSWORD,
				sessionSecret: env.ADMIN_SESSION_SECRET,
				databaseConfig: { ...env, ...process.env },
				requiredEnv: mode === 'production'
					? ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'].filter((name) => !env[name] && !process.env[name])
					: [],
			}),
		],
	}
})
