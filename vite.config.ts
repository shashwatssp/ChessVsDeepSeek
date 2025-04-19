import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    react(),
    wasm()
  ],
  worker: {
    format: 'es',
    plugins: ()=> [wasm()]
  },
  optimizeDeps: {
    exclude: ['stockfish.js']
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
