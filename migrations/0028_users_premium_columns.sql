-- Adicionar colunas premium e created_at aos usuários
-- Usando ALTER TABLE separadamente para cada coluna

-- Adicionar campo is_premium (0 = free, 1 = premium)
ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0;

-- Adicionar campo premium_expires_at
ALTER TABLE users ADD COLUMN premium_expires_at DATETIME;

-- Adicionar campo created_at (se não existir)
-- Nota: Se a coluna já existir, este comando falhará silenciosamente no contexto do batch
