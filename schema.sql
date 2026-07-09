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