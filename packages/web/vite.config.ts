import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@jungeon/shared': path.resolve(__dirname, '../shared/src'),
      '@jungeon/client-core': path.resolve(__dirname, '../client-core/src'),
    },
  },
  server: {
    port: 5174,
  },
});
