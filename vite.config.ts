// =============================
// vite.config.ts (FIXED for Netlify Build)
// =============================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Maintenance & Supply Management App',
        short_name: 'MSMApp',
        description: 'Aplikasi Untuk Support Aktivitas Maintenance & Supply Management',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },

      // 🧩 Tambahkan bagian ini untuk mengatasi error Netlify build
      workbox: {
        // Naikkan batas maksimal file yang bisa di-cache oleh PWA (default 2 MB → jadi 10 MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],

  // ⚙️ Tambahkan build optimization opsional untuk masa depan
  build: {
    chunkSizeWarningLimit: 2000, // Supaya Vite tidak warning untuk file > 500KB
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@supabase/supabase-js'],
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
