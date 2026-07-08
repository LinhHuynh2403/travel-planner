// backend/db.js
// Server-side Supabase client.
//
// SECURITY: this uses the SERVICE ROLE key, which bypasses Row Level Security.
// That's correct for a backend — server.js is the gatekeeper (JWT verification
// + ownership checks on every user-data endpoint). Because this key grants
// full database access, it must ONLY exist in backend/.env:
//   - never commit it to git (backend/.env is in your .gitignore — good)
//   - never use it in frontend code or expose it via any VITE_* variable
//   - if it has EVER been committed or pasted client-side, rotate it in the
//     Supabase dashboard (Settings -> API) immediately.

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // NOTE: createClient() throws synchronously on an empty/missing URL
  // ("supabaseUrl is required."), which — despite this being top-level
  // module code — crashes the ENTIRE process on startup (Node exits with
  // status 1 before the Express server ever binds a port), taking down
  // weather, chat, and itinerary generation too even though none of those
  // need Supabase. This previously caused Render deploys to fail outright
  // whenever these two vars weren't set there. A placeholder URL below keeps
  // client construction from crashing; any actual Supabase call still fails
  // gracefully at request time (every call site is already wrapped in
  // try/catch or gated by requireAuth).
    console.error(
        "[db] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env.\n" +
        "[db] Trips, chat history, and memory features will not work until these are set.\n" +
        "[db] Find the service_role key in Supabase dashboard -> Settings -> API."
    );
}

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder-key", {
    auth: {
    // This is a server, not a browser session — no token persistence needed.
    autoRefreshToken: false,
    persistSession: false,
    },
});