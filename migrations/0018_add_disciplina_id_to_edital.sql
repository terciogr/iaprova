-- Adicionar coluna disciplina_id na tabela edital_disciplinas
ALTER TABLE edital_disciplinas ADD COLUMN disciplina_id INTEGER;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_edital_disciplinas_disciplina_id ON edital_disciplinas(disciplina_id);
