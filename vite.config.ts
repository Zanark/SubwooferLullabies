import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  base: '/SubwooferLullabies/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
