-- ========================================
-- EXPANSÃO COMPLETA DE DISCIPLINAS E TÓPICOS
-- Mais de 30 disciplinas com tópicos variados
-- ========================================

-- ==================== NOVAS DISCIPLINAS ====================

-- Área Jurídica
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Direito Eleitoral', 'juridica', 'Código Eleitoral, Justiça Eleitoral e crimes eleitorais'),
  ('Direito do Trabalho', 'juridica', 'CLT, contratos de trabalho e direitos trabalhistas'),
  ('Direito Processual do Trabalho', 'juridica', 'Processo trabalhista e dissídios'),
  ('Direito Empresarial', 'juridica', 'Sociedades, títulos de crédito e falência'),
  ('Direito do Consumidor', 'juridica', 'CDC e relações de consumo'),
  ('Direito Ambiental', 'juridica', 'Legislação ambiental e crimes ambientais'),
  ('Direito Previdenciário', 'juridica', 'Regime Geral e benefícios previdenciários'),
  ('Direito Internacional', 'juridica', 'Tratados internacionais e direito comunitário'),
  ('Direito Financeiro', 'juridica', 'Orçamento público e Lei de Responsabilidade Fiscal'),
  ('Direitos Difusos e Coletivos', 'juridica', 'Ação civil pública e tutela coletiva');

-- Área Contábil/Financeira
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Análise de Balanços', 'contabil', 'Análise horizontal, vertical e indicadores'),
  ('Custos', 'contabil', 'Contabilidade de custos e gestão'),
  ('Orçamento Público', 'contabil', 'PPA, LDO, LOA e execução orçamentária'),
  ('Administração Financeira', 'contabil', 'Gestão financeira e orçamentária'),
  ('Matemática Financeira', 'contabil', 'Juros, descontos, amortização e capitalização'),
  ('Economia', 'contabil', 'Micro e macroeconomia'),
  ('Estatística', 'contabil', 'Estatística descritiva e inferencial');

-- Área de Gestão
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Administração Geral', 'gestao', 'Teorias administrativas e gestão'),
  ('Administração Pública', 'gestao', 'Gestão pública e reforma do Estado'),
  ('Gestão de Pessoas', 'gestao', 'RH, motivação e liderança'),
  ('Gestão de Projetos', 'gestao', 'PMBOK e metodologias ágeis'),
  ('Arquivologia', 'gestao', 'Gestão documental e arquivos'),
  ('Logística', 'gestao', 'Gestão da cadeia de suprimentos');

-- Área de Tecnologia
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Sistemas Operacionais', 'tecnologia', 'Windows, Linux e fundamentos'),
  ('Redes de Computadores', 'tecnologia', 'Protocolos, topologias e segurança'),
  ('Banco de Dados', 'tecnologia', 'SQL, modelagem e administração'),
  ('Segurança da Informação', 'tecnologia', 'Criptografia, vulnerabilidades e normas'),
  ('Desenvolvimento de Software', 'tecnologia', 'Programação e engenharia de software'),
  ('Governança de TI', 'tecnologia', 'COBIT, ITIL e gerenciamento de serviços');

-- Disciplinas Específicas
INSERT OR IGNORE INTO disciplinas (nome, area, descricao) VALUES 
  ('Geografia', 'especifica', 'Geografia física, humana e do Brasil'),
  ('História do Brasil', 'especifica', 'História colonial, imperial e republicana'),
  ('Filosofia', 'especifica', 'História da filosofia e ética'),
  ('Sociologia', 'especifica', 'Teorias sociológicas e sociedade brasileira'),
  ('Física', 'especifica', 'Mecânica, termodinâmica e eletromagnetismo'),
  ('Química', 'especifica', 'Química geral, orgânica e inorgânica'),
  ('Biologia', 'especifica', 'Citologia, genética e ecologia'),
  ('Conhecimentos Pedagógicos', 'educacao', 'Didática, currículo e avaliação'),
  ('Legislação Educacional', 'educacao', 'LDB, ECA e políticas educacionais'),
  ('Ética e Conduta', 'geral', 'Ética profissional e no serviço público'),
  ('Regime Jurídico Único', 'geral', 'Lei 8.112/90 e estatutos');

-- ==================== TÓPICOS PARA CADA DISCIPLINA ====================

