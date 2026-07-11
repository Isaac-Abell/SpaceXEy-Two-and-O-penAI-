import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend base URL is supplied via VITE_API_BASE (see .env.example).
// It is NEVER hardcoded in app code.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
