-- Corrigir TODOS os editais (não apenas o 6)

-- 1. Criar disciplinas faltantes
INSERT OR IGNORE INTO disciplinas (nome, area, descricao)
SELECT DISTINCT nome, 'edital', 'Disciplina extraída de edital/cronograma'
FROM edital_disciplinas
WHERE disciplina_id IS NULL;

-- 2. Atualizar disciplina_id em TODOS os edital_disciplinas
UPDATE edital_disciplinas
SET disciplina_id = (
  SELECT d.id 
  FROM disciplinas d 
  WHERE LOWER(TRIM(d.nome)) = LOWER(TRIM(edital_disciplinas.nome))
  LIMIT 1
)
WHERE disciplina_id IS NULL;

-- 3. Verificar quantos foram corrigidos por edital
SELECT 
  edital_id,
  COUNT(*) as total_disciplinas,
  COUNT(disciplina_id) as com_id_valido
FROM edital_disciplinas
GROUP BY edital_id
ORDER BY edital_id DESC;
