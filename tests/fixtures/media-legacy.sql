-- Fixed pre-media schema, independent of the schema under test.
CREATE TABLE links (
  id SERIAL PRIMARY KEY, url TEXT NOT NULL UNIQUE, title TEXT, description TEXT,
  favicon_url TEXT, image_url TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(url, '')), 'C')
  ) STORED
);
CREATE INDEX links_search_vector_idx ON links USING GIN (search_vector);
CREATE TABLE tags (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT);
CREATE TABLE link_tags (
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);
INSERT INTO links (url, title, notes) VALUES ('https://example.org/legacy', 'Legacy title', 'Legacy notes');
INSERT INTO tags (name, color) VALUES ('legacy-tag', 'blue');
INSERT INTO link_tags (link_id, tag_id) VALUES (1, 1);
