-- Tabela para registro de emails enviados
DROP TABLE IF EXISTS email_logs;
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para planos de pagamento (estrutura futura)
DROP TABLE IF EXISTS payment_plans;
CREATE TABLE payment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  duration_days INTEGER DEFAULT 30,
  features TEXT,
  is_active INTEGER DEFAULT 1
);

-- Tabela para assinaturas dos usuários
DROP TABLE IF EXISTS user_subscriptions;
CREATE TABLE user_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  amount_paid REAL,
  starts_at DATETIME,
  expires_at DATETIME
);

-- Inserir planos padrão
INSERT INTO payment_plans (id, name, description, price, duration_days, features, is_active) VALUES
(1, 'Gratuito', 'Acesso básico ao sistema', 0, 0, '{"metas_semana": 7, "ia_geracao": 5, "simulados": 1}', 1);
INSERT INTO payment_plans (id, name, description, price, duration_days, features, is_active) VALUES
(2, 'Premium Mensal', 'Acesso completo por 30 dias', 29.90, 30, '{"metas_semana": "ilimitado", "ia_geracao": "ilimitado", "simulados": "ilimitado", "suporte_prioritario": true}', 1);
INSERT INTO payment_plans (id, name, description, price, duration_days, features, is_active) VALUES
(3, 'Premium Trimestral', 'Acesso completo por 90 dias', 79.90, 90, '{"metas_semana": "ilimitado", "ia_geracao": "ilimitado", "simulados": "ilimitado", "suporte_prioritario": true, "desconto": "11%"}', 1);
INSERT INTO payment_plans (id, name, description, price, duration_days, features, is_active) VALUES
(4, 'Premium Anual', 'Acesso completo por 365 dias', 249.90, 365, '{"metas_semana": "ilimitado", "ia_geracao": "ilimitado", "simulados": "ilimitado", "suporte_prioritario": true, "desconto": "30%"}', 1);
