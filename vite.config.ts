import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Set base to repo name for GitHub Pages deployment
  // Change 'ttlibrary' to your actual GitHub repo name if different
  base: '/ttlibrary/',
})
