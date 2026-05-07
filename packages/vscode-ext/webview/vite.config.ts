import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to parent directory's webview-dist folder
    outDir: '../webview-dist',
    emptyOutDir: true,
    // Generate a single JS file for VS Code webview
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'index.js',
        assetFileNames: 'index.css',
      },
    },
    // Disable code splitting for simpler webview loading
    cssCodeSplit: false,
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // VS Code webview runs in a special context
  define: {
    // VS Code provides acquireVsCodeApi() globally
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})
