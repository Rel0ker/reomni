CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  teach_name TEXT,
  page TEXT,
  message TEXT NOT NULL,
  contact TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status, created_at DESC);
