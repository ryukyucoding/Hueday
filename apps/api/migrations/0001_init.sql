CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'single',
  target_color TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  dominant_colors TEXT NOT NULL DEFAULT '[]',
  ai_color_name TEXT,
  matches_target INTEGER,
  subject TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_entry ON photos(entry_id);
