-- Script para resetar e corrigir o banco de dados

-- Limpar dados problemáticos
DELETE FROM materiais_salvos WHERE disciplina_id IS NULL AND topico_id IS NULL;
DELETE FROM metas_semana WHERE data > date('now');
DELETE FROM semanas_estudo WHERE data_inicio > date('now');

-- Atualizar estrutura das tabelas se necessário
-- Remover constraint de foreign key temporariamente
PRAGMA foreign_keys = OFF;

-- Recriar tabela materiais_salvos com campos opcionais
DROP TABLE IF EXISTS materiais_salvos_temp;
CREATE TABLE materiais_salvos_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  disciplina_id INTEGER,
  topico_id INTEGER,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  meta_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
  FOREIGN KEY (topico_id) REFERENCES topicos_edital(id),
  FOREIGN KEY (meta_id) REFERENCES metas_semana(id)
);

-- Copiar dados válidos
INSERT INTO materiais_salvos_temp 
SELECT * FROM materiais_salvos 
WHERE user_id IS NOT NULL AND tipo IS NOT NULL;

-- Renomear tabelas
DROP TABLE IF EXISTS materiais_salvos;
ALTER TABLE materiais_salvos_temp RENAME TO materiais_salvos;

-- Reativar foreign keys
PRAGMA foreign_keys = ON;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_materiais_user ON materiais_salvos(user_id);
CREATE INDEX IF NOT EXISTS idx_materiais_meta ON materiais_salvos(meta_id);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON materiais_salvos(tipo);

-- Verificar integridade
PRAGMA integrity_check;