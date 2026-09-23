import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@app': path.resolve(import.meta.dirname, './src/app'),
      '@core': path.resolve(import.meta.dirname, './src/core'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@modulos': path.resolve(import.meta.dirname, './src/modulos'),
      '@modules': path.resolve(import.meta.dirname, './src/modulos'),
    }
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('react-is')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-ui-icons';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'vendor-forms';
            }
            if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
              return 'vendor-query-state';
            }
            if (
              id.includes('react') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  } as any,
})
