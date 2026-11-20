CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  omni_cookie TEXT NOT NULL,
  csrf_token TEXT,
  id_local_hash TEXT,
  teach_id TEXT,
  teach_name TEXT,
  branch_json TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cache_entries (
  session_id TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, cache_key)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER,
  verify_at INTEGER,
  verified_at INTEGER,
  verify_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_pending ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_verify ON sync_queue(verify_at, verify_status);
