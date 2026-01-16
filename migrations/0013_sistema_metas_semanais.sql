-- Migration 0013: Sistema de Metas Semanais
-- Substitui o sistema de metas diárias por um sistema semanal mais flexível
-- Data: 2024-12-04

-- =====================================================
-- 1. TABELA DE SEMANAS DE ESTUDO
-- =====================================================
CREATE TABLE IF NOT EXISTS semanas_estudo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plano_id INTEGER NOT NULL,
  numero_semana INTEGER NOT NULL,  -- 1, 2, 3, 4... (semana do plano)
  data_inicio DATE NOT NULL,       -- Segunda-feira
  data_fim DATE NOT NULL,          -- Domingo
  status TEXT DEFAULT 'ativa',     -- ativa, concluida, cancelada
  metas_totais INTEGER DEFAULT 0,
  metas_concluidas INTEGER DEFAULT 0,
  tempo_total_minutos INTEGER DEFAULT 0,
  tempo_estudado_minutos INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plano_id) REFERENCES planos_estudo(id) ON DELETE CASCADE
);

CREATE INDEX idx_semanas_user ON semanas_estudo(user_id);
CREATE INDEX idx_semanas_plano ON semanas_estudo(plano_id);
CREATE INDEX idx_semanas_data_inicio ON semanas_estudo(data_inicio);
CREATE INDEX idx_semanas_status ON semanas_estudo(status);

-- =====================================================
-- 2. TABELA DE METAS SEMANAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS metas_semana (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semana_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL,    -- 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  data DATE NOT NULL,              -- Data específica do dia
  tipo TEXT NOT NULL,              -- teoria, exercicios, revisao
  tempo_minutos INTEGER NOT NULL,
  topicos_sugeridos TEXT,          -- JSON array de tópicos
  ordem INTEGER DEFAULT 0,         -- Ordem dentro do dia (para múltiplas metas)
  concluida INTEGER DEFAULT 0,
  tempo_real_minutos INTEGER,
  conteudo_gerado INTEGER DEFAULT 0,
  conteudo_id INTEGER,
  observacoes TEXT,                -- Notas do usuário
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (semana_id) REFERENCES semanas_estudo(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
  FOREIGN KEY (conteudo_id) REFERENCES conteudo_estudo(id) ON DELETE SET NULL
);

CREATE INDEX idx_metas_semana_user ON metas_semana(user_id);
CREATE INDEX idx_metas_semana_semana ON metas_semana(semana_id);
CREATE INDEX idx_metas_semana_data ON metas_semana(data);
CREATE INDEX idx_metas_semana_dia ON metas_semana(dia_semana);
CREATE INDEX idx_metas_semana_disciplina ON metas_semana(disciplina_id);
CREATE INDEX idx_metas_semana_concluida ON metas_semana(concluida);

-- =====================================================
-- 3. TRIGGERS PARA ATUALIZAR ESTATÍSTICAS
-- =====================================================

-- Trigger para atualizar contadores da semana quando meta é concluída
CREATE TRIGGER IF NOT EXISTS atualizar_semana_ao_concluir_meta
AFTER UPDATE OF concluida, tempo_real_minutos ON metas_semana
WHEN NEW.concluida = 1 AND OLD.concluida = 0
BEGIN
  UPDATE semanas_estudo 
  SET 
    metas_concluidas = metas_concluidas + 1,
    tempo_estudado_minutos = tempo_estudado_minutos + COALESCE(NEW.tempo_real_minutos, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.semana_id;
END;

-- Trigger para reverter quando meta é desmarcada
CREATE TRIGGER IF NOT EXISTS reverter_semana_ao_desmarcar_meta
AFTER UPDATE OF concluida ON metas_semana
WHEN NEW.concluida = 0 AND OLD.concluida = 1
BEGIN
  UPDATE semanas_estudo 
  SET 
    metas_concluidas = metas_concluidas - 1,
    tempo_estudado_minutos = tempo_estudado_minutos - COALESCE(OLD.tempo_real_minutos, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.semana_id;
END;

-- Trigger para atualizar totais quando meta é adicionada
CREATE TRIGGER IF NOT EXISTS atualizar_totais_ao_adicionar_meta
AFTER INSERT ON metas_semana
BEGIN
  UPDATE semanas_estudo 
  SET 
    metas_totais = metas_totais + 1,
    tempo_total_minutos = tempo_total_minutos + NEW.tempo_minutos,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.semana_id;
END;

-- Trigger para atualizar totais quando meta é removida
CREATE TRIGGER IF NOT EXISTS atualizar_totais_ao_remover_meta
AFTER DELETE ON metas_semana
BEGIN
  UPDATE semanas_estudo 
  SET 
    metas_totais = metas_totais - 1,
    tempo_total_minutos = tempo_total_minutos - OLD.tempo_minutos,
    metas_concluidas = CASE WHEN OLD.concluida = 1 THEN metas_concluidas - 1 ELSE metas_concluidas END,
    tempo_estudado_minutos = tempo_estudado_minutos - COALESCE(OLD.tempo_real_minutos, 0),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.semana_id;
END;

-- =====================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

-- NOTA: O sistema antigo de metas_diarias ainda existe para compatibilidade
-- As novas funcionalidades devem usar semanas_estudo e metas_semana
-- Futuramente, podemos migrar dados antigos ou remover metas_diarias
