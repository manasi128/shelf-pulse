/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { aiMiddleware } from './server/ai';

/** Optional live AI route. Reads ANTHROPIC_API_KEY server-side only (no VITE_ prefix, so never bundled). */
function aiRoute(): Plugin {
  let key: string | undefined;
  return {
    name: 'shelf-pulse-ai-route',
    configResolved(config) {
      key = loadEnv(config.mode, config.root, '').ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || undefined;
    },
    configureServer(server) {
      server.middlewares.use(aiMiddleware(() => key));
    },
    configurePreviewServer(server) {
      server.middlewares.use(aiMiddleware(() => key));
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    aiRoute(),
    // Offline-first: the app shell, fonts and every screen are precached; data lives in IndexedDB.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/favicon.svg'],
      manifest: {
        name: 'Shelf Pulse (concept prototype)',
        short_name: 'Shelf Pulse',
        description: 'Spot ageing stock early and route it before it becomes waste. Concept prototype; not an official L\'Oréal product.',
        theme_color: '#0a0a0a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/rep',
        scope: '/',
        // Placeholder icon. Add brand/icon-192.png and brand/icon-512.png from the official kit (see public/brand/README.md).
        icons: [{ src: '/brand/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Scripts the app never displays; the browser only fetches these if such characters appear.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
