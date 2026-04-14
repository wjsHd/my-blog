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
  reading_time integer DEFAULT 0,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
