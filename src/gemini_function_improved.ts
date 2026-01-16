// FUNÇÃO MELHORADA - Usar este código para substituir gerarConteudoComGPT
// Linhas 2914-3004 do index.tsx

import { buildGeminiMasterPrompt } from './gemini_prompt_master'

async function gerarConteudoComGPT(disciplina: string, tipo: string, tempo_minutos: number, dificuldade: string, contexto: any, env: any, userDisc: any = null, topicos: string[] = []) {
  const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    console.log('⚠️ GEMINI_API_KEY não configurada')
    return null
  }

  try {
    console.log('🤖 Gerando conteúdo com Gemini API (PROMPT MASTER PROFISSIONAL)...')
    
    const topico = topicos[0] || 'Fundamentos'
    
    // Usar o PROMPT MASTER profissional
    const { systemPrompt, userPrompt } = buildGeminiMasterPrompt({
      disciplina,
      topico,
      tipo: tipo as 'teoria' | 'exercicios' | 'revisao',
      tempo_minutos,
      dificuldade,
      contexto,
      userDisc
    })
    
    console.log(`📚 Disciplina: ${disciplina}`)
    console.log(`🎯 Tópico: ${topico}`)
    console.log(`📋 Tipo: ${tipo}`)
    console.log(`⏱️ Tempo: ${tempo_minutos} min`)
    console.log(`📊 Nível: ${dificuldade} (${userDisc?.nivel_atual || 5}/10)`)

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { 
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }] 
          }
        ],
        generationConfig: {
          temperature: 0.8,        // Criatividade moderada-alta
          maxOutputTokens: 8192,   // Máximo de tokens para conteúdo extenso
          topP: 0.95,              // Diversidade de vocabulário
          topK: 40                 // Seleção de tokens
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro na API Gemini:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('❌ Resposta vazia do Gemini')
      console.error('Dados recebidos:', JSON.stringify(data, null, 2))
      return null
    }

    console.log('📝 Resposta recebida do Gemini, parseando JSON...')
    console.log(`📏 Tamanho da resposta: ${text.length} caracteres`)
    
    // Limpar markdown se existir
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim()
    }
    
    // Tentar parsear JSON
    let resultado
    try {
      resultado = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON do Gemini')
      console.error('Primeiro 500 chars:', jsonText.substring(0, 500))
      console.error('Últimos 200 chars:', jsonText.substring(jsonText.length - 200))
      throw parseError
    }
    
    // Validar estrutura mínima
    if (!resultado.topicos || !resultado.objetivos || !resultado.conteudo?.secoes) {
      console.error('❌ JSON do Gemini inválido: faltam campos obrigatórios')
      console.error('Campos recebidos:', Object.keys(resultado))
      return null
    }
    
    console.log('✅ Conteúdo gerado com sucesso!')
    console.log(`📊 Estatísticas:`)
    console.log(`   - Tópicos: ${resultado.topicos?.length || 0}`)
    console.log(`   - Objetivos: ${resultado.objetivos?.length || 0}`)
    console.log(`   - Seções: ${resultado.conteudo?.secoes?.length || 0}`)
    if (tipo === 'exercicios' && resultado.conteudo?.secoes?.[0]?.conteudo?.questoes) {
      console.log(`   - Questões: ${resultado.conteudo.secoes[0].conteudo.questoes.length}`)
    }
    if (resultado.conteudo?.mnemonicos) {
      console.log(`   - Mnemônicos: ${resultado.conteudo.mnemonicos.length}`)
    }
    
    return resultado
    
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo com Gemini:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    return null
  }
}