-- DIREITO PENAL (ID: 8)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (8, 'Aplicação da Lei Penal', 'Parte Geral', 1, 4),
  (8, 'Crime e seus Elementos', 'Parte Geral', 2, 5),
  (8, 'Dolo e Culpa', 'Parte Geral', 3, 4),
  (8, 'Erro de Tipo e Erro de Proibição', 'Parte Geral', 4, 3),
  (8, 'Ilicitude e Causas de Exclusão', 'Parte Geral', 5, 4),
  (8, 'Culpabilidade', 'Parte Geral', 6, 4),
  (8, 'Tentativa e Consumação', 'Parte Geral', 7, 4),
  (8, 'Concurso de Pessoas', 'Parte Geral', 8, 4),
  (8, 'Penas e suas Espécies', 'Parte Geral', 9, 4),
  (8, 'Aplicação da Pena', 'Parte Geral', 10, 5),
  (8, 'Suspensão Condicional da Pena', 'Penas', 11, 3),
  (8, 'Livramento Condicional', 'Penas', 12, 3),
  (8, 'Efeitos da Condenação', 'Penas', 13, 3),
  (8, 'Reabilitação', 'Penas', 14, 2),
  (8, 'Crimes contra a Vida', 'Parte Especial', 15, 5),
  (8, 'Crimes contra o Patrimônio', 'Parte Especial', 16, 5),
  (8, 'Crimes contra a Dignidade Sexual', 'Parte Especial', 17, 4),
  (8, 'Crimes contra a Administração Pública', 'Parte Especial', 18, 5),
  (8, 'Crimes de Trânsito', 'Legislação Especial', 19, 3),
  (8, 'Lei de Drogas', 'Legislação Especial', 20, 4);

-- DIREITO PROCESSUAL PENAL (ID: 9)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (9, 'Princípios do Processo Penal', 'Parte Geral', 1, 5),
  (9, 'Inquérito Policial', 'Investigação', 2, 4),
  (9, 'Ação Penal Pública e Privada', 'Ação Penal', 3, 5),
  (9, 'Competência Criminal', 'Competência', 4, 4),
  (9, 'Questões e Processos Incidentes', 'Processo', 5, 3),
  (9, 'Provas em Espécie', 'Provas', 6, 5),
  (9, 'Prisão em Flagrante', 'Prisão', 7, 4),
  (9, 'Prisão Preventiva', 'Prisão', 8, 4),
  (9, 'Prisão Temporária', 'Prisão', 9, 3),
  (9, 'Liberdade Provisória', 'Prisão', 10, 4),
  (9, 'Citação e Intimações', 'Atos Processuais', 11, 3),
  (9, 'Procedimento Comum', 'Procedimentos', 12, 5),
  (9, 'Júri Popular', 'Procedimentos', 13, 5),
  (9, 'Recursos em Geral', 'Recursos', 14, 4),
  (9, 'Habeas Corpus', 'Ações', 15, 5),
  (9, 'Revisão Criminal', 'Ações', 16, 3),
  (9, 'Execução Penal', 'Execução', 17, 4),
  (9, 'Juizados Especiais Criminais', 'Procedimentos', 18, 4);

-- DIREITO CIVIL (ID: 17)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (17, 'Lei de Introdução às Normas', 'Parte Geral', 1, 3),
  (17, 'Pessoas Naturais', 'Pessoas', 2, 4),
  (17, 'Pessoas Jurídicas', 'Pessoas', 3, 4),
  (17, 'Domicílio', 'Pessoas', 4, 2),
  (17, 'Bens Públicos e Particulares', 'Bens', 5, 3),
  (17, 'Fatos Jurídicos', 'Fatos Jurídicos', 6, 4),
  (17, 'Negócio Jurídico', 'Fatos Jurídicos', 7, 5),
  (17, 'Atos Ilícitos', 'Fatos Jurídicos', 8, 4),
  (17, 'Prescrição e Decadência', 'Fatos Jurídicos', 9, 5),
  (17, 'Obrigações e suas Modalidades', 'Obrigações', 10, 5),
  (17, 'Transmissão das Obrigações', 'Obrigações', 11, 3),
  (17, 'Adimplemento e Extinção', 'Obrigações', 12, 4),
  (17, 'Inadimplemento', 'Obrigações', 13, 4),
  (17, 'Contratos em Espécie', 'Contratos', 14, 5),
  (17, 'Responsabilidade Civil', 'Responsabilidade', 15, 5),
  (17, 'Posse', 'Direitos Reais', 16, 4),
  (17, 'Propriedade', 'Direitos Reais', 17, 5),
  (17, 'Direitos Reais sobre Coisa Alheia', 'Direitos Reais', 18, 3),
  (17, 'Direito de Família', 'Família', 19, 4),
  (17, 'Direito das Sucessões', 'Sucessões', 20, 4);

