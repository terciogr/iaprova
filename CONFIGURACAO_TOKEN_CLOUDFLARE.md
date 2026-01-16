# 🔧 Configuração do Token Cloudflare - IAprova

## ⚠️ Problema Atual

O token fornecido (`5L32OlKIDbl5YL67YTplpoveJP8nn5QCB5ugQl4h`) está com erro de autenticação.
Erro: `Authentication error [code: 10000]`

## 🔑 Como Criar um Token Correto

### Opção 1: Usar Template Pronto (Recomendado)

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique em **"Create Token"**
3. Procure o template **"Edit Cloudflare Workers"**
4. Clique em **"Use template"**
5. Configure:
   - **Account Resources**: Selecione sua conta
   - **Zone Resources**: Include - All zones
6. Clique em **"Continue to summary"**
7. Clique em **"Create Token"**
8. **COPIE O TOKEN COMPLETO** (será mostrado apenas uma vez!)

### Opção 2: Token Customizado

Se preferir criar um token customizado, você precisa das seguintes permissões:

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique em **"Create Token"**
3. Escolha **"Custom token"**
4. Configure as permissões:

**Account Permissions:**
- Cloudflare Pages:Edit ✅
- Workers Scripts:Edit ✅
- Workers Routes:Edit ✅
- Workers KV Storage:Edit ✅
- D1:Edit ✅
- Workers R2 Storage:Edit ✅

**Zone Permissions:**
- Zone:Read ✅
- DNS:Edit ✅

**Account Resources:**
- Include - All accounts ✅

**Zone Resources:**
- Include - All zones ✅

5. Clique em **"Continue to summary"**
6. Clique em **"Create Token"**
7. **COPIE O TOKEN COMPLETO**

## 📋 Formato Esperado do Token

Um token válido geralmente:
- Tem 40+ caracteres
- Pode começar com caracteres especiais
- É uma string alfanumérica longa

Exemplo de formato (ilustrativo):
```
_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🚀 Após Criar o Token Correto

1. Me envie o novo token
2. Vou configurar e fazer o deploy automaticamente
3. Você terá o sistema rodando em: `https://iaprova.pages.dev`

## 🔍 Verificar Token Existente

Se quiser verificar se o token "iaprova build token" tem as permissões corretas:

1. Vá em: https://dash.cloudflare.com/profile/api-tokens
2. Clique nos **três pontos** (...) ao lado do token
3. Clique em **"Roll"** para gerar um novo token com as mesmas permissões
4. Ou clique em **"Edit"** para adicionar as permissões que faltam

### Permissões Necessárias que Podem Estar Faltando:
- ❌ User Details:Read
- ❌ Account Resources access
- ❌ Memberships:Read

## 💡 Alternativa Temporária

Enquanto não temos o token correto, você pode:

1. **Usar o Cloudflare Dashboard** para criar o projeto manualmente:
   - Acesse: https://dash.cloudflare.com/
   - Vá em Pages
   - Clique em "Create a project"
   - Escolha "Connect to Git" ou "Direct Upload"

2. **Usar Wrangler Login** (se tiver acesso ao navegador):
   ```bash
   npx wrangler login
   ```
   Isso abrirá o navegador para autenticação OAuth

## 📊 Status Atual do Sistema

### ✅ Funcionando:
- Sistema rodando localmente: https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
- Groq API configurada e testada
- Resend API configurada e testada
- Build do projeto concluído

### ⏳ Aguardando:
- Token Cloudflare com permissões corretas para deploy

---

**Nota**: O sistema está 100% pronto para deploy. Só precisamos do token correto!