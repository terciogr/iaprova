-- Adicionar campo nome para gestão de planos
ALTER TABLE planos_estudo ADD COLUMN nome TEXT;

-- Atualizar planos existentes com nome padrão baseado na data
UPDATE planos_estudo 
SET nome = 'Plano ' || strftime('%d/%m/%Y', created_at)
WHERE nome IS NULL;
