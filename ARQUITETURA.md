# 🏗️ Arquitetura do IAprova

## 📋 Visão Geral

O **IAprova** é uma plataforma de preparação para concursos públicos com inteligência artificial. Foi desenvolvido como uma aplicação web moderna usando a arquitetura **Edge-First** (Serverless), hospedada inteiramente na **Cloudflare**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USUÁRIO (Browser/PWA)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE NETWORK                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloudflare Pages (CDN Global)                     │   │
│  │         Arquivos estáticos: HTML, CSS, JS, Imagens, PWA             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                        │                                    │
│                                        ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Cloudflare Workers (Backend)                      │   │
│  │              Hono Framework (TypeScript) - API REST                 │   │
│  │                     Roda no Edge (~300 POPs)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                    │                   │                    │               │
│                    ▼                   ▼                    ▼               │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Cloudflare D1      │  │  Cloudflare R2   │  │   APIs Externas      │  │
│  │   (SQLite Edge)      │  │ (Object Storage) │  │   - Google Gemini    │  │
│  │   Banco de Dados     │  │  Upload Editais  │  │   - Mercado Pago     │  │
│  │   Distribuído        │  │  PDFs, Imagens   │  │   - Resend (Email)   │  │
│  └──────────────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Stack Tecnológico

### Frontend
| Tecnologia | Função |
|------------|--------|
| **HTML5/CSS3** | Estrutura e estilos |
| **JavaScript (Vanilla)** | Lógica de interface (SPA) |
| **Tailwind CSS (CDN)** | Framework CSS utilitário |
| **Font Awesome** | Ícones |
| **Axios** | Requisições HTTP |
| **Chart.js** | Gráficos de progresso |
| **PWA** | Instalável como app |

### Backend
| Tecnologia | Função |
|------------|--------|
| **Hono** | Framework web leve para Edge |
| **TypeScript** | Linguagem tipada |
| **Cloudflare Workers** | Runtime serverless |
| **Vite** | Build tool |

### Banco de Dados
| Tecnologia | Função |
|------------|--------|
| **Cloudflare D1** | SQLite distribuído globalmente |

### Armazenamento
| Tecnologia | Função |
|------------|--------|
| **Cloudflare R2** | Storage S3-compatível para PDFs |

### Integrações
| Serviço | Função |
|---------|--------|
| **Google Gemini AI** | Geração de conteúdo, análise de editais |
| **Mercado Pago** | Pagamentos e assinaturas |
| **Resend** | Envio de emails transacionais |
| **Google OAuth** | Login social |

---

## 📁 Estrutura de Arquivos

```
iaprova/
├── src/                          # Código-fonte Backend
│   ├── index.tsx                 # API principal (Hono routes)
│   ├── types.ts                  # Tipos TypeScript
│   ├── renderer.tsx              # Renderização SSR
│   ├── banca-analyzer.ts         # Análise de bancas
│   ├── gemini_prompt_master.ts   # Prompts para IA
│   └── services/
│       └── email.service.ts      # Serviço de email
│
├── public/                       # Arquivos Estáticos
│   ├── static/
│   │   └── app.js               # Frontend SPA (~20k linhas)
│   ├── icons/                    # Ícones PWA
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service Worker
│
├── migrations/                   # Migrações D1
│   └── *.sql
│
├── dist/                         # Build de produção
│   ├── _worker.js                # Worker compilado
│   └── _routes.json              # Rotas Cloudflare
│
├── wrangler.jsonc                # Config Cloudflare
├── vite.config.ts                # Config Vite
├── tsconfig.json                 # Config TypeScript
├── package.json                  # Dependências
└── ecosystem.config.cjs          # Config PM2 (dev)
```

---

## 🗄️ Modelo de Dados (D1 SQLite)

### Tabelas Principais

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│     users       │      │    interviews    │      │   planos_estudo     │
├─────────────────┤      ├──────────────────┤      ├─────────────────────┤
│ id              │──┐   │ id               │──┐   │ id                  │
│ name            │  │   │ user_id ─────────│──┘   │ user_id             │
│ email           │  │   │ concurso_nome    │      │ interview_id ───────│
│ password_hash   │  │   │ cargo            │      │ diagnostico (JSON)  │
│ email_verified  │  │   │ area_geral       │      │ mapa_prioridades    │
│ google_id       │  │   │ tempo_disponivel │      │ data_prova          │
│ subscription    │  │   │ experiencia      │      │ ativo               │
└─────────────────┘  │   │ prazo_prova      │      └─────────────────────┘
                     │   └──────────────────┘               │
                     │                                       │
                     ▼                                       ▼
┌─────────────────────┐                         ┌─────────────────────┐
│  user_disciplinas   │                         │   semanas_estudo    │
├─────────────────────┤                         ├─────────────────────┤
│ id                  │                         │ id                  │
│ user_id             │                         │ plano_id            │
│ disciplina_id ──────│───┐                     │ numero_semana       │
│ ja_estudou          │   │                     │ data_inicio         │
│ nivel_atual         │   │                     │ tempo_total_minutos │
│ dificuldade         │   │                     │ ativa               │
└─────────────────────┘   │                     └─────────────────────┘
                          │                              │
                          ▼                              ▼
