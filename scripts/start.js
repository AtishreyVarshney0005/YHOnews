import { preview } from 'vite'
import apiHandler from '../api/[...path].js'

const port = Number(process.env.PORT || 4173)
const MAX_API_BODY_BYTES = 8 * 1024 * 1024

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new Error(`Invalid PORT value: ${process.env.PORT}`)
}

const apiPlugin = {
	name: 'yho-api',
	configurePreviewServer(server) {
		server.middlewares.use(async (request, response, next) => {
			if (!request.url?.startsWith('/api/')) return next()

			try {
				const chunks = []
				let size = 0
				let oversized = false
				for await (const chunk of request) {
					size += chunk.length
					if (size > MAX_API_BODY_BYTES) oversized = true
					else chunks.push(chunk)
				}

				if (oversized) {
					response.statusCode = 413
					response.setHeader('Content-Type', 'application/json; charset=utf-8')
					response.end(JSON.stringify({ message: 'Request body is too large.' }))
					return
				}

				request.body = Buffer.concat(chunks)
				await apiHandler(request, response)
			} catch (error) {
				console.error('API request failed:', error)
				if (!response.headersSent) {
					response.statusCode = 500
					response.setHeader('Content-Type', 'application/json; charset=utf-8')
					response.end(JSON.stringify({ message: 'Unable to process the request.' }))
				}
			}
		})
	},
}

const server = await preview({
	plugins: [apiPlugin],
	preview: {
		host: '0.0.0.0',
		port,
		strictPort: true,
	},
})

server.printUrls()
