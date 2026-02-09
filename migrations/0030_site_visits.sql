-- Tabela para registrar visitas ao site
CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  page_path TEXT DEFAULT '/',
  referrer TEXT,
  country TEXT,
  city TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_visits_ip ON site_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_visits_date ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_user ON site_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_page ON site_visits(page_path);

-- Tabela para estatísticas agregadas diárias (performance)
CREATE TABLE IF NOT EXISTS visit_stats_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_date DATE NOT NULL UNIQUE,
  total_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visit_stats_date ON visit_stats_daily(visit_date);
