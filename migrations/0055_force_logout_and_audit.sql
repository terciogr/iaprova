-- ✅ SEGURANÇA v146: Coluna para force logout de sessões ativas
ALTER TABLE users ADD COLUMN force_logout_at DATETIME DEFAULT NULL;

-- ✅ SEGURANÇA v145: Tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  user_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
