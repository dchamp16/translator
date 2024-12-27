import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html', // Ensure this points to your entry file
    },
  },
  server: {
    port: 5173, // Development server port
  },
});
