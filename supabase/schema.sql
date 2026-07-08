-- posts table
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

CREATE INDEX posts_pinned_order_idx ON posts (pinned DESC, pinned_at DESC, created_at DESC);

-- site_settings table
CREATE TABLE site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  blog_name text DEFAULT 'Peter · 随笔',
  author_name text DEFAULT 'Peter',
  bio text DEFAULT '记录思考与生活',
  about_content text DEFAULT '',
  avatar text DEFAULT '✍️',
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read for published posts
CREATE POLICY "Public can read published posts" ON posts FOR SELECT USING (status = 'published');

-- Service role can do everything
CREATE POLICY "Service role full access posts" ON posts USING (auth.role() = 'service_role');
CREATE POLICY "Public read settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Service role full access settings" ON site_settings USING (auth.role() = 'service_role');

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- daily_entries table for public/diary.html
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

CREATE INDEX daily_entries_user_date_idx ON daily_entries (user_id, date DESC);
CREATE INDEX daily_entries_tags_idx ON daily_entries USING gin (tags);

ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily entries" ON daily_entries
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own daily entries" ON daily_entries
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own daily entries" ON daily_entries
FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own daily entries" ON daily_entries
FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

CREATE TRIGGER daily_entries_updated_at BEFORE UPDATE ON daily_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
