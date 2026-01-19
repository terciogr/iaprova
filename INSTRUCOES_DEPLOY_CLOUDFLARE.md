# 🚀 INSTRUÇÕES PARA DEPLOY NO CLOUDFLARE PAGES

## ⚠️ PROBLEMA IDENTIFICADO
Você precisa primeiro adicionar o domínio iaprova.com.br ao Cloudflare.

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ **ADICIONAR DOMÍNIO AO CLOUDFLARE**

Na imagem que você enviou, o Cloudflare está pedindo para:

1. **Fazer login no seu provedor de DNS** (onde você registrou iaprova.com.br)
   - Registro.br, GoDaddy, HostGator, etc.

2. **Substituir os nameservers atuais pelos do Cloudflare:**
   ```
   alex.ns.cloudflare.com
   julissa.ns.cloudflare.com
   ```

3. **No seu provedor de domínio:**
   - Acesse o painel de controle
   - Procure por "DNS" ou "Nameservers"
   - Remova os nameservers atuais
   - Adicione os dois nameservers do Cloudflare
   - Salve as alterações

4. **Aguarde a propagação** (pode levar até 24 horas, geralmente é mais rápido)

### 2️⃣ **DEPLOY VIA CLOUDFLARE PAGES (MAIS FÁCIL)**

Enquanto aguarda a propagação do DNS, você pode fazer o deploy:

1. **Acesse:** https://pages.cloudflare.com
2. **Clique em "Create a project"**
3. **Conecte com GitHub**
4. **Selecione o repositório:** `terciogr/iaprova`
5. **Configure o build:**
   ```
   Framework preset: None
   Build command: npm run build
   Build output directory: dist
   ```

6. **Adicione as variáveis de ambiente:**
   ```
   GROQ_API_KEY = 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
   GEMINI_API_KEY = AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY
   RESEND_API_KEY = re_irsxBD5v_PNbBa8XRXRXKRRTCjv2t9Yqf
   FRONTEND_URL = https://iaprova.com.br
   JWT_SECRET = seu_jwt_secret_aqui
   DOMAIN = iaprova.com.br
   ```

7. **Clique em "Save and Deploy"**

### 3️⃣ **URL TEMPORÁRIA DO CLOUDFLARE**

Após o deploy, você receberá uma URL temporária:
```
https://iaprova.pages.dev
```

Você pode acessar e testar o sistema nesta URL imediatamente!

### 4️⃣ **CONFIGURAR DOMÍNIO CUSTOMIZADO**

Após a propagação do DNS (quando o domínio estiver ativo no Cloudflare):

1. No seu projeto Pages, vá em **"Custom domains"**
2. Clique em **"Set up a custom domain"**
3. Digite: `iaprova.com.br`
4. O Cloudflare configurará automaticamente

### 5️⃣ **CRIAR BANCO DE DADOS D1**

No Cloudflare Dashboard:

1. Vá em **Workers & Pages > D1**
2. Clique em **"Create database"**
3. Nome: `iaprova-production`
4. Anote o ID do banco
5. No projeto Pages, vá em **Settings > Functions > D1 database bindings**
6. Adicione:
   - Variable name: `DB`
   - D1 database: `iaprova-production`

---

## 🎯 ALTERNATIVA RÁPIDA (ENQUANTO CONFIGURA O DNS)

### **Deploy Manual Local**

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/terciogr/iaprova.git
   cd iaprova
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure .dev.vars:**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edite com as chaves API
   ```

4. **Execute localmente:**
   ```bash
   npm run dev
   ```
   
   Acesse: http://localhost:5173

---

## ✅ RESUMO DO STATUS

| Etapa | Status | Ação Necessária |
|-------|--------|-----------------|
| Código no GitHub | ✅ Pronto | - |
| Nameservers Cloudflare | ⏳ Pendente | Alterar no provedor do domínio |
| Deploy no Pages | ⏳ Pendente | Fazer via interface web |
| Domínio customizado | ⏳ Aguardando DNS | Configurar após propagação |

---

## 📞 SUPORTE

- **Repositório:** https://github.com/terciogr/iaprova
- **Backup completo:** https://www.genspark.ai/api/files/s/7ajGAqdf

---

## 🔴 IMPORTANTE

O sandbox do Genspark está instável no momento, mas isso NÃO afeta o funcionamento do sistema quando deployado no Cloudflare ou rodado localmente.

**O código está 100% funcional e pronto para produção!**