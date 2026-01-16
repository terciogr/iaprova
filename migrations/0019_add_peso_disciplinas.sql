-- Adicionar coluna peso na tabela user_disciplinas
ALTER TABLE user_disciplinas ADD COLUMN peso INTEGER DEFAULT NULL;

-- Adicionar coluna peso na tabela edital_disciplinas (para extrair do XLSX)
ALTER TABLE edital_disciplinas ADD COLUMN peso INTEGER DEFAULT NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_disciplinas_peso ON user_disciplinas(peso);
