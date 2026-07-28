import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/sudocoach/' : '/',
  build: {
    sourcemap: false
  },
  worker: { format: 'es' },
  server: {
    allowedHosts: ['focusing-bench-detector-ratio.trycloudflare.com']
  },
  preview: {
    allowedHosts: ['.trycloudflare.com']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/favicon.svg',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/favicon-48.png',
        'icons/apple-touch-icon.png'
      ],
      manifest: {
        name: 'SudoCoach',
        short_name: 'SudoCoach',
        description: 'Scan Sudoku puzzles, solve them, and understand every next move.',
        theme_color: '#0D1B2A',
        background_color: '#F7F4ED',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,json,wasm,bin}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: './src/test/setup.ts',
    globals: true
  }
})
