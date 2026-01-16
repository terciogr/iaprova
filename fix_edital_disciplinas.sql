-- Script para popular disciplina_id em edital_disciplinas

-- Primeiro, criar as disciplinas que não existem
INSERT OR IGNORE INTO disciplinas (nome, area, descricao)
SELECT DISTINCT nome, 'edital', 'Disciplina extraída de edital/cronograma'
FROM edital_disciplinas
WHERE disciplina_id IS NULL;

-- Depois, atualizar os disciplina_id
UPDATE edital_disciplinas
SET disciplina_id = (
  SELECT d.id 
  FROM disciplinas d 
  WHERE LOWER(TRIM(d.nome)) = LOWER(TRIM(edital_disciplinas.nome))
  LIMIT 1
)
WHERE disciplina_id IS NULL;

-- Verificar resultados
SELECT COUNT(*) as total, COUNT(disciplina_id) as com_id 
FROM edital_disciplinas;
