/**
 * PROMPT MASTER PARA GEMINI - CONCURSOS PÚBLICOS
 * 
 * Este arquivo contém o prompt profissional otimizado para geração
 * de conteúdo de altíssima qualidade para concursos públicos brasileiros.
 */

export function buildGeminiMasterPrompt(params: {
  disciplina: string
  topico: string
  tipo: 'teoria' | 'exercicios' | 'revisao'
  tempo_minutos: number
  dificuldade: string
  contexto: any
  userDisc: any
}): { systemPrompt: string; userPrompt: string } {
  
  const { disciplina, topico, tipo, tempo_minutos, dificuldade, contexto, userDisc } = params
  
  const nivelAluno = userDisc?.nivel_atual || 5
  const jaEstudou = userDisc?.ja_estudou ? 'Sim' : 'Não'
  const experiencia = contexto.experiencia || 'iniciante'
  
  // SYSTEM PROMPT - Define o agente especialista
  const systemPrompt = `Você é o PROFESSOR MESTRE EM CONCURSOS PÚBLICOS BRASILEIROS, com 20 anos de experiência em aprovações em concursos de alto nível (TJ, STJ, Receita Federal, Polícia Federal, Auditor Fiscal).

SUAS CREDENCIAIS:
- Aprovado em 15+ concursos públicos de elite
- Professor de cursinhos preparatórios renomados (Gran Cursos, Estratégia Concursos, CERS)
- Especialista em metodologias de estudo comprovadas (Pomodoro, Revisão Espaçada, Mapas Mentais)
- Conhecimento profundo de bancas: CESPE/CEBRASPE, FCC, FGV, VUNESP, IBFC
- Domínio de legislação atualizada e jurisprudência recente (STF, STJ, TST, TSE)

SEU OBJETIVO:
Criar material de estudo COMPLETO, DETALHADO e ESTRATÉGICO que prepare o aluno para APROVAÇÃO, não apenas para "passar na prova", mas para DOMINAR o conteúdo e se destacar entre os concorrentes.

PRINCÍPIOS FUNDAMENTAIS:
1. Profundidade Técnica: Conteúdo de alto nível, sem superficialidade
2. Contextualização Prática: Exemplos reais de questões e jurisprudência
3. Estratégia de Prova: Técnicas específicas por banca examinadora
4. Progressão Pedagógica: Do básico ao avançado, com revisão integrada
5. Memorização Ativa: Mnemônicos, esquemas, tabelas comparativas
6. Atualização Constante: Legislação recente, súmulas, informativos

FORMATO DE RESPOSTA:
Sempre retorne JSON válido, estruturado e completo, seguindo o schema fornecido.`

  // USER PROMPT - Missão específica com contexto completo
  const userPrompt = `🎯 MISSÃO: Gere material de estudo COMPLETO e ESTRATÉGICO para concursos públicos

📚 CONTEXTO DO ALUNO:
- Disciplina: ${disciplina}
- Tópico Específico: ${topico}
- Área de Concurso: ${contexto.area || 'Geral'} ${contexto.concurso ? `(${contexto.concurso})` : ''}
- Cargo Almejado: ${contexto.cargo || 'Diversos cargos'}
- Nível Atual do Aluno: ${nivelAluno}/10 (${dificuldade})
- Já Estudou Esta Disciplina: ${jaEstudou}
- Experiência com Concursos: ${experiencia}
- Tempo Disponível: ${tempo_minutos} minutos

📋 TIPO DE MATERIAL: ${tipo}

---

${getTipoInstructions(tipo, tempo_minutos, topico)}

---

## ADAPTAÇÃO POR NÍVEL:

${getNivelInstructions(nivelAluno)}

---

## FORMATO JSON OBRIGATÓRIO:

${getJSONSchema(tipo, tempo_minutos, topico)}

**CRÍTICO**: 
- Retorne APENAS JSON válido
- SEM markdown (\`\`\`json)
- SEM texto antes/depois
- ${tipo === 'teoria' ? 'Mínimo 2500 palavras no campo teoria_completa' : tipo === 'exercicios' ? 'Mínimo 10 questões completas' : 'Resumo executivo + 5+ mnemônicos'}
- Seja PROFUNDO, COMPLETO e ESTRATÉGICO`

  return { systemPrompt, userPrompt }
}

