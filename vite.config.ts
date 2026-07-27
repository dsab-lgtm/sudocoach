import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/sudocoach/' : '/',
  worker: { format: 'es' },
  preview: {
    allowedHosts: ['.trycloudflare.com']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/favicon.svg'],
      manifest: {
        name: 'SudoCoach — Offline Sudoku Solver',
        short_name: 'SudoCoach',
        description: 'Scan, correct and solve Sudoku puzzles privately.',
        theme_color: '#0c1020',
        background_color: '#0c1020',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icons/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
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
    setupFiles: './src/test/setup.ts',
    globals: true
  }
})
