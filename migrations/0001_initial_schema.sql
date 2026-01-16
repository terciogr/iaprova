-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de entrevistas (dados da entrevista inicial)
CREATE TABLE IF NOT EXISTS interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  objetivo_tipo TEXT NOT NULL, -- 'concurso_especifico' ou 'area_geral'
  concurso_nome TEXT,
  area_geral TEXT,
  tempo_disponivel_dia INTEGER NOT NULL, -- em minutos
  experiencia TEXT NOT NULL, -- 'iniciante', 'intermediario', 'avancado'
  ja_estudou_antes INTEGER DEFAULT 0, -- boolean
  prazo_prova TEXT, -- data ou null
  reprovacoes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de disciplinas disponíveis
CREATE TABLE IF NOT EXISTS disciplinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  area TEXT NOT NULL, -- 'fiscal', 'policial', 'tribunais', 'administrativo'
  descricao TEXT
);

-- Tabela de nível do usuário por disciplina
CREATE TABLE IF NOT EXISTS user_disciplinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  ja_estudou INTEGER DEFAULT 0, -- boolean
  nivel_atual INTEGER DEFAULT 0, -- 0-10
  dificuldade INTEGER DEFAULT 0, -- boolean, se tem dificuldade histórica
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  UNIQUE(user_id, disciplina_id)
);

-- Tabela de planos de estudo
CREATE TABLE IF NOT EXISTS planos_estudo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  interview_id INTEGER NOT NULL,
  diagnostico TEXT, -- JSON com diagnóstico completo
  mapa_prioridades TEXT, -- JSON com prioridades
  ativo INTEGER DEFAULT 1, -- boolean
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (interview_id) REFERENCES interviews(id)
);

-- Tabela de ciclos de estudo (semanal/diário)
CREATE TABLE IF NOT EXISTS ciclos_estudo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plano_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- 'teoria', 'exercicios', 'revisao'
  dia_semana INTEGER, -- 0-6 (domingo a sábado)
  tempo_minutos INTEGER NOT NULL,
  ordem INTEGER, -- ordem de execução no dia
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plano_id) REFERENCES planos_estudo(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de metas diárias
CREATE TABLE IF NOT EXISTS metas_diarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plano_id INTEGER NOT NULL,
  data DATE NOT NULL,
  ciclo_id INTEGER NOT NULL,
  concluida INTEGER DEFAULT 0, -- boolean
  tempo_real_minutos INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plano_id) REFERENCES planos_estudo(id),
  FOREIGN KEY (ciclo_id) REFERENCES ciclos_estudo(id),
  UNIQUE(user_id, data, ciclo_id)
);

-- Tabela de materiais (PDFs)
CREATE TABLE IF NOT EXISTS materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo TEXT DEFAULT 'pdf',
  paginas_total INTEGER DEFAULT 0,
  paginas_lidas INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de progresso de materiais
CREATE TABLE IF NOT EXISTS progresso_materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  pagina_atual INTEGER DEFAULT 0,
  ultima_leitura DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materiais(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(material_id, user_id)
);

-- Tabela de desempenho (histórico de evolução)
CREATE TABLE IF NOT EXISTS desempenho (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  nivel INTEGER NOT NULL, -- 0-10
  data_avaliacao DATE NOT NULL,
  tipo_avaliacao TEXT, -- 'autoavaliacao', 'exercicios', 'revisao'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de revisões programadas
CREATE TABLE IF NOT EXISTS revisoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  data_proxima_revisao DATE NOT NULL,
  frequencia TEXT, -- 'diaria', 'semanal', 'quinzenal'
  concluida INTEGER DEFAULT 0,
  resultado INTEGER, -- 0-10 quando concluída
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);

-- Tabela de flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  material_id INTEGER,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  dificuldade INTEGER DEFAULT 0, -- 0-2 (fácil, médio, difícil)
  proxima_revisao DATE,
  acertos INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  FOREIGN KEY (material_id) REFERENCES materiais(id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_disciplinas_user_id ON user_disciplinas(user_id);
CREATE INDEX IF NOT EXISTS idx_planos_estudo_user_id ON planos_estudo(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_diarias_user_data ON metas_diarias(user_id, data);
CREATE INDEX IF NOT EXISTS idx_materiais_user_disciplina ON materiais(user_id, disciplina_id);
CREATE INDEX IF NOT EXISTS idx_desempenho_user_disciplina ON desempenho(user_id, disciplina_id);
CREATE INDEX IF NOT EXISTS idx_revisoes_user_data ON revisoes(user_id, data_proxima_revisao);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_revisao ON flashcards(user_id, proxima_revisao);
