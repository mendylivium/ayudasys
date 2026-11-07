import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const DEV_PORT = 5173
const HOT_FILE = path.resolve('storage/vite.hot')

/**
 * Writes the dev server URL to storage/vite.hot while `npm run dev` runs,
 * so the Go server knows to load assets from Vite (HMR) instead of dist/.
 * Same idea as the "hot" file of laravel-vite-plugin.
 */
function goHotFile() {
  return {
    name: 'go-mvc:hot-file',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const { port } = server.httpServer.address()
        const url = server.config.server.origin ?? `http://localhost:${port}`
        fs.mkdirSync(path.dirname(HOT_FILE), { recursive: true })
        fs.writeFileSync(HOT_FILE, url)
      })

      const clean = () => fs.rmSync(HOT_FILE, { force: true })
      process.on('exit', clean)
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
        process.on(signal, () => process.exit())
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), goHotFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
    },
  },
  // Files in public/ are copied as-is into dist/ on build.
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'resources/js/app.js',
    },
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
    origin: `http://localhost:${DEV_PORT}`,
    cors: true,
  },
})
