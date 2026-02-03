-- Adicionar campos para autenticação Google OAuth
-- Nota: SQLite não permite UNIQUE diretamente no ALTER TABLE, usando CREATE UNIQUE INDEX depois
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN google_email TEXT;
ALTER TABLE users ADD COLUMN google_picture TEXT;
ALTER TABLE users ADD COLUMN google_access_token TEXT;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_token_expires DATETIME;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'; -- 'email' ou 'google'
ALTER TABLE users ADD COLUMN last_sync_at DATETIME;

-- Índice UNIQUE para google_id (garantir unicidade)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
