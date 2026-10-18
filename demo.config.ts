import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

// Only the self-contained public experience is included in this output.
// It has no controller, credentials, local endpoints or device bridge.
export default defineConfig({
  root: 'web/demo',
  base: './',
  plugins: [
    {
      name: 'public-license-notices',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'THIRD-PARTY-NOTICES.txt',
          source: readFileSync('tv/display/THIRD-PARTY-NOTICES.txt', 'utf8')
        })
      }
    }
  ],
  build: {
    outDir: '../../build/site',
    emptyOutDir: true
  },
  server: { host: '127.0.0.1' }
})
