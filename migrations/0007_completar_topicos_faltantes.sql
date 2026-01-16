-- ========================================
-- COMPLETAR TÓPICOS PARA DISCIPLINAS FALTANTES
-- ========================================

-- DIREITO DO TRABALHO (ID: 37) - Já existe com 20 tópicos, renomear para não duplicar
-- Verificar e adicionar caso não existam

-- DIREITO ELEITORAL (ID: 36)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (36, 'Código Eleitoral', 'Legislação', 1, 5),
  (36, 'Lei das Eleições', 'Legislação', 2, 5),
  (36, 'Direitos Políticos', 'Direitos', 3, 4),
  (36, 'Alistamento Eleitoral', 'Alistamento', 4, 4),
  (36, 'Domicílio Eleitoral', 'Alistamento', 5, 3),
  (36, 'Justiça Eleitoral', 'Organização', 6, 4),
  (36, 'Partidos Políticos', 'Partidos', 7, 4),
  (36, 'Convenções Partidárias', 'Partidos', 8, 3),
  (36, 'Registro de Candidaturas', 'Candidaturas', 9, 4),
  (36, 'Inelegibilidades', 'Candidaturas', 10, 5),
  (36, 'Propaganda Eleitoral', 'Propaganda', 11, 4),
  (36, 'Pesquisas Eleitorais', 'Propaganda', 12, 3),
  (36, 'Votação e Apuração', 'Processo', 13, 4),
  (36, 'Recursos Eleitorais', 'Recursos', 14, 4),
  (36, 'Crimes Eleitorais', 'Crimes', 15, 5),
  (36, 'Abuso de Poder', 'Crimes', 16, 4);

-- DIREITO DO TRABALHO (ID: 37)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (37, 'Princípios do Direito do Trabalho', 'Fundamentos', 1, 4),
  (37, 'Fontes do Direito do Trabalho', 'Fundamentos', 2, 3),
  (37, 'CLT - Consolidação', 'Legislação', 3, 5),
  (37, 'Relação de Emprego', 'Contrato', 4, 5),
  (37, 'Contrato de Trabalho', 'Contrato', 5, 5),
  (37, 'Alteração do Contrato', 'Contrato', 6, 4),
  (37, 'Suspensão e Interrupção', 'Contrato', 7, 4),
  (37, 'Terminação do Contrato', 'Contrato', 8, 5),
  (37, 'Jornada de Trabalho', 'Jornada', 9, 5),
  (37, 'Horas Extras', 'Jornada', 10, 4),
  (37, 'Intervalos', 'Jornada', 11, 3),
  (37, 'Repouso Semanal', 'Jornada', 12, 3),
  (37, 'Férias', 'Direitos', 13, 5),
  (37, 'Décimo Terceiro Salário', 'Direitos', 14, 4),
  (37, 'FGTS', 'Direitos', 15, 4),
  (37, 'Aviso Prévio', 'Direitos', 16, 4),
  (37, 'Segurança e Medicina do Trabalho', 'Proteção', 17, 4),
  (37, 'Trabalho da Mulher', 'Proteção', 18, 3),
  (37, 'Trabalho do Menor', 'Proteção', 19, 3),
  (37, 'Estabilidades', 'Garantias', 20, 4);

-- DIREITO PROCESSUAL DO TRABALHO (ID: 38)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (38, 'Princípios do Processo Trabalhista', 'Fundamentos', 1, 4),
  (38, 'Organização da Justiça do Trabalho', 'Organização', 2, 4),
  (38, 'Competência da Justiça do Trabalho', 'Competência', 3, 5),
  (38, 'Partes e Procuradores', 'Sujeitos', 4, 3),
  (38, 'Atos Processuais', 'Atos', 5, 3),
  (38, 'Prazos Processuais', 'Atos', 6, 3),
  (38, 'Procedimento Sumaríssimo', 'Procedimentos', 7, 4),
  (38, 'Procedimento Ordinário', 'Procedimentos', 8, 4),
  (38, 'Audiência Trabalhista', 'Processo', 9, 5),
  (38, 'Provas no Processo do Trabalho', 'Provas', 10, 4),
  (38, 'Sentença Trabalhista', 'Sentença', 11, 4),
  (38, 'Recursos Trabalhistas', 'Recursos', 12, 5),
  (38, 'Execução Trabalhista', 'Execução', 13, 5),
  (38, 'Dissídios Coletivos', 'Dissídios', 14, 3);

