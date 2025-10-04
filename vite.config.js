// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // FINAL BUILD CONFIGURATION
  build: {
    outDir: 'dist' // Ensure output folder is named 'dist'
  }
})