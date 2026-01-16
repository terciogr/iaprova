-- Adicionar campo meta_id à tabela materiais_salvos
-- Isso permite vincular materiais gerados a metas específicas
ALTER TABLE materiais_salvos ADD COLUMN meta_id INTEGER;

-- Índice para busca por meta_id
CREATE INDEX IF NOT EXISTS idx_materiais_meta_id ON materiais_salvos(meta_id);
