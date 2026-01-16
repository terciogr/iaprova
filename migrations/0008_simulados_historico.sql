-- Tabela para histórico de simulados realizados
CREATE TABLE IF NOT EXISTS simulados_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data_realizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  disciplinas TEXT, -- JSON com IDs das disciplinas
  topicos TEXT, -- JSON com IDs dos tópicos
  total_questoes INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  percentual_acerto REAL NOT NULL,
  tempo_gasto TEXT, -- Formato "HH:MM:SS" ou minutos
  questoes_detalhes TEXT, -- JSON com detalhes de cada questão
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_simulados_user ON simulados_historico(user_id);
CREATE INDEX IF NOT EXISTS idx_simulados_data ON simulados_historico(data_realizacao);
CREATE INDEX IF NOT EXISTS idx_simulados_percentual ON simulados_historico(percentual_acerto);
