-- Reference schema used when restoring the JSON snapshots.
-- The authoritative live schema remains the Supabase database.
CREATE TABLE posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  excerpt text,
  cover_image text,
  category text DEFAULT '文章',
  tags text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  pinned boolean DEFAULT false,
  pinned_at timestamptz,
  reading_time integer DEFAULT 0,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  blog_name text,
  author_name text,
  bio text,
  about_content text,
  avatar text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE daily_entries (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time text,
  text text,
  mood text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