-- DIREITO PROCESSUAL CIVIL (ID: 18)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (18, 'Normas Processuais Civis', 'Parte Geral', 1, 3),
  (18, 'Jurisdição e Competência', 'Jurisdição', 2, 5),
  (18, 'Partes e Procuradores', 'Sujeitos', 3, 4),
  (18, 'Litisconsórcio e Assistência', 'Sujeitos', 4, 4),
  (18, 'Intervenção de Terceiros', 'Sujeitos', 5, 4),
  (18, 'Atos Processuais', 'Atos', 6, 4),
  (18, 'Prazos Processuais', 'Atos', 7, 3),
  (18, 'Tutela Provisória', 'Tutelas', 8, 5),
  (18, 'Formação do Processo', 'Processo', 9, 4),
  (18, 'Petição Inicial', 'Processo', 10, 5),
  (18, 'Resposta do Réu', 'Processo', 11, 5),
  (18, 'Revelia', 'Processo', 12, 3),
  (18, 'Provas', 'Provas', 13, 5),
  (18, 'Sentença', 'Sentença', 14, 5),
  (18, 'Coisa Julgada', 'Sentença', 15, 4),
  (18, 'Recursos em Geral', 'Recursos', 16, 5),
  (18, 'Apelação', 'Recursos', 17, 4),
  (18, 'Agravo de Instrumento', 'Recursos', 18, 4),
  (18, 'Embargos de Declaração', 'Recursos', 19, 3),
  (18, 'Recursos Especial e Extraordinário', 'Recursos', 20, 4),
  (18, 'Cumprimento de Sentença', 'Execução', 21, 5),
  (18, 'Execução de Título Extrajudicial', 'Execução', 22, 4),
  (18, 'Procedimentos Especiais', 'Procedimentos', 23, 3);

-- PORTUGUÊS (ID: 21)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (21, 'Ortografia Oficial', 'Gramática', 1, 3),
  (21, 'Acentuação Gráfica', 'Gramática', 2, 4),
  (21, 'Classes de Palavras', 'Gramática', 3, 5),
  (21, 'Estrutura e Formação de Palavras', 'Gramática', 4, 3),
  (21, 'Sintaxe da Oração', 'Sintaxe', 5, 5),
  (21, 'Sintaxe do Período', 'Sintaxe', 6, 5),
  (21, 'Concordância Verbal', 'Sintaxe', 7, 5),
  (21, 'Concordância Nominal', 'Sintaxe', 8, 4),
  (21, 'Regência Verbal', 'Sintaxe', 9, 5),
  (21, 'Regência Nominal', 'Sintaxe', 10, 4),
  (21, 'Crase', 'Sintaxe', 11, 5),
  (21, 'Pontuação', 'Gramática', 12, 5),
  (21, 'Semântica', 'Semântica', 13, 4),
  (21, 'Figuras de Linguagem', 'Estilística', 14, 3),
  (21, 'Funções da Linguagem', 'Linguística', 15, 3),
  (21, 'Compreensão Textual', 'Interpretação', 16, 5),
  (21, 'Interpretação de Textos', 'Interpretação', 17, 5),
  (21, 'Tipos e Gêneros Textuais', 'Interpretação', 18, 4),
  (21, 'Coesão e Coerência', 'Interpretação', 19, 4),
  (21, 'Redação Oficial', 'Redação', 20, 4);

