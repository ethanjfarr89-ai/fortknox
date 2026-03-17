-- Migration v13: Add is_favorite column to pieces for quick-access favorites

ALTER TABLE public.pieces ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