┌─────────────────────┐              ┌─────────────────────────────┐
│    disciplinas      │              │       metas_semana          │
├─────────────────────┤              ├─────────────────────────────┤
│ id                  │              │ id                          │
│ nome                │              │ semana_id                   │
│ area                │              │ disciplina_id               │
│ descricao           │              │ disciplina_nome             │
└─────────────────────┘              │ tipo (teoria/exerc/revisao) │
                                     │ tempo_minutos               │
                                     │ dia_semana                  │
                                     │ concluida                   │
                                     │ topicos_sugeridos (JSON)    │
                                     └─────────────────────────────┘
```

### Tabelas de Conteúdo IA

```
┌─────────────────────┐      ┌─────────────────────┐
│   conteudo_estudo   │      │      flashcards     │
├─────────────────────┤      ├─────────────────────┤
│ id                  │      │ id                  │
│ user_id             │      │ user_id             │
│ disciplina_id       │      │ disciplina_id       │
│ topico_nome         │      │ topico_nome         │
│ tipo (teoria/etc)   │      │ frente              │
│ conteudo (TEXT)     │      │ verso               │
│ formato             │      │ nivel_dificuldade   │
└─────────────────────┘      └─────────────────────┘

┌─────────────────────┐      ┌─────────────────────┐
│      editais        │      │  edital_disciplinas │
├─────────────────────┤      ├─────────────────────┤
│ id                  │      │ id                  │
│ user_id             │──┐   │ edital_id ──────────│
│ concurso_nome       │  │   │ disciplina_id       │
│ cargo               │  │   │ nome                │
│ arquivo_url (R2)    │  │   │ peso                │
│ status              │  │   │ ordem               │
└─────────────────────┘  │   └─────────────────────┘
                         │            │
                         │            ▼
                         │   ┌─────────────────────┐
                         │   │   edital_topicos    │
                         │   ├─────────────────────┤
                         └──►│ edital_disciplina_id│
                             │ nome                │
                             │ ordem               │
                             └─────────────────────┘
```

### Lista Completa de Tabelas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `interviews` | Entrevistas iniciais (diagnóstico) |
| `planos_estudo` | Planos de estudo gerados |
| `semanas_estudo` | Semanas de cada plano |
| `metas_semana` | Metas diárias da semana |
| `metas_diarias` | Metas antigas (legado) |
| `ciclos_estudo` | Ciclos de estudo (teoria/exercício) |
| `disciplinas` | Catálogo de disciplinas |
| `user_disciplinas` | Disciplinas do usuário |
| `user_topicos_progresso` | Progresso por tópico |
| `editais` | Editais enviados |
| `edital_disciplinas` | Disciplinas extraídas do edital |
| `edital_topicos` | Tópicos extraídos do edital |
| `conteudo_estudo` | Conteúdo gerado por IA |
| `conteudo_topicos` | Tópicos do conteúdo |
| `flashcards` | Flashcards gerados |
| `revisoes` | Histórico de revisões |
| `simulados_historico` | Histórico de simulados |
| `exercicios_resultados` | Resultados de exercícios |
| `materiais` | Materiais de estudo |
| `materiais_salvos` | Materiais salvos pelo usuário |
| `payment_plans` | Planos de pagamento |
| `user_subscriptions` | Assinaturas de usuários |
| `bancas_caracteristicas` | Perfis de bancas |
| `email_logs` | Log de emails enviados |
| `desempenho` | Métricas de desempenho |

---

## 🔄 Fluxo de Dados

### 1. Cadastro e Login
```
Usuário → POST /api/register → Criar user → Enviar email verificação
       → POST /api/login → Validar → Retornar user data
       → GET /api/auth/google → OAuth Google → Criar/atualizar user
```

### 2. Entrevista Inicial
```
Frontend → POST /api/interview
        → Salvar interview
        → Processar disciplinas
        → Gerar diagnóstico
        → Criar plano_estudo automaticamente
        → Gerar ciclos_estudo
        → Criar semana_estudo ativa
        → Retornar plano completo
```

### 3. Geração de Conteúdo com IA
```
Frontend → POST /api/gerar-conteudo
        → Montar prompt (banca + disciplina + tópico)
        → Chamar Google Gemini API
        → Processar resposta
        → Salvar em conteudo_estudo
        → Retornar conteúdo formatado
```

### 4. Upload de Edital
```
Frontend → POST /api/editais/upload
        → Salvar PDF no Cloudflare R2
        → Extrair texto do PDF
        → Enviar para Gemini (análise)
        → Extrair disciplinas e tópicos
        → Salvar em edital_disciplinas/edital_topicos
        → Retornar estrutura extraída
