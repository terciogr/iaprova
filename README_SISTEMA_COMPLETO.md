# 🧠 IAprova - Sistema Completo Migrado

## 📌 Status da Migração: ✅ COMPLETO

**Data da Migração**: 15/01/2026  
**Versão**: v20.7  
**Status**: 🟢 **100% Funcional e Rodando**

## 🌐 URLs de Acesso

- **Aplicação Local (Sandbox)**: https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
- **Usuário de Teste**: 
  - Email: teste@iaprova.com
  - Senha: 123456

## 🎯 Funcionalidades Migradas

### ✅ Sistema Completo Implementado

1. **Entrevista Inicial Inteligente**
   - Upload de editais (PDF, TXT, XLSX)
   - Extração automática de disciplinas
   - Avaliação personalizada por matéria
   - Identificação de dificuldades e lacunas

2. **Gerador de Planos de Estudo**
   - Planos semanais personalizados
   - Distribuição inteligente de tempo
   - Ciclos adaptados (teoria/exercícios/revisão)
   - Baseado no nível de conhecimento

3. **Dashboard Interativo**
   - KPIs principais (Streak, Dias, Horas, Média)
   - Calendário compacto integrado
   - Metas diárias com checklist
   - Acompanhamento em tempo real

4. **Geração de Conteúdo com IA**
   - Integração com Groq API (Llama 3.3 70B)
   - Geração de resumos personalizados
   - Exercícios e simulados
   - Conteúdo adaptado ao cargo

5. **Sistema de Metas Semanais**
   - Geração automática de metas
   - Tracking de progresso
   - Histórico de estudos
   - Estatísticas detalhadas

6. **Calendário de Estudos**
   - Visualização mensal colorida
   - Status por cores (verde/amarelo/vermelho)
   - Detalhes ao passar o mouse
   - Cálculo de streak automático

## 📁 Estrutura do Projeto

```
/home/user/webapp/
├── src/
│   ├── index.tsx (459KB) - Backend principal Hono
│   ├── types.ts - Definições TypeScript
│   ├── gemini_prompt_master.ts - Prompts IA
│   └── services/
│       └── email.service.ts - Serviço de email
├── public/
│   ├── index.html - Frontend principal
│   └── static/
│       └── app.js - JavaScript frontend
├── migrations/ - 30+ migrações de banco de dados
│   ├── 0001_initial_schema.sql
│   ├── 0012_popular_topicos_dataset.sql (687KB)
│   └── ... (30 arquivos de migração)
├── docs/ - Documentação completa
├── .dev.vars - Variáveis de ambiente
├── wrangler.jsonc - Config Cloudflare
└── ecosystem.config.cjs - Config PM2
```

## 🗄️ Banco de Dados

### Tabelas Principais
- **users**: Usuários do sistema
- **entrevistas**: Dados das entrevistas
- **planos_estudo**: Planos gerados
- **disciplinas**: 100+ disciplinas cadastradas
- **topicos**: 5000+ tópicos de estudo
- **metas_semanais**: Sistema de metas
- **materiais_salvos**: Conteúdos gerados
- **calendario_estudos**: Histórico de estudos
- **editais**: Editais processados

### Dados Populados
- ✅ 100+ disciplinas básicas
- ✅ 5000+ tópicos detalhados
- ✅ Dataset completo de concursos
- ✅ Usuário de teste criado

## 🔧 Tecnologias Utilizadas

### Backend
- **Hono Framework** - Web framework ultrarrápido
- **Cloudflare Workers** - Edge runtime
- **Cloudflare D1** - Banco de dados SQLite
- **TypeScript** - Type safety

### Frontend
- **HTML5/CSS3** - Interface responsiva
- **TailwindCSS** - Estilização moderna
- **JavaScript Vanilla** - Sem frameworks pesados
- **Chart.js** - Gráficos e visualizações
- **FontAwesome** - Ícones

### IA e APIs
- **Groq API** - LLM principal (Llama 3.3 70B)
- **Suporte Gemini/OpenAI** - APIs alternativas
- **Resend** - Serviço de email

## 🚀 Como Executar

### Desenvolvimento Local

```bash
# 1. Instalar dependências (já feito)
npm install

# 2. Configurar variáveis de ambiente
# Edite .dev.vars com suas chaves:
# GROQ_API_KEY=gsk_sua_chave
# RESEND_API_KEY=re_sua_chave

# 3. Aplicar migrações (já feito)
npx wrangler d1 migrations apply iaprova-db --local

# 4. Buildar projeto (já feito)
npm run build

# 5. Iniciar servidor (já rodando)
pm2 start ecosystem.config.cjs

# 6. Acessar aplicação
# https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
```

### Comandos Úteis

```bash
# Ver logs
pm2 logs iaprova --nostream

# Reiniciar servidor
pm2 restart iaprova

# Parar servidor
pm2 stop iaprova

# Status
pm2 status

# Console do banco
npx wrangler d1 execute iaprova-db --local

# Rebuild
npm run build
```

## 📊 Recursos Implementados

### v20.7 - Versão Atual
- ✅ Sistema 100% funcional
- ✅ Disciplinas do diagnóstico corrigidas
- ✅ Metas semanais funcionando
- ✅ Múltiplas semanas ativas corrigidas
- ✅ Upload XLSX implementado
- ✅ Campo "peso da prova" funcional
- ✅ Integração com Groq API

## 🔑 Configuração de API Keys

### Groq (Recomendado - GRÁTIS)
1. Acesse: https://console.groq.com/
2. Crie conta gratuita
3. Gere API Key
4. Configure em `.dev.vars`: `GROQ_API_KEY=gsk_...`

### Alternativas
- **Gemini**: `GEMINI_API_KEY=...`
- **OpenAI**: `OPENAI_API_KEY=...`

## 📝 Notas Importantes

1. **Banco de Dados**: Usando D1 local (SQLite) no modo desenvolvimento
2. **Autenticação**: Sistema de login funcional com JWT
3. **Email**: Configurado para Resend (necessita API key para funcionar)
4. **IA**: Groq configurado como padrão (mais rápido e gratuito)
5. **Storage**: R2 configurado para upload de editais

## 🐛 Troubleshooting

### Servidor não inicia
```bash
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete all
pm2 start ecosystem.config.cjs
```

### Banco de dados vazio
```bash
npx wrangler d1 migrations apply iaprova-db --local
```

### Erro de build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Documentação Adicional

- **README.md** - Documentação original do projeto
- **GUIA_USUARIO_FINAL.md** - Guia para usuários
- **SISTEMA_STATUS.md** - Status detalhado
- **docs/EMAIL_SETUP.md** - Configuração de email

## ✅ Checklist de Migração

- [x] Clonar repositório original
- [x] Migrar estrutura de arquivos
- [x] Instalar dependências
- [x] Configurar banco de dados D1
- [x] Aplicar todas as migrações
- [x] Criar usuário de teste
- [x] Configurar variáveis de ambiente
- [x] Buildar projeto
- [x] Iniciar servidor com PM2
- [x] Testar aplicação
- [x] Documentar processo

## 🎉 Resultado Final

**Sistema IAprova completamente migrado e funcional!**

- ✅ Todos os arquivos do GitHub migrados
- ✅ Banco de dados configurado e populado
- ✅ Aplicação rodando em https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
- ✅ Sistema pronto para uso e desenvolvimento

---

**Desenvolvido com ❤️ - Sistema IAprova v20.7**