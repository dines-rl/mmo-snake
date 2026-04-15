import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: 'all',
    proxy: {
      '/ws': {
        target: 'ws://localhost:5001',
        ws: true,
      },
    },
  },
});
