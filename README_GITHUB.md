# 🧠 IAprova - Sistema Inteligente de Preparação para Concursos Públicos

[![Status](https://img.shields.io/badge/Status-Pronto%20para%20Deploy-success)](https://github.com/terciogomesrabelo/iaprova)
[![Versão](https://img.shields.io/badge/Versão-v20.7-blue)](https://github.com/terciogomesrabelo/iaprova)
[![Framework](https://img.shields.io/badge/Framework-Hono-orange)](https://hono.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-f38020)](https://pages.cloudflare.com)
[![IA](https://img.shields.io/badge/IA-Groq%20Llama%203.3-green)](https://groq.com)

## 📋 Visão Geral

Plataforma brasileira completa de preparação personalizada para concursos públicos, com inteligência artificial adaptada ao perfil do candidato e cargo pretendido.

**Sistema 100% migrado e configurado - Pronto para deploy!**

## 🚀 Demonstração

- **Sandbox (Funcionando)**: https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
- **Produção**: `https://iaprova.pages.dev` (aguardando deploy)

### Credenciais de Teste
- **Email**: teste@iaprova.com
- **Senha**: 123456

## ✨ Funcionalidades Principais

### 1. 🎯 Entrevista Inicial Inteligente
- Upload de editais (PDF, TXT, XLSX)
- Extração automática de disciplinas e tópicos
- Avaliação personalizada por matéria
- Identificação de dificuldades e lacunas

### 2. 📚 Gerador de Planos de Estudo
- Planos semanais personalizados
- Distribuição inteligente de tempo
- Ciclos adaptados (teoria/exercícios/revisão)
- Baseado no nível de conhecimento

### 3. 📊 Dashboard Interativo
- KPIs principais (Streak, Dias, Horas, Média)
- Calendário compacto integrado
- Metas diárias com checklist
- Acompanhamento em tempo real

### 4. 🤖 Geração de Conteúdo com IA
- Integração com Groq (Llama 3.3 70B)
- Geração de resumos personalizados
- Exercícios e simulados
- Conteúdo adaptado ao cargo

### 5. 📅 Sistema de Metas Semanais
- Geração automática de metas
- Tracking de progresso
- Histórico de estudos
- Estatísticas detalhadas

## 🛠️ Tecnologias Utilizadas

### Backend
- **[Hono](https://hono.dev)** - Web framework ultrarrápido
- **[Cloudflare Workers](https://workers.cloudflare.com)** - Edge runtime
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - Banco de dados SQLite
- **TypeScript** - Type safety

### Frontend
- **HTML5/CSS3** - Interface responsiva
- **[TailwindCSS](https://tailwindcss.com)** - Estilização moderna
- **JavaScript Vanilla** - Sem frameworks pesados
- **[Chart.js](https://www.chartjs.org)** - Gráficos e visualizações

### Integrações
- **[Groq API](https://groq.com)** - LLM principal (Llama 3.3 70B) - GRÁTIS!
- **[Resend](https://resend.com)** - Serviço de email
- **Cloudflare R2** - Storage de arquivos

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Cloudflare (para deploy)

### Configuração Local

1. **Clone o repositório**
```bash
git clone https://github.com/terciogomesrabelo/iaprova.git
cd iaprova
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` e adicione suas chaves:
```env
# IA - Groq (GRÁTIS em https://console.groq.com/)
GROQ_API_KEY=gsk_sua_chave_aqui

# Email - Resend
RESEND_API_KEY=re_sua_chave_aqui

# JWT Secret
JWT_SECRET=seu_secret_jwt_aqui
```

4. **Configure o banco de dados local**
```bash
npx wrangler d1 migrations apply iaprova-db --local
```

5. **Build e inicie o servidor**
```bash
npm run build
npm run dev:sandbox
```

6. **Acesse**
```
http://localhost:3000
```

## 🚀 Deploy para Produção

### Opção 1: Deploy via CLI (Requer Cloudflare Token)

```bash
# Configure seu token
export CLOUDFLARE_API_TOKEN="seu_token_aqui"

# Execute o script de deploy
./deploy.sh
```

### Opção 2: Deploy Manual via Dashboard

1. Build o projeto: `npm run build`
2. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Vá em **Pages** > **Create a project**
4. Escolha **Upload assets**
5. Arraste a pasta `dist/`
6. Configure as variáveis de ambiente
7. Deploy!

Veja [DEPLOY_VIA_INTERFACE.md](./DEPLOY_VIA_INTERFACE.md) para instruções detalhadas.

## 📁 Estrutura do Projeto

```
iaprova/
├── src/
│   ├── index.tsx           # Backend principal (Hono)
│   ├── types.ts            # TypeScript types
│   └── services/           # Serviços
├── public/
│   ├── index.html          # Frontend
│   └── static/             # Assets
├── migrations/             # 30+ migrações SQL
├── dist/                   # Build de produção
├── .dev.vars              # Variáveis locais
├── wrangler.jsonc         # Config Cloudflare
└── ecosystem.config.cjs   # Config PM2
```

## 🗄️ Banco de Dados

- **100+ disciplinas** cadastradas
- **5000+ tópicos** de estudo detalhados
- **30+ migrações** aplicadas
- Dataset completo de concursos públicos

## 📊 Status do Sistema

| Componente | Status | Observação |
|------------|--------|------------|
| Backend | ✅ Funcionando | Hono + TypeScript |
| Frontend | ✅ Funcionando | HTML + TailwindCSS |
| Banco de Dados | ✅ Configurado | D1 SQLite |
| IA (Groq) | ✅ Testado | 447K tokens/seg |
| Email (Resend) | ✅ Testado | Funcionando |
| Build | ✅ Pronto | dist/ gerada |
| Deploy | ⏳ Aguardando | Manual via Dashboard |

## 🔑 APIs Necessárias

### Groq (IA) - GRÁTIS
1. Acesse: https://console.groq.com/
2. Crie conta gratuita
3. Gere API Key
4. Use no `.dev.vars`

### Resend (Email)
1. Acesse: https://resend.com/
2. Crie conta
3. Gere API Key
4. Use no `.dev.vars`

## 📝 Documentação

- [README.md](./README.md) - Documentação original completa
- [GUIA_USUARIO_FINAL.md](./GUIA_USUARIO_FINAL.md) - Manual do usuário
- [DEPLOY_VIA_INTERFACE.md](./DEPLOY_VIA_INTERFACE.md) - Deploy manual
- [INSTRUCOES_DEPLOY.md](./INSTRUCOES_DEPLOY.md) - Deploy via CLI

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Tercio Gomes Rabelo**
- GitHub: [@terciogomesrabelo](https://github.com/terciogomesrabelo)
- Email: terciogomesrabelo@gmail.com

## 🙏 Agradecimentos

- Cloudflare pela infraestrutura edge
- Groq pela API de IA gratuita
- Comunidade Hono pelo framework incrível

---

**⭐ Se este projeto te ajudou, considere dar uma estrela!**

---

<p align="center">Desenvolvido com ❤️ para ajudar candidatos brasileiros em concursos públicos</p>