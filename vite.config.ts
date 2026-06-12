import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['vite.svg', 'icon-192.svg', 'icon-512.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-tiles',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: 'AgroField Planner',
          short_name: 'AgroField',
          description: 'A mobile-first application for agricultural engineers to plan their weekly visits, record visit details with validated geolocation, generate follow-up tasks, and receive AI-powered agronomic suggestions.',
          theme_color: '#16a34a',
          background_color: '#f3f4f6',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'icon-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
