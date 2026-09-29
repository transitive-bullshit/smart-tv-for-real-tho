import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    target: 'chrome120',
    outDir: 'tv/ambient/assets',
    emptyOutDir: true,
    lib: {
      entry: 'tv/ambient-src/main.ts',
      name: 'RoomAmbient',
      formats: ['iife'],
      fileName: () => 'ambient.js',
      cssFileName: 'ambient'
    }
  }
})