```

---

## 🌐 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/register` | Cadastro |
| POST | `/api/login` | Login |
| GET | `/api/verify-email/:token` | Verificar email |
| POST | `/api/forgot-password` | Esqueci senha |
| POST | `/api/reset-password` | Resetar senha |
| GET | `/api/auth/google` | OAuth Google |

### Usuários
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/users/:id` | Buscar usuário |
| PUT | `/api/users/:id` | Atualizar usuário |
| GET | `/api/user-disciplinas/:user_id` | Disciplinas do usuário |

### Entrevistas e Planos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/interview` | Criar entrevista |
| GET | `/api/planos/:user_id` | Listar planos |
| GET | `/api/planos/:plano_id/semana-ativa` | Semana ativa |
| PUT | `/api/planos/:plano_id/data-prova` | Atualizar data prova |

### Metas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/metas/semana/:semana_id` | Metas da semana |
| POST | `/api/metas/adicionar` | Adicionar meta |
| PUT | `/api/metas/editar-completo/:id` | Editar meta |
| PUT | `/api/metas/concluir/:id` | Concluir meta |
| DELETE | `/api/metas/excluir/:id` | Excluir meta |

### Conteúdo IA
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/gerar-conteudo` | Gerar teoria/resumo |
| POST | `/api/gerar-exercicios` | Gerar exercícios |
| POST | `/api/gerar-flashcards` | Gerar flashcards |
| POST | `/api/simulado/gerar` | Gerar simulado |

### Editais
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/editais/upload` | Upload de edital |
| GET | `/api/editais/:id/disciplinas` | Disciplinas do edital |
| DELETE | `/api/editais/:id` | Deletar edital |

### Pagamentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/mercadopago/create-preference` | Criar preferência |
| POST | `/api/mercadopago/webhook` | Webhook MP |
| GET | `/api/subscription/status/:user_id` | Status assinatura |

---

## ⚙️ Configuração de Ambiente

### Variáveis de Ambiente (Secrets)

```bash
# Configurar via Cloudflare Dashboard ou CLI
npx wrangler pages secret put GEMINI_API_KEY
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put MP_ACCESS_TOKEN
npx wrangler pages secret put GOOGLE_CLIENT_ID
npx wrangler pages secret put GOOGLE_CLIENT_SECRET
npx wrangler pages secret put JWT_SECRET
```

### Desenvolvimento Local

```bash
# Arquivo .dev.vars (não committar!)
GEMINI_API_KEY=sua-chave
RESEND_API_KEY=sua-chave
MP_ACCESS_TOKEN=sua-chave
```

---

## 🚀 Deploy

### Comandos de Deploy

```bash
# Build
npm run build

# Deploy para Cloudflare Pages
npx wrangler pages deploy dist --project-name iaprova

# Aplicar migrações D1
npx wrangler d1 migrations apply iaprova-db
```

### URLs

| Ambiente | URL |
|----------|-----|
| **Produção** | https://iaprova.app |
| **Preview** | https://*.iaprova.pages.dev |
| **API** | https://iaprova.app/api/* |

---

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (SPA)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Dashboard│ │Disciplina│ │ Conteúdo │ │ Simulado │           │
│  │   View   │ │   View   │ │   View   │ │   View   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│  ┌────┴────────────┴────────────┴────────────┴────┐            │
│  │              API Client (Axios)                 │            │
│  └─────────────────────┬───────────────────────────┘            │
└────────────────────────┼────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                     BACKEND (Hono + Workers)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Router (Hono)                         │  │
│  │  /api/auth/*  /api/planos/*  /api/metas/*  /api/ia/*     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────┐ ┌──────────┐ ┌┴─────────┐ ┌──────────┐          │
│  │   Auth   │ │  Planos  │ │  Metas   │ │    IA    │          │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │            │                  │
│  ┌────┴────────────┴────────────┴────────────┴────┐            │
│  │                 Database Layer (D1)             │            │
│  └─────────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Segurança

- **Autenticação**: JWT tokens + OAuth Google
- **Senhas**: Hash com bcrypt (via crypto-js)
- **CORS**: Configurado para domínio específico
- **Secrets**: Gerenciados via Cloudflare Secrets
- **HTTPS**: Forçado pela Cloudflare
- **Email verification**: Token único com expiração

---

## 📈 Escalabilidade

| Componente | Limite | Escalabilidade |
|------------|--------|----------------|
| **Workers** | 10ms CPU (free) / 30ms (paid) | Auto-escala global |
| **D1** | 500MB (free) / 10GB (paid) | Replicação automática |
| **R2** | 10GB (free) / Ilimitado (paid) | S3-compatible |
| **Requests** | 100k/dia (free) / Ilimitado (paid) | Edge global |

---

## 📝 Observações Importantes

1. **Não há servidor tradicional** - Tudo roda no Edge da Cloudflare
2. **Não há file system** - Arquivos são armazenados no R2
3. **Cold starts mínimos** - Workers iniciam em ~0ms
4. **Global por padrão** - Dados replicados em ~300 POPs
5. **Custo otimizado** - Pay-per-use, sem servidor ocioso

---

*Última atualização: Fevereiro 2026*
