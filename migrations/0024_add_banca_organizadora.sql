-- Adicionar campo de banca organizadora na tabela interviews
ALTER TABLE interviews ADD COLUMN banca_organizadora TEXT;

-- Adicionar campo de banca na tabela editais
ALTER TABLE editais ADD COLUMN banca_organizadora TEXT;

-- Criar tabela de características das bancas
CREATE TABLE IF NOT EXISTS bancas_caracteristicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  estilo_questoes TEXT, -- JSON com características
  dicas_estudo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Popular com as principais bancas brasileiras
INSERT INTO bancas_caracteristicas (nome, descricao, estilo_questoes, dicas_estudo) VALUES
('CEBRASPE', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção', 
 '{"tipo":"certo_errado","complexidade":"alta","interpretacao":"muito_alta","pegadinhas":"frequentes","interdisciplinar":true}',
 'Foco em interpretação de texto, atenção aos detalhes, questões interdisciplinares, cuidado com pegadinhas'),

('FCC', 'Fundação Carlos Chagas',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","pegadinhas":"raras","tradicional":true}',
 'Questões mais diretas, foco em letra da lei, menos interpretação, padrão tradicional'),

('FGV', 'Fundação Getúlio Vargas',
 '{"tipo":"multipla_escolha","complexidade":"alta","interpretacao":"alta","atualidades":true,"pratica":true}',
 'Questões práticas e atualizadas, interpretação moderna da lei, casos práticos, atualidades importantes'),

('VUNESP', 'Fundação para o Vestibular da UNESP',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","tradicional":true,"detalhista":true}',
 'Questões detalhistas, cobra exceções, foco em memorização, padrão tradicional'),

('IDECAN', 'Instituto de Desenvolvimento Educacional, Cultural e Assistencial Nacional',
 '{"tipo":"multipla_escolha","complexidade":"media_baixa","interpretacao":"baixa","direto":true}',
 'Questões mais diretas e simples, foco em conceitos básicos, menos pegadinhas'),

('IBFC', 'Instituto Brasileiro de Formação e Capacitação',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","pratico":true}',
 'Questões práticas, situações do dia-a-dia, interpretação moderada'),

('QUADRIX', 'Instituto Quadrix',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","objetivo":true}',
 'Questões objetivas, foco em conhecimento técnico, menos subjetividade'),

('AOCP', 'Assessoria em Organização de Concursos Públicos',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","regional":true}',
 'Questões regionalizadas, foco em legislação específica, padrão médio'),

('INSTITUTO AOCP', 'Instituto AOCP',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","saude":true}',
 'Especializada em área da saúde, questões técnicas específicas, conhecimento prático'),

('COMPERVE', 'Comissão Permanente do Vestibular - UFRN',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","regional":true,"nordeste":true}',
 'Banca regional do nordeste, questões contextualizadas, foco em realidade local'),

('FUNDATEC', 'Fundação Universidade Empresa de Tecnologia e Ciências',
 '{"tipo":"multipla_escolha","complexidade":"media_alta","interpretacao":"alta","sul":true}',
 'Banca do sul, questões elaboradas, boa interpretação necessária'),

('CONSULPLAN', 'Consultoria e Planejamento em Administração Pública',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","variado":true}',
 'Estilo variado, questões de médio nível, interpretação moderada'),

('IADES', 'Instituto Americano de Desenvolvimento',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","df":true}',
 'Foco em concursos do DF, questões regionais, padrão médio'),

('NC-UFPR', 'Núcleo de Concursos da UFPR',
 '{"tipo":"multipla_escolha","complexidade":"alta","interpretacao":"alta","academico":true}',
 'Estilo acadêmico, questões elaboradas, alta complexidade'),

('COPS-UEL', 'Coordenadoria de Processos Seletivos da UEL',
 '{"tipo":"multipla_escolha","complexidade":"media","interpretacao":"media","parana":true}',
 'Banca do Paraná, questões regionais, padrão universitário');

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_banca_nome ON bancas_caracteristicas(nome);