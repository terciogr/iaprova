-- Migração para isolamento de tópicos por usuário

-- Adicionar coluna user_id à tabela topicos_edital
ALTER TABLE topicos_edital ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_topicos_edital_user ON topicos_edital(user_id);

-- Criar tabela de documentos anexados às disciplinas
CREATE TABLE IF NOT EXISTS disciplina_documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_arquivo TEXT DEFAULT 'pdf', -- pdf, doc, txt, etc
  tamanho_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
);

-- Índices para documentos
CREATE INDEX IF NOT EXISTS idx_disciplina_docs_user ON disciplina_documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_disciplina_docs_disciplina ON disciplina_documentos(disciplina_id);
