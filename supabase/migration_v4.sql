-- Add privacy_settings column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