function getTipoInstructions(tipo: string, tempo_minutos: number, topico: string): string {
  if (tipo === 'teoria') {
    return `## GERE TEORIA COMPLETA (mínimo 2500 palavras):

a) **INTRODUÇÃO CONTEXTUALIZADA** (200 palavras):
   - Importância do tópico em editais recentes
   - Frequência de cobrança por banca (CESPE, FCC, FGV)
   - Alertas sobre "pegadinhas" comuns

b) **CONCEITOS FUNDAMENTAIS** (600 palavras):
   - Definições técnicas precisas (doutrina + lei)
   - Diferenciações cruciais
   - Fundamentos constitucionais/legais
   - Princípios norteadores

c) **DESENVOLVIMENTO TEÓRICO PROFUNDO** (1000 palavras):
   - Explicação detalhada ponto a ponto
   - Exemplos práticos contextualizados (mínimo 3)
   - Jurisprudência consolidada (se aplicável)
   - Súmulas e informativos recentes
   - Doutrinas majoritária e minoritária

d) **TABELAS E ESQUEMAS** (obrigatório):
   - Tabela comparativa (quando aplicável)
   - Esquema de memorização textual
   - Quadro-resumo de legislação

e) **MNEMÔNICOS** (mínimo 3):
   - Siglas criativas
   - Frases mnemônicas
   - Associações visuais

f) **ESTRATÉGIA POR BANCA**:
   - CESPE: pegadinhas típicas
   - FCC: estilo de cobrança
   - FGV: características

g) **ERROS COMUNS** (Top 3):
   - Confusões conceituais clássicas
   - Armadilhas recorrentes

h) **QUESTÕES COMENTADAS** (mínimo 3):
   - Questões reais de provas anteriores
   - Comentário DETALHADO (150+ palavras cada)

i) **PRÓXIMOS PASSOS**:
   - Cronograma de revisão
   - Tópicos relacionados`
  } else if (tipo === 'exercicios') {
    return `## GERE BATERIA DE QUESTÕES (mínimo 10 questões):

**FORMATO POR QUESTÃO:**

QUESTÃO X - Banca (Cargo, Ano)
Nível: básico/intermediário/avançado

📝 ENUNCIADO (mínimo 80 palavras):
[Enunciado contextualizado, situação-problema realista]

a) [Alternativa 1]
b) [Alternativa 2]
c) [Alternativa 3]
d) [Alternativa 4]
e) [Alternativa 5]

✅ GABARITO: X

📖 COMENTÁRIO DETALHADO (mínimo 150 palavras):
- Análise da questão
- Fundamentação legal/doutrinária
- Por que cada alternativa está certa/errada
- Dica estratégica

**DISTRIBUIÇÃO:**
- 4 questões BÁSICAS (conceitos fundamentais)
- 4 questões INTERMEDIÁRIAS (aplicação prática)
- 2 questões AVANÇADAS (jurisprudência, casos complexos)

**BANCAS VARIADAS:**
- 3 estilo CESPE/CEBRASPE
- 3 estilo FCC
- 2 estilo FGV
- 2 outras bancas (VUNESP, IBFC)`
  } else {
    return `## GERE MATERIAL DE REVISÃO (formato otimizado):

a) **RESUMO EXECUTIVO** (600 palavras):
   - Síntese dos pontos-chave
   - Bullet points para scan rápido

b) **MAPA MENTAL TEXTUAL**:
   - Estrutura hierárquica do conteúdo
   - Ramificações lógicas

c) **TABELA DE MEMORIZAÇÃO**:
   | Conceito | Definição | Exemplo | Legislação |

d) **MNEMÔNICOS MASTER** (mínimo 5)

e) **QUIZ DE FIXAÇÃO** (10 questões objetivas rápidas)

f) **JURISPRUDÊNCIA ESSENCIAL** (se aplicável):
   - Top 5 súmulas obrigatórias
   - Top 3 julgados recentes

g) **CHECKLIST DE DOMÍNIO**

h) **CRONOGRAMA DE REVISÃO ESPAÇADA**`
  }
}

function getNivelInstructions(nivelAluno: number): string {
  if (nivelAluno <= 3) {
    return `**NÍVEL INICIANTE** - Use:
- Linguagem didática e acessível
- Mais exemplos práticos e analogias
- Conceitos fundamentais passo-a-passo
- Menos jurisprudência, mais lei seca
- Questões diretas e literais`
  } else if (nivelAluno <= 6) {
    return `**NÍVEL INTERMEDIÁRIO** - Use:
- Linguagem técnica equilibrada
- Aprofundamento conceitual moderado
- Introdução de jurisprudência consolidada
- Questões de aplicação prática
- Comparações e diferenciações`
  } else {
    return `**NÍVEL AVANÇADO** - Use:
- Linguagem técnica especializada
- Máxima profundidade teórica
- Jurisprudência recente e polêmica
- Doutrinas minoritárias e debates
- Questões complexas e multidisciplinares`
  }
}

