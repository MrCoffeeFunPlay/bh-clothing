import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  // The published site (Replit) serves the built files with "vite preview"; allow the custom domain and Replit's.
  preview: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
});