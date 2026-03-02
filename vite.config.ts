import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

/** Make main CSS non-render-blocking to improve LCP (saves ~140ms in Lighthouse) */
function nonBlockingCss() {
  return {
    name: "non-blocking-css",
    enforce: "post" as const,
    transformIndexHtml(html: string) {
      return html.replace(
        /<link\s+([^>]*?)rel="stylesheet"([^>]*)>/gi,
        (full) => {
          const hrefMatch = full.match(/href="([^"]+)"/);
          const href = hrefMatch ? hrefMatch[1] : "";
          if (!href || !href.includes(".css")) return full;
          return (
            `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet" href="${href}"></noscript>`
          );
        }
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "production" && nonBlockingCss(),
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
          // AWS SDK — only loaded when admin uploads, keep isolated
          if (id.includes('@aws-sdk')) return 'aws-sdk';
          // Charts — only on admin/dashboard pages
          if (id.includes('recharts') || (id.includes('lodash') && !id.includes('node_modules/lodash/lodash'))) return 'charts';
          // Heavy form/date libs — only on subscription/auth pages
          if (id.includes('react-day-picker') || id.includes('date-fns')) return 'date-picker';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
          // Animation — only on pages using framer-motion
          if (id.includes('framer-motion')) return 'motion';
          // Carousel — only on homepage
          if (id.includes('embla-carousel')) return 'carousel';
          // Split radix-ui into smaller groups by component category
          if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-alert-dialog') || id.includes('@radix-ui/react-sheet') || id.includes('vaul') || id.includes('cmdk')) return 'radix-overlay';
          if (id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-dropdown') || id.includes('@radix-ui/react-popover') || id.includes('@radix-ui/react-context-menu') || id.includes('@radix-ui/react-menubar') || id.includes('@radix-ui/react-navigation-menu') || id.includes('@radix-ui/react-hover-card')) return 'radix-menus';
          if (id.includes('@radix-ui')) return 'radix-core';
          // Core vendor — split so no single chunk dominates parse/execution (TBT)
          if (id.includes('node_modules/react-dom/')) return 'react-dom';
          if (id.includes('node_modules/react/')) return 'react';
          if (id.includes('react-router-dom') || id.includes('react-router/')) return 'router';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('sonner') || id.includes('@radix-ui/react-toast')) return 'toasts';
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
