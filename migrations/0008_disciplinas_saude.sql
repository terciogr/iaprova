-- ========================================
-- DISCIPLINAS ESPECÍFICAS PARA ÁREA DE SAÚDE
-- ========================================

-- Adicionar disciplinas para concursos de Enfermagem e Saúde
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Enfermagem', 'saude', 'Fundamentos e práticas de enfermagem'),
  ('Saúde Pública', 'saude', 'Políticas de saúde e epidemiologia'),
  ('Legislação do SUS', 'saude', 'Sistema Único de Saúde e normas'),
  ('Ética em Enfermagem', 'saude', 'Código de ética e deontologia'),
  ('Anatomia e Fisiologia', 'saude', 'Estrutura e funcionamento do corpo humano'),
  ('Farmacologia', 'saude', 'Medicamentos e suas aplicações'),
  ('Microbiologia e Imunologia', 'saude', 'Microrganismos e sistema imune'),
  ('Saúde da Mulher', 'saude', 'Obstetrícia e ginecologia'),
  ('Saúde da Criança e do Adolescente', 'saude', 'Pediatria e puericultura'),
  ('Saúde Mental', 'saude', 'Psiquiatria e saúde mental'),
  ('Urgência e Emergência', 'saude', 'Atendimento de emergência'),
  ('Processo de Enfermagem', 'saude', 'SAE - Sistematização da Assistência'),
  ('Biossegurança', 'saude', 'Segurança do paciente e profissional'),
  ('Administração em Enfermagem', 'saude', 'Gestão de serviços de enfermagem');

-- Tópicos para Enfermagem
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES 
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Fundamentos de Enfermagem', 'Fundamentos', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Semiologia e Semiotécnica', 'Fundamentos', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Técnicas de Enfermagem', 'Práticas', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Administração de Medicamentos', 'Práticas', 4, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Curativos e Feridas', 'Práticas', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Controle de Infecção', 'Segurança', 6, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Cuidados de Enfermagem', 'Assistência', 7, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Enfermagem Cirúrgica', 'Especialidades', 8, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Enfermagem Clínica', 'Especialidades', 9, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Enfermagem'), 'Avaliação do Paciente', 'Assistência', 10, 4);

-- Tópicos para Saúde Pública
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'História e Princípios do SUS', 'SUS', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Políticas de Saúde', 'Políticas', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Epidemiologia', 'Epidemiologia', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Indicadores de Saúde', 'Epidemiologia', 4, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Vigilância em Saúde', 'Vigilância', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Atenção Básica', 'Atenção', 6, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Programa Saúde da Família', 'Programas', 7, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Programas de Imunização', 'Programas', 8, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Doenças de Notificação', 'Vigilância', 9, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Saúde Pública'), 'Promoção da Saúde', 'Promoção', 10, 4);

-- Tópicos para Legislação do SUS
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Constituição Federal - Saúde', 'Legislação', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Lei 8.080/90', 'Legislação', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Lei 8.142/90', 'Legislação', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Princípios e Diretrizes do SUS', 'Princípios', 4, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Organização do SUS', 'Organização', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Gestão do SUS', 'Gestão', 6, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Financiamento do SUS', 'Financiamento', 7, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Controle Social', 'Controle', 8, 3),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Redes de Atenção à Saúde', 'Redes', 9, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Legislação do SUS'), 'Pacto pela Saúde', 'Pactos', 10, 3);

-- Tópicos para Ética em Enfermagem
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Código de Ética', 'Ética', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Direitos e Deveres', 'Ética', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Responsabilidade Profissional', 'Responsabilidade', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Sigilo Profissional', 'Ética', 4, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Relações Profissionais', 'Relações', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Bioética', 'Bioética', 6, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'Legislação Profissional', 'Legislação', 7, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Ética em Enfermagem'), 'COFEN e COREN', 'Conselhos', 8, 3);

-- Tópicos para Urgência e Emergência
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Suporte Básico de Vida', 'Atendimento', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Suporte Avançado de Vida', 'Atendimento', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Parada Cardiorrespiratória', 'Emergências', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Trauma', 'Emergências', 4, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Queimaduras', 'Emergências', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Intoxicações', 'Emergências', 6, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Choque', 'Emergências', 7, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Urgência e Emergência'), 'Triagem de Emergência', 'Classificação', 8, 4);

-- Tópicos para Processo de Enfermagem (SAE)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) 
VALUES
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Sistematização da Assistência', 'SAE', 1, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Histórico de Enfermagem', 'SAE', 2, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Diagnóstico de Enfermagem', 'SAE', 3, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Planejamento de Enfermagem', 'SAE', 4, 5),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Implementação', 'SAE', 5, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'Avaliação', 'SAE', 6, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'NANDA', 'Taxonomias', 7, 4),
  ((SELECT id FROM disciplinas WHERE nome = 'Processo de Enfermagem'), 'NIC e NOC', 'Taxonomias', 8, 4);

-- ==================== FIM DA MIGRATION ====================
