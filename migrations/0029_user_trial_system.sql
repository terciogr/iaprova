-- Adicionar campos para sistema de trial e assinatura
ALTER TABLE users ADD COLUMN trial_started_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN trial_expires_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial'; -- trial, active, expired, cancelled
ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT NULL; -- mensal, anual
ALTER TABLE users ADD COLUMN subscription_expires_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN payment_id TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN payment_date TEXT DEFAULT NULL;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires ON users(subscription_expires_at);
