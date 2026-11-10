import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow the Arena preview host (and any *.e2b.app subdomain) to load the dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
})
