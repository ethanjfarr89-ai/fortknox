-- Migration v5: Allow friends to view each other's pieces
-- Privacy filtering (hide values, hide photos) is handled client-side
-- RLS just gates on accepted friendship status

DO $$ BEGIN
  BEGIN
    CREATE POLICY "Friends can view pieces" ON public.pieces FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = pieces.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = pieces.user_id)
        )
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
