-- =====================================================
-- MIGRAÇÃO: Vincular tópicos e progresso ao PLANO (não apenas usuário)
-- 
-- PROBLEMA: Quando um usuário tem múltiplos planos com a mesma disciplina,
-- os tópicos são duplicados e o progresso é compartilhado indevidamente.
--
-- SOLUÇÃO: Adicionar plano_id para isolar dados por plano de estudo.
-- =====================================================

-- 1. Adicionar plano_id na tabela topicos_edital
ALTER TABLE topicos_edital ADD COLUMN plano_id INTEGER REFERENCES planos_estudo(id);

-- 2. Criar índice para buscas por plano
CREATE INDEX IF NOT EXISTS idx_topicos_edital_plano ON topicos_edital(plano_id);

-- 3. Criar índice composto para evitar duplicatas por plano+disciplina+nome
CREATE UNIQUE INDEX IF NOT EXISTS idx_topicos_unique_plano 
ON topicos_edital(plano_id, disciplina_id, nome) WHERE plano_id IS NOT NULL;

-- 4. Adicionar plano_id na tabela user_topicos_progresso
ALTER TABLE user_topicos_progresso ADD COLUMN plano_id INTEGER REFERENCES planos_estudo(id);

-- 5. Criar índice para buscas de progresso por plano
CREATE INDEX IF NOT EXISTS idx_user_topicos_progresso_plano ON user_topicos_progresso(plano_id);

-- 6. Criar índice composto para unicidade de progresso por plano+usuário+tópico
CREATE UNIQUE INDEX IF NOT EXISTS idx_progresso_unique_plano 
ON user_topicos_progresso(plano_id, user_id, topico_id) WHERE plano_id IS NOT NULL;

-- =====================================================
-- NOTA: Dados existentes terão plano_id = NULL
-- O backend deve ser atualizado para:
-- 1. Sempre inserir tópicos com plano_id
-- 2. Filtrar por plano_id nas consultas
-- 3. Rastrear progresso por plano, não apenas por usuário
-- =====================================================
