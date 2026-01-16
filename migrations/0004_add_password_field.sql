-- Adicionar campo password na tabela users
ALTER TABLE users ADD COLUMN password TEXT;

-- Atualizar usuários existentes com uma senha padrão temporária
UPDATE users SET password = 'senha123' WHERE password IS NULL;
