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

      // Advanced code splitting configuration
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Aggressive vendor splitting based on your likely dependencies
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') && !id.includes('react-icons')) {
                return 'vendor-react'
              }
              
              // React Router (if used)
              if (id.includes('react-router')) {
                return 'vendor-router'
              }
              
              // Ant Design (COMMON SOURCE OF LARGE BUNDLES)
              if (id.includes('antd') || id.includes('@ant-design')) {
                return 'vendor-antd'
              }
              
              // UI libraries
              if (id.includes('@mui') || id.includes('@chakra-ui') || id.includes('tailwind')) {
                return 'vendor-ui'
              }
              
              // Date libraries
              if (id.includes('dayjs') || id.includes('date-fns') || id.includes('moment')) {
                return 'vendor-date'
              }
              
              // Utility libraries
              if (id.includes('lodash') || id.includes('axios') || id.includes('@reduxjs')) {
                return 'vendor-utils'
              }
              
              // Charts/Visualization (if used)
              if (id.includes('recharts') || id.includes('chart.js') || id.includes('d3')) {
                return 'vendor-charts'
              }
              
              // Form libraries
              if (id.includes('formik') || id.includes('react-hook-form') || id.includes('yup')) {
                return 'vendor-forms'
              }
              
              // Return remaining node_modules as vendor-other
              return 'vendor-other'
            }
            
            // Split by routes for better code splitting
            if (id.includes('src/pages/') || id.includes('src/routes/')) {
              const match = id.match(/src\/(?:pages|routes)\/([^\/]+)/)
              if (match) {
                return `page-${match[1]}`
              }
            }
            
            // Split large feature modules
            if (id.includes('src/features/')) {
              const match = id.match(/src\/features\/([^\/]+)/)
              if (match) {
                return `feature-${match[1]}`
              }
            }
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