-- DIREITO EMPRESARIAL (ID: 39)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (39, 'Conceitos de Empresa e Empresário', 'Fundamentos', 1, 4),
  (39, 'Estabelecimento Empresarial', 'Empresa', 2, 3),
  (39, 'Nome Empresarial', 'Empresa', 3, 3),
  (39, 'Registro de Empresas', 'Empresa', 4, 3),
  (39, 'Sociedades Empresárias', 'Sociedades', 5, 5),
  (39, 'Sociedade Limitada', 'Sociedades', 6, 5),
  (39, 'Sociedade Anônima', 'Sociedades', 7, 5),
  (39, 'Títulos de Crédito', 'Títulos', 8, 4),
  (39, 'Nota Promissória', 'Títulos', 9, 3),
  (39, 'Cheque', 'Títulos', 10, 4),
  (39, 'Duplicata', 'Títulos', 11, 3),
  (39, 'Falência', 'Recuperação', 12, 4),
  (39, 'Recuperação Judicial', 'Recuperação', 13, 4),
  (39, 'Contratos Empresariais', 'Contratos', 14, 3);

-- DIREITO DO CONSUMIDOR (ID: 40)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (40, 'CDC - Código de Defesa do Consumidor', 'Legislação', 1, 5),
  (40, 'Direitos Básicos do Consumidor', 'Direitos', 2, 5),
  (40, 'Qualidade de Produtos e Serviços', 'Produtos', 3, 4),
  (40, 'Responsabilidade pelo Fato do Produto', 'Responsabilidade', 4, 5),
  (40, 'Responsabilidade pelo Vício', 'Responsabilidade', 5, 4),
  (40, 'Decadência e Prescrição', 'Prazos', 6, 3),
  (40, 'Práticas Comerciais', 'Práticas', 7, 4),
  (40, 'Oferta e Publicidade', 'Práticas', 8, 4),
  (40, 'Práticas Abusivas', 'Práticas', 9, 5),
  (40, 'Cobrança de Dívidas', 'Práticas', 10, 4),
  (40, 'Contratos de Consumo', 'Contratos', 11, 4),
  (40, 'Cláusulas Abusivas', 'Contratos', 12, 5),
  (40, 'Proteção Contratual', 'Contratos', 13, 4),
  (40, 'Sanções Administrativas', 'Sanções', 14, 3);

-- DIREITO AMBIENTAL (ID: 41)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (41, 'Princípios do Direito Ambiental', 'Fundamentos', 1, 4),
  (41, 'Meio Ambiente na Constituição', 'Constitucional', 2, 5),
  (41, 'Política Nacional do Meio Ambiente', 'Legislação', 3, 5),
  (41, 'SISNAMA', 'Organização', 4, 3),
  (41, 'Licenciamento Ambiental', 'Instrumentos', 5, 4),
  (41, 'EIA/RIMA', 'Instrumentos', 6, 4),
  (41, 'Responsabilidade Ambiental', 'Responsabilidade', 7, 5),
  (41, 'Dano Ambiental', 'Responsabilidade', 8, 4),
  (41, 'Lei de Crimes Ambientais', 'Crimes', 9, 5),
  (41, 'Crimes contra a Fauna', 'Crimes', 10, 4),
  (41, 'Crimes contra a Flora', 'Crimes', 11, 4),
  (41, 'Áreas de Preservação', 'Proteção', 12, 4),
  (41, 'Código Florestal', 'Legislação', 13, 4);

-- DIREITO PREVIDENCIÁRIO (ID: 42)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (42, 'Seguridade Social', 'Fundamentos', 1, 5),
  (42, 'Princípios da Seguridade', 'Fundamentos', 2, 4),
  (42, 'Regime Geral de Previdência', 'RGPS', 3, 5),
  (42, 'Segurados do RGPS', 'Segurados', 4, 5),
  (42, 'Dependentes', 'Dependentes', 5, 4),
  (42, 'Inscrição e Filiação', 'Filiação', 6, 3),
  (42, 'Salário de Contribuição', 'Custeio', 7, 4),
  (42, 'Contribuições Previdenciárias', 'Custeio', 8, 5),
  (42, 'Aposentadoria por Idade', 'Benefícios', 9, 5),
  (42, 'Aposentadoria por Tempo de Contribuição', 'Benefícios', 10, 5),
  (42, 'Aposentadoria por Invalidez', 'Benefícios', 11, 4),
  (42, 'Auxílio-Doença', 'Benefícios', 12, 4),
  (42, 'Pensão por Morte', 'Benefícios', 13, 4),
  (42, 'Auxílio-Acidente', 'Benefícios', 14, 3),
  (42, 'Salário-Maternidade', 'Benefícios', 15, 4);

