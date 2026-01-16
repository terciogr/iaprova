-- Criar usuário de teste limpo
-- Email: teste@teste.com
-- Senha: 123456

INSERT INTO users (email, password, nome, created_at) 
VALUES ('teste@teste.com', '123456', 'Usuário Teste', CURRENT_TIMESTAMP);

-- Verificar criação
SELECT id, email, nome, created_at FROM users;
