-- Adicionar campo de desconto percentual aos planos de pagamento
ALTER TABLE payment_plans ADD COLUMN discount_percent REAL DEFAULT 0;
-- Adicionar campo de ordem para exibição
ALTER TABLE payment_plans ADD COLUMN display_order INTEGER DEFAULT 0;
-- Adicionar campo para destaque (plano mais popular)
ALTER TABLE payment_plans ADD COLUMN is_featured INTEGER DEFAULT 0;
