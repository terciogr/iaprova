-- Migration 0010: Reorganizar disciplinas básicas que aparecem em todos os concursos
-- Data: 2025-12-02
-- Objetivo: Criar categoria "basico" para disciplinas universais (Português, RL, Informática)

-- Atualizar disciplinas que aparecem em TODOS os concursos para área "basico"
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Português';
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Raciocínio Lógico';
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Informática';

-- Nota: Disciplinas já em 'geral' permanecem (Redação, Inglês, Ética e Conduta, RJU)
-- Essas são comuns mas não universais como as básicas
