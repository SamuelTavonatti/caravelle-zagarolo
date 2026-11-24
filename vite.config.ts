import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/caravelle-zagarolo/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
  },
});
