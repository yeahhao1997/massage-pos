import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时前端 5173，API 走 3000，用 proxy 转发
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: { outDir: 'dist' },
});
