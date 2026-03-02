-- Tabela para registrar interações de chat com a Lilu
CREATE TABLE IF NOT EXISTS chat_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message_count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índice para consultas de analytics por data
CREATE INDEX IF NOT EXISTS idx_chat_interactions_created ON chat_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_user ON chat_interactions(user_id);
