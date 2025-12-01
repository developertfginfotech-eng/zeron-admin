import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Determine the root directory based on file structure
const determineRoot = () => {
  const cwd = process.cwd()
  // Check if we're in the project root with a client subdirectory
  if (fs.existsSync(path.join(cwd, 'client', 'index.html'))) {
    return path.join(cwd, 'client')
  }
  // Check if index.html is in current directory (Render or CI environment)
  if (fs.existsSync(path.join(cwd, 'index.html'))) {
    return cwd
  }
  // Default to client directory
  return path.join(cwd, 'client')
}

const determineOutDir = () => {
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, 'client', 'index.html'))) {
    return path.join(cwd, 'dist', 'public')
  }
  // For Render or environments where client structure is flattened
  return path.join(cwd, 'dist', 'public')
}

const rootDir = determineRoot()
const outDir = determineOutDir()

export default defineConfig({
  root: rootDir,
  plugins: [react()],

  css: {
    postcss: {
      // This fixes the PostCSS warning by ensuring the 'from' option is set
      from: undefined
    }
  },

  build: {
    outDir: outDir,
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
      '@': path.resolve(rootDir, './src'),
      '@assets': path.resolve(process.cwd(), './attached_assets'),
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