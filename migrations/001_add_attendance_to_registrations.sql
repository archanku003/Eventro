-- Migration: add attendance fields to registrations
-- Run this in your Supabase SQL editor or via psql connected to your Postgres database.

ALTER TABLE IF EXISTS public.registrations
ADD COLUMN IF NOT EXISTS attended boolean DEFAULT false;

ALTER TABLE IF EXISTS public.registrations
ADD COLUMN IF NOT EXISTS attended_at timestamptz DEFAULT NULL;

-- Optional: index for quick queries by event + attended
CREATE INDEX IF NOT EXISTS idx_registrations_event_attended ON public.registrations (event_id) WHERE attended = true;
