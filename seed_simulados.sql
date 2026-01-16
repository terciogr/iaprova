-- Dados de teste para simulados (últimas 4 semanas)
INSERT INTO simulados_historico (user_id, disciplinas, topicos, total_questoes, acertos, percentual_acerto, tempo_gasto, data_realizacao) VALUES
(1, '["SUS", "Direito Constitucional"]', '[]', 20, 12, 60, '45min', datetime('now', '-28 days')),
(1, '["SUS", "Direito Constitucional"]', '[]', 20, 14, 70, '42min', datetime('now', '-26 days')),
(1, '["SUS", "Direito Administrativo"]', '[]', 25, 16, 64, '50min', datetime('now', '-21 days')),
(1, '["Direito Constitucional"]', '[]', 15, 12, 80, '35min', datetime('now', '-19 days')),
(1, '["SUS"]', '[]', 20, 15, 75, '40min', datetime('now', '-14 days')),
(1, '["Direito Administrativo"]', '[]', 20, 16, 80, '38min', datetime('now', '-12 days')),
(1, '["SUS", "Direito Constitucional", "Direito Administrativo"]', '[]', 30, 22, 73, '55min', datetime('now', '-7 days')),
(1, '["SUS"]', '[]', 20, 17, 85, '36min', datetime('now', '-5 days')),
(1, '["Direito Constitucional", "Direito Administrativo"]', '[]', 25, 20, 80, '48min', datetime('now', '-3 days')),
(1, '["SUS", "Direito Constitucional"]', '[]', 20, 18, 90, '40min', datetime('now', '-1 days'));