-- RACIOCÍNIO LÓGICO (ID: 13)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (13, 'Estruturas Lógicas', 'Lógica', 1, 5),
  (13, 'Lógica de Argumentação', 'Lógica', 2, 4),
  (13, 'Proposições Simples e Compostas', 'Lógica Proposicional', 3, 5),
  (13, 'Conectivos Lógicos', 'Lógica Proposicional', 4, 5),
  (13, 'Tabela-Verdade', 'Lógica Proposicional', 5, 5),
  (13, 'Equivalências Lógicas', 'Lógica Proposicional', 6, 5),
  (13, 'Negação de Proposições', 'Lógica Proposicional', 7, 5),
  (13, 'Implicação Lógica', 'Lógica Proposicional', 8, 4),
  (13, 'Lógica de Primeira Ordem', 'Lógica', 9, 3),
  (13, 'Diagramas Lógicos', 'Lógica', 10, 4),
  (13, 'Sequências Numéricas', 'Raciocínio Quantitativo', 11, 4),
  (13, 'Sequências de Letras e Símbolos', 'Raciocínio Quantitativo', 12, 3),
  (13, 'Análise Combinatória', 'Raciocínio Quantitativo', 13, 4),
  (13, 'Probabilidade', 'Raciocínio Quantitativo', 14, 4),
  (13, 'Verdades e Mentiras', 'Problemas', 15, 3);

-- INFORMÁTICA (ID: 14)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (14, 'Conceitos de Hardware', 'Hardware', 1, 3),
  (14, 'Periféricos e Componentes', 'Hardware', 2, 2),
  (14, 'Windows 10 e 11', 'Sistemas Operacionais', 3, 4),
  (14, 'Linux Básico', 'Sistemas Operacionais', 4, 3),
  (14, 'Microsoft Word', 'Office', 5, 4),
  (14, 'Microsoft Excel', 'Office', 6, 5),
  (14, 'Microsoft PowerPoint', 'Office', 7, 3),
  (14, 'LibreOffice', 'Office', 8, 3),
  (14, 'Navegadores Web', 'Internet', 9, 3),
  (14, 'Correio Eletrônico', 'Internet', 10, 3),
  (14, 'Conceitos de Internet', 'Internet', 11, 4),
  (14, 'Protocolos de Rede', 'Redes', 12, 3),
  (14, 'Segurança da Informação', 'Segurança', 13, 5),
  (14, 'Malwares e Ameaças', 'Segurança', 14, 4),
  (14, 'Backup e Recuperação', 'Segurança', 15, 3),
  (14, 'Computação em Nuvem', 'Tecnologias', 16, 3);

-- LEGISLAÇÃO ESPECIAL (ID: 11)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (11, 'Estatuto do Desarmamento', 'Leis Especiais', 1, 4),
  (11, 'Lei de Drogas', 'Leis Especiais', 2, 5),
  (11, 'Lei de Crimes Hediondos', 'Leis Especiais', 3, 4),
  (11, 'Lei Maria da Penha', 'Leis Especiais', 4, 4),
  (11, 'Estatuto da Criança e do Adolescente', 'Leis Especiais', 5, 4),
  (11, 'Estatuto do Idoso', 'Leis Especiais', 6, 3),
  (11, 'Lei de Crimes Ambientais', 'Leis Especiais', 7, 3),
  (11, 'Lei de Interceptação Telefônica', 'Leis Especiais', 8, 3),
  (11, 'Lei de Organização Criminosa', 'Leis Especiais', 9, 4),
  (11, 'Lei de Lavagem de Dinheiro', 'Leis Especiais', 10, 4),
  (11, 'Lei de Abuso de Autoridade', 'Leis Especiais', 11, 4),
  (11, 'Lei Anticorrupção', 'Leis Especiais', 12, 3);

-- DIREITOS HUMANOS (ID: 12)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (12, 'Teoria dos Direitos Humanos', 'Fundamentos', 1, 4),
  (12, 'Gerações de Direitos', 'Fundamentos', 2, 3),
  (12, 'Declaração Universal', 'Documentos', 3, 5),
  (12, 'Pacto Internacional de Direitos Civis', 'Documentos', 4, 4),
  (12, 'Convenção Americana', 'Documentos', 5, 4),
  (12, 'Sistema Global de Proteção', 'Sistemas', 6, 3),
  (12, 'Sistema Interamericano', 'Sistemas', 7, 4),
  (12, 'Corte Interamericana', 'Sistemas', 8, 4),
  (12, 'Direitos Humanos no Brasil', 'Nacional', 9, 4),
  (12, 'Direitos da Pessoa com Deficiência', 'Grupos Vulneráveis', 10, 3),
  (12, 'Direitos da Criança', 'Grupos Vulneráveis', 11, 3),
  (12, 'Direitos da Mulher', 'Grupos Vulneráveis', 12, 3);

