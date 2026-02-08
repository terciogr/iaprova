# IAprova - Sistema Inteligente de Preparação para Concursos Públicos 🎯

Sistema web completo para preparação inteligente para concursos públicos, utilizando IA para análise de editais, geração de conteúdo personalizado e planos de estudo adaptativos.

## 🌟 Principais Funcionalidades

### 📋 Análise Inteligente de Editais
- **Upload de PDF/TXT** com extração automática de conteúdo
- **✨ Colar Texto do Edital** - Cole o conteúdo programático e a IA extrai disciplinas em ~10 segundos
- **Detecção automática de banca organizadora** (15 bancas brasileiras)
- **Identificação de disciplinas e tópicos** do edital
- **Peso por disciplina** baseado na análise do edital

### 🤖 Geração de Conteúdo com IA
- **5 tipos de conteúdo:**
  - 📘 **Teoria Completa** - Explicações detalhadas
  - 📗 **Exercícios** - Questões no estilo da banca
  - 📙 **Resumos** - Esquematizados e objetivos
  - 🎯 **Flashcards** - Para memorização rápida
  - 📄 **Resumo Personalizado** - Upload de PDF para gerar resumo

### 🏛️ Adaptação por Banca Organizadora
Sistema reconhece e adapta conteúdo para 15 bancas:
- CEBRASPE (Cespe/UnB)
- FCC - Fundação Carlos Chagas
- FGV - Fundação Getúlio Vargas
- VUNESP
- CESGRANRIO
- IDECAN
- INSTITUTO AOCP
- QUADRIX
- CONSULPLAN
- IBFC
- IADES
- CESPE CEBRASPE
- FUNCAB
- COPS-UEL
- NÚCLEO DE CONCURSOS UFPR

### 📅 Plano de Estudos Personalizado
- **Entrevista inicial** para conhecer o perfil do candidato
- **Cronograma semanal** com metas diárias
- **Tracking de progresso** por disciplina
- **Ajuste automático** baseado no desempenho

### 📊 Dashboard Completo
- **Visão geral** do progresso
- **Estatísticas** de estudo
- **Calendário** com metas semanais
- **Histórico** de conteúdos estudados

## 🛠️ Stack Tecnológico

### Backend
- **Hono Framework** - Web framework ultrarrápido
- **Cloudflare Workers** - Edge computing
- **TypeScript** - Type safety

### Frontend
- **HTML5/CSS3** - Interface moderna
- **Tailwind CSS** - Estilização responsiva
- **JavaScript Vanilla** - Sem dependências pesadas
- **Chart.js** - Gráficos e visualizações

### Banco de Dados
- **Cloudflare D1** - SQLite distribuído globalmente
- **Migrations** - Versionamento de schema

### Integrações
- **Groq AI** - LLM Llama 3.3 70B para geração de conteúdo
- **Google Gemini** - Fallback e análise avançada
- **Resend** - Sistema de email transacional

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Cloudflare (para deploy)
- Chaves de API (Groq, Gemini, Resend)

### Instalação Local

1. **Clone o repositório:**
```bash
git clone https://github.com/terciogr/iaprova.git
cd iaprova
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` com suas chaves:
```
GROQ_API_KEY=seu_token_aqui
GEMINI_API_KEY=seu_token_aqui
RESEND_API_KEY=seu_token_aqui
```

4. **Configure o banco de dados D1:**
```bash
# Criar banco de dados de produção
npx wrangler d1 create webapp-production

# Aplicar migrations localmente
npx wrangler d1 migrations apply webapp-production --local
```

5. **Inicie o servidor de desenvolvimento:**
```bash
npm run build
npm run dev:sandbox
```

Acesse: http://localhost:3000

## 📦 Deploy para Produção

### Cloudflare Pages

1. **Configure o Cloudflare:**
```bash
# Login no Cloudflare
npx wrangler login

# Configure o projeto
npx wrangler pages project create iaprova --production-branch main
```

