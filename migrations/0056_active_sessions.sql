-- ✅ v156: Tabela de sessões ativas (dispositivos conectados)
-- Permite ao admin ver e revogar sessões individuais
CREATE TABLE IF NOT EXISTS active_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_revoked INTEGER DEFAULT 0,
  revoked_at DATETIME,
  revoked_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON active_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON active_sessions(user_id, is_revoked);
