import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    // Binds to the LAN, not just localhost — so the dev server is reachable
    // from a phone on the same WiFi at http://<mac's LAN IP>:5173, the same
    // "test on a real device instantly" convenience Expo's QR flow gives,
    // just via Safari directly instead of a native build step. Explicit
    // 0.0.0.0 (not just `true`, which binds the IPv6 wildcard `::`) so
    // there's a guaranteed real IPv4 socket for a phone connecting over
    // plain WiFi IPv4, not just a hopeful dual-stack fallback.
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8888",
        changeOrigin: true,
      },
    },
  },

  // `npm run preview` serves the real production build (dist/) instead of
  // unbundled dev-mode modules — noticeably faster to load over real WiFi
  // to a phone, since it's one bundled/minified/gzipped JS file instead of
  // hundreds of separate module requests. Same explicit LAN bind as above.
  // API calls don't need this proxy either way — VITE_API_URL in .env is an
  // absolute backend URL, so requests go straight there in both modes.
  preview: {
    host: "0.0.0.0",
    port: 5173,
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
        // Memory photos, Locket-style: once a photo has actually been seen
        // with a connection, it's cached and stays viewable with no
        // connection at all afterward — CacheFirst never re-fetches an
        // already-cached one, since an uploaded photo never changes.
        // Uploading a NEW photo still genuinely requires connectivity (it's
        // a real POST to the backend) — this only ever affects *viewing*
        // photos that were already loaded once. The itinerary/captions text
        // itself doesn't need this: that's already in localStorage and
        // works offline today, this only covers the actual image bytes.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/trip-memories/"),
            handler: "CacheFirst",
            options: {
              cacheName: "memory-photos",
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
