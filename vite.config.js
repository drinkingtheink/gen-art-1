import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * `/terms` and `/privacy` in dev, the way netlify.toml rewrites them in
 * production. Without this the clean URLs are a production-only fact and the
 * About panel's links 404 on the dev server, which is exactly the kind of
 * difference that gets noticed after deploying.
 */
const legalUrls = {
  name: 'legal-clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url.split('?')[0]
      if (path === '/terms' || path === '/privacy') req.url = `${path}.html`
      next()
    })
  },
}

export default defineConfig({
  plugins: [vue(), legalUrls],
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      /**
       * Three entry points, not one. The studio is the app; the two legal
       * documents are plain HTML that boot no JavaScript at all, so naming
       * them here is what gets their stylesheet hashed and emitted — left out,
       * Vite builds index.html alone and they never reach dist/.
       */
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        terms: fileURLToPath(new URL('./terms.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
      },
    },
  },
})
