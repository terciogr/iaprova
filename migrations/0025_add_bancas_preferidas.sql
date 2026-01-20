-- Adicionar campo de bancas preferidas na tabela interviews
ALTER TABLE interviews ADD COLUMN bancas_preferidas TEXT;
-- bancas_preferidas: JSON array de bancas preferidas pelo usuário (ex: ["CESPE/CEBRASPE", "FCC", "FGV"])
