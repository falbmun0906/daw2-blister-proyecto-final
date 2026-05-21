import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      zod: path.resolve(__dirname, './node_modules/zod')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/scss/shared" as *;`
      }
    }
  },
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'dist', 'e2e/**']
  }
});
