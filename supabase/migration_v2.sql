-- FortKnox v2 Migration
-- Run this in the Supabase SQL Editor

-- Add new columns to pieces table
ALTER TABLE public.pieces
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bits',
  ADD COLUMN IF NOT EXISTS is_wishlist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_paid numeric,
  ADD COLUMN IF NOT EXISTS date_purchased date,
  ADD COLUMN IF NOT EXISTS gemstones jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS styling_photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hallmark_photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_photo_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_photo_crop jsonb,
  -- Ring fields
  ADD COLUMN IF NOT EXISTS ring_size text,
  -- Chain fields
  ADD COLUMN IF NOT EXISTS chain_length numeric,
  ADD COLUMN IF NOT EXISTS chain_width numeric,
  -- Bracelet fields
  ADD COLUMN IF NOT EXISTS bracelet_length numeric,
  ADD COLUMN IF NOT EXISTS bracelet_width numeric,
  ADD COLUMN IF NOT EXISTS bracelet_type text,
  ADD COLUMN IF NOT EXISTS bangle_size numeric,
  -- Anklet fields
  ADD COLUMN IF NOT EXISTS anklet_length numeric,
  ADD COLUMN IF NOT EXISTS anklet_width numeric,
  -- Pendant fields
  ADD COLUMN IF NOT EXISTS pendant_length numeric,
  ADD COLUMN IF NOT EXISTS pendant_width numeric,
  -- Earring fields
  ADD COLUMN IF NOT EXISTS earring_length numeric,
  ADD COLUMN IF NOT EXISTS earring_width numeric,
  -- Watch fields
  ADD COLUMN IF NOT EXISTS watch_maker text,
  ADD COLUMN IF NOT EXISTS watch_movement text,
  ADD COLUMN IF NOT EXISTS watch_dial_size numeric;

-- Portfolio snapshots table for historical chart
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_melt_value numeric NOT NULL DEFAULT 0,
  total_appraised_value numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN
    CREATE POLICY "Users can view their own snapshots"
      ON public.portfolio_snapshots FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can insert their own snapshots"
      ON public.portfolio_snapshots FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
