import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only settings: JobBot uses a dedicated port (5290) so it never collides
// with other Vite projects on the default 5173, fails loudly if the port is
// taken, and opens the browser at the right URL. Production is built statically
// and served by Vercel; the app talks directly to Supabase in all environments.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5290,
    strictPort: true,
    open: true,
  },
})
