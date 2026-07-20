import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/fish-huh/',
  plugins: [react()],
  server: {
    port: 6969
  }
})
