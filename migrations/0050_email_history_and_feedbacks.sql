-- Tabela para histórico de emails enviados (exceto verificação)
CREATE TABLE IF NOT EXISTS email_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'payment_confirmation', 'welcome', 'password_reset', etc.
  subject TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  metadata TEXT, -- JSON com dados extras
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_type ON email_history(email_type);
CREATE INDEX IF NOT EXISTS idx_email_history_created_at ON email_history(created_at);

-- Tabela para feedbacks/avaliações dos usuários
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  rating INTEGER, -- 1 a 5 estrelas (opcional)
  feedback_type TEXT DEFAULT 'suggestion', -- 'suggestion', 'bug', 'compliment', 'other'
  message TEXT NOT NULL,
  page_context TEXT, -- onde o usuário estava quando enviou
  is_read INTEGER DEFAULT 0,
  admin_response TEXT,
  responded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_read ON user_feedbacks(is_read);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON user_feedbacks(created_at);
