-- Migration: Remover constraint FOREIGN KEY de meta_id em conteudo_estudo
-- Problema: meta_id pode referenciar metas_diarias OU metas_semana
-- SQLite não suporta DROP CONSTRAINT, então precisamos recriar a tabela

-- 1. Criar tabela temporária SEM a FK constraint
CREATE TABLE conteudo_estudo_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  meta_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  tempo_minutos INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  topicos TEXT,
  objetivos TEXT,
  status TEXT DEFAULT 'pendente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  -- REMOVIDO: FOREIGN KEY (meta_id) REFERENCES metas_diarias(id)
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- 2. Copiar dados existentes
INSERT INTO conteudo_estudo_new 
SELECT * FROM conteudo_estudo;

-- 3. Remover tabela antiga
DROP TABLE conteudo_estudo;

-- 4. Renomear nova tabela
ALTER TABLE conteudo_estudo_new RENAME TO conteudo_estudo;

-- 5. Recriar índices se existirem
CREATE INDEX IF NOT EXISTS idx_conteudo_user ON conteudo_estudo(user_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_meta ON conteudo_estudo(meta_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_disciplina ON conteudo_estudo(disciplina_id);
