-- Adicionar colunas para reset de senha na tabela users
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;

-- Criar índice para busca por reset token
CREATE INDEX idx_users_reset_token ON users(reset_token);