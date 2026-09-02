-- schema.sql
-- Run this in your Supabase SQL Editor to set up all database tables for JourZy.
-- For an EXISTING database, you only need the RLS section and indexes at the
-- bottom (or run enable_rls.sql) — the CREATE TABLE statements are no-ops
-- thanks to IF NOT EXISTS.

-- 1. Create Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    region TEXT NOT NULL,
    arrival_date DATE NOT NULL,
    leave_date DATE NOT NULL,
    budget TEXT,
    who_traveling TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Itineraries Table
CREATE TABLE IF NOT EXISTS public.itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    hotel_recommendation JSONB,
    days JSONB NOT NULL,
    packing_list JSONB,
    insights JSONB,
    logistics_guide JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For an EXISTING database that already had the itineraries table before
-- logistics_guide existed, CREATE TABLE IF NOT EXISTS above is a no-op and
-- won't add the new column — run this once against your existing database:
-- ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS logistics_guide JSONB;

-- 3. User Memory Table (Milestone 7)
CREATE TABLE IF NOT EXISTS public.user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    preferences JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Chat Histories Table
CREATE TABLE IF NOT EXISTS public.chat_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
-- SECURITY: the previous version of this file DISABLED RLS on the theory that
-- the backend was the trusted gatekeeper. But the backend originally used the
-- ANON key — the same public key shipped in the frontend bundle — so anyone
-- could query these tables directly against Supabase's REST API, bypassing
-- the Express server entirely.
--
-- The correct setup (now in place):
--   * backend uses the SERVICE ROLE key (bypasses RLS) + verifies user JWTs
--     and enforces ownership on every endpoint
--   * RLS is ENABLED so the public anon key cannot touch these tables directly
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;
-- (Optional owner-only policies for direct Supabase access live in enable_rls.sql)

-- 6. Indexes for the queries server.js actually runs
CREATE INDEX IF NOT EXISTS idx_trips_user_created
    ON public.trips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip
    ON public.itineraries (trip_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_session
    ON public.chat_histories (session_id, user_id, created_at);

-- 7. Trip Memories Table (scrapbook: visited flag + photos + caption per
-- activity). One row per (trip, day, activity) — activities have no id of
-- their own, they live inside itineraries.days JSONB, so day_number +
-- activity_index is the same day-idx/activity-idx addressing scheme the
-- frontend's uidFor() already uses. activity_title is a denormalized
-- snapshot so the scrapbook still reads correctly even if the itinerary
-- JSONB is ever regenerated later. "Visited, no photo yet" is just
-- photos = '[]' with visited = true.
CREATE TABLE IF NOT EXISTS public.trip_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    day_number INTEGER NOT NULL,
    activity_index INTEGER NOT NULL,
    activity_title TEXT,
    visited BOOLEAN NOT NULL DEFAULT true,
    caption TEXT,
    -- Array of { url, path, uploadedAt }
    photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (trip_id, day_number, activity_index)
);
ALTER TABLE public.trip_memories ENABLE ROW LEVEL SECURITY;
-- The UNIQUE constraint above already indexes (trip_id, day_number,
-- activity_index), which covers the trip_id-leading lookup GET
-- /api/trips/:tripId/memories runs — no separate index needed.

-- 7b. Trending places: extend trip_memories with real, denormalized place
-- identity + a "shared_publicly" flag. A place only ever counts toward
-- trending once a traveler actually shared that memory via a real social
-- channel (see POST /api/trips/:tripId/memories/mark-shared) — never just
-- from saving a private memory. place_id/lat/lng mirror the same Google
-- Places identity already carried on the activity itself (see
-- backend/prompts.js's 'place' object), copied here at share time so
-- trending queries never need to re-parse itineraries.days JSONB.
-- For an EXISTING database, CREATE TABLE IF NOT EXISTS above is a no-op —
-- run this block once against your existing database:
ALTER TABLE public.trip_memories ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE public.trip_memories ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.trip_memories ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.trip_memories ADD COLUMN IF NOT EXISTS shared_publicly BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_trip_memories_shared_place
    ON public.trip_memories (place_id) WHERE shared_publicly = true;

-- 7c. Destination photo cache: GET /api/destination-photo used to call
-- Google's (billed) Places Text Search fresh every single time any traveler
-- opened the app, for the same handful of regions over and over -- that's
-- what actually drove the Google Cloud billing charge. A given region's top
-- place result barely ever changes, so resolve it once, globally, and reuse
-- forever. region_key is the lowercased/trimmed region string; photo_ref can
-- be legitimately NULL (Google had nothing for that region) -- caching that
-- miss too avoids re-querying a dead-end region on every load.
CREATE TABLE IF NOT EXISTS public.destination_photos (
    region_key TEXT PRIMARY KEY,
    photo_ref TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.destination_photos ENABLE ROW LEVEL SECURITY;

-- 8. Storage bucket for memory photos. Public bucket + UUID-based object
-- paths: sharing a trip needs a plain fetchable URL for people who aren't
-- logged into the app, and paths are unguessable in practice. Writes still
-- only ever happen server-side via the service-role key (see server.js),
-- so this doesn't reopen the direct-anon-access issue the RLS section above
-- describes — only reads bypass the backend once a URL exists.
insert into storage.buckets (id, name, public)
values ('trip-memories', 'trip-memories', true)
on conflict (id) do nothing;