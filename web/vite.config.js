import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Extra pages, each served from <name>/index.html. Links can omit the trailing slash.
const PAGES = ['digital-fishers']

// Vite only serves a page's index.html at "/<name>/"; redirect "/<name>" there.
function pageSlashRedirect() {
  const redirect = (req, res, next) => {
    const [path, query = ''] = req.url.split('?')
    if (PAGES.some((p) => path === `/${p}`)) {
      res.statusCode = 301
      res.setHeader('Location', `${path}/${query && `?${query}`}`)
      res.end()
      return
    }
    next()
  }
  return {
    name: 'page-slash-redirect',
    configureServer(server) {
      server.middlewares.use(redirect)
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pageSlashRedirect()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(PAGES.map((p) => [p, resolve(import.meta.dirname, `${p}/index.html`)])),
      },
    },
  },
})
