
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      crypto: resolve(__dirname, './crypto-polyfill.js')
    }
  },
  build: {
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
