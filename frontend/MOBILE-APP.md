# JourZy → Mobile App (Capacitor)

Capacitor wraps your existing Vite web app in a real native shell — one
codebase, installable on iOS and Android, App Store / Play Store capable.
Your React code, Supabase auth, and Express backend stay exactly as they are.

## 0. Prerequisites
- Android: Android Studio installed (free, any OS)
- iOS: Xcode installed (requires a Mac)

## 1. Point the app at your deployed backend
On a phone, `localhost:8888` and the Vite proxy don't exist. Deploy your
backend (Render, Railway, Fly.io, etc.), then create `frontend/.env.production`:

```
VITE_API_URL=https://your-backend.example.com
```

Your `apiFetch` already reads this — no code change needed.

Also add the Capacitor origins to `allowedOrigins` in `backend/server.js`:

```js
"capacitor://localhost",   // iOS
"https://localhost",       // Android
```

## 2. Install Capacitor (run inside frontend/)
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```
The `capacitor.config.ts` in this folder is already set up
(appId com.jourzy.app, webDir dist).

## 3. Build the web app, add platforms
```bash
npm run build            # produces dist/
npx cap add android      # and/or: npx cap add ios
npx cap sync
```

## 4. Run it on a device
```bash
npx cap open android     # opens Android Studio → press Run ▶
npx cap open ios         # opens Xcode → press Run ▶ (Mac only)
```
Android Studio can run on a free emulator or your own phone via USB.

## 5. Every time you change frontend code
```bash
npm run build && npx cap sync
```
then Run again from Android Studio / Xcode.

## Notes
- The phone-frame bezel in the UI hides itself on small screens (sm:
  breakpoints), so inside the native shell the app runs edge-to-edge.
- Store publishing later: Android needs a one-time $25 Google Play account;
  iOS needs the $99/yr Apple Developer Program.
- If you want push notifications, camera, GPS, etc., Capacitor has official
  plugins (@capacitor/geolocation, @capacitor/push-notifications, ...).
