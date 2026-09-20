import { defineConfig } from "vite";

export default defineConfig({
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css")
            ? "assets/app.css"
            : "assets/[name].[hash][extname]",
      },
    },
  },
});