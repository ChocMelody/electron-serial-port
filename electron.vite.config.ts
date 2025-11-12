import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.ts')
        },
        output: {
          entryFileNames: '[name].js'
        },
        external: ['serialport']
      }
    },
    resolve: {
      alias: {
        'bufferutil': resolve(__dirname, 'src/main/mock/bufferutil.js'),
        'utf-8-validate': resolve(__dirname, 'src/main/mock/utf-8-validate.js')
      }
    },
    optimizeDeps: {
      exclude: ['serialport']
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        },
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})