import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // CRITICAL FIX: Use relative paths for assets on deployment

  plugins: [react()],
})