CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  ip TEXT,
  user_agent TEXT,
  teach_id TEXT,
  teach_name TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_last_used ON sessions(last_used_at DESC);
