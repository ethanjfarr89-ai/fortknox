-- FortKnox v3 Migration
-- Run this in the Supabase SQL Editor

-- 1. Add acquisition type to pieces
ALTER TABLE public.pieces
  ADD COLUMN IF NOT EXISTS acquisition_type text NOT NULL DEFAULT 'purchased',
  ADD COLUMN IF NOT EXISTS gifted_by text,
  ADD COLUMN IF NOT EXISTS inherited_from text,
  ADD COLUMN IF NOT EXISTS date_received date;

-- 2. User profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  avatar_crop jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users
INSERT INTO public.profiles (id, display_name)
SELECT id, split_part(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. Collections (sub-collections)
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private', -- private, friends, specific
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view own collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert own collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can update own collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete own collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Junction table: pieces can belong to multiple collections
CREATE TABLE IF NOT EXISTS public.piece_collections (
  piece_id uuid REFERENCES public.pieces(id) ON DELETE CASCADE NOT NULL,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (piece_id, collection_id)
);

ALTER TABLE public.piece_collections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view own piece_collections" ON public.piece_collections FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.pieces WHERE id = piece_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert own piece_collections" ON public.piece_collections FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.pieces WHERE id = piece_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete own piece_collections" ON public.piece_collections FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.pieces WHERE id = piece_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 4. Styling boards
CREATE TABLE IF NOT EXISTS public.styling_boards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  photo_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.styling_boards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view own boards" ON public.styling_boards FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert own boards" ON public.styling_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can update own boards" ON public.styling_boards FOR UPDATE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete own boards" ON public.styling_boards FOR DELETE USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE TABLE IF NOT EXISTS public.styling_board_pieces (
  board_id uuid REFERENCES public.styling_boards(id) ON DELETE CASCADE NOT NULL,
  piece_id uuid REFERENCES public.pieces(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (board_id, piece_id)
);

ALTER TABLE public.styling_board_pieces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view own board pieces" ON public.styling_board_pieces FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.styling_boards WHERE id = board_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert own board pieces" ON public.styling_board_pieces FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.styling_boards WHERE id = board_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete own board pieces" ON public.styling_board_pieces FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.styling_boards WHERE id = board_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5. Friends system
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can update friendships they're part of" ON public.friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Collection sharing (which friends can see which collections)
CREATE TABLE IF NOT EXISTS public.collection_shares (
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (collection_id, friend_id)
);

ALTER TABLE public.collection_shares ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  BEGIN CREATE POLICY "Users can view shares for their collections" ON public.collection_shares FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
      OR friend_id = auth.uid()
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can insert shares for own collections" ON public.collection_shares FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "Users can delete shares for own collections" ON public.collection_shares FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
