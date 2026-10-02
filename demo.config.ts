import { defineConfig } from 'vite'

// Only the self-contained public experience is included in this output.
// It has no controller, credentials, local endpoints or device bridge.
export default defineConfig({
  root: 'web/demo',
  base: './',
  build: { outDir: '../../build/site', emptyOutDir: true },
  server: { host: '127.0.0.1' }
})
