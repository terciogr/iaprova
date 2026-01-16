-- Tabela de editais (armazena PDFs/textos de editais)
CREATE TABLE IF NOT EXISTS editais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nome_concurso TEXT NOT NULL,
  arquivo_url TEXT,
  texto_completo TEXT,
  status TEXT DEFAULT 'processando',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de disciplinas extraídas do edital
CREATE TABLE IF NOT EXISTS edital_disciplinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edital_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edital_id) REFERENCES editais(id) ON DELETE CASCADE
);

-- Tabela de tópicos extraídos do edital
CREATE TABLE IF NOT EXISTS edital_topicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edital_disciplina_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edital_disciplina_id) REFERENCES edital_disciplinas(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_editais_user ON editais(user_id);
CREATE INDEX IF NOT EXISTS idx_edital_disciplinas_edital ON edital_disciplinas(edital_id);
CREATE INDEX IF NOT EXISTS idx_edital_topicos_disciplina ON edital_topicos(edital_disciplina_id);
