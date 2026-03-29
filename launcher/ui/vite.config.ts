import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Electron file:// 프로토콜 호환
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
