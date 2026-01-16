-- Script para corrigir problemas do banco de dados

-- Limpar dados com datas futuras
DELETE FROM metas_semana WHERE data > date('now');
DELETE FROM semanas_estudo WHERE data_inicio > date('now');

-- Limpar materiais salvos sem referências válidas
DELETE FROM materiais_salvos WHERE user_id NOT IN (SELECT id FROM users);

-- Resetar semanas ativas
UPDATE semanas_estudo SET status = 'concluida' WHERE status = 'ativa';

-- Verificar integridade
PRAGMA integrity_check;