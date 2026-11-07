import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works from any path (GitHub Pages, a subfolder, file server).
export default defineConfig({
  base: './',
  // `npm start` in another terminal gives the dev server sync.
  server: { proxy: { '/api': 'http://localhost:3000' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Hearers',
        short_name: 'Hearers',
        description: 'Memorise and study the Reformed confessions, creeds and Scripture.',
        theme_color: '#7a2e2e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Precache the app shell and the documents; Scripture books are cached
        // as they are first opened so the install stays small.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'data/index.json', 'data/docs/*.json', 'data/harmonies/*.json', 'sib.json', 'data/reading.json'],
        maximumFileSizeToCacheInBytes: 2_000_000,
        // Review reminders: the push and notificationclick handlers.
        importScripts: ['push-sw.js'],
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          // Cabinet Grotesk, the heading font, from Fontshare (see index.html).
          {
            urlPattern: ({ url }) => url.origin === 'https://api.fontshare.com' || url.origin === 'https://cdn.fontshare.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/kjv/'),
            handler: 'CacheFirst',
            options: { cacheName: 'kjv', expiration: { maxEntries: 80 } },
          },
        ],
      },
    }),
  ],
})
