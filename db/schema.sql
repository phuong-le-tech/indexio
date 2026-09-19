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
