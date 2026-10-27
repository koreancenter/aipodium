import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // 💡 저장소(Repository) 이름을 작성합니다. 
    // 예: 레포지토리 주소가 github.com/user/my-app 이라면 '/my-app/'
    base: '/', 
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'preload-stylesheet',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
          const html = bundle['index.html'];
          if (!html || html.type !== 'asset' || typeof html.source !== 'string') return;

          let hasStylesheet = false;
          let transformedHtml = html.source.replace(
            /<link\b([^>]*\brel="stylesheet"[^>]*)>/g,
            (tag, attributes: string) => {
              const href = attributes.match(/\bhref="([^"]+\.css)"/)?.[1];
              if (!href) return tag;

              hasStylesheet = true;
              const crossorigin = /\bcrossorigin(?:="[^"]*")?/i.test(attributes) ? ' crossorigin' : '';
              return `<link rel="preload" as="style" href="${href}"${crossorigin}>`;
            },
          );

          if (hasStylesheet) {
            transformedHtml = transformedHtml.replace(
              '</head>',
              '<style>html,body,#root{min-height:100%;margin:0}body{background:#09090b;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.4}</style></head>',
            );
            html.source = transformedHtml;
          }
        },
      },
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