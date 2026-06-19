-- schema.sql
-- Run this in your Supabase SQL Editor to set up all database tables for JourZy.

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Disable Row Level Security (RLS)
-- Since the backend acts as a trusted middleware accessing Supabase via the Anon key,
-- we disable RLS on these tables to let the backend API manage all data authorization.
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_histories DISABLE ROW LEVEL SECURITY;
