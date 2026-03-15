-- Migration v6: Collection sharing between friends
-- Requires migration_v4 (collections, piece_collections) and migration_v5 (friendships)

-- 1. Ensure collection_shares table exists
CREATE TABLE IF NOT EXISTS public.collection_shares (
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (collection_id, friend_id)
);

ALTER TABLE public.collection_shares ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check collection ownership WITHOUT triggering RLS on collections
--    This breaks the circular RLS dependency: collections → collection_shares → collections
CREATE OR REPLACE FUNCTION public.is_collection_owner(cid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM collections WHERE id = cid AND user_id = auth.uid());
$$;

-- 3. Drop old collection_shares policies that reference collections directly (causes circular RLS)
DROP POLICY IF EXISTS "Users can view shares for their collections" ON public.collection_shares;
DROP POLICY IF EXISTS "Users can insert shares for own collections" ON public.collection_shares;
DROP POLICY IF EXISTS "Users can delete shares for own collections" ON public.collection_shares;

-- 4. Recreate collection_shares policies using the helper function
CREATE POLICY "Users can view shares for their collections" ON public.collection_shares FOR SELECT
  USING (is_collection_owner(collection_id) OR friend_id = auth.uid());

CREATE POLICY "Users can insert shares for own collections" ON public.collection_shares FOR INSERT
  WITH CHECK (is_collection_owner(collection_id));

CREATE POLICY "Users can delete shares for own collections" ON public.collection_shares FOR DELETE
  USING (is_collection_owner(collection_id));

-- 5. Friend viewing policies on collections and piece_collections
DO $$ BEGIN
  BEGIN
    CREATE POLICY "Friends can view shared collections" ON public.collections FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.collection_shares cs
        WHERE cs.collection_id = collections.id
        AND cs.friend_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$ BEGIN
  BEGIN
    CREATE POLICY "Friends can view shared piece_collections" ON public.piece_collections FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.collection_shares cs
        WHERE cs.collection_id = piece_collections.collection_id
        AND cs.friend_id = auth.uid()
      )
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';
