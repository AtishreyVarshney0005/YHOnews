import { preview } from 'vite'

const port = Number(process.env.PORT || 4173)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new Error(`Invalid PORT value: ${process.env.PORT}`)
}

const server = await preview({
	preview: {
		host: '0.0.0.0',
		port,
		strictPort: true,
	},
})

server.printUrls()
