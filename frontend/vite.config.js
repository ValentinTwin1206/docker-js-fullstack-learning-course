import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // bind to all interfaces so VS Code can forward the port
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://app:3000',
        changeOrigin: true,
      },
    },
  },
});
