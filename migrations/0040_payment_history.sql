-- Tabela para rastrear histórico de pagamentos
-- Permite auditoria completa de todos os pagamentos processados
CREATE TABLE IF NOT EXISTS payment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  payment_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount REAL,
  status TEXT NOT NULL,
  external_reference TEXT,
  payer_email TEXT,
  transaction_details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índice para buscar pagamentos por usuário
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- Índice para buscar por payment_id (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);
