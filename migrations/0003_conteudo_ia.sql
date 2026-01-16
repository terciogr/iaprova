-- Tabela de conteúdo de estudo gerado por IA
CREATE TABLE IF NOT EXISTS conteudo_estudo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  meta_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- 'teoria', 'exercicios', 'revisao'
  tempo_minutos INTEGER NOT NULL,
  conteudo TEXT NOT NULL, -- JSON com o conteúdo gerado
  topicos TEXT, -- JSON com lista de tópicos
  objetivos TEXT, -- JSON com objetivos de aprendizado
  status TEXT DEFAULT 'pendente', -- 'pendente', 'em_andamento', 'concluido'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (meta_id) REFERENCES metas_diarias(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de histórico de estudos (para calendário)
CREATE TABLE IF NOT EXISTS historico_estudos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data DATE NOT NULL,
  metas_total INTEGER DEFAULT 0,
  metas_concluidas INTEGER DEFAULT 0,
  tempo_total_minutos INTEGER DEFAULT 0,
  tempo_estudado_minutos INTEGER DEFAULT 0,
  percentual_conclusao INTEGER DEFAULT 0,
  status TEXT DEFAULT 'nao_estudou', -- 'nao_estudou', 'parcial', 'completo'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, data)
);

-- Adicionar coluna para conteúdo gerado em metas_diarias
ALTER TABLE metas_diarias ADD COLUMN conteudo_gerado INTEGER DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conteudo_user_meta ON conteudo_estudo(user_id, meta_id);
CREATE INDEX IF NOT EXISTS idx_historico_user_data ON historico_estudos(user_id, data);