-- DIREITO INTERNACIONAL (ID: 43)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (43, 'Fontes do Direito Internacional', 'Fundamentos', 1, 4),
  (43, 'Sujeitos de Direito Internacional', 'Sujeitos', 2, 4),
  (43, 'Tratados Internacionais', 'Tratados', 3, 5),
  (43, 'Incorporação de Tratados', 'Tratados', 4, 4),
  (43, 'Conflito entre Normas', 'Tratados', 5, 4),
  (43, 'Responsabilidade Internacional', 'Responsabilidade', 6, 4),
  (43, 'ONU - Organização das Nações Unidas', 'Organizações', 7, 4),
  (43, 'Conselho de Segurança', 'ONU', 8, 3),
  (43, 'Corte Internacional de Justiça', 'ONU', 9, 3),
  (43, 'Direitos Humanos Internacionais', 'Direitos', 10, 5),
  (43, 'Direito Humanitário', 'Direitos', 11, 3),
  (43, 'Solução de Controvérsias', 'Controvérsias', 12, 4);

-- AUDITORIA (ID: 6)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (6, 'Conceitos e Objetivos da Auditoria', 'Fundamentos', 1, 4),
  (6, 'Normas de Auditoria', 'Normas', 2, 5),
  (6, 'Auditoria Independente', 'Tipos', 3, 4),
  (6, 'Auditoria Interna', 'Tipos', 4, 4),
  (6, 'Auditoria Governamental', 'Tipos', 5, 4),
  (6, 'Planejamento de Auditoria', 'Procedimentos', 6, 5),
  (6, 'Materialidade e Relevância', 'Procedimentos', 7, 4),
  (6, 'Risco de Auditoria', 'Procedimentos', 8, 5),
  (6, 'Procedimentos de Auditoria', 'Procedimentos', 9, 5),
  (6, 'Testes Substantivos', 'Testes', 10, 4),
  (6, 'Testes de Controle', 'Testes', 11, 4),
  (6, 'Evidências de Auditoria', 'Evidências', 12, 5),
  (6, 'Amostragem em Auditoria', 'Técnicas', 13, 3),
  (6, 'Relatório de Auditoria', 'Relatórios', 14, 5),
  (6, 'Parecer do Auditor', 'Relatórios', 15, 5);

-- LEGISLAÇÃO TRIBUTÁRIA (ID: 7)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (7, 'CTN - Código Tributário Nacional', 'Legislação', 1, 5),
  (7, 'Legislação Tributária', 'Fontes', 2, 4),
  (7, 'Vigência da Legislação Tributária', 'Aplicação', 3, 4),
  (7, 'Aplicação da Legislação Tributária', 'Aplicação', 4, 4),
  (7, 'Interpretação da Legislação', 'Aplicação', 5, 4),
  (7, 'ICMS - Imposto sobre Circulação', 'Impostos Estaduais', 6, 5),
  (7, 'IPVA - Imposto sobre Veículos', 'Impostos Estaduais', 7, 3),
  (7, 'ITCMD - Imposto sobre Transmissão', 'Impostos Estaduais', 8, 3),
  (7, 'ISS - Imposto sobre Serviços', 'Impostos Municipais', 9, 5),
  (7, 'IPTU - Imposto Predial', 'Impostos Municipais', 10, 4),
  (7, 'ITBI - Imposto sobre Transmissão', 'Impostos Municipais', 11, 3),
  (7, 'Processo Administrativo Tributário', 'Processo', 12, 4);

