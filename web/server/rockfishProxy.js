// Vite dev/preview middleware: POST /api/rockfish with an image body -> the rockfish model's result JSON.
// It calls the Hugging Face Space server-side with HF_TOKEN from web/.env.local, so the token never
// reaches the browser and model calls use the account's quota instead of the anonymous one.
// Only the model's result JSON is sent back.

const SPACE = 'Rena-06/rockfish-finder'
const MAX_BYTES = 15 * 1024 * 1024

export default function rockfishProxy(hfToken) {
  let clientPromise = null
  const client = () => {
    clientPromise ??= import('@gradio/client')
      .then(({ Client }) => Client.connect(SPACE, hfToken ? { token: hfToken } : {}))
      .catch((e) => {
        clientPromise = null
        throw e
      })
    return clientPromise
  }

  async function handle(req, res, next) {
    if (req.url.split('?')[0] !== '/api/rockfish') return next()
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'POST') return send(405, { error: 'POST an image to /api/rockfish' })
    const type = req.headers['content-type'] ?? ''
    if (!type.startsWith('image/')) return send(415, { error: 'Send the image as the request body (image/*)' })

    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > MAX_BYTES) return send(413, { error: 'Image too large' })
      chunks.push(chunk)
    }
    if (!size) return send(400, { error: 'Empty image' })

    try {
      const { handle_file } = await import('@gradio/client')
      const job = await (await client()).predict('/predict', { image: handle_file(new Blob(chunks, { type })) })
      send(200, { result: job.data[2] })
    } catch (e) {
      send(502, { error: String(e?.message ?? e) })
    }
  }

  return {
    name: 'rockfish-proxy',
    configureServer(server) { server.middlewares.use(handle) },
    configurePreviewServer(server) { server.middlewares.use(handle) },
  }
}
