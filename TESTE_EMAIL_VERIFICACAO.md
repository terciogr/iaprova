# 📧 Como Testar o Sistema de Verificação de Email

## 🎯 Resumo Rápido
O sistema está em **MODO DESENVOLVIMENTO**, então emails não são enviados de verdade. Em vez disso, o sistema mostra o link de verificação na tela para você clicar.

## ✅ Passo a Passo para Testar

### 1️⃣ Fazer Cadastro
1. Acesse o sistema
2. Clique em **"Cadastro"**
3. Preencha:
   - Nome: Seu nome
   - Email: qualquer email válido (ex: teste@exemplo.com)
   - Senha: mínimo 4 caracteres

### 2️⃣ Verificar o Email
Após o cadastro, o sistema mostrará:
- **Tela amarela** informando "Modo Desenvolvimento"
- **Link de verificação** pronto para clicar
- **Botão verde** "Verificar Email Agora"

👉 **CLIQUE NO BOTÃO VERDE** para verificar seu email

### 3️⃣ Fazer Login
Após verificar o email:
1. Você será redirecionado ao login
2. Use o email e senha cadastrados
3. Pronto! Você está no sistema

## 🔄 Se o Email Já Foi Cadastrado
Se tentar cadastrar um email que já existe:
1. Sistema mostrará erro
2. Clique em **"Login"**
3. Tente fazer login
4. Se não foi verificado, aparecerá opção de **"Reenviar Email"**

## 🛠️ Modo Desenvolvimento vs Produção

### Em Desenvolvimento (Atual)
- ❌ Emails NÃO são enviados
- ✅ Link aparece na tela
- ✅ Você clica manualmente no link
- ✅ Console mostra o token

### Em Produção (Com Resend)
- ✅ Emails são enviados de verdade
- ✅ Usuário recebe email profissional
- ✅ Link no email para verificar
- ❌ Não aparece link na tela

## 💡 Dicas

### Email de Teste Rápido
- Use: **teste@teste.com** / senha: **teste123**
- Este usuário já está verificado e pode fazer login direto

### Ver Token no Console
1. Abra o console do navegador (F12)
2. Faça o cadastro
3. Veja o token no console
4. URL: `/verificar-email?token=SEU_TOKEN`

### Problemas Comuns

**"Email já cadastrado"**
- O email já foi usado
- Use outro email ou faça login

**"Email não verificado"**
- Clique em "Reenviar Email"
- Use o novo link gerado

**Botão "Enviando..." travado**
- Recarregue a página
- Tente novamente

## 🎨 Visual do Sistema

### Tela de Cadastro
- Formulário limpo e moderno
- Validação em tempo real
- Mensagens de erro claras

### Tela de Verificação (Modo Dev)
- Aviso amarelo sobre modo desenvolvimento
- Link copiável
- Botão verde para verificar

### Após Verificação
- Mensagem de sucesso
- Redirecionamento automático
- Login liberado

## 📝 Notas Técnicas

- Tokens têm 32 caracteres aleatórios
- Expiram em 24 horas
- Emails são normalizados (lowercase)
- Senha mínima: 4 caracteres
- Validação dupla (frontend + backend)