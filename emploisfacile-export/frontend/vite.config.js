import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // nécessaire pour Android
    port: 5173,        // par défaut
    strictPort: true,  // évite que vite change de port automatiquement
    hmr: {
      host: "0.0.0.0",
    },
  },
  build: {
    outDir: "dist",
  },
});