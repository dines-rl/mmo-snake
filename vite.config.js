import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    allowedHosts: [
      '5000-arm18rg3ma36g8072p4wzxsi4il8gox4y4s3pn3zrfc80ypiaq8.tunnel.runloop.pro',
      '.tunnel.runloop.pro',
    ],
  },
});
