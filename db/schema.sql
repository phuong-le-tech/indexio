-- Indexio schema

CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  favicon_url TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(url, '')), 'C')
  ) STORED
);

CREATE INDEX IF NOT EXISTS links_search_vector_idx ON links USING GIN (search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS links_url_idx ON links (url);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Optional user override for a tag's color family (one of the 9 families
-- lib/tagColors.ts defines). NULL means "use the automatic color"
-- (Notion-carryover or name hash).
ALTER TABLE tags ADD COLUMN IF NOT EXISTS color TEXT;

CREATE TABLE IF NOT EXISTS link_tags (
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);

CREATE INDEX IF NOT EXISTS link_tags_tag_id_idx ON link_tags (tag_id);

-- Seed tag vocabulary from the user's Notion "Tech Ressources" database
-- Category field, so they're available in the tag picker/filter immediately.
INSERT INTO tags (name) VALUES
  ('UI/UX Design'), ('Coding Practice'), ('Learning Resources'), ('AI/ML'),
  ('Cloud/DevOps'), ('Development Tools'), ('Reference/APIs'), ('Community'),
  ('GitHub Projects'), ('Idea'), ('Form'), ('No-Code/Low-Code'), ('Prod'),
  ('VPS'), ('Serverless'), ('BDD'), ('Animation'), ('SEO'), ('Analytics'),
  ('Marketing'), ('Affilation'), ('Copywriting'), ('Security'), ('Monitoring'),
  ('RGPD'), ('Legal'), ('Payment')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS author TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS mentioned_urls TEXT[] NOT NULL DEFAULT '{}';

-- Rebuilding a stored vector rewrites existing rows; do it only for the legacy expression.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = 'links'::regclass AND a.attname = 'search_vector'
      AND NOT a.attisdropped AND pg_get_expr(d.adbin, d.adrelid) LIKE '%transcript%'
  ) THEN
    DROP INDEX IF EXISTS links_search_vector_idx;
    ALTER TABLE links DROP COLUMN IF EXISTS search_vector;
    ALTER TABLE links ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(caption, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(url, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(author, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(transcript, '')), 'D')
    ) STORED;
    CREATE INDEX links_search_vector_idx ON links USING GIN (search_vector);
  END IF;
END $$;
