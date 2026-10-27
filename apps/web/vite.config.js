import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5187,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5184',
      '/public': 'http://localhost:5184',
      '/health': 'http://localhost:5184',
    },
  },
})
