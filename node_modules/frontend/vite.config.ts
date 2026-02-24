// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5100,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // your backend
        changeOrigin: true,
        secure: false,
      }
    }
  }
})