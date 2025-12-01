import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  css: {
    postcss: {
      // This fixes the PostCSS warning by ensuring the 'from' option is set
      from: undefined
    }
  },

  build: {
    outDir: 'dist/public',
    
    // Code splitting configuration to reduce chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@mui/material', '@mui/icons-material'],
          
          // Feature-based code splitting
          'chunk-dashboard': [
            './src/pages/dashboard.tsx'
          ],
          'chunk-properties': [
            './src/pages/properties.tsx'
          ],
          'chunk-transactions': [
            './src/pages/transactions.tsx'
          ],
          'chunk-investors': [
            './src/pages/investors.tsx'
          ],
          'chunk-settings': [
            './src/pages/settings.tsx'
          ],
        },
        
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    
    // Increase chunk size warning limit (optional, but helps with debugging)
    chunkSizeWarningLimit: 1000,
    
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    },
    
    // Optimize CSS
    cssCodeSplit: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://zeron-backend-zs01.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})