import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5000,
    proxy: {
      '/ws': {
        target: 'ws://localhost:5001',
        ws: true,
      },
    },
  },
});
