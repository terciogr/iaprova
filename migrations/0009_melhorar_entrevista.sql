-- Migration: Melhorar campos da entrevista
-- Data: 2024-12-02
-- Descrição: Substituir 'reprovacoes' por 'concursos_prestados' e adicionar 'experiencias_detalhadas'

-- Adicionar novas colunas
ALTER TABLE interviews ADD COLUMN concursos_prestados INTEGER DEFAULT 0;
ALTER TABLE interviews ADD COLUMN experiencias_detalhadas TEXT;

-- Migrar dados existentes: reprovacoes -> concursos_prestados
UPDATE interviews SET concursos_prestados = reprovacoes WHERE concursos_prestados = 0;

-- Nota: Manter coluna 'reprovacoes' por compatibilidade com código existente
-- Será removida em versão futura após migração completa
