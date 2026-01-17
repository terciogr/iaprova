# 🚀 GUIA DE DEPLOY DO IAPROVA PARA IAPROVA.COM.BR

## ✅ SISTEMA FUNCIONANDO NO SANDBOX
**URL de Teste:** https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai

---

## 📋 PASSOS PARA DEPLOY EM IAPROVA.COM.BR

### 1️⃣ **CONFIGURAR TOKEN CLOUDFLARE COM PERMISSÕES CORRETAS**

Acesse: https://dash.cloudflare.com/profile/api-tokens

Crie um novo token com as seguintes permissões:
- **Account:** Cloudflare Pages:Edit
- **Account:** User Details:Read
- **Zone:** DNS:Edit (para o domínio iaprova.com.br)

### 2️⃣ **CLONAR O REPOSITÓRIO**

```bash
git clone https://github.com/terciogr/iaprova.git
cd iaprova
```

### 3️⃣ **INSTALAR DEPENDÊNCIAS**

```bash
npm install
```

### 4️⃣ **CONFIGURAR VARIÁVEIS DE AMBIENTE**

Crie o arquivo `.dev.vars`:
```env
GROQ_API_KEY=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
GEMINI_API_KEY=AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY
RESEND_API_KEY=re_irsxBD5v_PNbBa8XRXRXKRRTCjv2t9Yqf
FRONTEND_URL=https://iaprova.com.br
JWT_SECRET=sua_chave_secreta_aqui
DOMAIN=iaprova.com.br
```

### 5️⃣ **BUILD DO PROJETO**

```bash
npm run build
```

### 6️⃣ **CONFIGURAR WRANGLER**

```bash
export CLOUDFLARE_API_TOKEN="seu_token_aqui"
npx wrangler whoami
```

### 7️⃣ **CRIAR PROJETO NO CLOUDFLARE PAGES**

```bash
npx wrangler pages project create iaprova --production-branch main
```

### 8️⃣ **FAZER DEPLOY**

```bash
npx wrangler pages deploy dist --project-name iaprova
```

### 9️⃣ **CONFIGURAR DOMÍNIO CUSTOMIZADO**

No Cloudflare Dashboard:
1. Acesse seu projeto Pages
2. Vá em "Custom domains"
3. Adicione `iaprova.com.br` e `www.iaprova.com.br`
4. O Cloudflare configurará automaticamente os registros DNS

### 🔟 **CONFIGURAR VARIÁVEIS DE PRODUÇÃO**

No Cloudflare Dashboard:
1. Vá em Settings > Environment variables
2. Adicione todas as variáveis do `.dev.vars`

---

## 🌐 CONFIGURAÇÃO DNS PARA IAPROVA.COM.BR

Se o domínio não estiver no Cloudflare, adicione estes registros DNS:

```
Tipo: CNAME
Nome: @
Conteúdo: iaprova.pages.dev

Tipo: CNAME
Nome: www
Conteúdo: iaprova.pages.dev
```

---

## 📦 ALTERNATIVA: DEPLOY VIA INTERFACE WEB

1. Acesse: https://pages.cloudflare.com
2. Clique em "Create a project"
3. Conecte com GitHub: https://github.com/terciogr/iaprova
4. Configure:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Adicione as variáveis de ambiente
6. Deploy!

---

## ✅ RECURSOS DO SISTEMA

- **API Gemini 2.0 Flash** para análise de editais
- **5 opções de conteúdo** (Teoria, Exercícios, Resumo, Flashcards, Resumo Personalizado)
- **Menu flutuante** com ajuda
- **Banca organizadora** visível
- **Sistema de email** com Resend
- **Banco de dados D1** SQLite

---

## 📞 SUPORTE

- **GitHub:** https://github.com/terciogr/iaprova
- **Backup Completo:** https://www.genspark.ai/api/files/s/7ajGAqdf

---

## 🎯 STATUS ATUAL

✅ Sistema funcionando no sandbox
✅ Código completo no GitHub
✅ Todas as correções aplicadas
⏳ Aguardando token Cloudflare com permissões corretas para deploy

---

**IMPORTANTE:** O sistema está 100% pronto e funcionando. Apenas precisa do token correto para fazer o deploy em iaprova.com.br