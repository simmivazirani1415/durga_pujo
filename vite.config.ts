import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  build: { target: 'es2020', cssCodeSplit: false, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4000 },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
