-- Script para corrigir disciplinas com disciplina_id NULL
-- Esse script mapeia disciplinas do edital para disciplinas existentes ou cria novas

-- 1. Listar disciplinas com disciplina_id NULL
SELECT id, edital_id, nome, 'NULL disciplina_id' as problema
FROM edital_disciplinas
WHERE disciplina_id IS NULL;

-- 2. Para cada disciplina comum, atualizar com ID correto
UPDATE edital_disciplinas 
SET disciplina_id = (SELECT id FROM disciplinas WHERE nome = 'Sistema Único de Saúde (SUS)' LIMIT 1)
WHERE nome = 'Sistema Único de Saúde (SUS)' AND disciplina_id IS NULL;

UPDATE edital_disciplinas 
SET disciplina_id = (SELECT id FROM disciplinas WHERE nome = 'Língua Portuguesa' LIMIT 1)
WHERE nome = 'Língua Portuguesa' AND disciplina_id IS NULL;

UPDATE edital_disciplinas 
SET disciplina_id = (SELECT id FROM disciplinas WHERE nome LIKE '%Raciocínio Lógico%' LIMIT 1)
WHERE nome = 'Raciocínio Lógico-Matemático' AND disciplina_id IS NULL;

UPDATE edital_disciplinas 
SET disciplina_id = (SELECT id FROM disciplinas WHERE nome LIKE '%Enfermagem%' LIMIT 1)
WHERE nome = 'Enfermagem (Conhecimentos Específicos)' AND disciplina_id IS NULL;

-- 3. Para disciplinas não encontradas, criar novas na tabela disciplinas
INSERT OR IGNORE INTO disciplinas (nome, area, descricao)
SELECT DISTINCT nome, 'geral', 'Disciplina importada do edital'
FROM edital_disciplinas
WHERE disciplina_id IS NULL
AND nome NOT IN (SELECT nome FROM disciplinas);

-- 4. Atualizar edital_disciplinas com os IDs recém-criados
UPDATE edital_disciplinas
SET disciplina_id = (SELECT id FROM disciplinas WHERE disciplinas.nome = edital_disciplinas.nome LIMIT 1)
WHERE disciplina_id IS NULL;

-- 5. Verificar se corrigiu tudo
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Todas as disciplinas têm disciplina_id válido'
    ELSE '❌ Ainda há ' || COUNT(*) || ' disciplinas com disciplina_id NULL'
  END as resultado
FROM edital_disciplinas
WHERE disciplina_id IS NULL;
