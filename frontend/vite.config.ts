import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA disabled temporarily due to Cloudflare Access authentication blocking manifest.json
    // To re-enable PWA:
    // 1. Uncomment the VitePWA import above
    // 2. Restore VitePWA configuration from git history (commit 5b6eda6 or earlier)
    // 3. Configure Cloudflare Access to bypass /manifest.json, /sw.js, and icon files
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://tas-aerial-browser.awhobbs.workers.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
