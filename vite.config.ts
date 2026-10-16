import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Dev only: /api goes to the local backend, so the browser stays same-origin and the API needs no CORS entry.
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:5059', changeOrigin: true },
    },
  },
})
