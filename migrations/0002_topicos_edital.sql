-- Migração para adicionar sistema de tópicos do edital

-- Tabela de tópicos do edital por disciplina
CREATE TABLE IF NOT EXISTS topicos_edital (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disciplina_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT, -- Ex: "Parte Geral", "Parte Especial", etc.
  ordem INTEGER DEFAULT 0,
  peso INTEGER DEFAULT 1, -- Peso/importância do tópico
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de progresso do usuário em cada tópico
CREATE TABLE IF NOT EXISTS user_topicos_progresso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  topico_id INTEGER NOT NULL,
  vezes_estudado INTEGER DEFAULT 0,
  ultima_vez DATETIME,
  nivel_dominio INTEGER DEFAULT 0, -- 0-10
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (topico_id) REFERENCES topicos_edital(id),
  UNIQUE(user_id, topico_id)
);

-- Tabela de relacionamento entre conteúdos gerados e tópicos abordados
CREATE TABLE IF NOT EXISTS conteudo_topicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conteudo_id INTEGER NOT NULL,
  topico_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conteudo_id) REFERENCES conteudo_estudo(id),
  FOREIGN KEY (topico_id) REFERENCES topicos_edital(id),
  UNIQUE(conteudo_id, topico_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_topicos_disciplina ON topicos_edital(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_user_topicos ON user_topicos_progresso(user_id, topico_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_topicos ON conteudo_topicos(conteudo_id);

-- Seed de tópicos para Direito Constitucional
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (2, 'Princípios Fundamentais da República', 'Parte Geral', 1, 3),
  (2, 'Direitos e Garantias Fundamentais', 'Parte Geral', 2, 5),
  (2, 'Direitos Sociais', 'Direitos Fundamentais', 3, 4),
  (2, 'Direitos Políticos', 'Direitos Fundamentais', 4, 3),
  (2, 'Organização do Estado', 'Organização Político-Administrativa', 5, 4),
  (2, 'Poder Legislativo', 'Poderes da União', 6, 4),
  (2, 'Poder Executivo', 'Poderes da União', 7, 4),
  (2, 'Poder Judiciário', 'Poderes da União', 8, 4),
  (2, 'Controle de Constitucionalidade', 'Controle', 9, 5),
  (2, 'Ações Constitucionais', 'Remédios Constitucionais', 10, 4);

-- Seed de tópicos para Direito Tributário
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (1, 'Sistema Tributário Nacional', 'Parte Geral', 1, 5),
  (1, 'Princípios Constitucionais Tributários', 'Princípios', 2, 5),
  (1, 'Competência Tributária', 'Competência', 3, 4),
  (1, 'Impostos Federais', 'Espécies Tributárias', 4, 4),
  (1, 'Impostos Estaduais', 'Espécies Tributárias', 5, 4),
  (1, 'Impostos Municipais', 'Espécies Tributárias', 6, 4),
  (1, 'Obrigação Tributária', 'Obrigação Tributária', 7, 4),
  (1, 'Crédito Tributário', 'Crédito Tributário', 8, 4),
  (1, 'Lançamento Tributário', 'Crédito Tributário', 9, 3),
  (1, 'Imunidades Tributárias', 'Imunidades', 10, 4);

-- Seed de tópicos para Direito Administrativo
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (3, 'Princípios da Administração Pública', 'Princípios', 1, 5),
  (3, 'Atos Administrativos', 'Atos', 2, 5),
  (3, 'Contratos Administrativos', 'Contratos', 3, 4),
  (3, 'Licitações - Lei 14.133/2021', 'Licitações', 4, 5),
  (3, 'Servidores Públicos', 'Regime Jurídico', 5, 4),
  (3, 'Responsabilidade Civil do Estado', 'Responsabilidade', 6, 4),
  (3, 'Processo Administrativo', 'Processo', 7, 3),
  (3, 'Improbidade Administrativa', 'Improbidade', 8, 4),
  (3, 'Serviços Públicos', 'Serviços', 9, 3),
  (3, 'Controle da Administração', 'Controle', 10, 3);
