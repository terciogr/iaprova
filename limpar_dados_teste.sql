-- Script para limpar todos os dados de teste mantendo estrutura e disciplinas

-- ==========================================
-- LIMPAR DADOS DE USUÁRIOS E CONTEÚDOS
-- ==========================================

-- 1. Limpar conteúdos e vinculações
DELETE FROM conteudo_topicos;
DELETE FROM conteudos;

-- 2. Limpar metas e histórico
DELETE FROM metas_diarias;
DELETE FROM historico_diario;

-- 3. Limpar ciclos de estudo
DELETE FROM ciclos_estudo;

-- 4. Limpar planos de estudo
DELETE FROM planos_estudo;

-- 5. Limpar progresso e desempenho
DELETE FROM progresso_materiais;
DELETE FROM desempenho;

-- 6. Limpar revisões e flashcards
DELETE FROM revisoes;
DELETE FROM flashcards;

-- 7. Limpar materiais (PDFs, vídeos, etc)
DELETE FROM materiais;

-- 8. Limpar tópicos do usuário
DELETE FROM user_topicos;

-- 9. Limpar disciplinas do usuário
DELETE FROM user_disciplinas;

-- 10. Limpar tópicos do edital
DELETE FROM topicos_edital;

-- 11. Limpar entrevistas
DELETE FROM interviews;

-- 12. Limpar usuários (EXCETO admin se existir)
DELETE FROM users WHERE email != 'admin@iaprova.com';

-- ==========================================
-- RESETAR SEQUENCES (SQLite AutoIncrement)
-- ==========================================

-- Resetar contadores de ID para começar do 1
DELETE FROM sqlite_sequence WHERE name IN (
  'users',
  'interviews',
  'user_disciplinas',
  'planos_estudo',
  'ciclos_estudo',
  'metas_diarias',
  'conteudos',
  'conteudo_topicos',
  'topicos_edital',
  'user_topicos',
  'materiais',
  'progresso_materiais',
  'desempenho',
  'historico_diario',
  'revisoes',
  'flashcards'
);

-- ==========================================
-- VERIFICAÇÃO FINAL
-- ==========================================

-- Contar registros restantes
SELECT 'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'disciplinas', COUNT(*) FROM disciplinas
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews
UNION ALL
SELECT 'planos_estudo', COUNT(*) FROM planos_estudo
UNION ALL
SELECT 'metas_diarias', COUNT(*) FROM metas_diarias
UNION ALL
SELECT 'conteudos', COUNT(*) FROM conteudos
UNION ALL
SELECT 'topicos_edital', COUNT(*) FROM topicos_edital;
