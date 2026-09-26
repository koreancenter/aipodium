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
      alias: [
        { find: /^@tiptap\/pm$/, replacement: path.resolve(__dirname, 'src/shims/tiptap-pm.ts') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    build: {
      target: 'es2020',
      minify: 'esbuild' as const,
      cssMinify: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-webllm': ['@mlc-ai/web-llm'],
            'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/pm'],
            'vendor-parsers': ['katex', 'mammoth', 'xlsx', 'turndown'],
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