-- MATEMÁTICA (ID: 27)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (27, 'Conjuntos Numéricos', 'Aritmética', 1, 3),
  (27, 'Operações Básicas', 'Aritmética', 2, 4),
  (27, 'Potenciação e Radiciação', 'Aritmética', 3, 4),
  (27, 'Razão e Proporção', 'Aritmética', 4, 5),
  (27, 'Regra de Três', 'Aritmética', 5, 5),
  (27, 'Porcentagem', 'Aritmética', 6, 5),
  (27, 'Juros Simples e Compostos', 'Matemática Financeira', 7, 4),
  (27, 'Descontos', 'Matemática Financeira', 8, 3),
  (27, 'Equações do 1º Grau', 'Álgebra', 9, 4),
  (27, 'Equações do 2º Grau', 'Álgebra', 10, 4),
  (27, 'Sistemas Lineares', 'Álgebra', 11, 3),
  (27, 'Funções', 'Álgebra', 12, 4),
  (27, 'Geometria Plana', 'Geometria', 13, 4),
  (27, 'Geometria Espacial', 'Geometria', 14, 3),
  (27, 'Trigonometria', 'Geometria', 15, 3);

-- CONTABILIDADE GERAL (ID: 4)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (4, 'Conceitos e Princípios Contábeis', 'Fundamentos', 1, 4),
  (4, 'Patrimônio', 'Fundamentos', 2, 5),
  (4, 'Atos e Fatos Contábeis', 'Fundamentos', 3, 4),
  (4, 'Contas Patrimoniais e de Resultado', 'Contas', 4, 5),
  (4, 'Plano de Contas', 'Contas', 5, 3),
  (4, 'Escrituração Contábil', 'Escrituração', 6, 4),
  (4, 'Lançamentos Contábeis', 'Escrituração', 7, 5),
  (4, 'Regime de Competência e Caixa', 'Escrituração', 8, 4),
  (4, 'Balanço Patrimonial', 'Demonstrações', 9, 5),
  (4, 'DRE - Demonstração do Resultado', 'Demonstrações', 10, 5),
  (4, 'DLPA e DMPL', 'Demonstrações', 11, 3),
  (4, 'DFC - Fluxo de Caixa', 'Demonstrações', 12, 4),
  (4, 'DVA - Valor Adicionado', 'Demonstrações', 13, 3),
  (4, 'Operações com Mercadorias', 'Operações', 14, 4),
  (4, 'Tributos Incidentes', 'Operações', 15, 4),
  (4, 'Folha de Pagamento', 'Operações', 16, 3),
  (4, 'Ativo Imobilizado', 'Ativos', 17, 4),
  (4, 'Depreciação e Amortização', 'Ativos', 18, 4),
  (4, 'Provisões e Ajustes', 'Passivos', 19, 3),
  (4, 'Análise de Demonstrações', 'Análise', 20, 4);

-- CONTABILIDADE PÚBLICA (ID: 5)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (5, 'Conceitos e Campo de Aplicação', 'Fundamentos', 1, 3),
  (5, 'Lei 4.320/64', 'Legislação', 2, 5),
  (5, 'Lei de Responsabilidade Fiscal', 'Legislação', 3, 5),
  (5, 'MCASP - Manual de Contabilidade', 'Normas', 4, 4),
  (5, 'NBCASP - Normas Brasileiras', 'Normas', 5, 4),
  (5, 'Plano de Contas Aplicado', 'Plano de Contas', 6, 4),
  (5, 'Sistemas Contábeis', 'Sistemas', 7, 3),
  (5, 'Receita Pública', 'Receita', 8, 5),
  (5, 'Classificação da Receita', 'Receita', 9, 4),
  (5, 'Etapas da Receita', 'Receita', 10, 4),
  (5, 'Despesa Pública', 'Despesa', 11, 5),
  (5, 'Classificação da Despesa', 'Despesa', 12, 5),
  (5, 'Etapas da Despesa', 'Despesa', 13, 5),
  (5, 'Restos a Pagar', 'Despesa', 14, 4),
  (5, 'Dívida Ativa', 'Dívida', 15, 3),
  (5, 'Dívida Pública', 'Dívida', 16, 4),
  (5, 'Patrimônio Público', 'Patrimônio', 17, 4),
  (5, 'Variações Patrimoniais', 'Patrimônio', 18, 4),
  (5, 'Demonstrações Contábeis', 'Demonstrações', 19, 5),
  (5, 'RREO e RGF', 'Relatórios', 20, 4);

