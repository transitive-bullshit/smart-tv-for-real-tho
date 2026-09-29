import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'chrome120',
    outDir: 'tv/display/assets',
    emptyOutDir: true,
    lib: {
      entry: 'tv/visuals/main.tsx',
      name: 'RoomVisuals',
      formats: ['iife'],
      fileName: () => 'visuals.js',
      cssFileName: 'visuals'
    }
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') }
})
