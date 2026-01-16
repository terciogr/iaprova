# 🤖 Integração com Gemini GEM - Professor de Concurso Público

## 📚 Como Funciona

O IAprova agora pode gerar conteúdo **100% personalizado** usando o **Gemini GEM especializado** (https://gemini.google.com/gem/1uJPqfi6LCQv1mogcy3MZhqcJS0XhWEUz), que foi treinado especificamente para gerar materiais de estudo para concursos públicos.

### ✅ Funcionalidades do GEM

O GEM foi configurado com regras específicas para concursos:

1. **Adaptação ao Nível (0-10)**:
   - **0-3 (Iniciante)**: Linguagem simples, analogias, exemplos claros
   - **4-7 (Intermediário)**: Esquemas, jurisprudência simplificada, mapas mentais
   - **8-10 (Avançado)**: Conteúdo técnico, jurisprudência avançada, questões difíceis

2. **Considera o que já estudou**: Prioriza conteúdo novo, revisa o que já foi visto

3. **Estrutura Completa**:
   - Introdução personalizada
   - Mapa de conhecimento (sabe x falta)
   - Teoria explicada
   - Quadros-resumo
   - Jurisprudência relevante
   - Exemplos práticos
   - Questões comentadas (CESPE, FCC, FGV)
   - Checklist de memorização
   - Sugestão de revisão

4. **Contexto Personalizado**: Para concurso/cargo específico

5. **Fallback Automático**: Se API não configurada, usa conteúdo estático

---

## 🔧 Configuração da API Key

### Opção 1: Ambiente Local (Desenvolvimento)

1. Abra o arquivo `.dev.vars` na raiz do projeto
2. Descomente e configure suas chaves:

```bash
# .dev.vars
OPENAI_API_KEY=gsk-xxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://www.genspark.ai/api/llm_proxy/v1
```

3. Reinicie o servidor:
```bash
pm2 restart iaprova
```

### Opção 2: Produção (Cloudflare Pages)

1. Acesse o dashboard do Cloudflare Pages
2. Vá em **Settings** > **Environment Variables**
3. Adicione:
   - `OPENAI_API_KEY`: sua chave da API
   - `OPENAI_BASE_URL`: `https://www.genspark.ai/api/llm_proxy/v1`
4. Faça redeploy do projeto

---

## 🧪 Como Testar

### 1. **Sem API Key (Fallback Estático)**

Se você não configurar a API key, o sistema usa o conteúdo estático:

```bash
# Gerar conteúdo
curl -X POST http://localhost:3000/api/conteudo/gerar \
  -H "Content-Type: application/json" \
  -d '{
    "meta_id": 50,
    "user_id": 4,
    "disciplina_id": 1,
    "tipo": "teoria",
    "tempo_minutos": 30
  }'
```

**Log esperado:**
```
⚠️ OpenAI não configurado, usando conteúdo estático
```

### 2. **Com API Key (GPT Real)**

Configure a API key no `.dev.vars` e teste:

**Log esperado:**
```
🤖 Chamando GPT para gerar conteúdo...
✅ GPT respondeu, parseando JSON...
✅ JSON parseado com sucesso!
✅ Conteúdo gerado com GPT!
```

---

## 📝 Formato do Prompt

O sistema envia este tipo de prompt para o GPT:

```
Você é um Professor de Concurso Público especializado. Gere material de estudo para:

**Disciplina:** Direito Tributário
**Tipo de conteúdo:** Aula teórica completa
**Tempo de estudo:** 30 minutos
**Nível do aluno:** intermediário
**Contexto:** Área: fiscal

**Gere uma aula completa com:**
1. Introdução ao tema
2. Conceitos fundamentais (explicação detalhada)
3. Exemplos práticos e aplicações
4. Dicas de memorização
5. 3-5 questões de múltipla escolha (5 alternativas) com gabarito e explicação completa

**Formato da teoria:** Use Markdown com ## para títulos, ### para subtítulos, **negrito** para destaques, e listas numeradas.

**IMPORTANTE:**
- Seja direto e objetivo
- Use linguagem clara
- Adapte para o nível intermediário
- Questões devem ser estilo CESPE, FCC, FGV

**Retorne APENAS um JSON válido neste formato:**
{
  "topicos": ["Tópico 1", "Tópico 2"],
  "objetivos": ["Objetivo 1", "Objetivo 2"],
  "conteudo": {
    "introducao": "...",
    "secoes": [
      {
        "titulo": "...",
        "conteudo": {
          "teoria_completa": "## Título\n\nTexto...",
          "questoes": [...]
        }
      }
    ]
  }
}
```

---

## 🎯 Exemplo de Resposta do GPT

```json
{
  "topicos": [
    "Sistema Tributário Nacional",
    "Princípios do Direito Tributário",
    "Competência Tributária"
  ],
  "objetivos": [
    "Compreender a estrutura do STN",
    "Dominar os princípios constitucionais"
  ],
  "conteudo": {
    "introducao": "Nesta aula, abordaremos os fundamentos do Direito Tributário...",
    "orientacoes": [
      "Faça anotações dos artigos da CF/88",
      "Resolva as questões ao final"
    ],
    "secoes": [
      {
        "titulo": "Sistema Tributário Nacional",
        "tempo_estimado": 10,
        "ordem": 1,
        "conteudo": {
          "teoria_completa": "## Sistema Tributário Nacional\n\nO STN está previsto nos arts. 145 a 162 da CF/88...",
          "questoes": [
            {
              "enunciado": "Sobre o STN, assinale a alternativa CORRETA:",
              "alternativas": [
                "A União pode instituir taxas...",
                "Os impostos são vinculados...",
                "...",
                "...",
                "..."
              ],
              "gabarito": 0,
              "explicacao": "Correta a alternativa A. Conforme art. 145, II da CF/88..."
            }
          ]
        }
      }
    ],
    "proximos_passos": "Revise os artigos da CF/88 e resolva mais questões."
  }
}
```

---

## 🚀 Benefícios

### Sem API Key (Conteúdo Estático)
✅ Funciona offline  
✅ Sem custo  
✅ Conteúdo limitado (disciplinas principais)  
⚠️ Menos questões (2-4 por tópico)  

### Com API Key (GPT Real)
✅ Conteúdo ilimitado  
✅ Personalizado para qualquer disciplina  
✅ Mais questões (5-10 por tópico)  
✅ Adaptado ao concurso/cargo específico  
💰 Custo da API OpenAI (pequeno)  

---

## 💡 Dicas

1. **Custos**: O GPT-5 tem custo por token. Para 1 aula de 30min, gasta ~2000-4000 tokens (±$0.01-0.02)
2. **Cache**: O conteúdo é salvo no banco, então só gera 1x por meta
3. **Modelos**: Você pode testar com `gpt-5-mini` (mais barato) editando o código:
   ```typescript
   model: 'gpt-5-mini',  // ao invés de 'gpt-5'
   ```

---

## 🐛 Troubleshooting

### Erro: "OpenAI não configurado"
- Verifique se o `.dev.vars` está configurado
- Reinicie o servidor PM2

### Erro: "Invalid API key"
- Verifique se a chave está correta
- Teste manualmente: `curl https://www.genspark.ai/api/llm_proxy/v1/models -H "Authorization: Bearer gsk-xxx"`

### GPT retorna erro de parsing
- O GPT pode retornar JSON inválido às vezes
- O sistema tem fallback automático para conteúdo estático
- Confira os logs: `pm2 logs iaprova`

---

## 📊 Status Atual

✅ **Backend pronto** - Integração funcionando  
✅ **Fallback ativo** - Funciona sem API key  
✅ **Prompts otimizados** - Específicos para concursos  
⏳ **API key** - Usuário precisa configurar (opcional)  

---

**Qualquer dúvida, consulte os logs:** `pm2 logs iaprova --lines 100`