-- ADMINISTRAÇÃO GERAL (ID: 52)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (52, 'Teorias Administrativas', 'Fundamentos', 1, 4),
  (52, 'Escola Clássica', 'Teorias', 2, 3),
  (52, 'Escola de Relações Humanas', 'Teorias', 3, 3),
  (52, 'Teoria Burocrática', 'Teorias', 4, 3),
  (52, 'Funções Administrativas', 'Processo', 5, 5),
  (52, 'Planejamento Estratégico', 'Planejamento', 6, 5),
  (52, 'Planejamento Tático e Operacional', 'Planejamento', 7, 4),
  (52, 'Estruturas Organizacionais', 'Organização', 8, 4),
  (52, 'Cultura Organizacional', 'Organização', 9, 4),
  (52, 'Liderança', 'Direção', 10, 5),
  (52, 'Motivação', 'Direção', 11, 4),
  (52, 'Comunicação Organizacional', 'Direção', 12, 3),
  (52, 'Controle Organizacional', 'Controle', 13, 4),
  (52, 'Indicadores de Desempenho', 'Controle', 14, 4),
  (52, 'Balanced Scorecard', 'Controle', 15, 3);

-- ADMINISTRAÇÃO PÚBLICA (ID: 53)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (53, 'Estado e Administração Pública', 'Fundamentos', 1, 4),
  (53, 'Modelos de Administração Pública', 'Modelos', 2, 4),
  (53, 'Patrimonialismo', 'Modelos', 3, 3),
  (53, 'Burocracia', 'Modelos', 4, 3),
  (53, 'Gerencialismo', 'Modelos', 5, 4),
  (53, 'Governo Digital', 'Governo', 6, 3),
  (53, 'Governança Pública', 'Governança', 7, 5),
  (53, 'Governabilidade', 'Governança', 8, 3),
  (53, 'Accountability', 'Governança', 9, 4),
  (53, 'Transparência Pública', 'Governança', 10, 4),
  (53, 'Participação Social', 'Governança', 11, 3),
  (53, 'Excelência na Gestão', 'Qualidade', 12, 4),
  (53, 'Programa Nacional de Gestão', 'Qualidade', 13, 3);

-- DIREITO ELEITORAL (ID: 44)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (44, 'Código Eleitoral', 'Legislação', 1, 5),
  (44, 'Lei das Eleições', 'Legislação', 2, 5),
  (44, 'Direitos Políticos', 'Direitos', 3, 4),
  (44, 'Alistamento Eleitoral', 'Alistamento', 4, 4),
  (44, 'Domicílio Eleitoral', 'Alistamento', 5, 3),
  (44, 'Justiça Eleitoral', 'Organização', 6, 4),
  (44, 'Partidos Políticos', 'Partidos', 7, 4),
  (44, 'Convenções Partidárias', 'Partidos', 8, 3),
  (44, 'Registro de Candidaturas', 'Candidaturas', 9, 4),
  (44, 'Inelegibilidades', 'Candidaturas', 10, 5),
  (44, 'Propaganda Eleitoral', 'Propaganda', 11, 4),
  (44, 'Pesquisas Eleitorais', 'Propaganda', 12, 3),
  (44, 'Votação e Apuração', 'Processo', 13, 4),
  (44, 'Recursos Eleitorais', 'Recursos', 14, 4),
  (44, 'Crimes Eleitorais', 'Crimes', 15, 5),
  (44, 'Abuso de Poder', 'Crimes', 16, 4);

-- DIREITO DO TRABALHO (ID: 45)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (45, 'Princípios do Direito do Trabalho', 'Fundamentos', 1, 4),
  (45, 'Fontes do Direito do Trabalho', 'Fundamentos', 2, 3),
  (45, 'CLT - Consolidação', 'Legislação', 3, 5),
  (45, 'Relação de Emprego', 'Contrato', 4, 5),
  (45, 'Contrato de Trabalho', 'Contrato', 5, 5),
  (45, 'Alteração do Contrato', 'Contrato', 6, 4),
  (45, 'Suspensão e Interrupção', 'Contrato', 7, 4),
  (45, 'Terminação do Contrato', 'Contrato', 8, 5),
  (45, 'Jornada de Trabalho', 'Jornada', 9, 5),
  (45, 'Horas Extras', 'Jornada', 10, 4),
  (45, 'Intervalos', 'Jornada', 11, 3),
  (45, 'Repouso Semanal', 'Jornada', 12, 3),
  (45, 'Férias', 'Direitos', 13, 5),
  (45, 'Décimo Terceiro Salário', 'Direitos', 14, 4),
  (45, 'FGTS', 'Direitos', 15, 4),
  (45, 'Aviso Prévio', 'Direitos', 16, 4),
  (45, 'Segurança e Medicina do Trabalho', 'Proteção', 17, 4),
  (45, 'Trabalho da Mulher', 'Proteção', 18, 3),
  (45, 'Trabalho do Menor', 'Proteção', 19, 3),
  (45, 'Estabilidades', 'Garantias', 20, 4);

