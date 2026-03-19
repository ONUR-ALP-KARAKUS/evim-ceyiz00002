import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        urun: resolve(__dirname, 'urun.html'),
        kampanyalar: resolve(__dirname, 'kampanyalar.html')
      }
    }
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  }
});
