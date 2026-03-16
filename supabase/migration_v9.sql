-- Migration v9: Add card display preferences to profiles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS card_display_prefs jsonb;

NOTIFY pgrst, 'reload schema';
