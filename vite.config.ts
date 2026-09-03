import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Asume que vercel dev corre en 3000
        changeOrigin: true,
      },
    },
  },
  build: {
    // Permite que Vite y Rollup gestionen los chunks automáticamente para evitar dependencias circulares (ReferenceError)
    chunkSizeWarningLimit: 600,
  }
})

