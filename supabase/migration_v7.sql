-- Migration v7: Add ring band width and expanded watch fields

ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS ring_band_width real;
ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS watch_case_material text;
ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS watch_band_material text;
ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS watch_reference text;

NOTIFY pgrst, 'reload schema';
