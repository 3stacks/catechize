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
        name: 'Catechize',
        short_name: 'Catechize',
        description: 'Memorise and study the Reformed confessions, creeds and Scripture.',
        theme_color: '#7a2e2e',
        background_color: '#f7f4ee',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Precache the app shell and the documents; Scripture books are cached
        // as they are first opened so the install stays small.
        globPatterns: ['**/*.{js,css,html,svg}', 'data/index.json', 'data/docs/*.json', 'data/harmonies/*.json'],
        maximumFileSizeToCacheInBytes: 2_000_000,
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
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
