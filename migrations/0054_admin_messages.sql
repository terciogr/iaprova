-- Tabela de mensagens admin <-> usuário
CREATE TABLE IF NOT EXISTS admin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('admin', 'user')),
  message TEXT NOT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_admin_id ON admin_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(user_id, read_at);
