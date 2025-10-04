// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // FINAL BUILD CONFIGURATION
  build: {
    // Use the absolute root path for Vercel deployment
    base: '/', 
    // Ensure assets are placed in the output directory
    outDir: 'dist' 
  }
})