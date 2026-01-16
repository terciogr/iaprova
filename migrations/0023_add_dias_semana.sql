-- Adiciona campo dias_semana na tabela interviews
-- Armazena os dias da semana que o usuário pode estudar (JSON array: [0,1,2,3,4,5,6])
-- 0=Domingo, 1=Segunda, ..., 6=Sábado
ALTER TABLE interviews ADD COLUMN dias_semana TEXT DEFAULT '[1,2,3,4,5]';
