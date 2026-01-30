-- Adicionar campos para autenticação Google OAuth
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN google_email TEXT;
ALTER TABLE users ADD COLUMN google_picture TEXT;
ALTER TABLE users ADD COLUMN google_access_token TEXT;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_token_expires DATETIME;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'; -- 'email' ou 'google'
ALTER TABLE users ADD COLUMN last_sync_at DATETIME;

-- Índice para busca rápida por google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
