import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitVendorChunkPlugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import fs from 'fs'

// Determine the root directory based on file structure
const cwd = process.cwd()
const clientPath = path.join(cwd, 'client')
const hasClient = fs.existsSync(path.join(clientPath, 'index.html'))

// Always use client directory if it exists, otherwise use root
const rootDir = hasClient ? clientPath : cwd
const outDir = path.join(cwd, 'dist', 'public')

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    root: rootDir,
    
    plugins: [
      react(),
      splitVendorChunkPlugin(),
      // Bundle analyzer for optimization (only in build mode)
      isProduction && visualizer({
        filename: './dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),

    css: {
      postcss: {
        from: undefined
      },
      // Optimize CSS
      devSourcemap: !isProduction,
    },

    build: {
      outDir: outDir,
      emptyOutDir: true,
      target: 'es2020',
      sourcemap: isProduction ? false : 'inline',
      
      // STRICTER chunk size warning
      chunkSizeWarningLimit: 500, // Reduced from 1000 to catch more issues
      
      // Enable minification
      minify: isProduction ? 'esbuild' : false,
      
      // Tree-shaking optimizations
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        }
      } : undefined,

      // Code splitting configuration
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          },

          // Optimize chunk names
          chunkFileNames: isProduction
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          entryFileNames: isProduction
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          assetFileNames: isProduction
            ? 'assets/[name]-[hash][extname]'
            : 'assets/[name][extname]'
        }
      },

      // CSS optimization
      cssCodeSplit: true,
      cssMinify: isProduction,
      
      // Report bundle size
      reportCompressedSize: true,
    },

    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        '@assets': path.resolve(cwd, 'attached_assets'),
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
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@rollup/rollup-linux-x64-gnu'] // Exclude platform-specific binaries
    }
  }
})