-- Migration v8: Add per-photo crops
-- Stores a JSON object mapping photo index (as string key) to crop area

ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS photo_crops jsonb;

-- Migrate existing profile_photo_crop data into photo_crops
UPDATE public.pieces
SET photo_crops = jsonb_build_object(profile_photo_index::text, profile_photo_crop)
WHERE profile_photo_crop IS NOT NULL AND photo_crops IS NULL;

NOTIFY pgrst, 'reload schema';
