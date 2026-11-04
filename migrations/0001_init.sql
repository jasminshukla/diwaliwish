-- Happy Diwali 2026
-- All timestamps are ISO-8601 UTC strings so they sort lexicographically.
-- Rate-limit buckets store a daily hash, never a raw IP address.

CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('gu', 'hi', 'en')),
  template TEXT NOT NULL,
  custom_message TEXT,
  share_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes (created_at);
CREATE INDEX IF NOT EXISTS idx_wishes_public_id ON wishes (public_id);
CREATE INDEX IF NOT EXISTS idx_wishes_language ON wishes (language);
CREATE INDEX IF NOT EXISTS idx_wishes_template ON wishes (template);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  wish_id TEXT,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  session_id TEXT,
  action TEXT,
  language TEXT,
  template TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_wish_id ON events (wish_id);
CREATE INDEX IF NOT EXISTS idx_events_session_open ON events (session_id, event_type, wish_id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  wish_public_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup
  ON idempotency_keys (session_id, payload_hash, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);
