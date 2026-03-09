import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Build config for the native app (iOS/Android).
 * Entry: index-app.html → main-app.tsx → AppShell (separate UI).
 * Run: npm run build:app
 * Then: npx cap sync
 */
export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { index: "index-app.html" },
      output: {
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (/\.(png|jpe?g|svg|gif|ico|webp)$/i.test(name)) return "img/[name]-[hash][extname]";
          if (/\.css$/i.test(name)) return "css/[name]-[hash][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    target: ["es2020"],
    minify: true,
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
});
