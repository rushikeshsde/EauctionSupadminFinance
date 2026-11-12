// Purpose: Vite config. In development, /api is proxied to the backend so the browser makes
// same-origin calls (no CORS setup needed). Override the target with VITE_PROXY_TARGET.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_PROXY_TARGET || "https://e-auction-backend-staging1.onrender.com"; /* "http://localhost:3000" */

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: { "/api": { target, changeOrigin: true, secure: false } },
    },
  };
});
