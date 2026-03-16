-- Migration v10: Per-collection display prefs + enforce collection-based sharing via RLS

-- 1. Add display_prefs to collection_shares
ALTER TABLE public.collection_shares
ADD COLUMN IF NOT EXISTS display_prefs jsonb NOT NULL DEFAULT '{"value":true,"roi":true,"weight":true,"metal":true,"category":true,"gemstones":true}';

-- 2. Replace the v5 "Friends can view pieces" policy with one that only
--    exposes pieces belonging to a collection shared with the viewer.
DROP POLICY IF EXISTS "Friends can view pieces" ON public.pieces;

CREATE POLICY "Friends can view shared pieces" ON public.pieces FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.piece_collections pc
    JOIN public.collection_shares cs ON cs.collection_id = pc.collection_id
    WHERE pc.piece_id = pieces.id AND cs.friend_id = auth.uid()
  )
);

-- 3. Add indexes for the join performance
CREATE INDEX IF NOT EXISTS idx_piece_collections_piece_id ON public.piece_collections(piece_id);
CREATE INDEX IF NOT EXISTS idx_piece_collections_collection_id ON public.piece_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_shares_collection_id ON public.collection_shares(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_shares_friend_id ON public.collection_shares(friend_id);

NOTIFY pgrst, 'reload schema';
