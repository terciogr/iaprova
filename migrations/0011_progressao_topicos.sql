-- Migration 0011: Adicionar sistema de progressão aos tópicos
-- Data: 2025-12-02
-- Objetivo: Criar estrutura para progressão ordenada de tópicos (básico → intermediário → avançado)

-- Adicionar campo de nível de dificuldade (1=Básico, 2=Intermediário, 3=Avançado)
ALTER TABLE topicos_edital ADD COLUMN nivel_dificuldade INTEGER DEFAULT 1;

-- Adicionar campo de carga horária estimada em minutos
ALTER TABLE topicos_edital ADD COLUMN carga_horaria_estimada INTEGER DEFAULT 30;

-- Criar índice para melhorar performance de queries ordenadas
CREATE INDEX IF NOT EXISTS idx_topicos_ordem ON topicos_edital(disciplina_id, ordem, nivel_dificuldade);

-- Atualizar tópicos existentes com progressão (exemplo: Direito Constitucional)
-- Fundamentos (ordem 1-3, nível 1)
UPDATE topicos_edital SET nivel_dificuldade = 1, ordem = 1 
WHERE nome = 'Princípios Fundamentais da República' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 1, ordem = 2
WHERE nome = 'Direitos e Garantias Fundamentais' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 1, ordem = 3
WHERE nome = 'Nacionalidade e Cidadania' AND disciplina_id = 2;

-- Intermediário (ordem 4-7, nível 2)
UPDATE topicos_edital SET nivel_dificuldade = 2, ordem = 4
WHERE nome = 'Organização do Estado' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 2, ordem = 5
WHERE nome = 'Organização dos Poderes' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 2, ordem = 6
WHERE nome = 'Defesa do Estado e Instituições' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 2, ordem = 7
WHERE nome = 'Sistema Tributário Nacional' AND disciplina_id = 2;

-- Avançado (ordem 8-10, nível 3)
UPDATE topicos_edital SET nivel_dificuldade = 3, ordem = 8
WHERE nome = 'Controle de Constitucionalidade' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 3, ordem = 9
WHERE nome = 'Hermenêutica Constitucional' AND disciplina_id = 2;

UPDATE topicos_edital SET nivel_dificuldade = 3, ordem = 10
WHERE nome = 'Remédios Constitucionais' AND disciplina_id = 2;
