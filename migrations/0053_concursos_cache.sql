-- Cache diário de concursos públicos (evita múltiplas requisições à API externa)
CREATE TABLE IF NOT EXISTS concursos_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_date TEXT NOT NULL,
  data_json TEXT NOT NULL,
  total_abertos INTEGER DEFAULT 0,
  total_previstos INTEGER DEFAULT 0,
  total_ufs INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_concursos_cache_date ON concursos_cache(cache_date);