function getJSONSchema(tipo: string, tempo_minutos: number, topico: string): string {
  const questoesSchema = tipo === 'exercicios' ? `,
          "questoes": [
            {
              "numero": 1,
              "banca": "CESPE",
              "cargo": "Analista Judiciário",
              "ano": 2023,
              "nivel": "intermediario",
              "enunciado": "Enunciado completo e contextualizado com mínimo 80 palavras...",
              "alternativas": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D", "Alternativa E"],
              "gabarito": 0,
              "comentario": "## Análise Completa\\n\\n**O que a banca testou:** ...\\n\\n**Fundamentação:** Art. X da Lei Y...\\n\\n**Por que cada alternativa:** A) ERRADA porque... [mínimo 150 palavras TOTAL]"
            }
          ]` : ''
  
  return `{
  "topicos": ["${topico}", "Subtópico 1", "Subtópico 2"],
  "objetivos": [
    "Dominar o conceito ${topico} com profundidade técnica",
    "Diferenciar ${topico} de conceitos similares sem erros",
    "Resolver 90%+ das questões sobre ${topico} em provas"
  ],
  "conteudo": {
    "introducao": "Contextualização completa do tópico ${topico}, sua importância em editais recentes e frequência de cobrança por diferentes bancas. (mínimo 200 palavras)",
    "importancia_editais": "Este tópico aparece em X% dos editais de [área], sendo cobrado frequentemente por CESPE (estilo...), FCC (estilo...), FGV (estilo...)",
    "orientacoes": [
      "Dica estratégica 1: Como identificar este assunto em questões",
      "Dica estratégica 2: Palavras-chave que indicam cobrança deste tópico",
      "Dica estratégica 3: Armadilhas comuns das bancas sobre este tema"
    ],
    "secoes": [
      {
        "titulo": "Seção 1: Conceitos Fundamentais",
        "tempo_estimado": ${Math.ceil(tempo_minutos / 3)},
        "ordem": 1,
        "conteudo": {
          "teoria_completa": "# ${topico}\\n\\n## Introdução\\n\\nTexto introdutório...\\n\\n## Conceitos Fundamentais\\n\\n### Definição Legal\\nArt. X da Lei Y...\\n\\n### Doutrina\\nSegundo [Autor]...\\n\\n### Exemplos Práticos\\n1. Exemplo contextualizado...\\n\\n### Tabela Comparativa\\n| Conceito A | Conceito B |\\n|------------|------------|\\n| ...        | ...        |\\n\\n### Mnemônicos\\n- **SIGLA**: Significado de cada letra\\n\\n### Jurisprudência\\nSTF: Súmula X...\\n\\n[MÍNIMO ${tipo === 'teoria' ? '800' : '400'} PALAVRAS POR SEÇÃO]"${questoesSchema}
        }
      }
    ],
    "mnemonicos": [
      {
        "topico": "${topico}",
        "tecnica": "Sigla EXEMPLO",
        "descricao": "E - Item 1, X - Item 2, E - Item 3, M - Item 4, P - Item 5, L - Item 6, O - Item 7",
        "associacao": "Imagine uma situação visual para memorizar: [descrição criativa]"
      }
    ],
    "legislacao_aplicavel": [
      {
        "lei": "Nome completo da lei",
        "artigos": "Art. X, §Y",
        "texto_relevante": "Texto literal do artigo",
        "importancia": "Este artigo é base de 80% das questões sobre ${topico}"
      }
    ],
    "estrategias_banca": {
      "CESPE": "Como CESPE cobra ${topico}: geralmente através de [estilo]. Pegadinhas comuns: [lista]",
      "FCC": "Como FCC cobra ${topico}: prefere [abordagem]. Atenção para [pontos]",
      "FGV": "Como FGV cobra ${topico}: contextualiza através de [método]. Exige [competência]"
    },
    "erros_comuns": [
      "Erro 1: Confundir ${topico} com [conceito similar]",
      "Erro 2: Não conhecer a exceção da regra [específica]",
      "Erro 3: Desconhecer jurisprudência recente que modificou entendimento"
    ],
    "recursos_adicionais": [
      "📖 Livro recomendado: [Autor] - [Título] (Cap. X sobre ${topico})",
      "🎥 Vídeo-aula: [Canal/Professor] - Aula sobre ${topico}",
      "📄 Lei para leitura: [Lei X] - Arts. Y a Z",
      "⚖️ Súmulas: STF nº X, STJ nº Y sobre ${topico}"
    ],
    "proximos_passos": "1. Revisar este conteúdo em 24 horas (Revisão 1)\\n2. Resolver 20 questões sobre ${topico} (Fixação)\\n3. Estudar tópico relacionado: [Próximo Tópico Lógico]\\n4. Fazer simulado específico desta disciplina\\n5. Revisão 2 em 7 dias\\n6. Revisão 3 em 30 dias"
  }
}`
}
