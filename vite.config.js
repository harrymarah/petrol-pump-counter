import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this as a project page under
  // https://harrymarah.github.io/petrol-pump-counter/ — asset URLs must
  // be prefixed with the repo name or the deployed page 404s them.
  base: '/petrol-pump-counter/',
  plugins: [react()],
})
