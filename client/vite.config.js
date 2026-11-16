import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/lost-found-visual-match/' : '/',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001' } }
})
