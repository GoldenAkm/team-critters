import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import rockfishProxy from './server/rockfishProxy.js'

// https://vite.dev/config/
// Multi-page site: every tab is its own directory with its own index.html.
const PAGES = { main: 'index.html', map: 'map/index.html', digitalFishers: 'digital-fishers/index.html' }

// "/map" -> "/map/" so each directory's index.html is served with or without the trailing slash
const trailingSlash = {
  name: 'trailing-slash',
  configureServer(server) { server.middlewares.use(redirect) },
  configurePreviewServer(server) { server.middlewares.use(redirect) },
}
function redirect(req, res, next) {
  const dirs = Object.values(PAGES).filter((p) => p !== 'index.html').map((p) => '/' + p.replace('/index.html', ''))
  const [path, query] = req.url.split('?')
  if (dirs.includes(path)) {
    res.writeHead(301, { Location: `${path}/${query ? '?' + query : ''}` })
    return res.end()
  }
  next()
}

export default defineConfig(({ mode }) => ({
  // HF_TOKEN (web/.env.local) is read here, on the server only; it is not VITE_-prefixed, so it never
  // reaches browser code. The proxy uses it for /api/rockfish.
  plugins: [react(), trailingSlash, rockfishProxy(loadEnv(mode, import.meta.dirname, '').HF_TOKEN)],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(Object.entries(PAGES).map(([k, p]) => [k, resolve(import.meta.dirname, p)])),
    },
  },
}))
