import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Generate .gz and .br pre-compressed files for Azure Static Web Apps / CDN
    mode === 'production' && viteCompression({ algorithm: 'gzip', ext: '.gz' }),
    mode === 'production' && viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    mode === 'production' && !process.env.CI && visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers only - eliminates legacy JS polyfills (~57KB savings)
    target: ['chrome89', 'firefox89', 'safari15', 'edge89'],
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core vendor — loaded on every page
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) return 'vendor';
          if (id.includes('node_modules/@tanstack/') || id.includes('node_modules/lucide-react/')) return 'ui';
          if (id.includes('node_modules/@supabase/')) return 'supabase';
          if (id.includes('node_modules/embla-carousel')) return 'carousel';
          if (id.includes('node_modules/framer-motion/')) return 'motion';
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/zod/') || id.includes('node_modules/@hookform/')) return 'forms';
          // recharts + lodash (recharts's dependency) — admin-only, never loaded on homepage
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/lodash/') || id.includes('node_modules/lodash-es/')) return 'charts';
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash].${ext}`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    minify: true,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      '@supabase/supabase-js',
    ],
    force: mode === 'development',
  },
  css: {
    devSourcemap: mode === 'development',
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    treeShaking: true,
    minifyIdentifiers: mode === 'production',
    minifySyntax: mode === 'production',
    minifyWhitespace: mode === 'production',
  },
}));
