-- Migration v15: Show & Tell feed, reactions, instagram handle

-- Feed posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  piece_id uuid REFERENCES public.pieces(id) ON DELETE CASCADE NOT NULL,
  caption text,
  is_nominated boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Feed reactions
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_nominated ON feed_posts(is_nominated) WHERE is_nominated = true;
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post_id ON feed_reactions(post_id);

-- Instagram handle on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle text;

-- RLS for feed_posts
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can see own, friend, and nominated posts" ON public.feed_posts
    FOR SELECT USING (
      user_id = auth.uid()
      OR is_nominated = true
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = feed_posts.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = feed_posts.user_id)
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own posts" ON public.feed_posts
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own posts" ON public.feed_posts
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS for feed_reactions
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read reactions" ON public.feed_reactions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own reactions" ON public.feed_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reactions" ON public.feed_reactions
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
