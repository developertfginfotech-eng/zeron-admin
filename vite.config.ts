import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],

  css: {
    postcss: {
      // This fixes the PostCSS warning by ensuring the 'from' option is set
      from: undefined
    }
  },

  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,

    // Code splitting configuration to reduce chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
        },

        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },

    // Increase chunk size warning limit (optional, but helps with debugging)
    chunkSizeWarningLimit: 1000,

    // Enable minification (using esbuild by default)
    minify: 'esbuild',

    // Optimize CSS
    cssCodeSplit: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://zeron-backend-z5o1.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})