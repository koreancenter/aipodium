import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    // 💡 저장소(Repository) 이름을 작성합니다. 
    // 예: 레포지토리 주소가 github.com/user/my-app 이라면 '/my-app/'
    base: '/', 
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'AI Podium - 내가 지휘하는 AI 오케스트라',
          short_name: 'AI Podium',
          description: '외부 유출 걱정 없는 안전한 환경에서 흩어진 자료를 하나의 명확한 기준 문서로 통합하세요.',
          lang: 'ko',
          dir: 'ltr',
          orientation: 'any',
          categories: ['productivity', 'utilities'],
          theme_color: '#121214',
          background_color: '#09090b',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          shortcuts: [
            {
              name: '새 문서 작성',
              short_name: '새 문서',
              description: '새 마크다운 문서를 즉시 작성합니다.',
              url: '/?action=new-doc',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: '문서 적합성 검사',
              short_name: '적합성 검사',
              description: '기준 문서와 작업 문서 간의 일관성을 검사합니다.',
              url: '/?action=ssot-check',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-image-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: [
        { find: /^@tiptap\/pm$/, replacement: path.resolve(__dirname, 'src/shims/tiptap-pm.ts') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    worker: {
      format: 'es',
    },
    build: {
      target: 'es2020',
      minify: 'esbuild' as const,
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@mlc-ai')) return 'vendor-webllm';
              if (id.includes('katex')) return 'vendor-katex';
              if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-editor';
              if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('tesseract.js')) return 'vendor-pdf';
              if (id.includes('xlsx') || id.includes('jszip') || id.includes('mammoth') || id.includes('turndown')) return 'vendor-converters';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-motion';
            }
          },
        },
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});