-- ECONOMIA (ID: 51)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (51, 'Conceitos Fundamentais', 'Introdução', 1, 3),
  (51, 'Problemas Econômicos', 'Introdução', 2, 3),
  (51, 'Sistemas Econômicos', 'Introdução', 3, 3),
  (51, 'Microeconomia', 'Micro', 4, 4),
  (51, 'Teoria do Consumidor', 'Micro', 5, 4),
  (51, 'Teoria da Produção', 'Micro', 6, 4),
  (51, 'Estruturas de Mercado', 'Micro', 7, 5),
  (51, 'Falhas de Mercado', 'Micro', 8, 4),
  (51, 'Macroeconomia', 'Macro', 9, 4),
  (51, 'Agregados Macroeconômicos', 'Macro', 10, 5),
  (51, 'PIB e Renda Nacional', 'Macro', 11, 5),
  (51, 'Inflação', 'Macro', 12, 5),
  (51, 'Desemprego', 'Macro', 13, 4),
  (51, 'Política Monetária', 'Política', 14, 5),
  (51, 'Política Fiscal', 'Política', 15, 5),
  (51, 'Balanço de Pagamentos', 'Internacional', 16, 4),
  (51, 'Taxa de Câmbio', 'Internacional', 17, 4);

-- INGLÊS (ID: 34)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (34, 'Verb Tenses - Present', 'Grammar', 1, 5),
  (34, 'Verb Tenses - Past', 'Grammar', 2, 5),
  (34, 'Verb Tenses - Future', 'Grammar', 3, 4),
  (34, 'Modal Verbs', 'Grammar', 4, 4),
  (34, 'Conditional Sentences', 'Grammar', 5, 4),
  (34, 'Passive Voice', 'Grammar', 6, 4),
  (34, 'Reported Speech', 'Grammar', 7, 3),
  (34, 'Relative Clauses', 'Grammar', 8, 3),
  (34, 'Reading Comprehension', 'Reading', 9, 5),
  (34, 'Text Interpretation', 'Reading', 10, 5),
  (34, 'Vocabulary', 'Vocabulary', 11, 4),
  (34, 'Phrasal Verbs', 'Vocabulary', 12, 4),
  (34, 'Idioms and Expressions', 'Vocabulary', 13, 3),
  (34, 'False Cognates', 'Vocabulary', 14, 3);

-- REDAÇÃO (ID: 35)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (35, 'Estrutura Textual', 'Estrutura', 1, 5),
  (35, 'Dissertação Argumentativa', 'Tipos', 2, 5),
  (35, 'Dissertação Expositiva', 'Tipos', 3, 4),
  (35, 'Tese e Argumentação', 'Argumentação', 4, 5),
  (35, 'Tipos de Argumento', 'Argumentação', 5, 4),
  (35, 'Introdução', 'Partes', 6, 4),
  (35, 'Desenvolvimento', 'Partes', 7, 5),
  (35, 'Conclusão', 'Partes', 8, 4),
  (35, 'Coesão Textual', 'Coesão', 9, 5),
  (35, 'Conectivos', 'Coesão', 10, 4),
  (35, 'Coerência Textual', 'Coerência', 11, 5),
  (35, 'Padrão Culto da Língua', 'Linguagem', 12, 4),
  (35, 'Impessoalidade', 'Características', 13, 3),
  (35, 'Objetividade', 'Características', 14, 3),
  (35, 'Proposta de Intervenção', 'Competências', 15, 4);

-- ADMINISTRAÇÃO PÚBLICA (ID: 54)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (54, 'Estado e Administração Pública', 'Fundamentos', 1, 4),
  (54, 'Modelos de Administração Pública', 'Modelos', 2, 4),
  (54, 'Patrimonialismo', 'Modelos', 3, 3),
  (54, 'Burocracia', 'Modelos', 4, 3),
  (54, 'Gerencialismo', 'Modelos', 5, 4),
  (54, 'Governo Digital', 'Governo', 6, 3),
  (54, 'Governança Pública', 'Governança', 7, 5),
  (54, 'Governabilidade', 'Governança', 8, 3),
  (54, 'Accountability', 'Governança', 9, 4),
  (54, 'Transparência Pública', 'Governança', 10, 4),
  (54, 'Participação Social', 'Governança', 11, 3),
  (54, 'Excelência na Gestão', 'Qualidade', 12, 4),
  (54, 'Programa Nacional de Gestão', 'Qualidade', 13, 3);

-- ==================== FIM DA MIGRATION ====================
