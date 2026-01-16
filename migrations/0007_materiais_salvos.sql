-- Tabela para armazenar todos os materiais do usuário
CREATE TABLE IF NOT EXISTS materiais_salvos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER,
  topico_id INTEGER,
  tipo TEXT NOT NULL, -- 'teoria', 'exercicios', 'resumo', 'flashcards', 'upload', 'anotacao'
  titulo TEXT NOT NULL,
  conteudo TEXT, -- Conteúdo gerado pela IA ou anotações
  arquivo_url TEXT, -- URL do arquivo no R2 (para uploads)
  arquivo_nome TEXT, -- Nome original do arquivo
  arquivo_tipo TEXT, -- MIME type
  arquivo_tamanho INTEGER, -- Tamanho em bytes
  tags TEXT, -- Tags separadas por vírgula
  favorito INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  FOREIGN KEY (topico_id) REFERENCES topicos_edital(id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_materiais_user ON materiais_salvos(user_id);
CREATE INDEX IF NOT EXISTS idx_materiais_disciplina ON materiais_salvos(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais_salvos(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_favorito ON materiais_salvos(favorito);
CREATE INDEX IF NOT EXISTS idx_materiais_created ON materiais_salvos(created_at DESC);
