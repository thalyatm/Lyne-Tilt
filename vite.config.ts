import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
      port: 3001,
      host: '0.0.0.0',
      allowedHosts: ['.loca.lt', '.trycloudflare.com'],
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-color', '@tiptap/extension-highlight', '@tiptap/extension-image', '@tiptap/extension-link', '@tiptap/extension-placeholder', '@tiptap/extension-text-align', '@tiptap/extension-text-style', '@tiptap/extension-underline'],
            'vendor-charts': ['recharts'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          }
        }
      }
    }
});
