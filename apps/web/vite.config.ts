import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/setup': 'http://localhost:8000',
      '/columns': 'http://localhost:8000',
      '/designs': 'http://localhost:8000',
      '/presets': 'http://localhost:8000',
      '/settings': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
})
