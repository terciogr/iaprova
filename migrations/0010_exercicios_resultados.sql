-- Tabela para registrar resultados de exercícios
CREATE TABLE IF NOT EXISTS exercicios_resultados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  topico_id INTEGER,
  total_questoes INTEGER NOT NULL,
  acertos INTEGER NOT NULL,
  percentual REAL NOT NULL,
  tempo_segundos INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_exercicios_user ON exercicios_resultados(user_id);
CREATE INDEX IF NOT EXISTS idx_exercicios_disciplina ON exercicios_resultados(user_id, disciplina_id);
CREATE INDEX IF NOT EXISTS idx_exercicios_created ON exercicios_resultados(created_at);
