import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
    },
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Only precache the app shell (JS/CSS/HTML/icons) — never trip/chat
      // data, which must always come from a real network request so a
      // traveler never sees a stale itinerary. workbox's default globPatterns
      // already only picks up the build's own static assets, not /api/*.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
      // Lets the service worker register in `npm run dev` too, not just
      // production builds — otherwise there's no way to test install/offline
      // behavior without a full build+preview cycle every time.
      devOptions: { enabled: true, type: "module" },
      manifest: {
        name: "JourZy — AI Travel Planner",
        short_name: "JourZy",
        description: "Plan real, personalized trips with an AI travel companion — itineraries, packing lists, budgets, and a photo scrapbook for every trip.",
        start_url: "/",
        display: "standalone",
        background_color: "#1C1915",
        theme_color: "#1C1915",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  assetsInclude: ["**/*.svg", "**/*.csv"],
});
