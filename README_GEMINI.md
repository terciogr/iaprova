# 🤖 Integração com Google Gemini GEM

## Visão Geral

O IAprova v2.1 usa o **Google Gemini 2.0 Flash** para gerar material de estudo personalizado através do GEM "Professor de Concurso Público".

## 🔑 Como Configurar

### 1. Obter API Key do Google Gemini

1. Acesse: https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em "Get API Key"
4. Copie a chave gerada

### 2. Configurar Localmente (Desenvolvimento)

Edite o arquivo `.dev.vars` na raiz do projeto:

```bash
# .dev.vars
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Reinicie o servidor:**

```bash
cd /home/user/webapp
pm2 restart iaprova
```

### 3. Configurar em Produção (Cloudflare Pages)

```bash
cd /home/user/webapp
npx wrangler pages secret put GEMINI_API_KEY --project-name iaprova
# Cole sua API key quando solicitado
```

## 📊 Estrutura de Dados Enviada ao GEM

```json
{
  "disciplina": "Direito Administrativo",
  "tema": "Poderes da Administração",
  "nivel_aluno": 3,
  "ja_estudou": ["Poder Hierárquico"],
  "nao_estudou": ["Poder Disciplinar", "Poder Regulamentar"],
  "complexidade_edital": "alta",
  "tipo_de_estudo": "concurso",
  "concurso": "TCE-PI",
  "prazo": "45 dias",
  "tamanho_material": "médio"
}
```

## 📖 Estrutura Esperada do GEM

O GEM deve retornar um JSON com 9 pontos:

1. **Introdução** - Contextualização do tema
2. **Mapa** - O que já sabe vs. precisa aprender
3. **Teoria** - Conteúdo teórico completo (Markdown)
4. **Resumos** - Quadros-resumo e tabelas
5. **Jurisprudência** - Súmulas e decisões relevantes
6. **Exemplos** - Casos práticos e aplicações
7. **Questões** - 3-5 questões comentadas (CESPE, FCC, FGV)
8. **Checklist** - Lista de memorização
9. **Revisão** - Sugestão para próxima sessão

### Formato JSON de Saída

```json
{
  "topicos": ["Tópico 1", "Tópico 2"],
  "objetivos": ["Objetivo 1", "Objetivo 2"],
  "conteudo": {
    "introducao": "Texto introdutório...",
    "orientacoes": ["Orientação 1", "Orientação 2"],
    "secoes": [
      {
        "titulo": "Poderes da Administração",
        "tempo_estimado": 15,
        "ordem": 1,
        "conteudo": {
          "teoria_completa": "## Poder Hierárquico\n\n**Conceito:** ...",
          "questoes": [
            {
              "enunciado": "Sobre o poder hierárquico...",
              "alternativas": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
              "gabarito": 0,
              "explicacao": "A alternativa correta é A porque..."
            }
          ]
        }
      }
    ],
    "proximos_passos": "Recomendação para próximo estudo"
  }
}
```

## 🎯 Adaptação por Nível

- **Nível 0-3 (Básico):** Linguagem simples, analogias, exemplos claros
- **Nível 4-7 (Intermediário):** Esquemas, jurisprudência simplificada, mapas mentais
- **Nível 8-10 (Avançado):** Conteúdo técnico, jurisprudência complexa, questões difíceis

## 🔄 Fallback Automático

Se a API do Gemini não estiver configurada ou falhar:
- Sistema usa **conteúdo estático pré-programado**
- Exibe aviso no console: `⚠️ GEMINI_API_KEY não configurada, usando conteúdo estático`
- Aplicação continua funcionando normalmente

## 🐛 Debug

**Verificar se a API está funcionando:**

```bash
cd /home/user/webapp
pm2 logs iaprova --lines 50
```

**Logs importantes:**
- `🤖 Chamando Gemini GEM (Professor de Concurso Público)...` - Início da chamada
- `✅ Gemini GEM respondeu, parseando JSON...` - Sucesso
- `❌ Erro na API do Gemini: 400/401/403` - Problema com API key
- `⚠️ GEMINI_API_KEY não configurada` - Variável de ambiente ausente

## 📚 Referências

- Google AI Studio: https://aistudio.google.com
- Gemini API Docs: https://ai.google.dev/gemini-api/docs
- Link do GEM: https://gemini.google.com/gem/1uJPqfi6LCQv1mogcy3MZhqcJS0XhWEUz

## ⚠️ Notas Importantes

1. **Custo:** A API do Gemini tem limites gratuitos. Monitore o uso em: https://aistudio.google.com
2. **Rate Limits:** Máximo de 60 requisições por minuto (free tier)
3. **Tokens:** Cada geração consome ~3.000-6.000 tokens
4. **Segurança:** NUNCA commite o `.dev.vars` no git (já está no .gitignore)
