import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// JobBot runs on its own dedicated port (5290) so it never collides with
// other Vite projects that use the default 5173. strictPort makes it fail
// loudly if that port is taken, instead of silently drifting to another port
// and leaving you looking at the wrong app. open:true launches the browser
// straight to the right URL.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5290,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
