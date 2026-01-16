-- Criar usuário de teste
INSERT OR REPLACE INTO users (id, name, email, password) 
VALUES (1, 'Usuário Teste', 'teste@teste.com', 'teste123');

-- Verificar usuário criado
SELECT * FROM users WHERE email = 'teste@teste.com';
