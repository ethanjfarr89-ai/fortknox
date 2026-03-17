-- Migration v12: Shareable piece links for non-platform users

CREATE TABLE public.piece_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id uuid REFERENCES public.pieces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  show_value boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_piece_shares_token ON public.piece_shares(share_token);
CREATE INDEX idx_piece_shares_piece ON public.piece_shares(piece_id);

-- Enable Row Level Security
ALTER TABLE public.piece_shares ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own shares
CREATE POLICY "Users can insert own shares" ON public.piece_shares
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shares" ON public.piece_shares
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares" ON public.piece_shares
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own shares" ON public.piece_shares
FOR UPDATE USING (auth.uid() = user_id);

-- Anonymous users can look up shares by token (for the public share page)
CREATE POLICY "Anyone can view by token" ON public.piece_shares
FOR SELECT USING (true);

-- Create a view that joins piece data for public share lookups
-- This avoids giving anonymous users direct access to the pieces table
CREATE OR REPLACE FUNCTION public.get_shared_piece(token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'share', json_build_object(
      'id', s.id,
      'share_token', s.share_token,
      'show_value', s.show_value,
      'created_at', s.created_at
    ),
    'piece', json_build_object(
      'name', p.name,
      'description', p.description,
      'category', p.category,
      'metal_type', p.metal_type,
      'metal_weight_grams', p.metal_weight_grams,
      'metal_karat', p.metal_karat,
      'gemstones', p.gemstones,
      'photo_urls', p.photo_urls,
      'profile_photo_index', p.profile_photo_index,
      'profile_photo_crop', p.profile_photo_crop,
      'photo_crops', p.photo_crops,
      'history', p.history,
      'significance', p.significance,
      'appraised_value', CASE WHEN s.show_value THEN p.appraised_value ELSE NULL END,
      'ring_size', p.ring_size,
      'chain_length', p.chain_length,
      'chain_width', p.chain_width,
      'bracelet_length', p.bracelet_length,
      'bracelet_width', p.bracelet_width,
      'bracelet_type', p.bracelet_type,
      'bangle_size', p.bangle_size,
      'anklet_length', p.anklet_length,
      'anklet_width', p.anklet_width,
      'pendant_length', p.pendant_length,
      'pendant_width', p.pendant_width,
      'earring_length', p.earring_length,
      'earring_width', p.earring_width,
      'ring_band_width', p.ring_band_width,
      'watch_maker', p.watch_maker,
      'watch_movement', p.watch_movement,
      'watch_dial_size', p.watch_dial_size,
      'watch_case_material', p.watch_case_material,
      'watch_band_material', p.watch_band_material,
      'watch_reference', p.watch_reference,
      'styling_photo_urls', p.styling_photo_urls,
      'hallmark_photo_urls', p.hallmark_photo_urls
    ),
    'owner', json_build_object(
      'display_name', pr.display_name,
      'avatar_url', pr.avatar_url
    )
  ) INTO result
  FROM public.piece_shares s
  JOIN public.pieces p ON p.id = s.piece_id
  LEFT JOIN public.profiles pr ON pr.id = s.user_id
  WHERE s.share_token = token;

  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
