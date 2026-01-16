-- Inserir disciplinas comuns por área

-- Área Fiscal
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Direito Tributário', 'fiscal', 'Impostos, taxas, contribuições e legislação tributária'),
  ('Direito Constitucional', 'fiscal', 'Constituição Federal e princípios constitucionais'),
  ('Direito Administrativo', 'fiscal', 'Organização administrativa e atos administrativos'),
  ('Contabilidade Geral', 'fiscal', 'Princípios contábeis e demonstrações financeiras'),
  ('Contabilidade Pública', 'fiscal', 'Orçamento público e contabilidade governamental'),
  ('Auditoria', 'fiscal', 'Auditoria fiscal e contábil'),
  ('Legislação Tributária', 'fiscal', 'Códigos tributários e legislação específica');

-- Área Policial
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Direito Penal', 'policial', 'Crimes, penas e execução penal'),
  ('Direito Processual Penal', 'policial', 'Processo penal e investigação'),
  ('Direito Constitucional', 'policial', 'Direitos fundamentais e organização do Estado'),
  ('Legislação Especial', 'policial', 'Estatuto do Desarmamento, Lei de Drogas, etc'),
  ('Direitos Humanos', 'policial', 'Tratados e convenções internacionais'),
  ('Raciocínio Lógico', 'policial', 'Lógica matemática e proposições'),
  ('Informática', 'policial', 'Sistemas operacionais, redes e segurança');

-- Área Tribunais
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Direito Constitucional', 'tribunais', 'Organização do Estado e poderes'),
  ('Direito Administrativo', 'tribunais', 'Atos administrativos e licitações'),
  ('Direito Civil', 'tribunais', 'Pessoas, bens, fatos jurídicos e obrigações'),
  ('Direito Processual Civil', 'tribunais', 'Processo civil e procedimentos'),
  ('Direito Penal', 'tribunais', 'Parte geral e especial do Código Penal'),
  ('Direito Processual Penal', 'tribunais', 'Inquérito e processo penal'),
  ('Português', 'tribunais', 'Gramática, interpretação de textos e redação');

-- Área Administrativo
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Direito Administrativo', 'administrativo', 'Princípios e organização administrativa'),
  ('Direito Constitucional', 'administrativo', 'Constituição e administração pública'),
  ('Português', 'administrativo', 'Gramática, interpretação e redação oficial'),
  ('Raciocínio Lógico', 'administrativo', 'Lógica proposicional e quantitativa'),
  ('Informática', 'administrativo', 'Pacote Office, internet e segurança'),
  ('Matemática', 'administrativo', 'Matemática básica e financeira'),
  ('Atualidades', 'administrativo', 'Política, economia e sociedade');

-- Disciplinas gerais (comuns a várias áreas)
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Português', 'geral', 'Língua Portuguesa completa'),
  ('Raciocínio Lógico', 'geral', 'Lógica matemática e analítica'),
  ('Matemática', 'geral', 'Matemática básica e avançada'),
  ('Informática', 'geral', 'Hardware, software, redes e segurança'),
  ('Atualidades', 'geral', 'Eventos nacionais e internacionais'),
  ('Inglês', 'geral', 'Gramática e interpretação de textos'),
  ('Redação', 'geral', 'Redação discursiva e oficial');