2. **Build e Deploy:**
```bash
npm run build
npx wrangler pages deploy dist --project-name iaprova
```

3. **Configure secrets em produção:**
```bash
npx wrangler pages secret put GROQ_API_KEY --project-name iaprova
npx wrangler pages secret put GEMINI_API_KEY --project-name iaprova
npx wrangler pages secret put RESEND_API_KEY --project-name iaprova
```

## 🔧 Scripts Disponíveis

```json
{
  "dev": "Servidor de desenvolvimento com Vite",
  "dev:sandbox": "Desenvolvimento com Wrangler",
  "build": "Build para produção",
  "deploy": "Deploy para Cloudflare Pages",
  "db:migrate:local": "Aplicar migrations localmente",
  "db:migrate:prod": "Aplicar migrations em produção"
}
```

## 📁 Estrutura do Projeto

```
iaprova/
├── src/
│   ├── index.tsx           # Servidor principal Hono
│   ├── banca-analyzer.ts   # Análise de bancas
│   ├── gemini_prompt_master.ts # Prompts otimizados
│   └── services/
│       └── email.service.ts # Serviço de email
├── public/
│   ├── index.html          # Frontend principal
│   └── static/
│       ├── app.js          # Lógica do frontend
│       └── style.css       # Estilos customizados
├── migrations/             # Migrations do banco
├── wrangler.jsonc         # Configuração Cloudflare
├── package.json           # Dependências
└── README.md             # Este arquivo
```

## 🎨 Personalização

### Temas
O sistema suporta temas claro/escuro. Para personalizar cores, edite:
- `public/static/app.js` - Objeto `themes`
- `public/static/style.css` - Variáveis CSS

### Bancas
Para adicionar novas bancas, edite:
- `src/banca-analyzer.ts` - Adicione no array `BANCAS_CONFIG`
- `migrations/0024_add_banca_organizadora.sql` - Adicione na tabela

## 🔒 Segurança

- **Nunca commite** arquivos `.dev.vars` ou chaves de API
- Use **secrets do Cloudflare** para produção
- **Validação** de entrada em todos os endpoints
- **Rate limiting** automático pelo Cloudflare

## 👑 Painel Administrador

O sistema inclui um módulo de administração exclusivo para gestão da plataforma.

### Acesso
- **Restrito ao email**: terciogomesrabelo@gmail.com
- **Botão no FAB**: Ícone de escudo vermelho

### Funcionalidades
- **Dashboard** com métricas de usuários, planos, emails e metas
- **Gerenciamento de Usuários**: Listar, editar, atribuir premium, deletar
- **Controle de Planos**: Atribuir planos independente de pagamento
- **Histórico de Emails**: Verificação, boas-vindas, reset de senha
- **Estatísticas de Assinaturas**: Preparado para integração de pagamento

### Endpoints da API Admin
- `GET /api/admin/dashboard` - Estatísticas gerais
- `GET /api/admin/users` - Lista de usuários
- `PUT /api/admin/users/:id` - Atualizar usuário
- `POST /api/admin/users/:id/premium` - Atribuir premium
- `GET /api/admin/plans` - Planos disponíveis
- `GET /api/admin/emails` - Histórico de emails

## 🔄 Últimas Atualizações

### v2.0.0 (Fevereiro 2025)
- ✅ **Módulo Admin**: Painel completo de administração
- ✅ **Controle de Planos**: Admin pode atribuir planos a usuários
- ✅ **Mensagens de Erro**: Melhorias nas mensagens de erro (mais amigáveis e informativas)
- ✅ **Tratamento de PDF**: Fallback robusto com sugestões de conversão
- ✅ **Google OAuth**: Autenticação com Google implementada
- ✅ **Sistema de Email**: Integração completa com Resend
- ✅ **Domínio Próprio**: Migração para iaprova.app

## 📝 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📧 Contato

Para dúvidas ou sugestões sobre o sistema IAprova.

---

**Desenvolvido com ❤️ para democratizar a preparação para concursos públicos no Brasil**