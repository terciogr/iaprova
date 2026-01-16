-- Migration: Adicionar campo data_prova em planos_estudo
-- Permite que o usuário informe a data da prova para contagem regressiva

-- Adicionar coluna data_prova para armazenar a data exata da prova
ALTER TABLE planos_estudo ADD COLUMN data_prova DATE DEFAULT NULL;

-- Índice para buscar planos com data de prova definida
CREATE INDEX IF NOT EXISTS idx_planos_data_prova ON planos_estudo(data_prova);
