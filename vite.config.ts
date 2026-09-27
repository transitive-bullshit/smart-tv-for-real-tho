import { defineConfig } from 'vite'
export default defineConfig({
  root: 'web',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    host: '127.0.0.1',
    fs: {
      deny: [
        '.env',
        '.env.*',
        '**/.git/**',
        '**/.local/**',
        '**/bridge/.venv/**'
      ]
    }
  }
})
