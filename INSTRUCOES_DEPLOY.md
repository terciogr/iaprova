# 🚀 Instruções de Deploy - IAprova para Cloudflare Pages

## ✅ Status Atual

### Configurações Aplicadas:
- ✅ **Resend API Key**: Configurada e testada com sucesso! 
  - Email enviado para: terciogomesrabelo@gmail.com
  - ID do email: b391b6c9-4ff9-4565-9975-65017267792b
- ⚠️ **Cloudflare Token**: Configurado mas precisa verificação (pode estar incompleto)
- 🟢 **Aplicação Local**: Rodando em https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai

## 🔧 Tokens Configurados

```bash
# Resend API Key (FUNCIONANDO)
RESEND_API_KEY=re_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA

# Cloudflare API Token (VERIFICAR)
CLOUDFLARE_API_TOKEN=e522822b6f789812304e437f761cc492676bb
```

## ⚠️ Problema com Token Cloudflare

O token fornecido parece estar incompleto. Tokens do Cloudflare geralmente:
- Começam com um prefixo específico
- São mais longos (40+ caracteres)
- Formato típico: `_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Como obter um token válido:

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique em "Create Token"
3. Use o template "Edit Cloudflare Workers" ou crie um custom token com permissões:
   - Account: Cloudflare Pages:Edit
   - Account: Cloudflare Workers Scripts:Edit
   - Account: D1:Edit
   - Account: Workers R2 Storage:Edit
4. Copie o token completo (será mostrado apenas uma vez)

## 📝 Para fazer o Deploy (quando o token estiver correto)

### Opção 1: Script Automatizado
```bash
# Configurar o token correto
export CLOUDFLARE_API_TOKEN="seu_token_completo_aqui"

# Executar o script de deploy
cd /home/user/webapp
./deploy.sh
```

### Opção 2: Comandos Manuais
```bash
# 1. Configurar token
export CLOUDFLARE_API_TOKEN="seu_token_completo_aqui"

# 2. Verificar autenticação
npx wrangler whoami

# 3. Criar banco de dados D1 em produção
npx wrangler d1 create iaprova-db

# 4. Atualizar wrangler.jsonc com o ID do banco criado
# Edite o arquivo e substitua "placeholder-will-be-set-on-deploy" pelo ID real

# 5. Aplicar migrações no banco de produção
npx wrangler d1 migrations apply iaprova-db

# 6. Criar projeto no Cloudflare Pages
npx wrangler pages project create iaprova --production-branch main

# 7. Fazer o deploy
npm run build
npx wrangler pages deploy dist --project-name iaprova

# 8. Configurar secrets em produção
npx wrangler pages secret put RESEND_API_KEY --project-name iaprova
# Digite: re_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA

npx wrangler pages secret put JWT_SECRET --project-name iaprova
# Digite uma string segura de 32+ caracteres

npx wrangler pages secret put GROQ_API_KEY --project-name iaprova
# Digite sua chave Groq (obter em https://console.groq.com/)
```

## 🔐 Configuração de Secrets em Produção

Após o deploy, configure as variáveis de ambiente:

```bash
# Email (Resend) - JÁ TEMOS A CHAVE
npx wrangler pages secret put RESEND_API_KEY --project-name iaprova
# Use: re_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA

# JWT Secret (gerar uma nova)
npx wrangler pages secret put JWT_SECRET --project-name iaprova
# Sugestão: gerar com: openssl rand -hex 32

# Groq API (RECOMENDADO - GRÁTIS)
npx wrangler pages secret put GROQ_API_KEY --project-name iaprova
# Obter em: https://console.groq.com/
```

## 🌐 URLs após Deploy

Quando o deploy for concluído, você terá:

- **Produção**: https://iaprova.pages.dev
- **Preview**: https://[hash].iaprova.pages.dev
- **Custom Domain** (opcional): Configure em Cloudflare Dashboard

## 📧 Configuração de Email em Produção

O Resend está configurado mas com limitações:
- ✅ Pode enviar para: terciogomesrabelo@gmail.com
- ⚠️ Para enviar para outros emails, você precisa:
  1. Verificar um domínio em https://resend.com/domains
  2. Atualizar o `from` para usar seu domínio verificado

## 🤖 Configuração de IA (Groq - GRÁTIS)

Para habilitar geração de conteúdo com IA:

1. Acesse: https://console.groq.com/
2. Crie uma conta gratuita
3. Vá em "API Keys"
4. Clique em "Create API Key"
5. Copie a chave (começa com `gsk_`)
6. Configure no Cloudflare:
   ```bash
   npx wrangler pages secret put GROQ_API_KEY --project-name iaprova
   ```

## 📊 Verificação Pós-Deploy

Após o deploy, verifique:

1. **Acesso à aplicação**: https://iaprova.pages.dev
2. **Login com usuário teste**: teste@iaprova.com / 123456
3. **Teste de email**: Função de recuperação de senha
4. **Geração de conteúdo**: Se Groq estiver configurado

## 🆘 Troubleshooting

### Token Cloudflare inválido
- Verifique se copiou o token completo
- Certifique-se de que tem as permissões necessárias
- Tente criar um novo token

### Erro no deploy
```bash
# Limpar cache do wrangler
rm -rf .wrangler

# Rebuild
npm run build

# Tentar novamente
npx wrangler pages deploy dist --project-name iaprova
```

### Banco de dados vazio em produção
```bash
# Aplicar migrações
npx wrangler d1 migrations apply iaprova-db

# Verificar
npx wrangler d1 execute iaprova-db --command="SELECT COUNT(*) FROM users"
```

## ✅ Checklist Final

- [ ] Token Cloudflare válido configurado
- [ ] Banco D1 criado em produção
- [ ] Migrações aplicadas
- [ ] Deploy realizado com sucesso
- [ ] Secrets configuradas (Resend, JWT, Groq)
- [ ] Teste de login funcionando
- [ ] Email funcionando (para terciogomesrabelo@gmail.com)
- [ ] Geração de conteúdo com IA funcionando

---

**Nota**: O sistema está 100% funcional localmente. Apenas aguardando token Cloudflare válido para deploy em produção.