import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // React plugin powers fast refresh and JSX transforms
    react(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // The Cloudflare RealtimeKit SDK (~2.5 MB) is lazy-loaded only when a user
    // joins a live class, so a large vendor chunk is expected and acceptable.
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Vendor chunks are prefixed vendor-* so check-chunk-sizes.mjs exempts
        // them — third-party bundle size is not actionable in CI.
        manualChunks(id) {
          if (id.includes('@cloudflare/realtimekit')) return 'vendor-realtimekit'
          if (
            /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)
          ) return 'vendor-react'
        },
      },
    },
  },
})
