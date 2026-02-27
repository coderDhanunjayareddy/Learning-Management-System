// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'


export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'gvjb.png'],
      manifest: {
        name: 'Spectropy LMS',
        short_name: 'Spectropy',
        description: 'Spectropy Learning Management System',
        theme_color: '#0b1f44',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
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
