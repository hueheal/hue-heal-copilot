import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Hue & Heal — Studio Co-pilot dev/build config.
export default defineConfig({
  plugins: [react()],
  server: { port: 5273, host: true },
})
