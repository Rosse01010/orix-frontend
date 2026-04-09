import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy REST calls so browser avoids CORS during local dev
      "/auth": { target: "http://localhost:8000", changeOrigin: true },
      "/cameras": { target: "http://localhost:8000", changeOrigin: true },
      "/users": { target: "http://localhost:8000", changeOrigin: true },
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
      // Socket.IO transport
      "/socket.io": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