-- ECONOMIA (ID: 59)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (59, 'Conceitos Fundamentais', 'Introdução', 1, 3),
  (59, 'Problemas Econômicos', 'Introdução', 2, 3),
  (59, 'Sistemas Econômicos', 'Introdução', 3, 3),
  (59, 'Microeconomia', 'Micro', 4, 4),
  (59, 'Teoria do Consumidor', 'Micro', 5, 4),
  (59, 'Teoria da Produção', 'Micro', 6, 4),
  (59, 'Estruturas de Mercado', 'Micro', 7, 5),
  (59, 'Falhas de Mercado', 'Micro', 8, 4),
  (59, 'Macroeconomia', 'Macro', 9, 4),
  (59, 'Agregados Macroeconômicos', 'Macro', 10, 5),
  (59, 'PIB e Renda Nacional', 'Macro', 11, 5),
  (59, 'Inflação', 'Macro', 12, 5),
  (59, 'Desemprego', 'Macro', 13, 4),
  (59, 'Política Monetária', 'Política', 14, 5),
  (59, 'Política Fiscal', 'Política', 15, 5),
  (59, 'Balanço de Pagamentos', 'Internacional', 16, 4),
  (59, 'Taxa de Câmbio', 'Internacional', 17, 4);

-- ATUALIDADES (ID: 28)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (28, 'Política Nacional', 'Política', 1, 5),
  (28, 'Poderes da República', 'Política', 2, 4),
  (28, 'Eleições e Democracia', 'Política', 3, 4),
  (28, 'Economia Brasileira', 'Economia', 4, 5),
  (28, 'Indicadores Econômicos', 'Economia', 5, 4),
  (28, 'Política Econômica', 'Economia', 6, 4),
  (28, 'Sociedade Brasileira', 'Social', 7, 4),
  (28, 'Educação no Brasil', 'Social', 8, 3),
  (28, 'Saúde Pública', 'Social', 9, 3),
  (28, 'Segurança Pública', 'Social', 10, 4),
  (28, 'Meio Ambiente', 'Ambiente', 11, 4),
  (28, 'Desenvolvimento Sustentável', 'Ambiente', 12, 3),
  (28, 'Relações Internacionais', 'Internacional', 13, 4),
  (28, 'Conflitos Mundiais', 'Internacional', 14, 3),
  (28, 'Tecnologia e Inovação', 'Tecnologia', 15, 4),
  (28, 'Transformação Digital', 'Tecnologia', 16, 3);

-- ARQUIVOLOGIA (ID: 55)
INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES
  (55, 'Conceitos Fundamentais', 'Fundamentos', 1, 4),
  (55, 'Princípios Arquivísticos', 'Fundamentos', 2, 5),
  (55, 'Classificação de Documentos', 'Gestão', 3, 5),
  (55, 'Arquivamento', 'Gestão', 4, 4),
  (55, 'Protocolo', 'Gestão', 5, 3),
  (55, 'Tabela de Temporalidade', 'Gestão', 6, 5),
  (55, 'Avaliação de Documentos', 'Gestão', 7, 4),
  (55, 'Destinação de Documentos', 'Gestão', 8, 4),
  (55, 'Arquivos Correntes', 'Tipologia', 9, 3),
  (55, 'Arquivos Intermediários', 'Tipologia', 10, 3),
  (55, 'Arquivos Permanentes', 'Tipologia', 11, 3),
  (55, 'Preservação de Documentos', 'Preservação', 12, 4),
  (55, 'Digitalização', 'Tecnologia', 13, 4),
  (55, 'GED - Gerenciamento Eletrônico', 'Tecnologia', 14, 3);

-- ==================== FIM DA MIGRATION ====================
