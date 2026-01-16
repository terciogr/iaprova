-- Adicionar campo cargo na tabela interviews
ALTER TABLE interviews ADD COLUMN cargo TEXT;

-- Adicionar campos de contexto nas tabelas relevantes
ALTER TABLE planos_estudo ADD COLUMN contexto_concurso TEXT; -- JSON com info do concurso/cargo
