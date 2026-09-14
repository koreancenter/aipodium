import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // 💡 저장소(Repository) 이름을 작성합니다. 
    // 예: 레포지토리 주소가 github.com/user/my-app 이라면 '/my-app/'
    base: '/', 
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx') || id.includes('mammoth') || id.includes('jszip') || id.includes('turndown')) {
                return 'vendor-office';
              }
              if (id.includes('pdfjs-dist') || id.includes('tesseract.js')) {
                return 'vendor-pdf-ocr';
              }
              if (id.includes('katex')) {
                return 'vendor-katex';
              }
              if (id.includes('react') || id.includes('motion') || id.includes('lucide-react')) {
                return 'vendor-framework';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});