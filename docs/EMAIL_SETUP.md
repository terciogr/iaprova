# 📧 Configuração do Sistema de Email - IAprova

## Visão Geral
O IAprova implementa um sistema robusto de verificação de email para garantir que apenas usuários com emails válidos acessem o sistema. O sistema usa o Resend API para envio de emails transacionais.

## 🔒 Funcionalidades de Segurança

### 1. Validação de Email
- ✅ Formato de email validado no frontend e backend
- ✅ Normalização de email (lowercase, trim)
- ✅ Verificação de duplicação de email
- ✅ Token seguro de 32 caracteres
- ✅ Expiração de token em 24 horas

### 2. Fluxo de Cadastro
1. Usuário insere nome, email e senha
2. Sistema valida formato do email
3. Sistema gera token único de verificação
4. Email é enviado com link de verificação
5. Usuário clica no link para ativar conta
6. Somente após verificação pode fazer login

### 3. Fluxo de Login
- Email precisa estar verificado
- Se não verificado, mostra opção de reenviar email
- Login só é permitido com email verificado

## 🚀 Configuração para Produção

### Passo 1: Criar conta no Resend
1. Acesse [https://resend.com](https://resend.com)
2. Crie uma conta gratuita (10 emails/dia grátis)
3. Verifique seu domínio ou use domínio do Resend

### Passo 2: Obter API Key
1. No dashboard do Resend, vá em API Keys
2. Crie uma nova API key
3. Copie a key (será mostrada apenas uma vez)

### Passo 3: Configurar Cloudflare Pages

#### Via Interface Web:
1. Acesse seu projeto no Cloudflare Pages
2. Vá em Settings > Environment Variables
3. Adicione as variáveis:
   - `RESEND_API_KEY`: sua_api_key_do_resend
   - `FROM_EMAIL`: seu_email_verificado@dominio.com
   - `APP_URL`: https://seu-projeto.pages.dev

#### Via Wrangler CLI:
```bash
# Configurar RESEND_API_KEY
npx wrangler pages secret put RESEND_API_KEY --project-name iaprova
# Cole a API key quando solicitado

# Configurar FROM_EMAIL
npx wrangler pages secret put FROM_EMAIL --project-name iaprova
# Digite: noreply@seudominio.com

# Configurar APP_URL
npx wrangler pages secret put APP_URL --project-name iaprova
# Digite: https://iaprova.pages.dev
```

### Passo 4: Verificar domínio (opcional)
Para usar email personalizado:
1. No Resend, adicione seu domínio
2. Configure os registros DNS conforme instruções
3. Aguarde verificação (até 48h)
4. Use seu email personalizado em FROM_EMAIL

## 🧪 Modo de Desenvolvimento

### Configuração Local
1. Copie `.dev.vars.example` para `.dev.vars`
2. Configure as variáveis:
```env
RESEND_API_KEY=seu_resend_api_key_aqui
FROM_EMAIL=noreply@iaprova.com
APP_URL=http://localhost:3000
```

### Teste sem Email Real
Em desenvolvimento, quando RESEND_API_KEY não está configurada:
- Sistema entra em "modo dev"
- Token é mostrado no console do navegador
- Link de verificação é logado no console
- Email não é realmente enviado

### Verificação Manual em Dev
1. Faça cadastro normalmente
2. Abra o console do navegador (F12)
3. Copie o token mostrado no console
4. Acesse: `http://localhost:3000/verificar-email?token=TOKEN_COPIADO`

## 📊 Monitoramento

### Logs Importantes
- `📧 Link de verificação:` - URL enviada por email
- `📧 Token de verificação:` - Token em modo dev
- `⚠️ MODO DEV:` - Sistema em modo desenvolvimento
- `✅ Email verificado` - Verificação bem sucedida

### Métricas no Resend Dashboard
- Taxa de entrega
- Taxa de abertura
- Emails rejeitados
- Quota utilizada

## 🔧 Troubleshooting

### Email não chega
1. Verifique spam/lixo eletrônico
2. Confirme RESEND_API_KEY configurada
3. Verifique FROM_EMAIL é válido
4. Confira logs no Resend dashboard

### Token inválido/expirado
- Tokens expiram em 24 horas
- Use opção "Reenviar email"
- Verifique data/hora do servidor

### Erro 403 - Email não verificado
- Normal quando email não foi verificado
- Use opção "Reenviar email de verificação"
- Verifique caixa de entrada

## 📝 Estrutura do Banco de Dados

```sql
-- Campos adicionados na tabela users
email_verified INTEGER DEFAULT 0,  -- 0 = não verificado, 1 = verificado
verification_token TEXT,            -- Token único de verificação
verification_token_expires DATETIME -- Data/hora de expiração do token
```

## 🎨 Templates de Email

O email de verificação inclui:
- Header com logo/nome do IAprova
- Mensagem personalizada com nome do usuário
- Botão CTA para verificar email
- Link alternativo em texto
- Instruções de segurança
- Aviso de expiração (24 horas)

## 🚨 Segurança

### Boas Práticas Implementadas
- ✅ Tokens criptograficamente seguros
- ✅ Expiração automática de tokens
- ✅ Rate limiting no Resend
- ✅ Validação dupla (frontend + backend)
- ✅ Normalização de emails
- ✅ Proteção contra duplicação

### Recomendações Adicionais
- Configure SPF/DKIM/DMARC no domínio
- Monitore taxa de bounce
- Implemente captcha se necessário
- Configure webhook do Resend para tracking

## 📖 Referências
- [Documentação Resend](https://resend.com/docs)
- [Cloudflare Pages Secrets](https://developers.cloudflare.com/pages/platform/functions/bindings/#secrets)
- [Guia de Email Deliverability](https://resend.com/docs/deliverability)