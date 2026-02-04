import { identificarBanca, ajustarPromptParaBanca, getCaracteristicasBanca } from './banca-analyzer'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'
// EmailService movido para funções inline com templates atualizados

// ✅ FUNÇÃO PARA PDFs GRANDES - USA FILES API DO GEMINI
async function extractLargePDFWithFilesAPI(pdfBytes: Uint8Array, geminiKey: string): Promise<string> {
  console.log('🚀 Usando Files API do Gemini para PDF grande...')
  
  // PASSO 1: Upload do arquivo para o Gemini Files API
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`
  
  // Criar FormData com o arquivo
  const formData = new FormData()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  formData.append('file', blob, 'edital.pdf')
  
  console.log('📤 Fazendo upload do PDF para Gemini Files API...')
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'multipart',
    },
    body: formData
  })
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    console.error('❌ Erro no upload:', uploadResponse.status, errorText)
    throw new Error(`Falha no upload: ${uploadResponse.status}`)
  }
  
  const uploadData = await uploadResponse.json() as any
  const fileUri = uploadData.file?.uri
  
  if (!fileUri) {
    console.error('❌ URI do arquivo não retornada:', uploadData)
    throw new Error('URI do arquivo não retornada pelo Gemini')
  }
  
  console.log('✅ Upload concluído. URI:', fileUri)
  
  // PASSO 2: Aguardar processamento do arquivo (pode levar alguns segundos)
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  let fileReady = false
  let attempts = 0
  
  while (!fileReady && attempts < 30) {
    await sleep(2000)
    attempts++
    
    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${uploadData.file.name}?key=${geminiKey}`
    )
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json() as any
      console.log(`📊 Status do arquivo (tentativa ${attempts}): ${statusData.state}`)
      
      if (statusData.state === 'ACTIVE') {
        fileReady = true
      } else if (statusData.state === 'FAILED') {
        throw new Error('Processamento do arquivo falhou')
      }
    }
  }
  
  if (!fileReady) {
    throw new Error('Timeout aguardando processamento do arquivo')
  }
  
  // PASSO 3: Gerar conteúdo usando o arquivo
  console.log('📝 Gerando extração do texto com Gemini...')
  
  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
  
  const generateResponse = await fetch(generateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            file_data: {
              mime_type: 'application/pdf',
              file_uri: fileUri
            }
          },
          {
            text: `EXTRAIA O CONTEÚDO PROGRAMÁTICO COMPLETO deste edital de concurso.

FOCO: Vá direto para os ANEXOS (geralmente Anexo II ou III) que contêm o CONTEÚDO PROGRAMÁTICO.

EXTRAIA:
1. TODAS as disciplinas (Português, Raciocínio Lógico, Informática, Conhecimentos Específicos, etc.)
2. TODOS os tópicos de cada disciplina
3. O quadro de provas com pesos se houver

TRANSCREVA literalmente. NÃO resuma. NÃO comente.

INICIE A TRANSCRIÇÃO:`
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 65536
      }
    })
  })
  
  if (!generateResponse.ok) {
    const errorText = await generateResponse.text()
    console.error('❌ Erro na geração:', generateResponse.status, errorText)
    throw new Error(`Falha na geração: ${generateResponse.status}`)
  }
  
  const generateData = await generateResponse.json() as any
  const texto = generateData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  console.log(`✅ Texto extraído: ${texto.length} caracteres`)
  
  // PASSO 4: Deletar o arquivo do Gemini (limpeza)
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${uploadData.file.name}?key=${geminiKey}`,
      { method: 'DELETE' }
    )
    console.log('🗑️ Arquivo temporário deletado do Gemini')
  } catch (e) {
    console.warn('⚠️ Falha ao deletar arquivo temporário (não crítico)')
  }
  
  return texto
}

// ✅✅✅ FUNÇÃO OTIMIZADA DE EXTRAÇÃO DE PDF - RÁPIDA E EFICIENTE
async function extractTextFromPDF(pdfBuffer: ArrayBuffer, geminiKey: string): Promise<string> {
  console.log('⚡ Iniciando extração de texto do PDF com Gemini API...')
  
  const bytes = new Uint8Array(pdfBuffer)
  const fileSizeMB = bytes.length / (1024 * 1024)
  console.log(`📄 PDF: ${bytes.length} bytes (${fileSizeMB.toFixed(2)} MB)`)
  
  // Para PDFs muito grandes (>10MB), tentar usar Files API do Gemini
  if (fileSizeMB > 10) {
    console.log(`📦 PDF grande (${fileSizeMB.toFixed(1)}MB) - usando Files API do Gemini...`)
    try {
      const textoGrande = await extractLargePDFWithFilesAPI(bytes, geminiKey)
      if (textoGrande && textoGrande.length > 500) {
        return textoGrande
      }
    } catch (largeError) {
      console.warn(`⚠️ Files API falhou, tentando método padrão...`, largeError)
    }
  }
  
  // Converter para base64 de forma otimizada
  let binary = ''
  const len = bytes.length
  const chunkSize = 8192
  
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  const base64 = btoa(binary)
  
  console.log(`📄 Base64: ${base64.length} caracteres`)
  
  // Limite aumentado para 30MB em base64 (~22MB arquivo real)
  if (base64.length > 40000000) {
    throw new Error(`PDF muito grande (${fileSizeMB.toFixed(1)}MB). Converta para TXT em smallpdf.com`)
  }
  
  // ✅ PROMPT OTIMIZADO PARA EDITAIS DE CONCURSOS - EXTRAÇÃO COMPLETA DOS ANEXOS
  const promptOtimizado = `VOCÊ ESTÁ EXTRAINDO UM EDITAL DE CONCURSO PÚBLICO BRASILEIRO.

🎯 MISSÃO CRÍTICA: EXTRAIR O CONTEÚDO PROGRAMÁTICO DOS ANEXOS

⚠️ IMPORTANTE: O Conteúdo Programático SEMPRE está nos ANEXOS (geralmente Anexo II ou III)
- NÃO extraia as primeiras páginas (são instruções gerais)
- VÁ DIRETO para os ANEXOS no final do documento
- PROCURE por: "ANEXO II - CONTEÚDO PROGRAMÁTICO" ou "CONTEÚDO DAS DISCIPLINAS"

📋 O QUE EXTRAIR (em ordem de prioridade):

1. QUADRO DE PROVAS (peso e questões):
   - Estrutura da prova objetiva
   - Peso de Conhecimentos Gerais vs Específicos
   - Número de questões por disciplina

2. CONTEÚDO PROGRAMÁTICO COMPLETO:
   - TODAS as disciplinas listadas
   - TODOS os tópicos de cada disciplina
   - Estrutura: DISCIPLINA: tópico 1, tópico 2, etc.

3. DISCIPLINAS TÍPICAS A ENCONTRAR:
   - CONHECIMENTOS GERAIS: Português, Raciocínio Lógico, Informática, Atualidades, Legislação
   - CONHECIMENTOS ESPECÍFICOS: depende do cargo (Enfermagem, SUS, Saúde, etc.)

📄 FORMATO DE SAÍDA:
Transcreva literalmente o conteúdo programático encontrado nos anexos.
NÃO resuma. NÃO comente. Apenas transcreva.

INICIE A TRANSCRIÇÃO DO CONTEÚDO PROGRAMÁTICO (ANEXOS):`

  // ✅ ESTRATÉGIAS COM MÚLTIPLOS MODELOS E RETRIES
  const estrategias = [
    { prompt: promptOtimizado, modelo: 'gemini-2.5-flash', desc: 'Lite (tentativa 1)' },
    { prompt: promptOtimizado, modelo: 'gemini-2.5-flash', desc: 'Flash (tentativa 1)' },
    { prompt: promptOtimizado, modelo: 'gemini-2.5-flash', desc: 'Flash Exp' },
    { prompt: promptOtimizado, modelo: 'gemini-2.5-flash', desc: 'Lite (tentativa 2)' },
    { prompt: promptOtimizado, modelo: 'gemini-2.5-flash', desc: 'Flash (tentativa 2)' }
  ]
  
  let melhorTexto = ''
  let allErrors: string[] = []
  let consecutiveRateLimits = 0
  
  // Função para delay
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  
  for (let i = 0; i < estrategias.length; i++) {
    const estrategia = estrategias[i]
    console.log(`\n🚀 Tentativa ${i + 1}/${estrategias.length}: ${estrategia.desc}`)
    
    // Se já teve muitos rate limits consecutivos, aguardar mais
    if (consecutiveRateLimits >= 2) {
      console.log(`   ⏳ Aguardando 5s devido a rate limits consecutivos...`)
      await sleep(5000)
    }
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${estrategia.modelo}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: estrategia.prompt },
                { inline_data: { mime_type: 'application/pdf', data: base64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.01,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 65536
            }
          })
        }
      )
      
      console.log(`   📡 Status: ${response.status}`)
      
      // ✅ Rate limit ou serviço indisponível - aguardar e tentar próximo
      if (response.status === 429 || response.status === 503) {
        consecutiveRateLimits++
        const waitTime = Math.min(consecutiveRateLimits * 2000, 10000)
        console.log(`   ⏩ Erro ${response.status} - aguardando ${waitTime/1000}s antes do próximo...`)
        await sleep(waitTime)
        continue
      }
      
      // Reset contador se não foi rate limit
      consecutiveRateLimits = 0
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`   ❌ Erro ${response.status}: ${errorText.substring(0, 100)}`)
        allErrors.push(`Erro ${response.status}`)
        continue
      }
      
      const data = await response.json() as any
      
      // Validação simples
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error(`   ❌ Resposta inválida`)
        allErrors.push('Resposta inválida')
        continue
      }
      
      const texto = data.candidates[0].content.parts[0].text
      
      // Validação mínima de tamanho
      if (texto.length < 500) {
        console.error(`   ❌ Texto muito curto: ${texto.length} chars`)
        allErrors.push(`Texto curto (${texto.length})`)
        continue
      }
      
      console.log(`   ✅ Extraído: ${texto.length} caracteres`)
      
      // ✅ RETORNAR IMEDIATAMENTE se texto for válido (sem validações complexas)
      if (texto.length >= 1000) {
        console.log(`   🎯 SUCESSO! Retornando texto extraído.`)
        return texto
      }
      
      // Guardar como backup
      if (texto.length > melhorTexto.length) {
        melhorTexto = texto
      }
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Erro: ${msg}`)
      allErrors.push(msg)
    }
  }
  
  // ✅ Retornar melhor resultado se houver
  if (melhorTexto.length >= 500) {
    console.log(`\n✅ Retornando melhor resultado: ${melhorTexto.length} caracteres`)
    return melhorTexto
  }
  
  // ❌ Falha total
  console.error('\n❌ FALHA - Todas as tentativas falharam')
  throw new Error(
    `Falha ao extrair texto do PDF.\n` +
    `Erros: ${allErrors.join(', ')}\n\n` +
    `SOLUÇÕES:\n` +
    `1. ✅ RECOMENDADO: Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n` +
    `2. Use um arquivo XLSX com o cronograma de estudos\n` +
    `3. Aguarde 2-3 minutos (possível rate limit da API Gemini)`
  )
}

// Função para extrair disciplinas e tópicos de um arquivo XLSX (cronograma)
async function extractFromXLSX(xlsxBuffer: ArrayBuffer): Promise<{ disciplinas: Array<{ nome: string, topicos: string[] }> }> {
  try {
    console.log('📊 Iniciando extração de disciplinas e tópicos do XLSX...')
    
    // Ler o arquivo XLSX
    const workbook = XLSX.read(xlsxBuffer, { type: 'array' })
    
    // Verificar se a planilha "Cronograma Intercalado" existe
    const sheetName = 'Cronograma Intercalado'
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error('Planilha "Cronograma Intercalado" não encontrada no arquivo')
    }
    
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
    
    console.log(`📄 Lendo ${rows.length} linhas da planilha "${sheetName}"`)
    
    // Estrutura para agrupar disciplinas e tópicos
    const disciplinasMap = new Map<string, Set<string>>()
    
    // Processar linhas (pular cabeçalho na linha 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      
      // Colunas: [Semana, Período, Fase, Data, Dia, Tópico, Disciplina, Horas, Descrição]
      const topico = row[5]?.toString().trim() || ''
      const disciplina = row[6]?.toString().trim() || ''
      
      // Ignorar linhas vazias ou inválidas
      if (!topico || !disciplina || disciplina === 'Disciplina') continue
      
      // Ignorar disciplinas auxiliares (Revisão, Prática, Simulado, PROVA)
      const disciplinasIgnoradas = ['Revisão', 'Prática', 'Simulado', 'PROVA']
      if (disciplinasIgnoradas.includes(disciplina)) continue
      
      // Adicionar à estrutura
      if (!disciplinasMap.has(disciplina)) {
        disciplinasMap.set(disciplina, new Set())
      }
      
      // Limpar tópicos com prefixos especiais (⭐, ✅, etc.)
      const topicoLimpo = topico.replace(/^[⭐✅❌📌🔥💡]+\s*/, '').trim()
      
      if (topicoLimpo && topicoLimpo.length > 3) {
        disciplinasMap.get(disciplina)!.add(topicoLimpo)
      }
    }
    
    // 🎯 AGRUPAMENTO INTELIGENTE: Mapear para estrutura do edital
    const agrupamento = new Map<string, Set<string>>()
    
    // Regras de mapeamento baseadas no edital real
    const mapeamento: { [key: string]: string } = {
      'Português': 'Língua Portuguesa',
      'Lógica': 'Raciocínio Lógico-Matemático',
      'Piauí': 'Conhecimentos Regionais do Piauí',
      'SUS': 'Sistema Único de Saúde (SUS)',
      'Emergência': 'Enfermagem (Conhecimentos Específicos)',
      'Assistência Geral': 'Enfermagem (Conhecimentos Específicos)',
      'Farmacologia': 'Enfermagem (Conhecimentos Específicos)',
      'Saúde Mulher': 'Enfermagem (Conhecimentos Específicos)',
      'Saúde Criança': 'Enfermagem (Conhecimentos Específicos)',
      'Saúde Idoso': 'Enfermagem (Conhecimentos Específicos)',
      'Cuidados Críticos': 'Enfermagem (Conhecimentos Específicos)',
      'Doenças Infecciosas': 'Enfermagem (Conhecimentos Específicos)'
    }
    
    // Aplicar mapeamento
    for (const [discOriginal, topicosSet] of disciplinasMap.entries()) {
      const discAgrupada = mapeamento[discOriginal] || discOriginal
      
      if (!agrupamento.has(discAgrupada)) {
        agrupamento.set(discAgrupada, new Set())
      }
      
      // Adicionar todos os tópicos ao grupo
      for (const topico of topicosSet) {
        agrupamento.get(discAgrupada)!.add(topico)
      }
    }
    
    // Converter para formato final com ordem
    const disciplinas = Array.from(agrupamento.entries()).map(([nome, topicosSet], index) => ({
      nome,
      topicos: Array.from(topicosSet).sort(),
      ordem: index
    })).sort((a, b) => a.nome.localeCompare(b.nome))
    
    console.log(`✅ Agrupamento aplicado: ${disciplinas.length} disciplinas finais (de ${disciplinasMap.size} originais)`)
    
    // Log resumido
    disciplinas.forEach(d => {
      console.log(`  📚 ${d.nome}: ${d.topicos.length} tópicos`)
    })
    
    return { disciplinas }
    
  } catch (error: any) {
    console.error('❌ Erro ao processar XLSX:', error)
    throw new Error(`Falha ao extrair dados do XLSX: ${error.message || error}`)
  }
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('/api/*', cors())

// Servir arquivos estáticos manualmente para evitar problemas
app.get('/static/*', async (c) => {
  const path = c.req.path.replace('/static/', '')
  
  // Mapa de tipos MIME
  const mimeTypes: Record<string, string> = {
    'js': 'application/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  }
  
  const extension = path.split('.').pop() || 'txt'
  const contentType = mimeTypes[extension] || 'text/plain'
  
  try {
    // Para desenvolvimento local, vamos retornar o conteúdo diretamente
    // Este é um workaround para o problema do __STATIC_CONTENT_MANIFEST
    if (path === 'app.js') {
      // Retornar o conteúdo do app.js diretamente (você precisa fazer o build incluir isso)
      const response = await fetch(new URL(`/static/${path}`, c.req.url))
      if (!response.ok) {
        // Se falhar, vamos tentar servir de outra forma
        return c.text('// App.js temporariamente indisponível. Recarregue a página.', 503)
      }
      return c.body(await response.arrayBuffer(), 200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      })
    }
    
    // Para outros arquivos
    return c.text('File not found', 404)
  } catch (error) {
    console.error('Erro ao servir arquivo estático:', error)
    return c.text('Internal Server Error', 500)
  }
})

// ============== FUNÇÕES AUXILIARES DE AUTENTICAÇÃO ==============

// Função para gerar token seguro
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(32));
  for (let i = 0; i < 32; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

// Função para validar formato de email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  // Regex mais permissiva para emails brasileiros
  // Aceita underscores, números e caracteres especiais comuns
  return emailRegex.test(email);
}

// Função para enviar email de reset de senha
async function sendPasswordResetEmail(email: string, token: string, name: string, env?: any): Promise<boolean> {
  // Obter configurações do ambiente
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'noreply@iaprova.app';
  
  // URL de reset - usar APP_URL do ambiente ou fallback
  const APP_URL = env?.APP_URL || 'https://iaprova.app';
  const resetUrl = `${APP_URL}/resetar-senha?token=${token}`;
  
  console.log('🔐 Preparando envio de email de reset...');
  console.log('🔐 Link de reset:', resetUrl);
  console.log('🔐 Enviando para:', email);
  
  // Verificar se tem API key configurada
  if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
    console.log('⚠️ MODO DEV: Email de reset não enviado (configure RESEND_API_KEY)');
    console.log('🔐 Token de reset:', token);
    return false;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '🔐 Redefinição de Senha - IAprova',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir Senha - IAprova</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #E8EDF5;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #E8EDF5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(18, 45, 106, 0.12); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 50%, #2A4A9F 100%); padding: 40px 30px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="background-color: rgba(255,255,255,0.15); width: 70px; height: 70px; border-radius: 16px; display: inline-block; line-height: 70px; margin-bottom: 16px;">
                                <span style="font-size: 32px;">🔐</span>
                              </div>
                              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Redefinição de Senha</h1>
                              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">IAprova - Preparação Inteligente</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Conteúdo -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px;">
                        <h2 style="color: #122D6A; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Olá, ${name}!</h2>
                        <p style="color: #4A6491; margin: 0; font-size: 15px; line-height: 1.6;">
                          Recebemos uma solicitação para redefinir a senha da sua conta.
                        </p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 0 40px;">
                        <div style="background: linear-gradient(135deg, #E8EDF5 0%, #F3F6FA 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #1A3A7F;">
                          <p style="color: #122D6A; margin: 0; font-size: 14px; line-height: 1.7;">
                            Se você fez essa solicitação, clique no botão abaixo para criar uma nova senha. Caso contrário, você pode ignorar este email com segurança.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Botão -->
                    <tr>
                      <td style="padding: 32px 40px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(18, 45, 106, 0.35);">
                                🔐 Criar Nova Senha
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Aviso importante -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <div style="background-color: #FEF3C7; border-radius: 12px; padding: 20px; border-left: 4px solid #F59E0B;">
                          <p style="color: #92400E; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">
                            ⚠️ Informações Importantes:
                          </p>
                          <ul style="color: #92400E; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>Este link é válido por apenas <strong>1 hora</strong></li>
                            <li>Não compartilhe este link com ninguém</li>
                            <li>Se você não solicitou, sua senha permanecerá a mesma</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Link alternativo -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <div style="background-color: #F3F6FA; border-radius: 8px; padding: 16px;">
                          <p style="color: #8FA4CC; font-size: 12px; margin: 0 0 8px 0;">
                            Caso o botão não funcione, copie e cole este link no navegador:
                          </p>
                          <p style="color: #1A3A7F; font-size: 12px; margin: 0; word-break: break-all;">
                            <a href="${resetUrl}" style="color: #1A3A7F; text-decoration: underline;">${resetUrl}</a>
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #122D6A; padding: 24px 40px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                                Se você não solicitou a redefinição de senha, ignore este email.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Copyright -->
                    <tr>
                      <td style="padding: 20px 40px; text-align: center;">
                        <p style="color: #8FA4CC; font-size: 11px; margin: 0;">
                          © 2024 IAprova - Preparação Inteligente para Concursos Públicos
                        </p>
                        <p style="color: #C5D1E8; font-size: 10px; margin: 8px 0 0 0;">
                          Este é um email automático. Por favor, não responda.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    console.log('🔐 Resposta do Resend:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend:', errorText);
    } else {
      console.log('✅ Email de reset enviado com sucesso!');
    }

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar email de reset:', error);
    return false;
  }
}

// Função para enviar email de verificação (usando Resend)
async function sendVerificationEmail(email: string, token: string, name: string, env?: any): Promise<boolean> {
  // Obter configurações do ambiente
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'noreply@iaprova.app';
  const APP_URL = env?.APP_URL || 'https://iaprova.app';
  
  // URL de verificação
  const verificationUrl = `${APP_URL}/verificar-email?token=${token}`;
  
  // Para fins de desenvolvimento, vamos logar o link
  console.log('📧 Preparando envio de email...');
  console.log('📧 Link de verificação:', verificationUrl);
  console.log('📧 Enviando para:', email);
  console.log('📧 API Key presente:', !!RESEND_API_KEY && RESEND_API_KEY !== 'seu_resend_api_key_aqui');
  
  // Verificar se tem API key configurada
  if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
    console.log('⚠️ MODO DEV: Email não enviado (configure RESEND_API_KEY)');
    console.log('📧 Token de verificação:', token);
    return false; // Em dev, retorna false para indicar que não foi enviado
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '🎯 Ative sua conta no IAprova - Sua jornada de aprovação começa agora!',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo ao IAprova</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #E8EDF5;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #E8EDF5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(18, 45, 106, 0.12); overflow: hidden;">
                    
                    <!-- Header com gradiente azul marinho -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 50%, #2A4A9F 100%); padding: 40px 30px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <!-- Logo/Ícone -->
                              <div style="background-color: rgba(255,255,255,0.15); width: 70px; height: 70px; border-radius: 16px; display: inline-block; line-height: 70px; margin-bottom: 16px;">
                                <span style="font-size: 32px;">🎯</span>
                              </div>
                              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">IAprova</h1>
                              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px; font-weight: 400;">Preparação Inteligente para Concursos</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Conteúdo principal -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px;">
                        <h2 style="color: #122D6A; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Olá, ${name}! 👋</h2>
                        <p style="color: #4A6491; margin: 0; font-size: 16px;">Estamos muito felizes em ter você conosco!</p>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="padding: 0 40px;">
                        <div style="background: linear-gradient(135deg, #E8EDF5 0%, #F3F6FA 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #122D6A;">
                          <p style="color: #122D6A; margin: 0 0 12px 0; font-size: 15px; line-height: 1.7;">
                            <strong>Você está a um clique de iniciar sua jornada rumo à aprovação!</strong>
                          </p>
                          <p style="color: #4A6491; margin: 0; font-size: 14px; line-height: 1.7;">
                            Com o IAprova, você terá acesso a um plano de estudos personalizado, conteúdos gerados por IA e ferramentas inteligentes para maximizar sua preparação.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Botão de verificação -->
                    <tr>
                      <td style="padding: 32px 40px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <a href="${verificationUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(18, 45, 106, 0.35); transition: all 0.3s ease;">
                                ✅ Ativar Minha Conta
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #8FA4CC; font-size: 13px; margin: 16px 0 0 0;">
                          Clique no botão acima para confirmar seu email
                        </p>
                      </td>
                    </tr>
                    
                    <!-- O que você terá acesso -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <p style="color: #122D6A; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                          ✨ O que você terá acesso:
                        </p>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">📚</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Plano de Estudos Personalizado</strong> - Baseado no seu edital e disponibilidade
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">🤖</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Conteúdo Gerado por IA</strong> - Teoria, exercícios e resumos personalizados
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">📊</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Acompanhamento de Progresso</strong> - Métricas e estatísticas de desempenho
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Link alternativo -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <div style="background-color: #F3F6FA; border-radius: 8px; padding: 16px;">
                          <p style="color: #8FA4CC; font-size: 12px; margin: 0 0 8px 0;">
                            Caso o botão não funcione, copie e cole este link no navegador:
                          </p>
                          <p style="color: #1A3A7F; font-size: 12px; margin: 0; word-break: break-all;">
                            <a href="${verificationUrl}" style="color: #1A3A7F; text-decoration: underline;">${verificationUrl}</a>
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #122D6A; padding: 24px 40px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 8px 0;">
                                Este link expira em <strong style="color: #ffffff;">24 horas</strong>
                              </p>
                              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                                Se você não criou uma conta no IAprova, pode ignorar este email com segurança.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Copyright -->
                    <tr>
                      <td style="padding: 20px 40px; text-align: center;">
                        <p style="color: #8FA4CC; font-size: 11px; margin: 0;">
                          © 2024 IAprova - Preparação Inteligente para Concursos Públicos
                        </p>
                        <p style="color: #C5D1E8; font-size: 10px; margin: 8px 0 0 0;">
                          Este é um email automático. Por favor, não responda.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    console.log('📧 Resposta do Resend:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend:', errorText);
      
      // Se for erro 403, provavelmente é modo de teste
      if (response.status === 403) {
        console.log('⚠️ Resend em modo de teste - email só pode ser enviado para o proprietário da conta');
      }
      return false;
    }
    
    const responseData = await response.json();
    console.log('✅ Email enviado com sucesso! ID:', responseData.id);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

// Função para enviar email de boas-vindas após verificação (usando Resend)
async function sendWelcomeEmail(email: string, name: string, env?: any): Promise<boolean> {
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'noreply@iaprova.app';
  const APP_URL = env?.APP_URL || 'https://iaprova.app';
  
  // Verificar se tem API key configurada
  if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
    console.log('⚠️ MODO DEV: Email de boas-vindas não enviado (configure RESEND_API_KEY)');
    return false;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: '🎉 Conta Ativada! Bem-vindo ao IAprova',
        html: `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo ao IAprova</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #E8EDF5;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #E8EDF5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(18, 45, 106, 0.12); overflow: hidden;">
                    
                    <!-- Header com gradiente verde de sucesso -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%); padding: 40px 30px; text-align: center;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <div style="background-color: rgba(255,255,255,0.15); width: 70px; height: 70px; border-radius: 16px; display: inline-block; line-height: 70px; margin-bottom: 16px;">
                                <span style="font-size: 32px;">🎉</span>
                              </div>
                              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Conta Ativada com Sucesso!</h1>
                              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Sua jornada rumo à aprovação começa agora</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Conteúdo principal -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px;">
                        <h2 style="color: #122D6A; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">Parabéns, ${name}! 🚀</h2>
                        <p style="color: #4A6491; margin: 0; font-size: 15px; line-height: 1.6;">
                          Seu email foi verificado e sua conta está <strong>100% ativa</strong>. Agora você tem acesso completo a todas as funcionalidades do IAprova!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Próximos passos -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <div style="background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10B981;">
                          <p style="color: #065F46; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            💡 Próximos Passos para Começar:
                          </p>
                          <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 6px 0; color: #047857; font-size: 14px;">
                                <strong>1.</strong> Faça upload do edital do seu concurso
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #047857; font-size: 14px;">
                                <strong>2.</strong> Complete a entrevista inicial personalizada
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #047857; font-size: 14px;">
                                <strong>3.</strong> Receba seu plano de estudos gerado por IA
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #047857; font-size: 14px;">
                                <strong>4.</strong> Comece a estudar com conteúdos personalizados!
                              </td>
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Botão de acesso -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px; text-align: center;">
                        <a href="${APP_URL}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(18, 45, 106, 0.35);">
                          🚀 Acessar IAprova Agora
                        </a>
                      </td>
                    </tr>
                    
                    <!-- Recursos disponíveis -->
                    <tr>
                      <td style="padding: 0 40px 32px 40px;">
                        <p style="color: #122D6A; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                          ✨ Recursos Disponíveis para Você:
                        </p>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">📚</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Teoria Completa</strong> - Conteúdo gerado por IA para cada disciplina
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">📝</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Exercícios Práticos</strong> - Questões no estilo da sua banca
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">🎯</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Metas Semanais</strong> - Plano organizado até a data da prova
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <table cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width: 28px; vertical-align: top;">
                                    <span style="color: #1A3A7F; font-size: 16px;">📊</span>
                                  </td>
                                  <td style="color: #4A6491; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #122D6A;">Dashboard de Progresso</strong> - Acompanhe sua evolução
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #122D6A; padding: 24px 40px;">
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0 0 8px 0;">
                                Estamos aqui para ajudar você a conquistar sua aprovação! 💪
                              </p>
                              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                                Dúvidas? Entre em contato: suporte@iaprova.com.br
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Copyright -->
                    <tr>
                      <td style="padding: 20px 40px; text-align: center;">
                        <p style="color: #8FA4CC; font-size: 11px; margin: 0;">
                          © 2025 IAprova - Preparação Inteligente para Concursos Públicos
                        </p>
                        <p style="color: #C5D1E8; font-size: 10px; margin: 8px 0 0 0;">
                          Este é um email automático. Por favor, não responda.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    console.log('🎉 Resposta do Resend (Welcome):', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend (Welcome):', errorText);
    } else {
      console.log('✅ Email de boas-vindas enviado com sucesso!');
    }

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return false;
  }
}

// ============== ROTAS DE USUÁRIOS ==============

// Alias para /api/register (usado pela landing page)
app.post('/api/register', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const email = body.email?.toLowerCase()?.trim()
  const password = body.password || body.senha
  const name = body.name || body.nome || email?.split('@')[0] || 'Usuário'
  
  console.log('📝 Registro via landing:', { email, hasPassword: !!password })

  // Validar campos obrigatórios
  if (!email) {
    return c.json({ error: 'Email é obrigatório' }, 400)
  }
  
  if (!password || password.length < 4) {
    return c.json({ error: 'Senha deve ter pelo menos 4 caracteres' }, 400)
  }
  
  // Validar formato do email
  if (!isValidEmail(email)) {
    return c.json({ error: 'Email inválido' }, 400)
  }

  try {
    // Verificar se email já existe
    const existingUser = await DB.prepare(
      'SELECT id, email_verified, password FROM users WHERE email = ?'
    ).bind(email).first() as {id: number, email_verified: number, password: string} | undefined

    if (existingUser) {
      // Se usuário existe, tentar fazer login automático
      if (existingUser.password === password) {
        // Senha correta - fazer login
        const user = await DB.prepare(
          'SELECT id, email, name, created_at FROM users WHERE id = ?'
        ).bind(existingUser.id).first()
        
        return c.json({ 
          user,
          message: 'Login realizado com sucesso!',
          isLogin: true
        })
      } else {
        return c.json({ error: 'Email já cadastrado. Use a opção de login ou recupere sua senha.' }, 400)
      }
    }

    // Criar novo usuário
    const result = await DB.prepare(
      `INSERT INTO users (name, email, password, email_verified, trial_started_at, trial_expires_at, subscription_status) 
       VALUES (?, ?, ?, 1, datetime('now'), datetime('now', '+7 days'), 'trial')`
    ).bind(name, email, password).run()

    // Buscar usuário criado
    const newUser = await DB.prepare(
      'SELECT id, email, name, created_at FROM users WHERE id = ?'
    ).bind(result.meta.last_row_id).first()

    return c.json({ 
      user: newUser,
      message: '🎉 Conta criada com sucesso! Bem-vindo ao IAprova!'
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return c.json({ error: 'Erro ao criar conta. Tente novamente.' }, 500)
  }
})

app.post('/api/users', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  // ✅ CORREÇÃO: Aceitar tanto 'name' quanto 'nome'
  const name = body.name || body.nome || 'Usuário'
  const email = body.email?.toLowerCase()?.trim() // Normalizar email
  const password = body.password || body.senha || 'senha123'
  
  console.log('📝 Criando usuário:', { name, email, hasPassword: !!password })

  // Validar campos obrigatórios
  if (!email) {
    return c.json({ error: 'Email é obrigatório' }, 400)
  }
  
  // Validar formato do email
  if (!isValidEmail(email)) {
    return c.json({ error: 'Email inválido. Use um email válido como nome@exemplo.com' }, 400)
  }

  try {
    // Verificar se email já existe
    const existingUser = await DB.prepare(
      'SELECT id, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as {id: number, email_verified: number} | undefined

    if (existingUser) {
      // Se existe mas não está verificado, permitir reenvio
      if (!existingUser.email_verified) {
        return c.json({ 
          error: 'Email já cadastrado mas não verificado. Use a opção de reenviar email.',
          needsVerification: true 
        }, 400)
      }
      return c.json({ error: 'Email já cadastrado' }, 400)
    }

    // Garantir que todos os valores existem
    const userName = name || 'Usuário'
    const userEmail = email
    const userPassword = password || 'senha123'
    
    // Gerar token de verificação
    const verificationToken = generateSecureToken()
    const APP_URL = c.env?.APP_URL || 'https://iaprova.app'
    
    console.log('💾 Inserindo no banco:', { userName, userEmail, hasPassword: !!userPassword })

    const result = await DB.prepare(
      `INSERT INTO users (name, email, password, email_verified, verification_token, verification_token_expires) 
       VALUES (?, ?, ?, 0, ?, datetime('now', '+24 hours'))`
    ).bind(userName, userEmail, userPassword, verificationToken).run()

    // Enviar email de verificação
    const emailSent = await sendVerificationEmail(userEmail, verificationToken, userName, c.env)
    
    if (!emailSent) {
      console.warn('⚠️ Usuário criado mas email não foi enviado')
    }

    // SEMPRE retornar o token para permitir verificação manual
    // (útil quando Resend está em modo teste ou email não chega)
    return c.json({ 
      id: result.meta.last_row_id, 
      name: userName, 
      email: userEmail,
      message: emailSent 
        ? '✅ Cadastro realizado! Verifique seu email (inclusive a pasta de spam) para ativar sua conta.'
        : '✅ Cadastro realizado! Use o link abaixo para verificar seu email.',
      emailSent,
      needsVerification: true,
      // SEMPRE retornar token para permitir verificação manual
      devToken: verificationToken,
      devMode: !emailSent,
      verificationUrl: `${APP_URL}/verificar-email?token=${verificationToken}`
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return c.json({ error: 'Erro ao criar usuário' }, 500)
  }
})

// Login
app.post('/api/login', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const email = body.email?.toLowerCase()?.trim()
  const password = body.password

  // Validar campos
  if (!email || !password) {
    return c.json({ error: 'Email e senha são obrigatórios' }, 400)
  }
  
  // Validar formato do email
  if (!isValidEmail(email)) {
    return c.json({ error: 'Email inválido' }, 400)
  }

  try {
    // Login normal
    const user = await DB.prepare(
      'SELECT id, name, email, password, created_at, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as any

    if (!user) {
      return c.json({ error: 'Email não cadastrado. Faça seu cadastro primeiro.' }, 404)
    }
    
    // Verificar se o email foi verificado
    if (!user.email_verified) {
      return c.json({ 
        error: 'Email não verificado. Verifique sua caixa de entrada ou solicite o reenvio do email.',
        needsVerification: true,
        email: user.email
      }, 403)
    }

    // Verificação simples de senha (em produção, usar bcrypt)
    if (user.password !== password) {
      return c.json({ error: 'Senha incorreta' }, 401)
    }

    // Retornar usuário sem a senha
    return c.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email,
      created_at: user.created_at,
      message: 'Login realizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    return c.json({ error: 'Erro ao fazer login' }, 500)
  }
})

// ============== SISTEMA DE TRIAL E ASSINATURA ==============

// Links de pagamento do Mercado Pago
const PAYMENT_LINKS = {
  mensal: 'https://mpago.la/13tzztx',    // R$ 29,90
  anual: 'https://mpago.la/2ZBgz1w'      // R$ 249,90
}

// Verificar status da assinatura do usuário
app.get('/api/subscription/status/:userId', async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')
  
  try {
    const user = await DB.prepare(`
      SELECT id, email, trial_started_at, trial_expires_at, subscription_status, 
             subscription_plan, subscription_expires_at, payment_id, payment_date, created_at
      FROM users WHERE id = ?
    `).bind(userId).first() as any
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    const now = new Date()
    let status = user.subscription_status || 'new'
    let daysRemaining = 0
    let isActive = false
    let needsPayment = false
    
    // Se é admin, sempre tem acesso
    if (user.email === 'terciogomesrabelo@gmail.com') {
      return c.json({
        status: 'admin',
        isActive: true,
        needsPayment: false,
        isAdmin: true,
        message: 'Acesso administrativo ilimitado'
      })
    }
    
    // Se nunca iniciou trial, iniciar agora
    if (!user.trial_started_at) {
      const trialStart = now.toISOString()
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      
      await DB.prepare(`
        UPDATE users SET 
          trial_started_at = ?,
          trial_expires_at = ?,
          subscription_status = 'trial'
        WHERE id = ?
      `).bind(trialStart, trialEnd, userId).run()
      
      return c.json({
        status: 'trial',
        isActive: true,
        needsPayment: false,
        trialStarted: trialStart,
        trialExpires: trialEnd,
        daysRemaining: 7,
        message: 'Período de teste iniciado! Você tem 7 dias grátis.'
      })
    }
    
    // Verificar se tem assinatura ativa
    if (user.subscription_status === 'active' && user.subscription_expires_at) {
      const subExpires = new Date(user.subscription_expires_at)
      if (subExpires > now) {
        daysRemaining = Math.ceil((subExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return c.json({
          status: 'active',
          isActive: true,
          needsPayment: false,
          plan: user.subscription_plan,
          expiresAt: user.subscription_expires_at,
          daysRemaining,
          message: `Assinatura ${user.subscription_plan} ativa`
        })
      } else {
        // Assinatura expirou
        await DB.prepare(`UPDATE users SET subscription_status = 'expired' WHERE id = ?`).bind(userId).run()
        status = 'expired'
      }
    }
    
    // Verificar trial
    if (user.trial_expires_at) {
      const trialExpires = new Date(user.trial_expires_at)
      if (trialExpires > now) {
        daysRemaining = Math.ceil((trialExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return c.json({
          status: 'trial',
          isActive: true,
          needsPayment: false,
          trialExpires: user.trial_expires_at,
          daysRemaining,
          message: `${daysRemaining} dias restantes no período de teste`
        })
      }
    }
    
    // Trial expirou e não tem assinatura
    return c.json({
      status: 'expired',
      isActive: false,
      needsPayment: true,
      paymentLinks: PAYMENT_LINKS,
      message: 'Seu período de teste expirou. Escolha um plano para continuar.'
    })
    
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error)
    return c.json({ error: 'Erro ao verificar status da assinatura' }, 500)
  }
})

// Obter detalhes completos da assinatura para área financeira
app.get('/api/subscription/details/:userId', async (c) => {
  const { DB } = c.env
  const userId = c.req.param('userId')
  
  try {
    const user = await DB.prepare(`
      SELECT id, email, name, trial_started_at, trial_expires_at, subscription_status, 
             subscription_plan, subscription_expires_at, payment_id, payment_date, created_at
      FROM users WHERE id = ?
    `).bind(userId).first() as any
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    const now = new Date()
    let planInfo: any = {
      status: 'free',
      statusLabel: 'Gratuito',
      currentPlan: 'Teste Grátis',
      price: 0,
      startDate: null,
      expiresAt: null,
      daysRemaining: 0,
      isActive: false,
      paymentHistory: []
    }
    
    // Se é admin
    if (user.email === 'terciogomesrabelo@gmail.com') {
      planInfo = {
        status: 'admin',
        statusLabel: 'Administrador',
        currentPlan: 'Acesso Administrativo',
        price: 0,
        startDate: user.created_at,
        expiresAt: null,
        daysRemaining: -1, // infinito
        isActive: true,
        paymentHistory: []
      }
    }
    // Se tem assinatura ativa
    else if (user.subscription_status === 'active' && user.subscription_expires_at) {
      const expiresAt = new Date(user.subscription_expires_at)
      const isExpired = expiresAt <= now
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      
      planInfo = {
        status: isExpired ? 'expired' : 'active',
        statusLabel: isExpired ? 'Expirado' : 'Ativo',
        currentPlan: user.subscription_plan === 'anual' ? 'Premium Anual' : 'Premium Mensal',
        price: user.subscription_plan === 'anual' ? 249.90 : 29.90,
        startDate: user.payment_date,
        expiresAt: user.subscription_expires_at,
        daysRemaining: daysRemaining,
        isActive: !isExpired,
        paymentId: user.payment_id,
        paymentHistory: user.payment_date ? [{
          date: user.payment_date,
          plan: user.subscription_plan === 'anual' ? 'Premium Anual' : 'Premium Mensal',
          amount: user.subscription_plan === 'anual' ? 249.90 : 29.90,
          status: 'paid'
        }] : []
      }
    }
    // Se está no período de trial
    else if (user.trial_started_at && user.trial_expires_at) {
      const trialExpires = new Date(user.trial_expires_at)
      const isExpired = trialExpires <= now
      const daysRemaining = Math.max(0, Math.ceil((trialExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      
      planInfo = {
        status: isExpired ? 'trial_expired' : 'trial',
        statusLabel: isExpired ? 'Trial Expirado' : 'Período de Teste',
        currentPlan: 'Teste Grátis (7 dias)',
        price: 0,
        startDate: user.trial_started_at,
        expiresAt: user.trial_expires_at,
        daysRemaining: daysRemaining,
        isActive: !isExpired,
        paymentHistory: []
      }
    }
    // Usuário novo sem trial iniciado
    else {
      planInfo = {
        status: 'new',
        statusLabel: 'Novo',
        currentPlan: 'Sem plano ativo',
        price: 0,
        startDate: user.created_at,
        expiresAt: null,
        daysRemaining: 0,
        isActive: false,
        paymentHistory: []
      }
    }
    
    return c.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      memberSince: user.created_at,
      ...planInfo,
      upgradePlans: [
        {
          id: 'mensal',
          name: 'Premium Mensal',
          price: 29.90,
          duration: '30 dias',
          link: PAYMENT_LINKS.mensal
        },
        {
          id: 'anual',
          name: 'Premium Anual',
          price: 249.90,
          duration: '365 dias',
          savings: '30% de desconto',
          link: PAYMENT_LINKS.anual
        }
      ]
    })
    
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error)
    return c.json({ error: 'Erro ao obter detalhes' }, 500)
  }
})

// Obter links de pagamento
app.get('/api/subscription/payment-links', async (c) => {
  return c.json({
    plans: [
      {
        id: 'mensal',
        name: 'Premium Mensal',
        price: 29.90,
        duration: 30,
        link: PAYMENT_LINKS.mensal,
        features: ['Acesso ilimitado', 'Suporte prioritário', 'Todas as funcionalidades']
      },
      {
        id: 'anual',
        name: 'Premium Anual',
        price: 249.90,
        pricePerMonth: 20.83,
        duration: 365,
        link: PAYMENT_LINKS.anual,
        savings: '30% de desconto',
        features: ['Acesso ilimitado', 'Suporte VIP', 'Todas as funcionalidades', 'Novos recursos em primeira mão']
      }
    ]
  })
})

// Ativar assinatura após pagamento confirmado (chamado manualmente pelo admin ou webhook)
app.post('/api/subscription/activate', async (c) => {
  const { DB } = c.env
  const { userId, plan, paymentId, activatedBy } = await c.req.json()
  
  // Verificar se quem está ativando é admin
  const adminCheck = c.req.header('X-User-ID')
  if (adminCheck) {
    const admin = await DB.prepare('SELECT email FROM users WHERE id = ?').bind(adminCheck).first() as any
    if (admin?.email !== 'terciogomesrabelo@gmail.com') {
      return c.json({ error: 'Apenas administradores podem ativar assinaturas' }, 403)
    }
  }
  
  try {
    const now = new Date()
    const durationDays = plan === 'anual' ? 365 : 30
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    
    await DB.prepare(`
      UPDATE users SET 
        subscription_status = 'active',
        subscription_plan = ?,
        subscription_expires_at = ?,
        payment_id = ?,
        payment_date = ?
      WHERE id = ?
    `).bind(plan, expiresAt, paymentId || 'manual_' + Date.now(), now.toISOString(), userId).run()
    
    console.log(`✅ Assinatura ${plan} ativada para usuário ${userId} até ${expiresAt}`)
    
    return c.json({
      success: true,
      message: `Assinatura ${plan} ativada com sucesso!`,
      expiresAt,
      durationDays
    })
  } catch (error) {
    console.error('Erro ao ativar assinatura:', error)
    return c.json({ error: 'Erro ao ativar assinatura' }, 500)
  }
})

// Webhook para receber confirmação de pagamento do Mercado Pago (futuro)
app.post('/api/webhook/mercadopago', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    console.log('📦 Webhook Mercado Pago recebido:', JSON.stringify(body))
    
    // TODO: Implementar validação do webhook do Mercado Pago
    // Por enquanto, apenas loga a requisição
    
    return c.json({ received: true })
  } catch (error) {
    console.error('Erro no webhook:', error)
    return c.json({ error: 'Erro ao processar webhook' }, 500)
  }
})

// ============== MÓDULO ADMINISTRADOR (EXCLUSIVO) ==============
// ⚠️ ACESSO RESTRITO: Apenas terciogomesrabelo@gmail.com

const ADMIN_EMAIL = 'terciogomesrabelo@gmail.com'

// Middleware para verificar se é admin
async function isAdmin(c: any): Promise<boolean> {
  const userId = c.req.header('X-User-ID')
  if (!userId) return false
  
  const { DB } = c.env
  const user = await DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first() as any
  return user?.email === ADMIN_EMAIL
}

// Registrar log de email enviado
async function logEmailSent(DB: any, userId: number | null, emailTo: string, emailType: string, status: string = 'sent') {
  try {
    await DB.prepare(`
      INSERT INTO email_logs (user_id, email_to, email_type, status)
      VALUES (?, ?, ?, ?)
    `).bind(userId, emailTo, emailType, status).run()
  } catch (e) {
    console.log('⚠️ Erro ao registrar log de email (tabela pode não existir ainda):', e)
  }
}

// Dashboard Admin - Estatísticas gerais
app.get('/api/admin/dashboard', async (c) => {
  const { DB } = c.env
  
  // Verificar se é admin
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Total de usuários
    const totalUsers = await DB.prepare('SELECT COUNT(*) as count FROM users').first() as any
    
    // Usuários verificados
    const verifiedUsers = await DB.prepare('SELECT COUNT(*) as count FROM users WHERE email_verified = 1').first() as any
    
    // Usuários premium
    const premiumUsers = await DB.prepare('SELECT COUNT(*) as count FROM users WHERE is_premium = 1').first() as any
    
    // Usuários criados hoje
    const todayUsers = await DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE DATE(created_at) = DATE('now')
    `).first() as any
    
    // Usuários criados nos últimos 7 dias
    const weekUsers = await DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= DATE('now', '-7 days')
    `).first() as any
    
    // Usuários criados nos últimos 30 dias
    const monthUsers = await DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= DATE('now', '-30 days')
    `).first() as any
    
    // Total de planos de estudo
    const totalPlanos = await DB.prepare('SELECT COUNT(*) as count FROM planos_estudo').first() as any
    
    // Planos ativos
    const activePlanos = await DB.prepare('SELECT COUNT(*) as count FROM planos_estudo WHERE ativo = 1').first() as any
    
    // Total de metas
    const totalMetas = await DB.prepare('SELECT COUNT(*) as count FROM metas_diarias').first() as any
    
    // Metas concluídas
    const completedMetas = await DB.prepare('SELECT COUNT(*) as count FROM metas_diarias WHERE concluida = 1').first() as any
    
    // Total de emails enviados (se tabela existir)
    let emailStats = { total: 0, verification: 0, welcome: 0, password_reset: 0, resend: 0 }
    try {
      const totalEmails = await DB.prepare('SELECT COUNT(*) as count FROM email_logs').first() as any
      const verificationEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_logs WHERE email_type = 'verification'").first() as any
      const welcomeEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_logs WHERE email_type = 'welcome'").first() as any
      const resetEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_logs WHERE email_type = 'password_reset'").first() as any
      const resendEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_logs WHERE email_type = 'resend_verification'").first() as any
      
      emailStats = {
        total: totalEmails?.count || 0,
        verification: verificationEmails?.count || 0,
        welcome: welcomeEmails?.count || 0,
        password_reset: resetEmails?.count || 0,
        resend: resendEmails?.count || 0
      }
    } catch (e) {
      console.log('⚠️ Tabela email_logs não existe ainda')
    }
    
    // Assinaturas (se tabela existir)
    let subscriptionStats = { total: 0, active: 0, pending: 0, cancelled: 0, revenue: 0 }
    try {
      const totalSubs = await DB.prepare('SELECT COUNT(*) as count FROM user_subscriptions').first() as any
      const activeSubs = await DB.prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'").first() as any
      const pendingSubs = await DB.prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'pending'").first() as any
      const cancelledSubs = await DB.prepare("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'cancelled'").first() as any
      const revenue = await DB.prepare("SELECT COALESCE(SUM(amount_paid), 0) as total FROM user_subscriptions WHERE status = 'active'").first() as any
      
      subscriptionStats = {
        total: totalSubs?.count || 0,
        active: activeSubs?.count || 0,
        pending: pendingSubs?.count || 0,
        cancelled: cancelledSubs?.count || 0,
        revenue: revenue?.total || 0
      }
    } catch (e) {
      console.log('⚠️ Tabela user_subscriptions não existe ainda')
    }
    
    return c.json({
      users: {
        total: totalUsers?.count || 0,
        verified: verifiedUsers?.count || 0,
        premium: premiumUsers?.count || 0,
        today: todayUsers?.count || 0,
        this_week: weekUsers?.count || 0,
        this_month: monthUsers?.count || 0
      },
      planos: {
        total: totalPlanos?.count || 0,
        active: activePlanos?.count || 0
      },
      metas: {
        total: totalMetas?.count || 0,
        completed: completedMetas?.count || 0,
        completion_rate: totalMetas?.count > 0 ? Math.round((completedMetas?.count / totalMetas?.count) * 100) : 0
      },
      emails: emailStats,
      subscriptions: subscriptionStats
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard admin:', error)
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500)
  }
})

// Lista de usuários (paginada)
app.get('/api/admin/users', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit
    
    let query = `
      SELECT 
        u.id, u.name, u.email, u.email_verified, u.is_premium, 
        u.premium_expires_at, u.created_at, u.auth_provider,
        COUNT(DISTINCT pe.id) as total_planos,
        COUNT(DISTINCT md.id) as total_metas
      FROM users u
      LEFT JOIN planos_estudo pe ON pe.user_id = u.id
      LEFT JOIN metas_diarias md ON md.user_id = u.id
    `
    
    if (search) {
      query += ` WHERE u.name LIKE ? OR u.email LIKE ?`
    }
    
    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    
    let users
    if (search) {
      users = await DB.prepare(query).bind(`%${search}%`, `%${search}%`, limit, offset).all()
    } else {
      users = await DB.prepare(query).bind(limit, offset).all()
    }
    
    // Total para paginação
    let countQuery = 'SELECT COUNT(*) as count FROM users'
    if (search) {
      countQuery += ' WHERE name LIKE ? OR email LIKE ?'
    }
    
    let total
    if (search) {
      total = await DB.prepare(countQuery).bind(`%${search}%`, `%${search}%`).first() as any
    } else {
      total = await DB.prepare(countQuery).first() as any
    }
    
    return c.json({
      users: users.results,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return c.json({ error: 'Erro ao listar usuários' }, 500)
  }
})

// Histórico de emails enviados
app.get('/api/admin/emails', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit
    
    const emails = await DB.prepare(`
      SELECT 
        el.id, el.email_to, el.email_type, el.status, el.sent_at,
        u.name as user_name
      FROM email_logs el
      LEFT JOIN users u ON u.id = el.user_id
      ORDER BY el.sent_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
    
    const total = await DB.prepare('SELECT COUNT(*) as count FROM email_logs').first() as any
    
    return c.json({
      emails: emails.results,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao listar emails:', error)
    return c.json({ error: 'Erro ao listar emails' }, 500)
  }
})

// Planos de pagamento disponíveis
app.get('/api/admin/plans', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const plans = await DB.prepare('SELECT * FROM payment_plans ORDER BY price ASC').all()
    return c.json({ plans: plans.results })
  } catch (error) {
    console.error('Erro ao listar planos:', error)
    return c.json({ error: 'Erro ao listar planos' }, 500)
  }
})

// Atualizar plano de pagamento
app.put('/api/admin/plans/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const planId = c.req.param('id')
    const { name, description, price, duration_days, features, is_active } = await c.req.json()
    
    await DB.prepare(`
      UPDATE payment_plans 
      SET name = ?, description = ?, price = ?, duration_days = ?, features = ?, is_active = ?
      WHERE id = ?
    `).bind(name, description, price, duration_days, JSON.stringify(features), is_active ? 1 : 0, planId).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return c.json({ error: 'Erro ao atualizar plano' }, 500)
  }
})

// Assinaturas dos usuários
app.get('/api/admin/subscriptions', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const subscriptions = await DB.prepare(`
      SELECT 
        us.*, 
        u.name as user_name, u.email as user_email,
        pp.name as plan_name
      FROM user_subscriptions us
      JOIN users u ON u.id = us.user_id
      JOIN payment_plans pp ON pp.id = us.plan_id
      ORDER BY us.created_at DESC
      LIMIT 100
    `).all()
    
    return c.json({ subscriptions: subscriptions.results })
  } catch (error) {
    console.error('Erro ao listar assinaturas:', error)
    return c.json({ error: 'Erro ao listar assinaturas' }, 500)
  }
})

// Dar/remover premium manualmente (admin)
app.post('/api/admin/users/:id/premium', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    const { is_premium, days } = await c.req.json()
    
    if (is_premium && days) {
      // Ativar premium por X dias
      await DB.prepare(`
        UPDATE users 
        SET is_premium = 1, premium_expires_at = DATE('now', '+' || ? || ' days')
        WHERE id = ?
      `).bind(days, userId).run()
    } else {
      // Remover premium
      await DB.prepare(`
        UPDATE users 
        SET is_premium = 0, premium_expires_at = NULL
        WHERE id = ?
      `).bind(userId).run()
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar premium:', error)
    return c.json({ error: 'Erro ao atualizar premium' }, 500)
  }
})

// Verificar se usuário atual é admin
app.get('/api/admin/check', async (c) => {
  const isAdminUser = await isAdmin(c)
  return c.json({ isAdmin: isAdminUser })
})

// Buscar detalhes de um usuário específico (admin)
app.get('/api/admin/users/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    const user = await DB.prepare(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM planos_estudo WHERE user_id = u.id) as total_planos,
        (SELECT COUNT(*) FROM metas_diarias WHERE user_id = u.id) as total_metas,
        (SELECT COUNT(*) FROM metas_diarias WHERE user_id = u.id AND concluida = 1) as metas_concluidas
      FROM users u
      WHERE u.id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    // Buscar assinatura ativa
    let subscription = null
    try {
      subscription = await DB.prepare(`
        SELECT us.*, pp.name as plan_name, pp.price
        FROM user_subscriptions us
        JOIN payment_plans pp ON pp.id = us.plan_id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.id DESC
        LIMIT 1
      `).bind(userId).first()
    } catch (e) {
      console.log('Tabela de assinaturas pode não existir')
    }
    
    return c.json({ user, subscription })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return c.json({ error: 'Erro ao buscar usuário' }, 500)
  }
})

// Atualizar dados de um usuário (admin)
app.put('/api/admin/users/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    const { is_premium, premium_days, plan_id } = await c.req.json()
    
    // Atualizar premium do usuário
    if (typeof is_premium !== 'undefined') {
      if (is_premium && premium_days) {
        await DB.prepare(`
          UPDATE users 
          SET is_premium = 1, premium_expires_at = DATE('now', '+' || ? || ' days')
          WHERE id = ?
        `).bind(premium_days, userId).run()
      } else if (!is_premium) {
        await DB.prepare(`
          UPDATE users 
          SET is_premium = 0, premium_expires_at = NULL
          WHERE id = ?
        `).bind(userId).run()
      }
    }
    
    // Se um plano foi especificado, criar/atualizar assinatura
    if (plan_id) {
      try {
        // Buscar plano
        const plan = await DB.prepare('SELECT * FROM payment_plans WHERE id = ?').bind(plan_id).first() as any
        if (plan) {
          // Desativar assinaturas anteriores
          await DB.prepare(`
            UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'
          `).bind(userId).run()
          
          // Criar nova assinatura
          await DB.prepare(`
            INSERT INTO user_subscriptions (user_id, plan_id, status, amount_paid, starts_at, expires_at)
            VALUES (?, ?, 'active', ?, DATE('now'), DATE('now', '+' || ? || ' days'))
          `).bind(userId, plan_id, plan.price, plan.duration_days || 30).run()
          
          // Atualizar usuário como premium se plano não for gratuito
          if (plan.price > 0) {
            await DB.prepare(`
              UPDATE users 
              SET is_premium = 1, premium_expires_at = DATE('now', '+' || ? || ' days')
              WHERE id = ?
            `).bind(plan.duration_days || 30, userId).run()
          }
        }
      } catch (e) {
        console.log('Erro ao criar assinatura:', e)
      }
    }
    
    return c.json({ success: true, message: 'Usuário atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return c.json({ error: 'Erro ao atualizar usuário' }, 500)
  }
})

// Deletar usuário (admin) - CUIDADO!
app.delete('/api/admin/users/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    
    // Verificar se não é o próprio admin
    const user = await DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first() as any
    if (user?.email === ADMIN_EMAIL) {
      return c.json({ error: 'Não é possível deletar o administrador' }, 400)
    }
    
    // Deletar dados relacionados primeiro
    await DB.prepare('DELETE FROM metas_diarias WHERE user_id = ?').bind(userId).run()
    await DB.prepare('DELETE FROM semanas_estudo WHERE plano_id IN (SELECT id FROM planos_estudo WHERE user_id = ?)').bind(userId).run()
    await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id IN (SELECT id FROM planos_estudo WHERE user_id = ?)').bind(userId).run()
    await DB.prepare('DELETE FROM planos_estudo WHERE user_id = ?').bind(userId).run()
    await DB.prepare('DELETE FROM user_disciplinas WHERE user_id = ?').bind(userId).run()
    await DB.prepare('DELETE FROM interviews WHERE user_id = ?').bind(userId).run()
    
    // Deletar assinaturas se existir a tabela
    try {
      await DB.prepare('DELETE FROM user_subscriptions WHERE user_id = ?').bind(userId).run()
    } catch (e) {}
    
    // Deletar usuário
    await DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    
    return c.json({ success: true, message: 'Usuário deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return c.json({ error: 'Erro ao deletar usuário' }, 500)
  }
})

// ============== GOOGLE OAUTH ==============

// Endpoint para iniciar autenticação Google (retorna URL de autorização)
app.get('/api/auth/google', async (c) => {
  const GOOGLE_CLIENT_ID = c.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const APP_URL = c.env.APP_URL || 'https://iaprova.app'
  
  if (!GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google OAuth não configurado' }, 500)
  }
  
  const redirectUri = `${APP_URL}/api/auth/google/callback`
  const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/drive.file')
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent`
  
  return c.json({ authUrl })
})

// Callback do Google OAuth
app.get('/api/auth/google/callback', async (c) => {
  const { DB } = c.env
  const code = c.req.query('code')
  const error = c.req.query('error')
  
  const GOOGLE_CLIENT_ID = c.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = c.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const APP_URL = c.env.APP_URL || 'https://iaprova.app'
  
  if (error) {
    return c.redirect(`${APP_URL}?error=google_auth_denied`)
  }
  
  if (!code) {
    return c.redirect(`${APP_URL}?error=no_code`)
  }
  
  try {
    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    })
    
    const tokens = await tokenResponse.json() as any
    
    if (tokens.error) {
      console.error('Erro ao obter tokens:', tokens)
      return c.redirect(`${APP_URL}?error=token_exchange_failed`)
    }
    
    // Buscar informações do usuário
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    })
    
    const googleUser = await userInfoResponse.json() as any
    console.log('👤 Usuário Google:', { id: googleUser.id, email: googleUser.email, name: googleUser.name })
    
    // Verificar se usuário já existe (por google_id ou email)
    let user = await DB.prepare(
      'SELECT * FROM users WHERE google_id = ? OR email = ?'
    ).bind(googleUser.id, googleUser.email).first() as any
    
    const tokenExpires = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
    
    if (user) {
      // Atualizar tokens e informações
      await DB.prepare(`
        UPDATE users SET 
          google_id = ?,
          google_email = ?,
          google_picture = ?,
          google_access_token = ?,
          google_refresh_token = COALESCE(?, google_refresh_token),
          google_token_expires = ?,
          auth_provider = CASE WHEN auth_provider = 'email' THEN 'both' ELSE 'google' END,
          email_verified = 1,
          name = COALESCE(name, ?)
        WHERE id = ?
      `).bind(
        googleUser.id,
        googleUser.email,
        googleUser.picture || null,
        tokens.access_token,
        tokens.refresh_token || null,
        tokenExpires,
        googleUser.name,
        user.id
      ).run()
      
      console.log(`✅ Usuário ${user.id} atualizado com Google OAuth`)
    } else {
      // Criar novo usuário
      const result = await DB.prepare(`
        INSERT INTO users (
          name, email, google_id, google_email, google_picture,
          google_access_token, google_refresh_token, google_token_expires,
          auth_provider, email_verified, password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'google', 1, '')
      `).bind(
        googleUser.name || 'Usuário Google',
        googleUser.email,
        googleUser.id,
        googleUser.email,
        googleUser.picture || null,
        tokens.access_token,
        tokens.refresh_token || null,
        tokenExpires
      ).run()
      
      user = { 
        id: result.meta.last_row_id, 
        name: googleUser.name, 
        email: googleUser.email 
      }
      console.log(`✅ Novo usuário ${user.id} criado via Google OAuth`)
    }
    
    // Redirecionar com dados do usuário
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name || googleUser.name,
      email: user.email || googleUser.email,
      picture: googleUser.picture,
      authProvider: 'google'
    }))
    
    return c.redirect(`${APP_URL}?googleAuth=success&user=${userData}`)
    
  } catch (error) {
    console.error('Erro no callback Google:', error)
    return c.redirect(`${APP_URL}?error=google_auth_failed`)
  }
})

// Endpoint para atualizar tokens do Google (refresh)
app.post('/api/auth/google/refresh', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  const GOOGLE_CLIENT_ID = c.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = c.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  
  try {
    const user = await DB.prepare(
      'SELECT google_refresh_token FROM users WHERE id = ?'
    ).bind(user_id).first() as any
    
    if (!user?.google_refresh_token) {
      return c.json({ error: 'Usuário não conectado ao Google' }, 400)
    }
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: user.google_refresh_token,
        grant_type: 'refresh_token'
      })
    })
    
    const tokens = await tokenResponse.json() as any
    
    if (tokens.error) {
      return c.json({ error: 'Falha ao renovar token' }, 400)
    }
    
    const tokenExpires = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
    
    await DB.prepare(`
      UPDATE users SET 
        google_access_token = ?,
        google_token_expires = ?
      WHERE id = ?
    `).bind(tokens.access_token, tokenExpires, user_id).run()
    
    return c.json({ 
      success: true, 
      access_token: tokens.access_token,
      expires_at: tokenExpires
    })
  } catch (error) {
    console.error('Erro ao renovar token:', error)
    return c.json({ error: 'Erro ao renovar token' }, 500)
  }
})

// Verificar status da conexão Google
app.get('/api/auth/google/status/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  
  try {
    // Primeiro, verificar se as colunas do Google existem
    let user: any = null
    
    try {
      user = await DB.prepare(`
        SELECT google_id, google_email, google_picture, auth_provider, 
               google_token_expires, last_sync_at
        FROM users WHERE id = ?
      `).bind(user_id).first()
    } catch (columnError: any) {
      // Se as colunas não existem, retornar status desconectado
      if (columnError.message?.includes('no such column')) {
        console.log('⚠️ Colunas Google ainda não existem - retornando status desconectado')
        return c.json({
          connected: false,
          email: null,
          picture: null,
          authProvider: 'email',
          tokenValid: false,
          lastSync: null,
          googleNotConfigured: true
        })
      }
      throw columnError
    }
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    const isConnected = !!user.google_id
    const tokenExpired = user.google_token_expires ? new Date(user.google_token_expires) < new Date() : true
    
    return c.json({
      connected: isConnected,
      email: user.google_email,
      picture: user.google_picture,
      authProvider: user.auth_provider || 'email',
      tokenValid: isConnected && !tokenExpired,
      lastSync: user.last_sync_at
    })
  } catch (error) {
    console.error('Erro ao verificar status Google:', error)
    // Retornar status desconectado em vez de erro
    return c.json({
      connected: false,
      email: null,
      picture: null,
      authProvider: 'email',
      tokenValid: false,
      lastSync: null
    })
  }
})

// Desconectar Google
app.post('/api/auth/google/disconnect', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  try {
    const user = await DB.prepare(
      'SELECT auth_provider, password FROM users WHERE id = ?'
    ).bind(user_id).first() as any
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    // Se o usuário só tem Google (sem senha), não pode desconectar
    if (user.auth_provider === 'google' && (!user.password || user.password === '')) {
      return c.json({ 
        error: 'Você precisa definir uma senha antes de desconectar o Google',
        needsPassword: true
      }, 400)
    }
    
    await DB.prepare(`
      UPDATE users SET 
        google_id = NULL,
        google_email = NULL,
        google_picture = NULL,
        google_access_token = NULL,
        google_refresh_token = NULL,
        google_token_expires = NULL,
        auth_provider = 'email'
      WHERE id = ?
    `).bind(user_id).run()
    
    return c.json({ success: true, message: 'Google desconectado com sucesso' })
  } catch (error) {
    console.error('Erro ao desconectar Google:', error)
    return c.json({ error: 'Erro ao desconectar' }, 500)
  }
})

// Verificar email com token
app.get('/api/verify-email/:token', async (c) => {
  const { DB } = c.env
  const token = c.req.param('token')
  
  if (!token) {
    return c.json({ error: 'Token inválido' }, 400)
  }
  
  // Token de teste para desenvolvimento
  if (token === 'TestToken123ABC456DEF789GHI012JKL') {
    console.log('🧪 Token de teste detectado!')
    return c.json({ 
      message: '🧪 Token de teste reconhecido! Este é um token especial para testes. Em produção, seria validado no banco de dados.',
      success: true,
      testMode: true,
      email: 'terciogomesrabelo@gmail.com'
    })
  }
  
  try {
    // Buscar usuário pelo token
    const user = await DB.prepare(
      `SELECT id, email, email_verified, verification_token_expires 
       FROM users 
       WHERE verification_token = ? 
       AND datetime('now') < verification_token_expires`
    ).bind(token).first() as any
    
    if (!user) {
      return c.json({ 
        error: 'Token inválido ou expirado. Solicite um novo email de verificação.' 
      }, 400)
    }
    
    // Se já está verificado
    if (user.email_verified) {
      return c.json({ 
        message: 'Email já verificado. Você pode fazer login.',
        alreadyVerified: true 
      })
    }
    
    // Verificar o email
    await DB.prepare(
      `UPDATE users 
       SET email_verified = 1, 
           verification_token = NULL, 
           verification_token_expires = NULL 
       WHERE id = ?`
    ).bind(user.id).run()
    
    return c.json({ 
      message: 'Email verificado com sucesso! Agora você pode fazer login.',
      email: user.email,
      success: true
    })
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return c.json({ error: 'Erro ao verificar email' }, 500)
  }
})

// Solicitar recuperação de senha
app.post('/api/forgot-password', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const email = body.email?.toLowerCase()?.trim()
  
  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Email inválido' }, 400)
  }
  
  try {
    // Buscar usuário
    const user = await DB.prepare(
      'SELECT id, name, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as any
    
    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      return c.json({ 
        message: 'Se o email estiver cadastrado, você receberá instruções de recuperação.',
        success: true 
      })
    }
    
    // Se email não está verificado, não permitir reset
    if (!user.email_verified) {
      return c.json({ 
        error: 'Email não verificado. Verifique seu email primeiro.',
        needsVerification: true 
      }, 403)
    }
    
    // Gerar token de reset
    const resetToken = generateSecureToken()
    
    // Salvar token no banco (válido por 1 hora)
    await DB.prepare(
      `UPDATE users 
       SET reset_token = ?, 
           reset_token_expires = datetime('now', '+1 hour') 
       WHERE id = ?`
    ).bind(resetToken, user.id).run()
    
    // Enviar email de reset
    const emailSent = await sendPasswordResetEmail(email, resetToken, user.name, c.env)
    const APP_URL = c.env?.APP_URL || 'https://iaprova.app'
    const resetUrl = `${APP_URL}/resetar-senha?token=${resetToken}`
    
    console.log('🔐 Token de reset gerado:', resetToken)
    console.log('📧 Email de reset enviado:', emailSent)
    
    // SEMPRE retornar o token para permitir reset manual
    return c.json({ 
      message: emailSent 
        ? 'Se o email estiver cadastrado, você receberá instruções de recuperação. Se não receber, use o link abaixo.'
        : '✅ Use o link abaixo para redefinir sua senha.',
      success: true,
      // SEMPRE retornar token e URL para permitir reset manual
      devToken: resetToken,
      devMode: !emailSent,
      resetUrl
    })
  } catch (error) {
    console.error('Erro ao processar recuperação de senha:', error)
    return c.json({ error: 'Erro ao processar solicitação' }, 500)
  }
})

// Validar token de reset
app.get('/api/reset-password/validate/:token', async (c) => {
  const { DB } = c.env
  const token = c.req.param('token')
  
  if (!token) {
    return c.json({ error: 'Token inválido' }, 400)
  }
  
  try {
    // Buscar usuário pelo token
    const user = await DB.prepare(
      `SELECT id, email, name 
       FROM users 
       WHERE reset_token = ? 
       AND datetime('now') < reset_token_expires`
    ).bind(token).first() as any
    
    if (!user) {
      return c.json({ 
        error: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.',
        valid: false 
      }, 400)
    }
    
    return c.json({ 
      message: 'Token válido',
      email: user.email,
      valid: true 
    })
  } catch (error) {
    console.error('Erro ao validar token:', error)
    return c.json({ error: 'Erro ao validar token' }, 500)
  }
})

// Resetar senha com token
app.post('/api/reset-password', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { token, newPassword } = body
  
  if (!token || !newPassword) {
    return c.json({ error: 'Token e nova senha são obrigatórios' }, 400)
  }
  
  if (newPassword.length < 4) {
    return c.json({ error: 'A senha deve ter pelo menos 4 caracteres' }, 400)
  }
  
  try {
    // Buscar usuário pelo token
    const user = await DB.prepare(
      `SELECT id, email 
       FROM users 
       WHERE reset_token = ? 
       AND datetime('now') < reset_token_expires`
    ).bind(token).first() as any
    
    if (!user) {
      return c.json({ 
        error: 'Token inválido ou expirado. Solicite uma nova recuperação de senha.' 
      }, 400)
    }
    
    // Atualizar senha e limpar token
    await DB.prepare(
      `UPDATE users 
       SET password = ?, 
           reset_token = NULL, 
           reset_token_expires = NULL 
       WHERE id = ?`
    ).bind(newPassword, user.id).run()
    
    console.log('✅ Senha resetada para usuário:', user.email)
    
    return c.json({ 
      message: 'Senha alterada com sucesso! Você já pode fazer login.',
      success: true,
      email: user.email 
    })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return c.json({ error: 'Erro ao resetar senha' }, 500)
  }
})

// Reenviar email de verificação
app.post('/api/resend-verification', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const email = body.email?.toLowerCase()?.trim()
  
  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Email inválido' }, 400)
  }
  
  try {
    // Buscar usuário
    const user = await DB.prepare(
      'SELECT id, name, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as any
    
    if (!user) {
      return c.json({ error: 'Email não cadastrado' }, 404)
    }
    
    // Se já está verificado
    if (user.email_verified) {
      return c.json({ 
        message: 'Email já verificado. Você pode fazer login.',
        alreadyVerified: true 
      })
    }
    
    // Gerar novo token
    const newToken = generateSecureToken()
    
    // Atualizar token no banco
    await DB.prepare(
      `UPDATE users 
       SET verification_token = ?, 
           verification_token_expires = datetime('now', '+24 hours') 
       WHERE id = ?`
    ).bind(newToken, user.id).run()
    
    // Reenviar email
    const emailSent = await sendVerificationEmail(email, newToken, user.name, c.env)
    const APP_URL = c.env?.APP_URL || 'https://iaprova.app'
    const verificationUrl = `${APP_URL}/verificar-email?token=${newToken}`
    
    // SEMPRE retornar o token para permitir verificação manual
    return c.json({ 
      message: emailSent 
        ? '✅ Email de verificação reenviado! Verifique sua caixa de entrada (e a pasta de spam). Se não receber, use o link abaixo.'
        : '✅ Use o link abaixo para verificar seu email.',
      emailSent,
      // SEMPRE retornar token e URL para permitir verificação manual
      devToken: newToken,
      devMode: !emailSent,
      verificationUrl
    })
  } catch (error) {
    console.error('Erro ao reenviar email:', error)
    return c.json({ error: 'Erro ao reenviar email' }, 500)
  }
})

// Verificar email com token
app.get('/api/verify-email/:token', async (c) => {
  const { DB } = c.env
  const token = c.req.param('token')
  
  try {
    const user = await DB.prepare(`
      SELECT id, name, email, verification_token_expires 
      FROM users 
      WHERE verification_token = ? AND email_verified = 0
    `).bind(token).first() as any
    
    if (!user) {
      return c.json({ error: 'Token inválido ou já utilizado' }, 400)
    }
    
    const now = new Date()
    const expires = new Date(user.verification_token_expires)
    if (now > expires) {
      return c.json({ error: 'Token expirado. Solicite um novo link.' }, 400)
    }
    
    await DB.prepare(`
      UPDATE users 
      SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL 
      WHERE id = ?
    `).bind(user.id).run()
    
    // Enviar email de boas-vindas
    await sendWelcomeEmail(user.email, user.name, c.env);
    
    return c.json({
      message: 'Email verificado com sucesso!',
      verified: true,
      email: user.email
    })
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return c.json({ error: 'Erro ao verificar email' }, 500)
  }
})

app.get('/api/users/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const user = await DB.prepare(
    'SELECT id, name, email, created_at FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) {
    return c.json({ error: 'Usuário não encontrado' }, 404)
  }

  return c.json(user)
})

// Atualizar usuário
app.put('/api/users/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { name, email, password } = await c.req.json()

  try {
    // Verificar se usuário existe
    const user = await DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(id).first()

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }

    // Verificar se email já está em uso por outro usuário
    if (email) {
      const existingUser = await DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
      ).bind(email, id).first()

      if (existingUser) {
        return c.json({ error: 'Email já está em uso' }, 400)
      }
    }

    // Construir query de atualização
    const updates = []
    const params = []

    if (name) {
      updates.push('name = ?')
      params.push(name)
    }
    if (email) {
      updates.push('email = ?')
      params.push(email)
    }
    if (password) {
      updates.push('password = ?')
      params.push(password)
    }

    if (updates.length === 0) {
      return c.json({ error: 'Nenhum dado para atualizar' }, 400)
    }

    params.push(id)

    await DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    // Buscar usuário atualizado
    const updatedUser = await DB.prepare(
      'SELECT id, name, email, created_at FROM users WHERE id = ?'
    ).bind(id).first()

    return c.json({ 
      ...updatedUser,
      message: 'Perfil atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return c.json({ error: 'Erro ao atualizar usuário' }, 500)
  }
})

// ============== ROTAS DE EDITAIS ==============

// Upload de edital (PDF/TXT via Gemini)
app.post('/api/editais/upload', async (c) => {
  const { DB, EDITAIS } = c.env
  const formData = await c.req.formData()
  const userId = formData.get('user_id') as string
  const nomeConcurso = formData.get('nome_concurso') as string
  const bancaInformada = formData.get('banca_organizadora') as string || null
  const files = formData.getAll('arquivos') as File[]

  if (!userId || !nomeConcurso || files.length === 0) {
    return c.json({ error: 'user_id, nome_concurso e arquivos são obrigatórios' }, 400)
  }

  // ✅ VALIDAR se usuário existe
  const userExists = await DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
  if (!userExists) {
    console.error(`❌ Usuário ${userId} não encontrado no banco`)
    return c.json({ 
      error: 'Usuário não encontrado. Faça login novamente.',
      code: 'USER_NOT_FOUND'
    }, 404)
  }

  const geminiKey = c.env.GEMINI_API_KEY || 'SUA_CHAVE_GEMINI_AQUI'

  try {
    const uploadedFiles = []

    for (const file of files) {
      const timestamp = Date.now()
      const key = `editais/${userId}/${timestamp}_${file.name}`
      
      let textoCompleto = ''
      let disciplinasExtraidas: any = null
      
      // ✅ NOVO: Suporte para XLSX (cronograma)
      if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        console.log(`📊 XLSX detectado: ${file.name}. Extraindo disciplinas e tópicos...`)
        
        try {
          const arrayBuffer = await file.arrayBuffer()
          const resultado = await extractFromXLSX(arrayBuffer)
          disciplinasExtraidas = resultado.disciplinas
          
          // Criar um texto descritivo para salvar no banco
          textoCompleto = `CRONOGRAMA IMPORTADO DO EXCEL\n\n`
          disciplinasExtraidas.forEach((d: any) => {
            textoCompleto += `${d.nome}:\n`
            d.topicos.forEach((t: string) => {
              textoCompleto += `  - ${t}\n`
            })
            textoCompleto += `\n`
          })
          
          console.log(`✅ XLSX processado: ${disciplinasExtraidas.length} disciplinas, ${disciplinasExtraidas.reduce((acc: number, d: any) => acc + d.topicos.length, 0)} tópicos`)
        } catch (xlsxError) {
          console.error(`❌ Erro ao processar XLSX:`, xlsxError)
          return c.json({ error: `Erro ao processar planilha: ${xlsxError}` }, 400)
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Arquivo TXT: ler diretamente
        textoCompleto = await file.text()
        console.log(`✅ TXT lido: ${textoCompleto.length} caracteres`)
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // ✅ PDF: Verificar tamanho e processar
        const arrayBuffer = await file.arrayBuffer()
        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024)
        
        console.log(`📄 PDF detectado: ${file.name} (${fileSizeMB.toFixed(2)} MB)`)
        
        // ⚠️ PDFs muito grandes (>15MB): Salvar sem extrair texto agora
        // O usuário deve converter para TXT manualmente
        if (fileSizeMB > 15) {
          console.warn(`⚠️ PDF muito grande (${fileSizeMB.toFixed(1)}MB). Salvando para processamento manual.`)
          
          // Salvar arquivo no R2 se disponível
          if (EDITAIS) {
            await EDITAIS.put(key, arrayBuffer, {
              httpMetadata: { contentType: file.type }
            })
          }
          
          // Salvar no banco com instrução para converter
          const result = await DB.prepare(`
            INSERT INTO editais (user_id, nome_concurso, arquivo_url, texto_completo, status)
            VALUES (?, ?, ?, ?, 'erro')
          `).bind(
            userId, 
            nomeConcurso, 
            key, 
            `[PDF MUITO GRANDE - ${fileSizeMB.toFixed(1)}MB]\n\nO arquivo excede o limite de processamento automático (15MB).\n\nPor favor:\n1. Converta o PDF para TXT em: https://smallpdf.com/pdf-to-text\n2. Ou use um arquivo XLSX com o cronograma de estudos\n3. Anexe o arquivo convertido novamente`,
            ).run()
          
          return c.json({
            error: `PDF muito grande (${fileSizeMB.toFixed(1)}MB). O limite para processamento automático é 15MB.`,
            errorType: 'FILE_TOO_LARGE',
            suggestion: `Opções:\n1. ✅ RECOMENDADO: Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n2. Use um arquivo XLSX com o cronograma\n3. Divida o PDF em partes menores`,
            fileSizeMB: fileSizeMB.toFixed(2),
            maxSizeMB: 15,
            editalId: result.meta.last_row_id
          }, 413) // 413 = Payload Too Large
        }
        
        // PDFs até 15MB: processar normalmente
        console.log(`📄 Processando PDF (${fileSizeMB.toFixed(2)}MB)...`)
        
        try {
          textoCompleto = await extractTextFromPDF(arrayBuffer, geminiKey)
          
          console.log(`✅ Extração concluída: ${textoCompleto.length} caracteres`)
          
          if (textoCompleto.length < 50) {
            console.warn(`⚠️ Pouco texto extraído (${textoCompleto.length} chars) - mas continuando`)
          }
          
          if (!textoCompleto || textoCompleto.trim().length === 0) {
            console.error(`❌ Nenhum texto extraído do PDF`)
            throw new Error('PDF não contém texto extraível (pode ser escaneado)')
          }
        } catch (pdfError) {
          console.error(`❌ Erro ao extrair texto do PDF:`, pdfError)
          
          // Salvar mesmo assim com placeholder
          textoCompleto = `[ERRO NA EXTRAÇÃO]\n\nArquivo: ${file.name}\nErro: ${pdfError.message}\n\nSugestões:\n- Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n- Use planilha XLSX para processamento mais rápido\n- Verifique se o PDF não está protegido ou escaneado`
          
          console.log(`⚠️ PDF salvo com erro. Usuário pode converter para TXT.`)
        }
      } else {
        console.warn(`⚠️ Arquivo ${file.name} não é TXT, PDF nem XLSX. Será ignorado.`)
        textoCompleto = ''
      }

      // R2 é opcional (apenas em produção)
      if (EDITAIS) {
        await EDITAIS.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type }
        })
        console.log(`✅ Arquivo salvo no R2: ${key}`)
      } else {
        console.log(`⚠️ R2 indisponível (dev local). Salvando apenas texto no banco.`)
      }

      // Inserir registro no banco
      let result: any
      try {
        result = await DB.prepare(`
          INSERT INTO editais (user_id, nome_concurso, arquivo_url, texto_completo, status)
          VALUES (?, ?, ?, ?, 'pendente')
        `).bind(userId, nomeConcurso, key, textoCompleto).run()

        console.log(`💾 Edital #${result.meta.last_row_id} salvo no banco. Texto: ${textoCompleto.length > 0 ? textoCompleto.substring(0, 200) + '...' : '(vazio)'}`)
      } catch (insertError) {
        console.error(`❌ Erro ao inserir edital no banco:`, insertError)
        throw new Error(`Falha ao salvar edital: ${insertError.message}`)
      }

      // ✅ NOVO: Se for XLSX, processar automaticamente e salvar disciplinas/tópicos
      if (disciplinasExtraidas && disciplinasExtraidas.length > 0) {
        console.log(`📊 Processando XLSX automaticamente: ${disciplinasExtraidas.length} disciplinas`)
        
        try {
          // Salvar disciplinas e tópicos no banco
          for (const disciplina of disciplinasExtraidas) {
            // ✅ CORREÇÃO CRÍTICA: Buscar ou criar disciplina na tabela disciplinas
            let disciplinaBaseId: number
            
            // Tentar encontrar disciplina existente (busca fuzzy por nome)
            const { results: disciplinasExistentes } = await DB.prepare(`
              SELECT id, nome FROM disciplinas WHERE nome LIKE ?
            `).bind(`%${disciplina.nome}%`).all()
            
            if (disciplinasExistentes && disciplinasExistentes.length > 0) {
              // Usar primeira correspondência
              disciplinaBaseId = disciplinasExistentes[0].id
              console.log(`  ℹ️ Disciplina "${disciplina.nome}" encontrada (ID: ${disciplinaBaseId})`)
            } else {
              // Criar nova disciplina
              const novaDiscResult = await DB.prepare(`
                INSERT INTO disciplinas (nome, area, descricao)
                VALUES (?, 'geral', 'Disciplina importada do XLSX')
              `).bind(disciplina.nome).run()
              
              disciplinaBaseId = novaDiscResult.meta.last_row_id
              console.log(`  ✅ Nova disciplina "${disciplina.nome}" criada (ID: ${disciplinaBaseId})`)
            }
            
            // Salvar na tabela edital_disciplinas COM disciplina_id
            const discResult = await DB.prepare(`
              INSERT INTO edital_disciplinas (edital_id, disciplina_id, nome, ordem, peso)
              VALUES (?, ?, ?, ?, ?)
            `).bind(
              result.meta.last_row_id, 
              disciplinaBaseId,
              disciplina.nome, 
              disciplina.ordem || 0,
              disciplina.peso || null
            ).run()
            
            const editalDisciplinaId = discResult.meta.last_row_id
            console.log(`  ✅ Disciplina "${disciplina.nome}" vinculada ao edital (edital_disciplina_id: ${editalDisciplinaId}, disciplina_id: ${disciplinaBaseId})`)
            
            // Salvar tópicos
            let topicoOrdem = 0
            for (const topico of disciplina.topicos) {
              await DB.prepare(`
                INSERT INTO edital_topicos (edital_disciplina_id, nome, ordem)
                VALUES (?, ?, ?)
              `).bind(editalDisciplinaId, topico, topicoOrdem++).run()
            }
            console.log(`    📝 ${disciplina.topicos.length} tópicos salvos`)
          }
          
          // Atualizar status do edital
          await DB.prepare(`
            UPDATE editais SET status = 'processado' WHERE id = ?
          `).bind(result.meta.last_row_id).run()
          
          console.log(`✅ XLSX processado e salvo: ${disciplinasExtraidas.length} disciplinas com tópicos`)
        } catch (xlsxSaveError) {
          console.error(`❌ Erro ao salvar disciplinas/tópicos do XLSX:`, xlsxSaveError)
          // Marcar como erro mas não falhar o upload
          await DB.prepare(`
            UPDATE editais SET status = 'erro' WHERE id = ?
          `).bind(result.meta.last_row_id).run()
        }
      }

      uploadedFiles.push({
        id: result.meta.last_row_id,
        nome: file.name,
        url: key,
        texto_extraido: textoCompleto.length > 0,
        tipo: disciplinasExtraidas ? 'xlsx' : (file.name.endsWith('.pdf') ? 'pdf' : 'txt'),
        disciplinas_extraidas: disciplinasExtraidas?.length || 0,
        processado_automaticamente: !!disciplinasExtraidas
      })
    }

    return c.json({ 
      success: true, 
      editais: uploadedFiles,
      message: uploadedFiles.some(f => f.processado_automaticamente) 
        ? 'Cronograma XLSX importado com sucesso! Disciplinas e tópicos já estão disponíveis.' 
        : 'Arquivos enviados com sucesso! Aguarde processamento...'
    })
  } catch (error) {
    console.error('❌ Erro crítico no upload:', error)
    
    // Retornar mensagem de erro detalhada
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor'
    
    // Mensagens amigáveis para erros comuns
    let userFriendlyMessage = 'Erro ao fazer upload de editais'
    let suggestion = 'Tente novamente ou use outro formato de arquivo'
    
    if (errorMessage.includes('USER_NOT_FOUND') || errorMessage.includes('FOREIGN KEY')) {
      userFriendlyMessage = 'Sessão expirada'
      suggestion = 'Faça login novamente'
    } else if (errorMessage.includes('15MB') || errorMessage.includes('muito grande')) {
      userFriendlyMessage = 'Arquivo muito grande'
      suggestion = 'Use um arquivo menor que 15MB ou converta o PDF para TXT'
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      userFriendlyMessage = 'API temporariamente indisponível'
      suggestion = 'Aguarde 2-3 minutos e tente novamente'
    } else if (errorMessage.includes('escaneado') || errorMessage.includes('protegido')) {
      userFriendlyMessage = 'PDF não extraível'
      suggestion = 'Converta o PDF para TXT em https://smallpdf.com/pdf-to-text'
    }
    
    return c.json({ 
      error: userFriendlyMessage,
      details: errorMessage,
      suggestion: suggestion,
      errorType: 'UPLOAD_ERROR'
    }, 500)
  }
})

// ==========================================
// FUNÇÃO AUXILIAR: Extrair seção de conteúdo programático
// ==========================================
function extrairConteudoProgramatico(texto: string): { conteudo: string, encontrado: boolean, posicao: number } {
  // ✅ NORMALIZAR texto: remover espaços extras e normalizar quebras de linha
  const textoNormalizado = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const textoLower = textoNormalizado.toLowerCase()
  
  console.log(`📝 extrairConteudoProgramatico: texto total ${textoLower.length} caracteres`)
  
  // Padrões para encontrar fim do conteúdo programático
  const padroesFim = [
    '\fanexo iii',
    '\nexo iii',
    'anexo iii',
    'anexo iv',
    'cronograma previsto',
    '\fcronograma',
    '\ncronograma'
  ]
  
  let posInicio = -1
  
  // ✅ PASSO 1: Buscar "ANEXO II" como TÍTULO (isolado, não como referência)
  // O ANEXO II real geralmente começa com quebra de página (\f) ou está em linha própria
  // Procuramos por padrões como: "\fANEXO II", "\nANEXO II\n", "ANEXO II\r\n"
  
  // Buscar ANEXO II que é um TÍTULO (seguido de quebra de linha ou CONTEÚDO PROGRAMÁTICO)
  const regexAnexoIITitulo = /[\f\n][ \t]*anexo\s+ii[ \t]*[\r\n]/gi
  let matchTitulo = regexAnexoIITitulo.exec(textoLower)
  if (matchTitulo) {
    posInicio = matchTitulo.index + 1 // Pular o \f ou \n inicial
    console.log(`📍 Encontrado ANEXO II como TÍTULO na posição ${posInicio}`)
  }
  
  // ✅ PASSO 2: Buscar "ANEXO II" seguido de "CONTEÚDO PROGRAMÁTICO" na mesma linha/próximas linhas
  if (posInicio === -1) {
    const regexAnexoCP = /[\f\n][ \t]*anexo\s+ii[^\n]*conteúdo\s*programático|[\f\n][ \t]*anexo\s+ii[\r\n]+[^\n]*conteúdo\s*programático/gi
    let matchAnexoCP = regexAnexoCP.exec(textoLower)
    if (matchAnexoCP) {
      posInicio = matchAnexoCP.index + 1
      console.log(`📍 Encontrado ANEXO II + CONTEÚDO PROGRAMÁTICO na posição ${posInicio}`)
    }
  }
  
  // ✅ PASSO 3: Buscar "CONTEÚDO PROGRAMÁTICO" como título de seção (não referência)
  // Evitar frases como "consta do Anexo II" - procurar quando aparece como TÍTULO
  if (posInicio === -1) {
    const regexCPTitulo = /[\f\n][ \t]*conteúdo\s*programático[ \t]*[\r\n]/gi
    let matchCP = regexCPTitulo.exec(textoLower)
    if (matchCP) {
      posInicio = matchCP.index + 1
      console.log(`📍 Encontrado CONTEÚDO PROGRAMÁTICO como TÍTULO na posição ${posInicio}`)
    }
  }
  
  // ✅ PASSO 4: Buscar "CONHECIMENTOS GERAIS" que NÃO é referência (seguido de disciplinas)
  if (posInicio === -1) {
    const regexCG = /[\f\n][ \t]*(?:cargos?\s+de\s+)?(?:nível\s+(?:médio|superior)[^\n]*[\r\n]+)?[ \t]*conhecimentos?\s+gerais[ \t]*[\r\n]/gi
    let matchCG
    while ((matchCG = regexCG.exec(textoLower)) !== null) {
      const posCG = matchCG.index + 1
      // Verificar se há "Língua Portuguesa" nos próximos 1500 caracteres (indica conteúdo real)
      const proximosChars = textoLower.substring(posCG, posCG + 1500)
      if (proximosChars.includes('língua portuguesa') || proximosChars.includes('lingua portuguesa')) {
        posInicio = posCG
        console.log(`📍 Encontrado CONHECIMENTOS GERAIS com disciplinas na posição ${posInicio}`)
        break
      }
    }
  }
  
  // ✅ PASSO 5: Buscar "Língua Portuguesa:" como início de listagem de tópicos
  if (posInicio === -1) {
    // Buscar padrão: "Língua Portuguesa:" seguido de tópicos
    const regexLP = /[\f\n][ \t]*1\.?\s*língua\s+portuguesa\s*:|[\f\n][ \t]*língua\s+portuguesa\s*:/gi
    let matchLP = regexLP.exec(textoLower)
    if (matchLP) {
      // Voltar um pouco para pegar o cabeçalho
      posInicio = Math.max(0, matchLP.index - 300)
      console.log(`📍 Encontrado "Língua Portuguesa:" na posição ${matchLP.index}, iniciando em ${posInicio}`)
    }
  }
  
  // ✅ PASSO 6: Buscar seção "CARGOS DE NÍVEL" que precede conteúdo programático
  if (posInicio === -1) {
    const regexNivel = /[\f\n][ \t]*cargos?\s+de\s+nível\s+(?:médio|superior)/gi
    let matchNivel
    while ((matchNivel = regexNivel.exec(textoLower)) !== null) {
      const posNivel = matchNivel.index + 1
      const proximosChars = textoLower.substring(posNivel, posNivel + 2000)
      if (proximosChars.includes('língua portuguesa') || proximosChars.includes('conhecimentos gerais')) {
        posInicio = posNivel
        console.log(`📍 Encontrado seção CARGOS DE NÍVEL com disciplinas na posição ${posInicio}`)
        break
      }
    }
  }
  
  // Se ainda não encontrou, retornar texto original truncado
  if (posInicio === -1) {
    console.log(`⚠️ Nenhum padrão de conteúdo programático encontrado, usando texto completo`)
    return { 
      conteudo: texto.substring(0, 60000), 
      encontrado: false,
      posicao: 0 
    }
  }
  
  // Encontrar fim - buscar ANEXO III ou próxima seção
  let posFim = textoNormalizado.length
  for (const padrao of padroesFim) {
    const pos = textoLower.indexOf(padrao, posInicio + 2000) // Procurar após 2000 chars do início
    if (pos !== -1 && pos < posFim) {
      posFim = pos
      console.log(`📍 Encontrado padrão de fim "${padrao.replace(/[\f\n]/g, '\\n')}" na posição ${pos}`)
      break
    }
  }
  
  // Limitar a 60k caracteres do conteúdo programático
  const maxLength = 60000
  if (posFim - posInicio > maxLength) {
    posFim = posInicio + maxLength
  }
  
  const conteudoExtraido = textoNormalizado.substring(posInicio, posFim)
  console.log(`📝 Conteúdo extraído: ${conteudoExtraido.length} caracteres (posição ${posInicio} a ${posFim})`)
  console.log(`📄 Preview início: ${conteudoExtraido.substring(0, 200).replace(/\r?\n/g, ' ')}...`)
  
  // ✅ VALIDAÇÃO: Verificar se o conteúdo extraído parece ter disciplinas
  const conteudoLower = conteudoExtraido.toLowerCase()
  const temDisciplinas = conteudoLower.includes('língua portuguesa') ||
                         conteudoLower.includes('lingua portuguesa') ||
                         conteudoLower.includes('raciocínio lógico') ||
                         conteudoLower.includes('raciocinio logico') ||
                         conteudoLower.includes('conhecimentos específicos') ||
                         conteudoLower.includes('conhecimentos especificos')
  
  if (!temDisciplinas) {
    console.log(`⚠️ Conteúdo extraído não parece ter disciplinas listadas, buscando no texto completo...`)
    
    // Tentar encontrar qualquer seção com disciplinas no texto completo
    const regexQualquerDisciplina = /língua\s+portuguesa\s*:/gi
    const matchQualquer = regexQualquerDisciplina.exec(textoLower)
    if (matchQualquer) {
      const novoInicio = Math.max(0, matchQualquer.index - 500)
      const novoFim = Math.min(textoNormalizado.length, novoInicio + 60000)
      console.log(`📍 Fallback: encontrado disciplinas em ${matchQualquer.index}, extraindo de ${novoInicio}`)
      return {
        conteudo: textoNormalizado.substring(novoInicio, novoFim),
        encontrado: true,
        posicao: novoInicio
      }
    }
    
    return {
      conteudo: textoNormalizado.substring(0, 60000),
      encontrado: false,
      posicao: 0
    }
  }
  
  return {
    conteudo: conteudoExtraido,
    encontrado: true,
    posicao: posInicio
  }
}

// ✅ ENDPOINT: Deletar edital e permitir re-upload
app.delete('/api/editais/:id', async (c) => {
  const { DB } = c.env
  const editalId = c.req.param('id')
  
  try {
    // Primeiro deletar tópicos associados às disciplinas
    await DB.prepare(`
      DELETE FROM edital_topicos WHERE edital_disciplina_id IN (
        SELECT id FROM edital_disciplinas WHERE edital_id = ?
      )
    `).bind(editalId).run()
    
    // Depois deletar disciplinas associadas
    await DB.prepare(`DELETE FROM edital_disciplinas WHERE edital_id = ?`).bind(editalId).run()
    
    // Por fim, deletar edital
    await DB.prepare(`DELETE FROM editais WHERE id = ?`).bind(editalId).run()
    
    console.log(`🗑️ Edital #${editalId} deletado com sucesso`)
    return c.json({ success: true, message: 'Edital deletado com sucesso' })
  } catch (error) {
    console.error('❌ Erro ao deletar edital:', error)
    return c.json({ error: 'Erro ao deletar edital' }, 500)
  }
})

// ✅ ENDPOINT: Resetar edital para reprocessamento
app.post('/api/editais/:id/reset', async (c) => {
  const { DB } = c.env
  const editalId = c.req.param('id')
  
  try {
    // Primeiro deletar tópicos associados às disciplinas
    await DB.prepare(`
      DELETE FROM edital_topicos WHERE edital_disciplina_id IN (
        SELECT id FROM edital_disciplinas WHERE edital_id = ?
      )
    `).bind(editalId).run()
    
    // Depois deletar disciplinas associadas
    await DB.prepare(`DELETE FROM edital_disciplinas WHERE edital_id = ?`).bind(editalId).run()
    
    // Resetar status do edital
    await DB.prepare(`UPDATE editais SET status = 'pendente' WHERE id = ?`).bind(editalId).run()
    
    console.log(`🔄 Edital #${editalId} resetado para reprocessamento`)
    return c.json({ success: true, message: 'Edital resetado para reprocessamento' })
  } catch (error) {
    console.error('❌ Erro ao resetar edital:', error)
    return c.json({ error: 'Erro ao resetar edital' }, 500)
  }
})

// Processar edital: extrair disciplinas e tópicos via IA (Gemini)
app.post('/api/editais/processar/:id', async (c) => {
  const { DB } = c.env
  const editalId = c.req.param('id')

  try {
    console.log('═'.repeat(60))
    console.log('📋 PASSO 1: Buscando edital no banco de dados...')
    console.log('═'.repeat(60))
    
    // Buscar edital (aceita pendente ou erro para permitir reprocessamento)
    const edital = await DB.prepare(`
      SELECT * FROM editais WHERE id = ? AND status IN ('pendente', 'erro')
    `).bind(editalId).first() as any

    if (!edital) {
      return c.json({ error: 'Edital não encontrado ou já processado' }, 404)
    }
    
    console.log(`✅ Edital #${editalId} encontrado: ${edital.nome_concurso}`)
    
    // ✅ NOVO: Buscar cargo da entrevista do usuário para filtrar disciplinas
    const entrevista = await DB.prepare(`
      SELECT cargo, concurso_nome, area_geral FROM interviews WHERE user_id = ? ORDER BY id DESC LIMIT 1
    `).bind(edital.user_id).first() as any
    
    const cargoDesejado = entrevista?.cargo || ''
    console.log(`👤 Cargo desejado pelo usuário: ${cargoDesejado || 'Não especificado'}`)

    // Validar texto do edital
    const textoOriginal = edital.texto_completo

    if (!textoOriginal || textoOriginal.trim() === '') {
      console.error('❌ ERRO: Texto do edital vazio')
      return c.json({ 
        error: 'Texto do edital vazio. O arquivo pode não ter sido processado corretamente.',
        errorType: 'EMPTY_TEXT',
        suggestion: 'Por favor, anexe o edital novamente ou converta o PDF para TXT.',
        step: 1,
        stepName: 'Validação do arquivo'
      }, 400)
    }
    
    console.log('═'.repeat(60))
    console.log('📋 PASSO 2: Validando conteúdo do texto...')
    console.log('═'.repeat(60))
    
    // ✅ NOVA VALIDAÇÃO: Verificar se o texto tem conteúdo suficiente
    // ✅ CORREÇÃO: Remover prefixos de resposta da IA que podem ter vindo da extração
    let textoLimpo = textoOriginal.trim()
    
    // Remover prefixos comuns de resposta da IA
    const prefixosIA = [
      /^ok,?\s*(aqui\s+está|segue|abaixo)[^:]*:/i,
      /^(aqui\s+está|segue|abaixo)[^:]*:/i,
      /^transcrição[^:]*:/i,
      /^texto\s+extraído[^:]*:/i,
    ]
    for (const prefixo of prefixosIA) {
      textoLimpo = textoLimpo.replace(prefixo, '').trim()
    }
    
    console.log(`📝 Texto total: ${textoLimpo.length} caracteres`)
    
    if (textoLimpo.length < 500) {
      console.error(`❌ Texto muito curto: ${textoLimpo.length} caracteres`)
      
      // Verificar se o texto indica erro de rate limit
      const isRateLimitError = textoLimpo.toLowerCase().includes('rate limit') || 
                               textoLimpo.toLowerCase().includes('limite') ||
                               textoLimpo.toLowerCase().includes('aguarde')
      
      if (isRateLimitError) {
        return c.json({ 
          error: 'API de IA temporariamente sobrecarregada. A extração do PDF falhou.',
          errorType: 'API_RATE_LIMIT',
          suggestion: 'A API Gemini atingiu o limite de requisições. Opções:\n1. Aguarde 2-3 minutos e tente novamente\n2. Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n3. Use um arquivo XLSX com cronograma de estudos',
          textLength: textoLimpo.length,
          step: 2,
          stepName: 'Extração de texto do PDF',
          canRetry: true,
          retryAfter: 120
        }, 503)
      }
      
      return c.json({ 
        error: `Texto do edital muito curto (${textoLimpo.length} caracteres). O PDF pode estar protegido ou ser escaneado.`,
        errorType: 'INSUFFICIENT_TEXT',
        suggestion: 'Possíveis causas:\n• PDF protegido ou escaneado (imagem)\n• Erro na extração de texto pela IA\n• Arquivo corrompido\n\nSoluções:\n1. Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n2. Use um arquivo XLSX com cronograma de estudos\n3. Copie manualmente o conteúdo programático para um arquivo TXT',
        textLength: textoLimpo.length,
        step: 2,
        stepName: 'Validação do conteúdo',
        canRetry: true
      }, 400)
    }
    
    console.log('═'.repeat(60))
    console.log('📋 PASSO 3: Localizando seção de CONTEÚDO PROGRAMÁTICO...')
    console.log('═'.repeat(60))
    
    // ✅ NOVA LÓGICA: Extrair apenas a seção de conteúdo programático
    const { conteudo: textoEdital, encontrado, posicao } = extrairConteudoProgramatico(textoLimpo)
    
    if (encontrado) {
      console.log(`✅ Conteúdo programático encontrado na posição ${posicao}`)
      console.log(`📝 Extraídos ${textoEdital.length} caracteres para análise`)
      console.log(`📄 Preview: ${textoEdital.substring(0, 300)}...`)
    } else {
      console.log(`⚠️ Seção específica não encontrada - usando primeiros ${textoEdital.length} caracteres`)
    }
    
    // Verificar se parece ser conteúdo programático
    const temConteudoProgramatico = textoEdital.toLowerCase().includes('disciplina') ||
                                     textoEdital.toLowerCase().includes('matéria') ||
                                     textoEdital.toLowerCase().includes('conhecimentos') ||
                                     textoEdital.toLowerCase().includes('português') ||
                                     textoEdital.toLowerCase().includes('raciocínio')
    
    if (!temConteudoProgramatico) {
      console.warn(`⚠️ ALERTA: O texto pode não conter conteúdo programático visível`)
    }
    
    console.log('═'.repeat(60))
    console.log('📋 PASSO 4: Enviando para análise com IA Gemini...')
    console.log('═'.repeat(60))

    // Chamar Gemini AI para extrair disciplinas e tópicos
    const geminiKey = c.env.GEMINI_API_KEY || 'SUA_CHAVE_GEMINI_AQUI'
    
    // ════════════════════════════════════════════════════════════════
    // ✅ ETAPA 4A: PRIMEIRA EXTRAÇÃO - LOCALIZAR QUADRO DE PROVAS/PESOS
    // ════════════════════════════════════════════════════════════════
    console.log('📊 ETAPA 4A: Buscando QUADRO DE PROVAS para extrair pesos...')
    
    // Tentar encontrar tabela de provas no texto
    const textoLowerCase = textoLimpo.toLowerCase()
    let quadroProvas: any = null
    
    // Padrões comuns de quadro de provas
    const posQuadro = Math.max(
      textoLowerCase.indexOf('quadro de provas'),
      textoLowerCase.indexOf('composição das provas'),
      textoLowerCase.indexOf('estrutura da prova'),
      textoLowerCase.indexOf('distribuição de questões'),
      textoLowerCase.indexOf('tabela de provas')
    )
    
    if (posQuadro > -1) {
      // Extrair ~3000 caracteres após o início do quadro
      const textoQuadro = textoLimpo.substring(posQuadro, posQuadro + 3000)
      console.log(`  📍 Quadro de provas encontrado na posição ${posQuadro}`)
      console.log(`  📄 Preview: ${textoQuadro.substring(0, 200)}...`)
      
      // Tentar extrair pesos via regex simples antes de usar IA
      // Padrão: "Conhecimentos Gerais ... peso 1" ou "peso: 1" ou "(peso 1)"
      const regexPesoGeral = /conhecimentos?\s+gerais[^0-9]*(?:peso|valor)[:\s]*(\d)/i
      const regexPesoEspecifico = /conhecimentos?\s+espec[íi]ficos[^0-9]*(?:peso|valor)[:\s]*(\d)/i
      
      const matchPesoGeral = textoQuadro.match(regexPesoGeral)
      const matchPesoEspecifico = textoQuadro.match(regexPesoEspecifico)
      
      if (matchPesoGeral || matchPesoEspecifico) {
        quadroProvas = {
          encontrado: true,
          peso_conhecimentos_gerais: matchPesoGeral ? parseInt(matchPesoGeral[1]) : 1,
          peso_conhecimentos_especificos: matchPesoEspecifico ? parseInt(matchPesoEspecifico[1]) : 2,
          fonte: 'regex'
        }
        console.log(`  ✅ Pesos extraídos por regex: CG=${quadroProvas.peso_conhecimentos_gerais}, CE=${quadroProvas.peso_conhecimentos_especificos}`)
      }
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ ETAPA 4B: EXTRAÇÃO PRINCIPAL - DISCIPLINAS E TÓPICOS
    // ════════════════════════════════════════════════════════════════
    console.log('📚 ETAPA 4B: Extraindo disciplinas e tópicos...')
    
    // ✅ PROMPT OTIMIZADO - Extrai APENAS disciplinas do CARGO ESPECÍFICO
    // Usando até 60k caracteres do conteúdo programático extraído
    const textoParaIA = textoEdital.substring(0, 60000)
    console.log(`🤖 Enviando ${textoParaIA.length} caracteres para análise da IA`)
    console.log(`🎯 Filtrando para cargo: ${cargoDesejado || 'Não especificado'}`)
    
    // ✅ INSTRUÇÃO CRÍTICA: Filtrar pelo cargo do candidato
    const instrucaoCargo = cargoDesejado ? `
CARGO DO CANDIDATO: ${cargoDesejado.toUpperCase()}

INSTRUÇÕES:
- Extraia APENAS disciplinas do cargo "${cargoDesejado.toUpperCase()}"
- IGNORE conteúdos de outros cargos
- Procure seções como "NÍVEL SUPERIOR - ${cargoDesejado.toUpperCase()}"

` : '';

    // ✅ USAR PESOS JÁ EXTRAÍDOS DO QUADRO DE PROVAS
    const pesoCG = quadroProvas?.peso_conhecimentos_gerais || 1
    const pesoCE = quadroProvas?.peso_conhecimentos_especificos || 2
    
    // ✅ PROMPT SIMPLIFICADO E DIRETO
    const prompt = `TAREFA: Extrair disciplinas e tópicos do edital para o cargo "${cargoDesejado || 'não especificado'}".

${instrucaoCargo}

REGRAS CRÍTICAS:
1. Extraia APENAS 3-6 DISCIPLINAS (matérias principais da prova)
2. NÃO transforme tópicos em disciplinas separadas
3. "Conhecimentos Específicos" deve ser UMA disciplina com muitos tópicos
4. Use os pesos: Conhecimentos Gerais = ${pesoCG}, Conhecimentos Específicos = ${pesoCE}

EXEMPLOS DE DISCIPLINAS CORRETAS:
- "Língua Portuguesa" (peso ${pesoCG})
- "Raciocínio Lógico" (peso ${pesoCG})
- "Conhecimentos Específicos de ${cargoDesejado || 'Área'}" (peso ${pesoCE}) - com TODOS os itens técnicos como tópicos
- "Legislação SUS" (peso ${pesoCE}) - se for seção separada no edital

TEXTO DO EDITAL:
${textoParaIA}

RETORNE APENAS JSON (sem markdown, sem explicações):
{"disciplinas":[{"nome":"Nome da Disciplina","peso":${pesoCG},"topicos":["Tópico 1","Tópico 2"]}]}`

    // ════════════════════════════════════════════════════════════════════════
    // ✅ SISTEMA SIMPLIFICADO DE CHAMADA À API GEMINI (máximo 2 tentativas)
    // ════════════════════════════════════════════════════════════════════════
    let response: Response | null = null
    let data: any = null
    let lastError: string = ''
    const MAX_RETRIES = 2
    
    // Usar apenas 1 modelo estável
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
    
    // Função auxiliar para delay simples
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    let successModel = 'gemini-2.5-flash'
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`🔄 Tentativa ${attempt}/${MAX_RETRIES} com Gemini Flash...`)
      
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 32768
            }
          })
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          lastError = `HTTP ${response.status}: ${errorText.substring(0, 200)}`
          console.error(`❌ Erro HTTP ${response.status}`)
          
          if (attempt < MAX_RETRIES) {
            console.log(`⏳ Aguardando 5s antes de nova tentativa...`)
            await delay(5000)
            continue
          }
          break
        }
        
        data = await response.json() as any
        
        if (!data?.candidates?.[0]) {
          lastError = 'Resposta sem conteúdo válido'
          if (data?.promptFeedback?.blockReason) {
            lastError = `Conteúdo bloqueado: ${data.promptFeedback.blockReason}`
          }
          
          if (attempt < MAX_RETRIES) {
            await delay(3000)
            continue
          }
          break
        }
        
        // SUCESSO!
        console.log(`✅ Gemini respondeu com sucesso!`)
        break
        
      } catch (fetchError) {
        lastError = `Erro de rede: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
        console.error(`❌ Erro:`, lastError)
        
        if (attempt < MAX_RETRIES) {
          await delay(3000)
          continue
        }
      }
    }
    
    // Se falhou, retornar erro
    if (!data?.candidates?.[0]) {
      console.error('❌ Falha após todas as tentativas.')
      console.error(`Último erro: ${lastError}`)
      
      await DB.prepare(`UPDATE editais SET status = 'erro' WHERE id = ?`).bind(editalId).run()
      
      const isRateLimit = lastError.includes('429') || lastError.includes('Too Many')
      
      return c.json({
        error: isRateLimit ? 'API temporariamente indisponível (rate limit).' : 'Erro ao processar edital com IA.',
        errorType: isRateLimit ? 'RATE_LIMIT' : 'AI_ERROR',
        suggestion: 'Aguarde 30 segundos e tente novamente, ou use um arquivo XLSX.',
        canRetry: true,
        retryAfter: 30,
        step: 4,
        stepName: 'Análise com IA'
      }, isRateLimit ? 429 : 500)
    }
    
    console.log(`✅ Sucesso com modelo: ${successModel}`)
    
    // Extrair texto da resposta com validação
    if (!data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('❌ Estrutura da resposta inválida:', JSON.stringify(data, null, 2))
      throw new Error('Gemini retornou estrutura de resposta inválida')
    }
    
    const textoResposta = data.candidates[0].content.parts[0].text
    console.log('🤖 Resposta da IA (primeiros 500 caracteres):', textoResposta.substring(0, 500))
    console.log(`📝 Tamanho total da resposta: ${textoResposta.length} caracteres`)
    
    // ════════════════════════════════════════════════════════════════
    // ✅ SISTEMA ULTRA-ROBUSTO DE PARSING DE RESPOSTA DA IA
    // ════════════════════════════════════════════════════════════════
    
    let resultado: any = null
    
    // Estratégia 1: Tentar extrair JSON da resposta
    let jsonMatch = textoResposta.match(/\{[\s\S]*\}/)
    
    if (jsonMatch) {
      try {
        // Limpar JSON de caracteres problemáticos
        let jsonStr = jsonMatch[0]
        jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ') // Remove caracteres de controle
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1') // Remove vírgulas extras
        jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, ' ')
        
        try {
          resultado = JSON.parse(jsonStr)
          console.log('✅ JSON parseado com sucesso na primeira tentativa')
        } catch (e) {
          console.warn('⚠️ Primeira tentativa de parse falhou, tentando correção...')
          
          // Estratégia 1b: Fechar arrays/objetos abertos
          let bracketCount = 0, braceCount = 0
          for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') braceCount++
            if (jsonStr[i] === '}') braceCount--
            if (jsonStr[i] === '[') bracketCount++
            if (jsonStr[i] === ']') bracketCount--
          }
          
          let closingChars = ''
          for (let i = 0; i < bracketCount; i++) closingChars += ']'
          for (let i = 0; i < braceCount; i++) closingChars += '}'
          
          if (closingChars) {
            jsonStr = jsonStr + closingChars
            console.log('📝 Tentando com fechamento automático...')
          }
          
          try {
            resultado = JSON.parse(jsonStr)
            console.log('✅ JSON parseado após correção de fechamento')
          } catch (e2) {
            console.warn('⚠️ Segunda tentativa falhou')
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Erro ao processar JSON:', parseError)
      }
    }
    
    // Estratégia 2: Extrair disciplinas por regex se JSON falhou
    if (!resultado || !resultado.disciplinas || resultado.disciplinas.length === 0) {
      console.log('🔄 Tentando extração por regex...')
      
      // Padrões para encontrar disciplinas no texto
      const disciplinasExtraidas: any[] = []
      
      // Padrão 1: "nome": "Disciplina"
      const regexNome = /"nome"\s*:\s*"([^"]+)"/gi
      let match
      const nomesEncontrados = new Set<string>()
      
      while ((match = regexNome.exec(textoResposta)) !== null) {
        const nome = match[1].trim()
        if (nome.length > 3 && nome.length < 100 && !nomesEncontrados.has(nome.toLowerCase())) {
          nomesEncontrados.add(nome.toLowerCase())
          disciplinasExtraidas.push({
            nome: nome,
            peso: null,
            topicos: []
          })
        }
      }
      
      // Padrão 2: Buscar listas de disciplinas por texto
      if (disciplinasExtraidas.length === 0) {
        const padroesTexto = [
          /(?:língua\s*)?portugu[eê]s/gi,
          /racioc[íi]nio\s*l[óo]gico/gi,
          /matem[áa]tica/gi,
          /inform[áa]tica/gi,
          /conhecimentos?\s*(?:regionais?|gerais?|espec[íi]ficos?)/gi,
          /(?:sistema\s*)?[úu]nico\s*de\s*sa[úu]de|sus/gi,
          /enfermagem/gi,
          /sa[úu]de\s*(?:p[úu]blica|coletiva|da\s*mulher|da\s*crian[çc]a)/gi,
          /legisla[çc][ãa]o/gi,
          /[ée]tica/gi,
          /administra[çc][ãa]o\s*p[úu]blica/gi,
          /direito\s*(?:administrativo|constitucional|penal)/gi,
        ]
        
        for (const padrao of padroesTexto) {
          const matches = textoResposta.match(padrao)
          if (matches) {
            for (const m of matches) {
              const nomeNorm = m.trim()
              if (!nomesEncontrados.has(nomeNorm.toLowerCase())) {
                nomesEncontrados.add(nomeNorm.toLowerCase())
                // Capitalizar primeira letra
                const nomeCap = nomeNorm.charAt(0).toUpperCase() + nomeNorm.slice(1).toLowerCase()
                disciplinasExtraidas.push({
                  nome: nomeCap,
                  peso: null,
                  topicos: []
                })
              }
            }
          }
        }
      }
      
      if (disciplinasExtraidas.length > 0) {
        console.log(`✅ Extraídas ${disciplinasExtraidas.length} disciplinas por regex`)
        resultado = { disciplinas: disciplinasExtraidas, info_peso: {} }
      }
    }
    
    // Estratégia 3: Se ainda não tem resultado, criar disciplinas padrão baseadas no cargo
    if (!resultado || !resultado.disciplinas || resultado.disciplinas.length === 0) {
      console.log('🔄 Usando disciplinas padrão baseadas no cargo...')
      
      const cargoNorm = cargoDesejado.toLowerCase()
      let disciplinasPadrao: any[] = []
      
      // Disciplinas básicas para qualquer concurso (tópicos completos)
      disciplinasPadrao = [
        { 
          nome: 'Língua Portuguesa', 
          peso: 1, 
          topicos: [
            'Ortografia oficial',
            'Acentuação gráfica',
            'Pontuação',
            'Morfossintaxe',
            'Classes de palavras',
            'Pronomes: emprego, formas de tratamento e colocação',
            'Tempos e modos verbais',
            'Vozes do verbo',
            'Concordância nominal e verbal',
            'Regência nominal e verbal',
            'Frase, oração e período',
            'Processos de coordenação e subordinação',
            'Compreensão e interpretação de texto',
            'Gêneros textuais',
            'Figuras de linguagem'
          ] 
        },
        { 
          nome: 'Raciocínio Lógico-Matemático', 
          peso: 1, 
          topicos: [
            'Estrutura lógica de relações',
            'Raciocínio verbal',
            'Raciocínio matemático',
            'Raciocínio sequencial',
            'Orientação espacial e temporal',
            'Formação de conceitos',
            'Discriminação de elementos',
            'Noções de aritmética',
            'Proporcionalidade e porcentagem',
            'Regra de três simples',
            'Cálculos de porcentagem, acréscimos e descontos'
          ] 
        },
      ]
      
      // Adicionar disciplinas específicas por área
      if (cargoNorm.includes('enfermeiro') || cargoNorm.includes('saúde') || cargoNorm.includes('saude')) {
        // ✅ CONHECIMENTOS REGIONAIS DO PIAUÍ (típico de concursos estaduais)
        disciplinasPadrao.push({
          nome: 'Conhecimentos Regionais do Estado do Piauí',
          peso: 1,
          topicos: ['História do Piauí', 'Geografia do Piauí', 'Cultura piauiense', 'Economia do Piauí', 'Política do Piauí']
        })
        
        // ✅ SUS E LEGISLAÇÃO DE SAÚDE
        disciplinasPadrao.push({
          nome: 'Sistema Único de Saúde (SUS) e Legislação',
          peso: 2,
          topicos: [
            'Princípios e Diretrizes do SUS (Universalidade, Equidade, Integralidade)',
            'Constituição Federal - Artigos 196 a 200',
            'Lei Orgânica da Saúde - Lei nº 8.080/1990',
            'Lei nº 8.142/1990 - Participação da comunidade',
            'Decreto nº 7508/2011',
            'Lei Complementar nº 141/2012',
            'PNAB 2017 - Portaria nº 2.436/2017',
            'PNAE - Portaria GM/MS nº 1.604/2023',
            'Política Nacional de Humanização (HumanizaSUS)'
          ]
        })
        
        // ✅ CONHECIMENTOS ESPECÍFICOS DE ENFERMAGEM
        disciplinasPadrao.push({
          nome: 'Conhecimentos Específicos de Enfermagem',
          peso: 3,
          topicos: [
            'Código de Ética dos Profissionais de Enfermagem',
            'Legislação Profissional - Cofen/Coren',
            'Sistematização da Assistência de Enfermagem (SAE)',
            'Técnicas básicas de enfermagem',
            'Processamento de material: descontaminação, limpeza, desinfecção, esterilização',
            'Noções de farmacologia',
            'Cálculo e administração de medicamentos',
            'Biossegurança em saúde',
            'Segurança do paciente e saúde laboral',
            'Prevenção e controle de infecção (IRAS)',
            'Programa Nacional de Imunizações (PNI)',
            'Assistência de enfermagem em doenças transmissíveis',
            'Assistência de enfermagem em urgência/emergência e trauma',
            'Suporte Básico de Vida (SBV)',
            'Assistência de enfermagem em saúde mental',
            'Assistência de enfermagem na saúde da mulher',
            'Assistência de enfermagem na saúde do homem',
            'Assistência de enfermagem na saúde do idoso',
            'Enfermagem na saúde do trabalhador',
            'PCMSO - NR-7',
            'Noções de Epidemiologia',
            'Educação em saúde'
          ]
        })
      } else if (cargoNorm.includes('fiscal') || cargoNorm.includes('tributário') || cargoNorm.includes('tributario')) {
        disciplinasPadrao.push(
          { nome: 'Direito Tributário', peso: 3, topicos: ['Sistema Tributário Nacional', 'Impostos', 'Obrigação Tributária'] },
          { nome: 'Contabilidade', peso: 2, topicos: ['Contabilidade Geral', 'Demonstrações Contábeis'] }
        )
      } else if (cargoNorm.includes('policial') || cargoNorm.includes('polícia') || cargoNorm.includes('policia')) {
        disciplinasPadrao.push(
          { nome: 'Direito Penal', peso: 3, topicos: ['Crimes e penas', 'Código Penal'] },
          { nome: 'Direito Processual Penal', peso: 3, topicos: ['Inquérito policial', 'Processo penal'] },
          { nome: 'Direito Constitucional', peso: 2, topicos: ['Direitos e garantias fundamentais'] }
        )
      } else if (cargoNorm.includes('administrativo') || cargoNorm.includes('técnico')) {
        disciplinasPadrao.push(
          { nome: 'Direito Administrativo', peso: 2, topicos: ['Atos administrativos', 'Licitações', 'Contratos'] },
          { nome: 'Informática', peso: 1, topicos: ['MS Office', 'Internet', 'Segurança da informação'] }
        )
      } else {
        // Genérico
        disciplinasPadrao.push(
          { nome: 'Conhecimentos Gerais', peso: 1, topicos: ['Atualidades', 'História', 'Geografia'] },
          { nome: 'Conhecimentos Específicos', peso: 3, topicos: ['Conteúdo específico do cargo'] }
        )
      }
      
      resultado = { disciplinas: disciplinasPadrao, info_peso: {} }
      console.log(`✅ Criadas ${disciplinasPadrao.length} disciplinas padrão para cargo: ${cargoDesejado}`)
    }
    
    // Validar se temos resultado agora
    if (!resultado || !resultado.disciplinas || resultado.disciplinas.length === 0) {
      console.error('❌ Não foi possível extrair disciplinas de nenhuma forma')
      
      // Marcar como erro mas permitir continuar manualmente
      await DB.prepare(`UPDATE editais SET status = 'erro' WHERE id = ?`).bind(editalId).run()
      
      return c.json({
        error: 'Não foi possível extrair disciplinas automaticamente.',
        errorType: 'EXTRACTION_FAILED',
        suggestion: 'O sistema não conseguiu identificar disciplinas no edital. Você pode:\n\n1. ✅ Continuar e selecionar disciplinas manualmente\n2. 📄 Usar um arquivo XLSX com cronograma de estudos\n3. 📝 Converter o PDF para TXT e tentar novamente',
        canRetry: true,
        canContinueManually: true,
        step: 4,
        stepName: 'Extração de disciplinas'
      }, 400)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ PROCESSAMENTO DAS DISCIPLINAS EXTRAÍDAS
    // ════════════════════════════════════════════════════════════════
    
    console.log(`✅ Extração concluída com sucesso`)
    console.log(`📚 Disciplinas encontradas: ${resultado.disciplinas?.length || 0}`)
      
      // ════════════════════════════════════════════════════════════════
      // ✅ PÓS-PROCESSAMENTO CRÍTICO: GARANTIR PESO EM TODAS AS DISCIPLINAS
      // ════════════════════════════════════════════════════════════════
      
      // Extrair informações de peso do resultado (se disponível)
      const infoPeso = resultado.info_peso || {}
      const pesoConhecimentosGerais = infoPeso.peso_conhecimentos_gerais || 1
      const pesoConhecimentosEspecificos = infoPeso.peso_conhecimentos_especificos || 3
      
      console.log(`📊 INFO PESO EXTRAÍDO: CG=${pesoConhecimentosGerais}, CE=${pesoConhecimentosEspecificos}`)
      
      // Definir quais disciplinas são de Conhecimentos Gerais vs Específicos
      const disciplinasConhecimentosGerais = [
        'português', 'lingua', 'portugues',
        'raciocínio', 'raciocinio', 'lógico', 'logico', 'matemático', 'matematico',
        'conhecimentos regionais', 'regional', 'piauí', 'piaui',
        'informática', 'informatica', 'computação', 'computacao',
        'atualidades', 'conhecimentos gerais',
        'ética', 'etica', 'noções de administração', 'nocoes'
      ]
      
      const disciplinasConhecimentosEspecificos = [
        'sus', 'saúde', 'saude', 'único', 'unico',
        'enfermagem', 'enfermeiro', 'técnico', 'tecnico',
        'específicos', 'especificos', 'especializado',
        'legislação', 'legislacao',
        'políticas', 'politicas', 'humanização', 'humanizacao'
      ]
      
      // Função para determinar categoria e peso
      const determinarPeso = (disc: any): number => {
        // 1. Se já tem peso definido (não null), usar esse
        if (disc.peso !== null && disc.peso !== undefined && typeof disc.peso === 'number') {
          return disc.peso
        }
        
        // 2. Se tem categoria definida pela Gemini, usar
        if (disc.categoria) {
          const catNorm = disc.categoria.toLowerCase()
          if (catNorm.includes('geral') || catNorm.includes('básico') || catNorm.includes('basico')) {
            return pesoConhecimentosGerais
          }
          if (catNorm.includes('específico') || catNorm.includes('especifico')) {
            return pesoConhecimentosEspecificos
          }
        }
        
        // 3. Inferir pela nome da disciplina
        const nomeNorm = disc.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        
        // Verificar se é Conhecimentos Gerais
        const ehConhecimentosGerais = disciplinasConhecimentosGerais.some(termo => 
          nomeNorm.includes(termo.toLowerCase())
        )
        if (ehConhecimentosGerais) {
          return pesoConhecimentosGerais
        }
        
        // Verificar se é Conhecimentos Específicos
        const ehConhecimentosEspecificos = disciplinasConhecimentosEspecificos.some(termo => 
          nomeNorm.includes(termo.toLowerCase())
        )
        if (ehConhecimentosEspecificos) {
          return pesoConhecimentosEspecificos
        }
        
        // 4. Fallback: peso 1 (mais conservador)
        return 1
      }
      
      // Aplicar peso a todas as disciplinas que não têm
      resultado.disciplinas = resultado.disciplinas.map((disc: any) => {
        const pesoCalculado = determinarPeso(disc)
        const pesoFinal = disc.peso ?? pesoCalculado
        
        if (disc.peso === null || disc.peso === undefined) {
          console.log(`  🔧 Atribuindo peso ${pesoFinal} para "${disc.nome}" (categoria: ${disc.categoria || 'inferida'})`)
        }
        
        return {
          ...disc,
          peso: pesoFinal
        }
      })
      
      // ✅ LOG DETALHADO: Mostrar peso e questões de cada disciplina extraída
      if (resultado.disciplinas && resultado.disciplinas.length > 0) {
        console.log('📊 DETALHES DAS DISCIPLINAS APÓS PÓS-PROCESSAMENTO:')
        resultado.disciplinas.forEach((d: any, idx: number) => {
          console.log(`   ${idx + 1}. ${d.nome} → peso: ${d.peso}, questões: ${d.questoes ?? 'N/A'}, tópicos: ${d.topicos?.length || 0}`)
        })
      }
      
      // Validar estrutura do resultado
      if (!resultado.disciplinas || !Array.isArray(resultado.disciplinas)) {
        throw new Error('JSON não contém array de disciplinas')
      }
      
      if (resultado.disciplinas.length === 0) {
        // ✅ NOVA LÓGICA: Retornar erro específico quando IA não encontra disciplinas
        console.error('═'.repeat(60))
        console.error('❌ PASSO 4 FALHOU: IA não encontrou disciplinas')
        console.error('═'.repeat(60))
        console.error(`📝 Texto enviado tinha ${textoEdital.length} caracteres`)
        console.error(`📝 Preview do texto: ${textoEdital.substring(0, 500)}...`)
        
        // Marcar edital como erro para poder tentar novamente
        await DB.prepare(`
          UPDATE editais SET status = 'erro' WHERE id = ?
        `).bind(editalId).run()
        
        return c.json({ 
          error: 'A IA não conseguiu identificar disciplinas no texto do edital.',
          errorType: 'NO_DISCIPLINES_FOUND',
          suggestion: `Possíveis causas:\n• O arquivo pode estar protegido ou escaneado\n• O conteúdo programático pode estar em formato não reconhecível\n• O texto pode estar truncado\n\nSoluções:\n1. Converta o PDF para TXT em https://smallpdf.com/pdf-to-text\n2. Use um arquivo XLSX com cronograma de estudos\n3. Copie apenas a seção "Conteúdo Programático" para um arquivo TXT`,
          textLength: textoEdital.length,
          textPreview: textoEdital.substring(0, 200),
          step: 4,
          stepName: 'Análise com IA Gemini',
          canRetry: true
        }, 400)
      }
    
    // ==========================================
    // AGRUPAMENTO INTELIGENTE PÓS-PROCESSAMENTO
    // ==========================================
    console.log('🔄 Iniciando agrupamento inteligente de disciplinas...')
    
    // Mapa de agrupamento para área de saúde
    const gruposAgrupamento = {
      'Língua Portuguesa': ['portugues', 'lingua', 'gramatica', 'redacao', 'interpretacao'],
      'Raciocínio Lógico': ['raciocinio', 'logica', 'matematica'],
      'Informática': ['informatica', 'computador', 'internet', 'software', 'hardware'],
      'Sistema Único de Saúde (SUS)': ['sus', 'saude publica', 'lei 8080', 'lei 8142', 'politica', 'humanizacao'],
      'Enfermagem Clínica': ['enfermagem', 'cuidados', 'assistencia', 'procedimento', 'tecnica'],
      'Urgência e Emergência': ['urgencia', 'emergencia', 'trauma', 'suporte', 'reanimacao'],
      'Saúde da Criança': ['crianca', 'pediatria', 'neonatal', 'adolescente'],
      'Saúde da Mulher': ['mulher', 'ginecologia', 'obstetricia', 'gestante', 'materna'],
      'Legislação': ['legislacao', 'lei', 'decreto', 'resolucao', 'portaria'],
      'Ética Profissional': ['etica', 'bioetica', 'codigo', 'moral']
    }
    
    const disciplinasAgrupadas: any[] = []
    const disciplinasUsadas = new Set<number>()
    
    // ✅ CORREÇÃO: Preservar PESO durante agrupamento
    // Primeiro: agrupar por categorias predefinidas
    for (const [nomeGrupo, palavrasChave] of Object.entries(gruposAgrupamento)) {
      const topicosGrupo: string[] = []
      let pesoGrupo: number | null = null // ✅ Preservar peso do grupo
      let questoesGrupo: number | null = null // ✅ Preservar questões do grupo
      
      for (let i = 0; i < resultado.disciplinas.length; i++) {
        if (disciplinasUsadas.has(i)) continue
        
        const disc = resultado.disciplinas[i]
        const nomeNormalizado = disc.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        
        // Verificar se o nome da disciplina contém alguma palavra-chave
        const pertenceAoGrupo = palavrasChave.some(palavra => 
          nomeNormalizado.includes(palavra.toLowerCase())
        )
        
        if (pertenceAoGrupo) {
          // ✅ NOVO: Capturar peso e questões da primeira disciplina do grupo
          if (pesoGrupo === null && disc.peso !== null && disc.peso !== undefined) {
            pesoGrupo = disc.peso
            console.log(`    💡 Peso encontrado para grupo "${nomeGrupo}": ${disc.peso} (de ${disc.nome})`)
          }
          if (questoesGrupo === null && disc.questoes !== null && disc.questoes !== undefined) {
            questoesGrupo = disc.questoes
          }
          
          // Adicionar o nome original como tópico
          topicosGrupo.push(disc.nome)
          // Adicionar os tópicos originais também
          if (disc.topicos && disc.topicos.length > 0) {
            topicosGrupo.push(...disc.topicos)
          }
          disciplinasUsadas.add(i)
        }
      }
      
      // Se encontrou disciplinas para este grupo, criar uma disciplina agrupada
      if (topicosGrupo.length > 0) {
        disciplinasAgrupadas.push({
          nome: nomeGrupo,
          peso: pesoGrupo, // ✅ PRESERVAR PESO!
          questoes: questoesGrupo, // ✅ PRESERVAR QUESTÕES!
          topicos: [...new Set(topicosGrupo)] // Remover duplicatas
        })
        console.log(`  📦 Grupo "${nomeGrupo}" criado com peso: ${pesoGrupo || 'N/A'}`)
      }
    }
    
    // Segundo: adicionar disciplinas não agrupadas (se sobrarem) - COM PESO!
    for (let i = 0; i < resultado.disciplinas.length; i++) {
      if (!disciplinasUsadas.has(i)) {
        const disc = resultado.disciplinas[i]
        disciplinasAgrupadas.push({
          nome: disc.nome,
          peso: disc.peso || null, // ✅ PRESERVAR PESO!
          questoes: disc.questoes || null, // ✅ PRESERVAR QUESTÕES!
          topicos: disc.topicos || []
        })
        console.log(`  📌 Disciplina "${disc.nome}" mantida com peso: ${disc.peso || 'N/A'}`)
      }
    }
    
    // Limitar a 12 disciplinas
    if (disciplinasAgrupadas.length > 12) {
      console.warn(`⚠️ Após agrupamento: ${disciplinasAgrupadas.length} disciplinas. Limitando a 12.`)
      resultado.disciplinas = disciplinasAgrupadas.slice(0, 12)
    } else {
      resultado.disciplinas = disciplinasAgrupadas
    }
    
    console.log(`✅ Agrupamento concluído: ${resultado.disciplinas.length} disciplinas finais`)
    console.log('📋 Disciplinas agrupadas:', resultado.disciplinas.map(d => d.nome).join(', '))
    
    // Validar estrutura
    if (!resultado.disciplinas || !Array.isArray(resultado.disciplinas)) {
      throw new Error('Resposta da IA não contém array de disciplinas')
    }

    // ════════════════════════════════════════════════════════════════════════
    // ✅ NOVA FUNCIONALIDADE: MODO REVISÃO - Retorna disciplinas para o usuário revisar
    // ════════════════════════════════════════════════════════════════════════
    
    // Verificar se o usuário quer modo revisão (query param ?modo=revisao)
    const modoRevisao = c.req.query('modo') === 'revisao'
    
    if (modoRevisao) {
      console.log('📝 MODO REVISÃO: Retornando disciplinas para revisão do usuário...')
      
      // Marcar edital como 'aguardando_revisao' em vez de 'processado'
      await DB.prepare(`
        UPDATE editais SET status = 'aguardando_revisao' WHERE id = ?
      `).bind(editalId).run()
      
      // Retornar disciplinas completas para revisão (com todos os tópicos)
      return c.json({ 
        success: true,
        modo: 'revisao',
        edital_id: editalId,
        message: 'Disciplinas extraídas! Revise os pesos e tópicos antes de confirmar.',
        quadro_provas: quadroProvas || { encontrado: false },
        disciplinas: resultado.disciplinas.map((d, idx) => ({
          id: idx + 1,
          nome: d.nome,
          categoria: d.categoria || 'Geral',
          peso: d.peso || 1,
          questoes: d.questoes || null,
          topicos: d.topicos || []
        })),
        estatisticas: {
          total_disciplinas: resultado.disciplinas.length,
          disciplinas_com_peso: resultado.disciplinas.filter(d => d.peso).length,
          total_topicos: resultado.disciplinas.reduce((acc, d) => acc + (d.topicos ? d.topicos.length : 0), 0)
        }
      })
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODO NORMAL: Salvar diretamente (comportamento anterior)
    // ════════════════════════════════════════════════════════════════════════
    console.log(`💾 Salvando ${resultado.disciplinas.length} disciplinas no banco...`)
    
    for (let i = 0; i < resultado.disciplinas.length; i++) {
      const disc = resultado.disciplinas[i]
      
      // ✅ CORREÇÃO v20.8: Verificar se disciplina já existe na tabela disciplinas
      let disciplina_id_real = null
      const discExistente = await DB.prepare(`
        SELECT id FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
      `).bind(disc.nome).first() as any
      
      if (discExistente) {
        disciplina_id_real = discExistente.id
        console.log(`  ℹ️ Disciplina "${disc.nome}" já existe (ID: ${disciplina_id_real})`)
      } else {
        // Criar nova disciplina na tabela disciplinas
        const novaDiscResult = await DB.prepare(`
          INSERT INTO disciplinas (nome, area, descricao)
          VALUES (?, ?, ?)
        `).bind(disc.nome, 'edital', 'Disciplina extraída de edital/cronograma').run()
        
        disciplina_id_real = novaDiscResult.meta.last_row_id
        console.log(`  ✅ Nova disciplina criada: "${disc.nome}" (ID: ${disciplina_id_real})`)
      }
      
      // Inserir em edital_disciplinas COM o disciplina_id correto E peso
      const discResult = await DB.prepare(`
        INSERT INTO edital_disciplinas (edital_id, nome, ordem, disciplina_id, peso)
        VALUES (?, ?, ?, ?, ?)
      `).bind(editalId, disc.nome, i + 1, disciplina_id_real, disc.peso || null).run()

      const edital_disciplina_id = discResult.meta.last_row_id
      console.log(`  ✅ Disciplina vinculada ao edital: ${disc.nome} (edital_disciplina_id: ${edital_disciplina_id}, disciplina_id: ${disciplina_id_real}, peso: ${disc.peso || 'N/A'})`)

      // Inserir tópicos em edital_topicos
      if (disc.topicos && disc.topicos.length > 0) {
        for (let j = 0; j < disc.topicos.length; j++) {
          const topicoNome = disc.topicos[j]
          
          // Salvar em edital_topicos (referência ao edital)
          await DB.prepare(`
            INSERT INTO edital_topicos (edital_disciplina_id, nome, ordem)
            VALUES (?, ?, ?)
          `).bind(edital_disciplina_id, topicoNome, j + 1).run()
          
          // ✅ NOVO: Também salvar em topicos_edital (usado nas metas semanais)
          // Verificar se já existe para evitar duplicatas
          // ✅ CORREÇÃO: Verificar se existe para ESTE USUÁRIO
          const topicoExistente = await DB.prepare(`
            SELECT id FROM topicos_edital WHERE disciplina_id = ? AND user_id = ? AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
          `).bind(disciplina_id_real, edital.user_id, topicoNome).first()
          
          if (!topicoExistente) {
            // ✅ CORREÇÃO: Usar o peso da disciplina pai para os tópicos + user_id
            const pesoTopico = disc.peso || 1
            await DB.prepare(`
              INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
              VALUES (?, ?, ?, ?, ?, ?)
            `).bind(disciplina_id_real, topicoNome, 'Conteúdo Programático', j + 1, pesoTopico, edital.user_id).run()
          }
        }
        console.log(`    → ${disc.topicos.length} tópicos salvos (edital_topicos + topicos_edital)`)
      }
    }

    // Atualizar status do edital
    await DB.prepare(`
      UPDATE editais SET status = 'processado' WHERE id = ?
    `).bind(editalId).run()

    console.log(`✅ Edital ${editalId} marcado como 'processado'`)

    // Retornar detalhes completos do processamento
    return c.json({ 
      success: true, 
      modo: 'direto',
      disciplinas_extraidas: resultado.disciplinas.length,
      message: 'Edital processado com sucesso!',
      disciplinas: resultado.disciplinas.map(d => ({
        nome: d.nome,
        peso: d.peso || null,
        total_topicos: d.topicos ? d.topicos.length : 0
      })),
      estatisticas: {
        total_disciplinas: resultado.disciplinas.length,
        disciplinas_com_peso: resultado.disciplinas.filter(d => d.peso).length,
        total_topicos: resultado.disciplinas.reduce((acc, d) => acc + (d.topicos ? d.topicos.length : 0), 0)
      }
    })
  } catch (error) {
    console.error('Erro ao processar edital:', error)
    
    // Marcar como erro
    await DB.prepare(`
      UPDATE editais SET status = 'erro' WHERE id = ?
    `).bind(editalId).run()

    // Retornar erro detalhado
    const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor'
    console.error('❌ Detalhes do erro:', errorMessage)
    
    // Identificar tipo de erro específico e fornecer mensagem amigável
    let errorType = 'PROCESSING_ERROR'
    let userMessage = 'Erro ao processar edital'
    let suggestion = 'Tente novamente ou use um formato diferente de arquivo'
    let canRetry = true
    
    if (errorMessage.includes('Gemini') || errorMessage.includes('API')) {
      errorType = 'API_ERROR'
      userMessage = 'Serviço de IA temporariamente indisponível'
      suggestion = 'Aguarde alguns segundos e tente novamente'
    } else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      errorType = 'PARSE_ERROR'
      userMessage = 'Não foi possível interpretar o conteúdo do edital'
      suggestion = 'Converta o PDF para TXT em https://smallpdf.com/pdf-to-text'
    } else if (errorMessage.includes('vazio') || errorMessage.includes('empty')) {
      errorType = 'EMPTY_TEXT'
      userMessage = 'O arquivo não contém texto extraível'
      suggestion = 'Use um PDF de texto (não escaneado) ou converta para TXT'
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorType = 'RATE_LIMIT'
      userMessage = 'Muitas requisições simultâneas'
      suggestion = 'Aguarde 30 segundos e tente novamente'
    } else if (errorMessage.includes('muito grande') || errorMessage.includes('15MB')) {
      errorType = 'FILE_TOO_LARGE'
      userMessage = 'Arquivo muito grande'
      suggestion = 'Use um arquivo menor que 15MB ou converta para TXT'
      canRetry = false
    }
    
    return c.json({ 
      error: userMessage,
      errorType: errorType,
      details: errorMessage,
      suggestion: suggestion,
      canRetry: canRetry
    }, 500)
  }
})

// ════════════════════════════════════════════════════════════════════════
// ✅ NOVO ENDPOINT: Atualizar disciplinas do edital (revisão pelo usuário)
// ════════════════════════════════════════════════════════════════════════
app.put('/api/editais/:id/disciplinas', async (c) => {
  const { DB } = c.env
  const editalId = c.req.param('id')
  
  try {
    const { disciplinas } = await c.req.json()
    
    if (!disciplinas || !Array.isArray(disciplinas)) {
      return c.json({ error: 'Disciplinas inválidas' }, 400)
    }
    
    console.log(`📝 Atualizando ${disciplinas.length} disciplinas do edital ${editalId}`)
    
    // Buscar edital para obter user_id
    const edital = await DB.prepare(`SELECT user_id FROM editais WHERE id = ?`).bind(editalId).first() as any
    if (!edital) {
      return c.json({ error: 'Edital não encontrado' }, 404)
    }
    
    // Deletar disciplinas antigas
    await DB.prepare(`DELETE FROM edital_topicos WHERE edital_disciplina_id IN (SELECT id FROM edital_disciplinas WHERE edital_id = ?)`).bind(editalId).run()
    await DB.prepare(`DELETE FROM edital_disciplinas WHERE edital_id = ?`).bind(editalId).run()
    
    // Inserir disciplinas atualizadas
    for (let i = 0; i < disciplinas.length; i++) {
      const disc = disciplinas[i]
      
      // Verificar/criar disciplina na tabela principal
      let disciplina_id_real = null
      const discExistente = await DB.prepare(`
        SELECT id FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
      `).bind(disc.nome).first() as any
      
      if (discExistente) {
        disciplina_id_real = discExistente.id
      } else {
        const novaDiscResult = await DB.prepare(`
          INSERT INTO disciplinas (nome, area, descricao)
          VALUES (?, ?, ?)
        `).bind(disc.nome, 'edital', 'Disciplina do edital').run()
        disciplina_id_real = novaDiscResult.meta.last_row_id
      }
      
      // Inserir em edital_disciplinas
      const discResult = await DB.prepare(`
        INSERT INTO edital_disciplinas (edital_id, nome, ordem, disciplina_id, peso)
        VALUES (?, ?, ?, ?, ?)
      `).bind(editalId, disc.nome, i + 1, disciplina_id_real, disc.peso || 1).run()
      
      const edital_disciplina_id = discResult.meta.last_row_id
      
      // Inserir tópicos
      if (disc.topicos && disc.topicos.length > 0) {
        // Limpar tópicos antigos do usuário para esta disciplina
        await DB.prepare(`DELETE FROM topicos_edital WHERE disciplina_id = ? AND user_id = ?`).bind(disciplina_id_real, edital.user_id).run()
        
        for (let j = 0; j < disc.topicos.length; j++) {
          const topicoNome = typeof disc.topicos[j] === 'string' ? disc.topicos[j] : disc.topicos[j].nome
          
          await DB.prepare(`
            INSERT INTO edital_topicos (edital_disciplina_id, nome, ordem)
            VALUES (?, ?, ?)
          `).bind(edital_disciplina_id, topicoNome, j + 1).run()
          
          await DB.prepare(`
            INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(disciplina_id_real, topicoNome, 'Conteúdo Programático', j + 1, disc.peso || 1, edital.user_id).run()
        }
      }
      
      console.log(`  ✅ ${disc.nome}: peso ${disc.peso}, ${disc.topicos?.length || 0} tópicos`)
    }
    
    // Atualizar status do edital
    await DB.prepare(`UPDATE editais SET status = 'processado' WHERE id = ?`).bind(editalId).run()
    
    return c.json({ 
      success: true, 
      message: 'Disciplinas atualizadas com sucesso!',
      total_disciplinas: disciplinas.length
    })
  } catch (error) {
    console.error('Erro ao atualizar disciplinas:', error)
    return c.json({ error: 'Erro ao atualizar disciplinas' }, 500)
  }
})

// Listar editais do usuário
app.get('/api/editais/user/:user_id', async (c) => {
  const { DB } = c.env
  const userId = c.req.param('user_id')

  try {
    const editais = await DB.prepare(`
      SELECT 
        e.*,
        COUNT(DISTINCT ed.id) as total_disciplinas
      FROM editais e
      LEFT JOIN edital_disciplinas ed ON e.id = ed.edital_id
      WHERE e.user_id = ?
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).bind(userId).all()

    return c.json(editais.results || [])
  } catch (error) {
    console.error('Erro ao listar editais:', error)
    return c.json({ error: 'Erro ao listar editais' }, 500)
  }
})

// Buscar disciplinas de um edital específico
app.get('/api/editais/:id/disciplinas', async (c) => {
  const { DB } = c.env
  const editalId = c.req.param('id')

  try {
    // ✅ CORREÇÃO v20.13: Contar tópicos da tabela edital_topicos (tópicos do edital processado)
    // A tabela edital_topicos vincula via edital_disciplina_id (ed.id)
    const { results: disciplinas } = await DB.prepare(`
      SELECT 
        ed.id,
        ed.nome,
        ed.ordem,
        ed.peso,
        ed.disciplina_id as disciplina_id_real,
        (SELECT COUNT(*) FROM edital_topicos et WHERE et.edital_disciplina_id = ed.id) as total_topicos
      FROM edital_disciplinas ed
      WHERE ed.edital_id = ?
      ORDER BY ed.ordem
    `).bind(editalId).all()

    // ✅ Também buscar os tópicos de cada disciplina para enviar ao frontend
    const disciplinasComTopicos = await Promise.all(disciplinas.map(async (d: any) => {
      const { results: topicos } = await DB.prepare(`
        SELECT id, nome, ordem FROM edital_topicos WHERE edital_disciplina_id = ? ORDER BY ordem
      `).bind(d.id).all()
      
      return {
        ...d,
        total_topicos: topicos.length,
        topicos: topicos
      }
    }))

    console.log(`📋 Disciplinas do edital ${editalId}:`, disciplinasComTopicos.map((d: any) => `${d.nome} (ID: ${d.id}, topicos: ${d.total_topicos}, peso: ${d.peso || 'N/A'})`).join(', '))
    return c.json(disciplinasComTopicos)
  } catch (error) {
    console.error('Erro ao buscar disciplinas do edital:', error)
    return c.json({ error: 'Erro ao buscar disciplinas' }, 500)
  }
})

// Deletar edital
app.delete('/api/editais/:id', async (c) => {
  const { DB, EDITAIS } = c.env
  const editalId = c.req.param('id')

  try {
    // Buscar URL do arquivo
    const edital = await DB.prepare(`
      SELECT arquivo_url FROM editais WHERE id = ?
    `).bind(editalId).first() as any

    if (edital && edital.arquivo_url && EDITAIS) {
      // Deletar do R2 (apenas se disponível)
      await EDITAIS.delete(edital.arquivo_url)
      console.log(`✅ Arquivo removido do R2: ${edital.arquivo_url}`)
    }

    // Deletar tópicos
    await DB.prepare(`
      DELETE FROM edital_topicos 
      WHERE edital_disciplina_id IN (
        SELECT id FROM edital_disciplinas WHERE edital_id = ?
      )
    `).bind(editalId).run()

    // Deletar disciplinas
    await DB.prepare(`
      DELETE FROM edital_disciplinas WHERE edital_id = ?
    `).bind(editalId).run()

    // Deletar edital
    await DB.prepare(`
      DELETE FROM editais WHERE id = ?
    `).bind(editalId).run()

    return c.json({ success: true, message: 'Edital deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar edital:', error)
    return c.json({ error: 'Erro ao deletar edital' }, 500)
  }
})

// ============== ROTAS DE DISCIPLINAS ==============

// Buscar disciplinas do PLANO ATIVO do usuário (para modal de simulados)
app.get('/api/usuarios/:user_id/disciplinas', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  
  try {
    // Primeiro, buscar o plano ativo do usuário
    const plano = await DB.prepare(
      'SELECT id FROM planos_estudo WHERE user_id = ? AND ativo = 1 ORDER BY created_at DESC LIMIT 1'
    ).bind(user_id).first() as any
    
    if (!plano) {
      console.log(`⚠️ Usuário ${user_id} não tem plano ativo`)
      return c.json([])
    }
    
    // Buscar disciplinas ÚNICAS dos ciclos do plano ativo
    const { results } = await DB.prepare(`
      SELECT DISTINCT
        d.id,
        d.nome,
        d.area,
        (
          SELECT COUNT(*) 
          FROM edital_topicos et 
          JOIN edital_disciplinas ed ON et.edital_disciplina_id = ed.id 
          WHERE LOWER(TRIM(ed.nome)) = LOWER(TRIM(d.nome))
        ) as topicos_count
      FROM ciclos_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      WHERE c.plano_id = ?
      ORDER BY d.nome
    `).bind(plano.id).all()
    
    console.log(`✅ Disciplinas do plano ${plano.id}: ${results?.map((r: any) => r.nome).join(', ')}`)
    
    return c.json(results || [])
  } catch (error) {
    console.error('Erro ao buscar disciplinas do plano:', error)
    return c.json([])
  }
})

app.get('/api/disciplinas', async (c) => {
  const { DB } = c.env
  const area = c.req.query('area')

  let query = 'SELECT * FROM disciplinas'
  if (area) {
    query += ' WHERE area = ? OR area = "geral"'
    const { results } = await DB.prepare(query).bind(area).all()
    return c.json(results)
  }

  const { results } = await DB.prepare(query).all()
  return c.json(results)
})

app.get('/api/disciplinas/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const disciplina = await DB.prepare(
    'SELECT * FROM disciplinas WHERE id = ?'
  ).bind(id).first()

  if (!disciplina) {
    return c.json({ error: 'Disciplina não encontrada' }, 404)
  }

  return c.json(disciplina)
})

// ✅ CRUD Disciplinas - Criar disciplina
app.post('/api/disciplinas', async (c) => {
  const { DB } = c.env
  const { nome, area } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO disciplinas (nome, area, descricao)
      VALUES (?, ?, ?)
    `).bind(nome, area || 'custom', `Disciplina personalizada: ${nome}`).run()
    
    console.log(`✅ Disciplina "${nome}" criada com ID: ${result.meta.last_row_id}`)
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    console.error('Erro ao criar disciplina:', error)
    return c.json({ error: 'Erro ao criar disciplina' }, 500)
  }
})

// ✅ CRUD Disciplinas - Atualizar disciplina
app.put('/api/disciplinas/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { nome, area, descricao } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE disciplinas 
      SET nome = COALESCE(?, nome),
          area = COALESCE(?, area),
          descricao = COALESCE(?, descricao)
      WHERE id = ?
    `).bind(nome ?? null, area ?? null, descricao ?? null, id).run()
    
    console.log(`✅ Disciplina ${id} atualizada`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar disciplina:', error)
    return c.json({ error: 'Erro ao atualizar disciplina' }, 500)
  }
})

// ✅ CRUD User-Disciplinas - Criar associação
app.post('/api/user-disciplinas', async (c) => {
  const { DB } = c.env
  const { user_id, disciplina_id, nivel_atual, ja_estudou, dificuldade, nivel_dominio, peso } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO user_disciplinas (user_id, disciplina_id, nivel_atual, ja_estudou, dificuldade, nivel_dominio, peso)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user_id, 
      disciplina_id, 
      nivel_atual || 0, 
      ja_estudou || false, 
      dificuldade || false,
      nivel_dominio || 0, // ✅ NOVO: Nível de domínio 0-10
      peso || null
    ).run()
    
    console.log(`✅ User ${user_id} associado à disciplina ${disciplina_id} (domínio: ${nivel_dominio || 0})`)
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    console.error('Erro ao associar disciplina:', error)
    return c.json({ error: 'Erro ao associar disciplina' }, 500)
  }
})

// ✅ CRUD User-Disciplinas - Atualizar associação
app.put('/api/user-disciplinas/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { nivel_atual, ja_estudou, dificuldade } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE user_disciplinas 
      SET nivel_atual = COALESCE(?, nivel_atual),
          ja_estudou = COALESCE(?, ja_estudou),
          dificuldade = COALESCE(?, dificuldade)
      WHERE id = ?
    `).bind(nivel_atual ?? null, ja_estudou ?? null, dificuldade ?? null, id).run()
    
    console.log(`✅ User-disciplina ${id} atualizada`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar user-disciplina:', error)
    return c.json({ error: 'Erro ao atualizar associação' }, 500)
  }
})

// ✅ CRUD User-Disciplinas - Excluir associação
app.delete('/api/user-disciplinas/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  
  try {
    await DB.prepare('DELETE FROM user_disciplinas WHERE id = ?').bind(id).run()
    console.log(`✅ User-disciplina ${id} excluída`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir user-disciplina:', error)
    return c.json({ error: 'Erro ao excluir associação' }, 500)
  }
})

// Buscar disciplinas de um usuário
app.get('/api/user-disciplinas/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  try {
    // ✅ Buscar disciplinas COM contagem de tópicos
    const { results } = await DB.prepare(`
      SELECT 
        ud.id,
        ud.user_id,
        ud.disciplina_id,
        ud.ja_estudou,
        ud.nivel_atual,
        ud.dificuldade,
        d.nome,
        d.area,
        (SELECT COUNT(*) FROM topicos_edital te WHERE te.disciplina_id = d.id) as total_topicos
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      WHERE ud.user_id = ?
      ORDER BY d.nome
    `).bind(user_id).all()

    return c.json(results)
  } catch (error) {
    console.error('Erro ao buscar disciplinas do usuário:', error)
    return c.json({ error: 'Erro ao buscar disciplinas' }, 500)
  }
})

// Buscar tópicos do edital de uma disciplina (com filtro por usuário)
app.get('/api/topicos/:disciplina_id', async (c) => {
  const { DB } = c.env
  const disciplina_id = c.req.param('disciplina_id')
  const user_id = c.req.query('user_id') // Opcional via query string

  // ✅ CORREÇÃO v3: Filtrar por user_id quando fornecido
  let query = `
    SELECT 
      t.id,
      t.disciplina_id,
      t.nome,
      t.categoria,
      t.ordem,
      COALESCE(t.peso, (
        SELECT ed.peso FROM edital_disciplinas ed 
        WHERE ed.disciplina_id = t.disciplina_id 
        LIMIT 1
      ), 1) as peso
    FROM topicos_edital t
    WHERE t.disciplina_id = ?
  `
  
  if (user_id) {
    query += ` AND t.user_id = ?`
  }
  
  query += ` ORDER BY t.ordem, t.nome`
  
  const { results: topicos } = user_id 
    ? await DB.prepare(query).bind(disciplina_id, user_id).all()
    : await DB.prepare(query).bind(disciplina_id).all()

  return c.json(topicos)
})

// ✅ CRUD de Tópicos - Adicionar tópico manualmente
app.post('/api/topicos/manual', async (c) => {
  const { DB } = c.env
  const { disciplina_id, nome, peso, categoria, user_id } = await c.req.json()
  
  if (!user_id) {
    return c.json({ error: 'user_id é obrigatório' }, 400)
  }
  
  try {
    // Obter a próxima ordem (para este usuário)
    const { ordem: maxOrdem } = await DB.prepare(`
      SELECT COALESCE(MAX(ordem), 0) as ordem FROM topicos_edital WHERE disciplina_id = ? AND user_id = ?
    `).bind(disciplina_id, user_id).first() || { ordem: 0 }
    
    const result = await DB.prepare(`
      INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(disciplina_id, nome, categoria || 'Outros', (maxOrdem || 0) + 1, peso || 1, user_id).run()
    
    console.log(`✅ Tópico "${nome}" adicionado à disciplina ${disciplina_id} para user ${user_id}`)
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    console.error('Erro ao adicionar tópico:', error)
    return c.json({ error: 'Erro ao adicionar tópico' }, 500)
  }
})

// ✅ CRUD de Tópicos - Atualizar tópico
app.put('/api/topicos/:topico_id', async (c) => {
  const { DB } = c.env
  const topico_id = c.req.param('topico_id')
  const { nome, peso, categoria } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE topicos_edital 
      SET nome = COALESCE(?, nome),
          peso = COALESCE(?, peso),
          categoria = COALESCE(?, categoria)
      WHERE id = ?
    `).bind(nome, peso, categoria, topico_id).run()
    
    console.log(`✅ Tópico ${topico_id} atualizado`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar tópico:', error)
    return c.json({ error: 'Erro ao atualizar tópico' }, 500)
  }
})

// ✅ CRUD de Tópicos - Excluir tópico
app.delete('/api/topicos/:topico_id', async (c) => {
  const { DB } = c.env
  const topico_id = c.req.param('topico_id')
  
  try {
    await DB.prepare('DELETE FROM topicos_edital WHERE id = ?').bind(topico_id).run()
    console.log(`✅ Tópico ${topico_id} excluído`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir tópico:', error)
    return c.json({ error: 'Erro ao excluir tópico' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 📎 ENDPOINTS DE DOCUMENTOS ANEXADOS ÀS DISCIPLINAS
// ═══════════════════════════════════════════════════════════════════════════

// Listar documentos de uma disciplina do usuário
app.get('/api/disciplinas/:disciplina_id/documentos/:user_id', async (c) => {
  const { DB } = c.env
  const disciplina_id = c.req.param('disciplina_id')
  const user_id = c.req.param('user_id')
  
  try {
    const { results: documentos } = await DB.prepare(`
      SELECT * FROM disciplina_documentos 
      WHERE disciplina_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `).bind(disciplina_id, user_id).all()
    
    return c.json(documentos)
  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return c.json({ error: 'Erro ao buscar documentos' }, 500)
  }
})

// Upload de documento para disciplina
app.post('/api/disciplinas/:disciplina_id/documentos', async (c) => {
  const { DB, EDITAIS } = c.env // Usando o R2 bucket EDITAIS para armazenar
  const disciplina_id = c.req.param('disciplina_id')
  
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const user_id = formData.get('user_id') as string
    const nome = formData.get('nome') as string || file.name
    
    if (!file || !user_id) {
      return c.json({ error: 'Arquivo e user_id são obrigatórios' }, 400)
    }
    
    // Determinar tipo de arquivo
    const extensao = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const tipoArquivo = extensao
    
    // Gerar nome único para o arquivo
    const nomeArquivo = `documentos/${user_id}/${disciplina_id}/${Date.now()}_${file.name}`
    
    // Upload para R2 (se disponível)
    let arquivo_url = nomeArquivo
    if (EDITAIS) {
      const arrayBuffer = await file.arrayBuffer()
      await EDITAIS.put(nomeArquivo, arrayBuffer, {
        httpMetadata: { contentType: file.type }
      })
      console.log(`✅ Documento salvo no R2: ${nomeArquivo}`)
    }
    
    // Salvar no banco
    const result = await DB.prepare(`
      INSERT INTO disciplina_documentos (user_id, disciplina_id, nome, arquivo_url, tipo_arquivo, tamanho_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(user_id, disciplina_id, nome, arquivo_url, tipoArquivo, file.size).run()
    
    console.log(`✅ Documento "${nome}" anexado à disciplina ${disciplina_id} por user ${user_id}`)
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      nome,
      arquivo_url,
      tipo_arquivo: tipoArquivo
    })
  } catch (error) {
    console.error('Erro ao fazer upload do documento:', error)
    return c.json({ error: 'Erro ao fazer upload do documento' }, 500)
  }
})

// Deletar documento
app.delete('/api/documentos/:documento_id', async (c) => {
  const { DB, EDITAIS } = c.env
  const documento_id = c.req.param('documento_id')
  const user_id = c.req.query('user_id')
  
  try {
    // Buscar documento para verificar permissão e obter URL
    const documento = await DB.prepare(`
      SELECT * FROM disciplina_documentos WHERE id = ? AND user_id = ?
    `).bind(documento_id, user_id).first()
    
    if (!documento) {
      return c.json({ error: 'Documento não encontrado ou sem permissão' }, 404)
    }
    
    // Deletar do R2 (se disponível)
    if (EDITAIS && documento.arquivo_url) {
      try {
        await EDITAIS.delete(documento.arquivo_url)
        console.log(`✅ Documento deletado do R2: ${documento.arquivo_url}`)
      } catch (e) {
        console.warn('Aviso: Não foi possível deletar do R2:', e)
      }
    }
    
    // Deletar do banco
    await DB.prepare('DELETE FROM disciplina_documentos WHERE id = ?').bind(documento_id).run()
    
    console.log(`✅ Documento ${documento_id} deletado`)
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar documento:', error)
    return c.json({ error: 'Erro ao deletar documento' }, 500)
  }
})

// Download/visualização de documento
app.get('/api/documentos/:documento_id/download', async (c) => {
  const { DB, EDITAIS } = c.env
  const documento_id = c.req.param('documento_id')
  const user_id = c.req.query('user_id')
  
  try {
    const documento = await DB.prepare(`
      SELECT * FROM disciplina_documentos WHERE id = ? AND user_id = ?
    `).bind(documento_id, user_id).first() as any
    
    if (!documento) {
      return c.json({ error: 'Documento não encontrado ou sem permissão' }, 404)
    }
    
    if (!EDITAIS) {
      return c.json({ error: 'Storage não disponível' }, 500)
    }
    
    const objeto = await EDITAIS.get(documento.arquivo_url)
    if (!objeto) {
      return c.json({ error: 'Arquivo não encontrado no storage' }, 404)
    }
    
    const contentType = documento.tipo_arquivo === 'pdf' 
      ? 'application/pdf'
      : documento.tipo_arquivo === 'doc' || documento.tipo_arquivo === 'docx'
        ? 'application/msword'
        : 'application/octet-stream'
    
    return new Response(objeto.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${documento.nome}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Erro ao baixar documento:', error)
    return c.json({ error: 'Erro ao baixar documento' }, 500)
  }
})

// ✅ Endpoint para limpar tópicos órfãos (sem user_id) - manutenção
app.post('/api/topicos/limpar-orfaos', async (c) => {
  const { DB } = c.env
  
  try {
    console.log('🧹 Limpando tópicos sem user_id (órfãos)...')
    
    // Contar antes
    const antes = await DB.prepare('SELECT COUNT(*) as total FROM topicos_edital WHERE user_id IS NULL').first() as any
    
    // Deletar tópicos órfãos
    await DB.prepare('DELETE FROM topicos_edital WHERE user_id IS NULL').run()
    
    // Contar depois
    const depois = await DB.prepare('SELECT COUNT(*) as total FROM topicos_edital').first() as any
    
    console.log(`✅ Tópicos órfãos removidos: ${antes.total}`)
    
    return c.json({
      success: true,
      orfaos_removidos: antes.total,
      topicos_restantes: depois.total
    })
  } catch (error) {
    console.error('Erro ao limpar órfãos:', error)
    return c.json({ error: 'Erro ao limpar órfãos' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════

// ✅ NOVO: Sincronizar pesos dos tópicos com disciplinas pai
app.post('/api/topicos/sincronizar-pesos', async (c) => {
  const { DB } = c.env
  
  try {
    console.log('🔄 Iniciando sincronização de pesos dos tópicos...')
    
    // Atualizar peso dos tópicos baseado na disciplina pai via edital_disciplinas
    // edital_disciplinas tem o peso correto da disciplina
    const result = await DB.prepare(`
      UPDATE topicos_edital 
      SET peso = (
        SELECT COALESCE(ed.peso, 1)
        FROM edital_disciplinas ed 
        WHERE ed.disciplina_id = topicos_edital.disciplina_id
        LIMIT 1
      )
      WHERE disciplina_id IN (
        SELECT DISTINCT disciplina_id FROM edital_disciplinas WHERE peso IS NOT NULL
      )
    `).run()
    
    console.log(`✅ Tópicos atualizados: ${result.meta.changes || 0}`)
    
    // Buscar estatísticas
    const stats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_topicos,
        SUM(CASE WHEN peso = 1 THEN 1 ELSE 0 END) as peso_1,
        SUM(CASE WHEN peso = 2 THEN 1 ELSE 0 END) as peso_2,
        SUM(CASE WHEN peso = 3 THEN 1 ELSE 0 END) as peso_3
      FROM topicos_edital
    `).first()
    
    return c.json({ 
      success: true, 
      message: 'Pesos dos tópicos sincronizados com sucesso!',
      topicos_atualizados: result.meta.changes || 0,
      estatisticas: stats
    })
  } catch (error) {
    console.error('Erro ao sincronizar pesos:', error)
    return c.json({ error: 'Erro ao sincronizar pesos' }, 500)
  }
})

// ✅ NOVO v2: Limpar tópicos duplicados mantendo apenas um de cada POR USUÁRIO
app.post('/api/topicos/limpar-duplicados', async (c) => {
  const { DB } = c.env
  
  try {
    console.log('🧹 Iniciando limpeza de tópicos duplicados por usuário...')
    
    // 1. Contar duplicados antes
    const antes = await DB.prepare(`
      SELECT COUNT(*) as total FROM topicos_edital
    `).first() as any
    
    // 2. Identificar duplicados: mesmo user_id + disciplina_id + nome
    // Manter apenas o com menor ID (mais antigo) para cada combinação
    const duplicados = await DB.prepare(`
      DELETE FROM topicos_edital 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM topicos_edital 
        GROUP BY COALESCE(user_id, 0), disciplina_id, LOWER(TRIM(nome))
      )
    `).run()
    
    // 3. Contar após limpeza
    const depois = await DB.prepare(`
      SELECT COUNT(*) as total FROM topicos_edital
    `).first() as any
    
    // 4. Estatísticas por usuário e disciplina
    const { results: estatsPorUsuario } = await DB.prepare(`
      SELECT 
        user_id,
        COUNT(DISTINCT disciplina_id) as total_disciplinas,
        COUNT(*) as total_topicos
      FROM topicos_edital
      GROUP BY user_id
    `).all()
    
    console.log(`✅ Limpeza concluída: ${antes.total} → ${depois.total} tópicos (${duplicados.meta.changes} removidos)`)
    
    return c.json({ 
      success: true, 
      message: 'Tópicos duplicados removidos com sucesso!',
      antes: antes.total,
      depois: depois.total,
      removidos: duplicados.meta.changes || 0,
      por_usuario: estatsPorUsuario
    })
  } catch (error) {
    console.error('Erro ao limpar duplicados:', error)
    return c.json({ error: 'Erro ao limpar duplicados' }, 500)
  }
})

// Criar/atualizar tópicos para uma disciplina (baseado no edital/área)
app.post('/api/topicos/gerar/:disciplina_id', async (c) => {
  const { DB } = c.env
  const disciplina_id = c.req.param('disciplina_id')
  const { topicos, user_id } = await c.req.json() // Array de { nome, categoria, ordem, peso } + user_id
  
  if (!user_id) {
    return c.json({ error: 'user_id é obrigatório' }, 400)
  }
  
  try {
    // ✅ Limpar tópicos existentes APENAS DESTE USUÁRIO
    await DB.prepare('DELETE FROM topicos_edital WHERE disciplina_id = ? AND user_id = ?').bind(disciplina_id, user_id).run()
    
    // Inserir novos tópicos com user_id
    for (const topico of topicos) {
      await DB.prepare(`
        INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        disciplina_id,
        topico.nome,
        topico.categoria || 'Geral',
        topico.ordem || 0,
        topico.peso || 1,
        user_id
      ).run()
    }
    
    return c.json({ success: true, total: topicos.length })
  } catch (error) {
    console.error('Erro ao gerar tópicos:', error)
    return c.json({ error: 'Erro ao gerar tópicos' }, 500)
  }
})

// Popular tópicos para todas as disciplinas de um usuário
app.post('/api/topicos/popular-usuario/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  
  try {
    // Buscar todas as disciplinas do usuário
    const { results: disciplinas } = await DB.prepare(`
      SELECT ud.disciplina_id, d.nome
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      WHERE ud.user_id = ?
    `).bind(user_id).all()
    
    let totalPopulado = 0
    
    for (const disc of disciplinas) {
      await popularTopicosEdital(DB, disc.disciplina_id)
      
      // Verificar quantos foram inseridos
      const { results: topicos } = await DB.prepare(
        'SELECT id FROM topicos_edital WHERE disciplina_id = ?'
      ).bind(disc.disciplina_id).all()
      
      if (topicos && topicos.length > 0) {
        totalPopulado++
      }
    }
    
    return c.json({ 
      success: true, 
      disciplinas_processadas: disciplinas.length,
      disciplinas_com_topicos: totalPopulado
    })
  } catch (error) {
    console.error('Erro ao popular tópicos do usuário:', error)
    return c.json({ error: 'Erro ao popular tópicos' }, 500)
  }
})

// Buscar progresso do usuário nos tópicos de uma disciplina
app.get('/api/user-topicos/:user_id/:disciplina_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const disciplina_id = c.req.param('disciplina_id')

  // ✅ CORREÇÃO v3: Filtrar por user_id para isolamento de dados
  let { results } = await DB.prepare(`
    SELECT 
      te.id,
      te.disciplina_id,
      te.nome,
      te.categoria,
      te.ordem,
      COALESCE(te.peso, (
        SELECT ed.peso FROM edital_disciplinas ed 
        WHERE ed.disciplina_id = te.disciplina_id 
        LIMIT 1
      ), 1) as peso,
      COALESCE(utp.vezes_estudado, 0) as vezes_estudado,
      COALESCE(utp.nivel_dominio, 0) as nivel_dominio,
      utp.ultima_vez
    FROM topicos_edital te
    LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
    WHERE te.disciplina_id = ? AND te.user_id = ?
    ORDER BY te.ordem, te.nome
  `).bind(user_id, disciplina_id, user_id).all()

  // ✅ Se não encontrou tópicos em topicos_edital, buscar em edital_topicos (do edital processado DO USUÁRIO)
  if (!results || results.length === 0) {
    console.log(`📋 Buscando tópicos em edital_topicos para disciplina ${disciplina_id} do user ${user_id}...`)
    
    // ✅ CORREÇÃO v4: Buscar apenas tópicos do edital DO USUÁRIO
    const { results: editalTopicos } = await DB.prepare(`
      SELECT 
        et.id,
        et.nome,
        et.ordem,
        'Conteúdo Programático' as categoria,
        COALESCE(ed.peso, 1) as peso,
        ed.disciplina_id,
        0 as vezes_estudado,
        0 as nivel_dominio,
        NULL as ultima_vez
      FROM edital_topicos et
      JOIN edital_disciplinas ed ON et.edital_disciplina_id = ed.id
      JOIN editais e ON ed.edital_id = e.id
      WHERE ed.disciplina_id = ? AND e.user_id = ?
      ORDER BY et.ordem, et.nome
    `).bind(disciplina_id, user_id).all()
    
    if (editalTopicos && editalTopicos.length > 0) {
      console.log(`✅ Encontrados ${editalTopicos.length} tópicos no edital com pesos herdados para user ${user_id}`)
      
      // ✅ CORREÇÃO: Copiar para topicos_edital COM o peso da disciplina E user_id
      for (const topico of editalTopicos as any[]) {
        try {
          await DB.prepare(`
            INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(disciplina_id, topico.nome, 'Conteúdo Programático', topico.ordem, topico.peso, user_id).run()
        } catch (e) {
          // Ignorar duplicatas
        }
      }
      
      // ✅ CORREÇÃO v2: Buscar novamente sem duplicação - FILTRANDO POR USER_ID
      const { results: novosTopicos } = await DB.prepare(`
        SELECT 
          te.id,
          te.disciplina_id,
          te.nome,
          te.categoria,
          te.ordem,
          COALESCE(te.peso, (
            SELECT ed.peso FROM edital_disciplinas ed 
            WHERE ed.disciplina_id = te.disciplina_id 
            LIMIT 1
          ), 1) as peso,
          COALESCE(utp.vezes_estudado, 0) as vezes_estudado,
          COALESCE(utp.nivel_dominio, 0) as nivel_dominio,
          utp.ultima_vez
        FROM topicos_edital te
        LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
        WHERE te.disciplina_id = ? AND te.user_id = ?
        ORDER BY te.ordem, te.nome
      `).bind(user_id, disciplina_id, user_id).all()
      
      results = novosTopicos
    }
  }

  return c.json(results)
})

// ✅ POST para salvar/atualizar progresso de um tópico
app.post('/api/user-topicos/progresso', async (c) => {
  const { DB } = c.env
  const { user_id, topico_id, vezes_estudado, nivel_dominio } = await c.req.json()
  
  console.log('📊 Atualizando progresso do tópico:', { user_id, topico_id, vezes_estudado, nivel_dominio })
  
  try {
    // Verificar se já existe registro
    const existing = await DB.prepare(`
      SELECT id FROM user_topicos_progresso WHERE user_id = ? AND topico_id = ?
    `).bind(user_id, topico_id).first()
    
    if (existing) {
      // Atualizar
      await DB.prepare(`
        UPDATE user_topicos_progresso 
        SET vezes_estudado = ?, nivel_dominio = ?, ultima_vez = CURRENT_TIMESTAMP
        WHERE user_id = ? AND topico_id = ?
      `).bind(vezes_estudado, nivel_dominio, user_id, topico_id).run()
    } else {
      // Inserir
      await DB.prepare(`
        INSERT INTO user_topicos_progresso (user_id, topico_id, vezes_estudado, nivel_dominio, ultima_vez)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(user_id, topico_id, vezes_estudado, nivel_dominio).run()
    }
    
    console.log('✅ Progresso atualizado com sucesso')
    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar progresso:', error)
    return c.json({ error: 'Erro ao atualizar progresso' }, 500)
  }
})

// Função auxiliar para popular tópicos do edital baseado na disciplina
async function popularTopicosEdital(DB: any, disciplina_id: number, user_id?: number) {
  try {
    // Buscar nome da disciplina
    const disciplina = await DB.prepare('SELECT nome FROM disciplinas WHERE id = ?').bind(disciplina_id).first()
    if (!disciplina) return
    
    const nomeDisciplina = disciplina.nome
    const topicos = TOPICOS_POR_DISCIPLINA[nomeDisciplina]
    
    if (!topicos || topicos.length === 0) {
      console.log(`⚠️ Não há tópicos pré-definidos para: ${nomeDisciplina}`)
      return
    }
    
    // ✅ CORREÇÃO: Verificar se já existem tópicos para essa disciplina E USUÁRIO
    const { results: topicosExistentes } = await DB.prepare(
      user_id 
        ? 'SELECT id FROM topicos_edital WHERE disciplina_id = ? AND user_id = ?'
        : 'SELECT id FROM topicos_edital WHERE disciplina_id = ? AND user_id IS NULL'
    ).bind(...(user_id ? [disciplina_id, user_id] : [disciplina_id])).all()
    
    if (topicosExistentes && topicosExistentes.length > 0) {
      console.log(`✅ Disciplina ${nomeDisciplina} já possui ${topicosExistentes.length} tópicos para user ${user_id || 'global'}`)
      return
    }
    
    // ✅ CORREÇÃO: Inserir tópicos COM user_id
    for (const topico of topicos) {
      await DB.prepare(`
        INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        disciplina_id,
        topico.nome,
        topico.categoria,
        topico.ordem,
        topico.peso,
        user_id || null
      ).run()
    }
    
    console.log(`✅ Inseridos ${topicos.length} tópicos para: ${nomeDisciplina}`)
  } catch (error) {
    console.error('❌ Erro ao popular tópicos do edital:', error)
  }
}

// Algoritmo de distância de Levenshtein para similaridade de strings
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Inicializar matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Calcular distâncias
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // Deleção
        matrix[i][j - 1] + 1,     // Inserção
        matrix[i - 1][j - 1] + cost // Substituição
      )
    }
  }

  return matrix[len1][len2]
}

// Calcular similaridade entre duas strings (0 a 1, onde 1 = idênticas)
function calcularSimilaridade(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1.0
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return 1 - (distance / maxLen)
}

// ============== FUNÇÕES DE EXPORTAÇÃO DE CONTEÚDO ==============

// Gerar TXT simples para download
function gerarTXT(conteudo: any): string {
  let txt = ''
  
  txt += '═══════════════════════════════════════════════════════════════\n'
  txt += `        MATERIAL DE ESTUDO - ${conteudo.disciplina_nome || 'DISCIPLINA'}\n`
  txt += '═══════════════════════════════════════════════════════════════\n\n'
  txt += `Tipo: ${conteudo.tipo?.toUpperCase()}\n`
  txt += `Data: ${new Date(conteudo.created_at).toLocaleDateString('pt-BR')}\n`
  txt += `Tempo estimado: ${conteudo.tempo_minutos} minutos\n\n`
  
  if (conteudo.topicos && conteudo.topicos.length > 0) {
    txt += '📚 TÓPICOS ABORDADOS:\n'
    conteudo.topicos.forEach((t: string, i: number) => {
      txt += `   ${i + 1}. ${t}\n`
    })
    txt += '\n'
  }
  
  if (conteudo.objetivos && conteudo.objetivos.length > 0) {
    txt += '🎯 OBJETIVOS:\n'
    conteudo.objetivos.forEach((obj: string, i: number) => {
      txt += `   ${i + 1}. ${obj}\n`
    })
    txt += '\n'
  }
  
  txt += '───────────────────────────────────────────────────────────────\n\n'
  
  const detalhes = conteudo.conteudo
  
  if (detalhes.introducao) {
    txt += 'INTRODUÇÃO\n\n'
    txt += `${detalhes.introducao}\n\n`
    txt += '───────────────────────────────────────────────────────────────\n\n'
  }
  
  if (detalhes.secoes && Array.isArray(detalhes.secoes)) {
    detalhes.secoes.forEach((secao: any, idx: number) => {
      txt += `\n\n${'═'.repeat(63)}\n`
      txt += `SEÇÃO ${idx + 1}: ${secao.titulo || 'Sem título'}\n`
      txt += `${'═'.repeat(63)}\n\n`
      
      const conteudoSecao = secao.conteudo || secao
      
      if (conteudoSecao.teoria_completa) {
        // Remover markdown básico
        let teoria = conteudoSecao.teoria_completa
        teoria = teoria.replace(/#{1,6}\s/g, '')  // Remove headers
        teoria = teoria.replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold
        teoria = teoria.replace(/\*(.+?)\*/g, '$1')  // Remove italic
        teoria = teoria.replace(/`(.+?)`/g, '$1')  // Remove code
        txt += teoria + '\n\n'
      }
      
      if (conteudoSecao.questoes && Array.isArray(conteudoSecao.questoes)) {
        txt += '\n📝 QUESTÕES:\n\n'
        conteudoSecao.questoes.forEach((q: any, qIdx: number) => {
          txt += `${'─'.repeat(63)}\n`
          txt += `QUESTÃO ${qIdx + 1}\n`
          txt += `${'─'.repeat(63)}\n\n`
          txt += `${q.enunciado}\n\n`
          
          if (q.alternativas && Array.isArray(q.alternativas)) {
            const letras = ['A', 'B', 'C', 'D', 'E']
            q.alternativas.forEach((alt: string, aIdx: number) => {
              const isGabarito = aIdx === q.gabarito
              txt += `${letras[aIdx]}) ${alt}${isGabarito ? ' ✓ (CORRETA)' : ''}\n`
            })
          }
          
          txt += '\n'
          
          if (q.explicacao) {
            txt += 'EXPLICAÇÃO:\n'
            txt += `${q.explicacao}\n\n`
          }
        })
      }
    })
  }
  
  if (detalhes.proximos_passos) {
    txt += '\n\n═══════════════════════════════════════════════════════════════\n'
    txt += '📌 PRÓXIMOS PASSOS\n'
    txt += '═══════════════════════════════════════════════════════════════\n\n'
    txt += `${detalhes.proximos_passos}\n`
  }
  
  txt += '\n\n═══════════════════════════════════════════════════════════════\n'
  txt += '                      FIM DO MATERIAL\n'
  txt += '═══════════════════════════════════════════════════════════════\n'
  
  return txt
}

function gerarMarkdown(conteudo: any): string {
  let md = `# ${conteudo.disciplina_nome} - ${conteudo.tipo.toUpperCase()}\n\n`
  md += `**Data:** ${new Date(conteudo.created_at).toLocaleDateString('pt-BR')}\n\n`
  
  // Tópicos
  md += `## 📚 Tópicos\n\n`
  conteudo.topicos.forEach((topico: string) => {
    md += `- ${topico}\n`
  })
  md += `\n`
  
  // Objetivos
  md += `## 🎯 Objetivos\n\n`
  conteudo.objetivos.forEach((obj: string) => {
    md += `- ${obj}\n`
  })
  md += `\n`
  
  // Conteúdo
  const cont = conteudo.conteudo
  if (cont.introducao) {
    md += `## 📖 Introdução\n\n${cont.introducao}\n\n`
  }
  
  if (cont.orientacoes && cont.orientacoes.length > 0) {
    md += `## 💡 Orientações\n\n`
    cont.orientacoes.forEach((orient: string) => {
      md += `- ${orient}\n`
    })
    md += `\n`
  }
  
  // Seções
  if (cont.secoes && cont.secoes.length > 0) {
    cont.secoes.forEach((secao: any, idx: number) => {
      md += `---\n\n`
      md += `## ${idx + 1}. ${secao.titulo}\n\n`
      
      if (secao.tempo_estimado) {
        md += `⏱️ **Tempo estimado:** ${secao.tempo_estimado} minutos\n\n`
      }
      
      if (secao.conteudo && secao.conteudo.teoria_completa) {
        md += `${secao.conteudo.teoria_completa}\n\n`
      }
      
      // Questões
      if (secao.conteudo && secao.conteudo.questoes && secao.conteudo.questoes.length > 0) {
        md += `### 📝 Questões\n\n`
        secao.conteudo.questoes.forEach((q: any, qIdx: number) => {
          md += `**Questão ${qIdx + 1}**\n\n`
          md += `${q.enunciado}\n\n`
          
          if (q.alternativas && q.alternativas.length > 0) {
            q.alternativas.forEach((alt: string, altIdx: number) => {
              const letra = String.fromCharCode(65 + altIdx) // A, B, C, D, E
              const isCorreta = altIdx === q.gabarito
              md += `${letra}) ${alt}${isCorreta ? ' ✅' : ''}\n\n`
            })
          }
          
          if (q.explicacao) {
            md += `**Explicação:** ${q.explicacao}\n\n`
          }
          
          md += `---\n\n`
        })
      }
    })
  }
  
  // Próximos passos
  if (cont.proximos_passos) {
    md += `## 🚀 Próximos Passos\n\n${cont.proximos_passos}\n\n`
  }
  
  md += `\n---\n\n`
  md += `*Gerado por IAprova - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}*\n`
  
  return md
}

function gerarHTML(conteudo: any): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${conteudo.disciplina_nome} - ${conteudo.tipo}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #3b82f6; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .badge { 
      display: inline-block; 
      padding: 4px 12px; 
      background: #dbeafe; 
      color: #1e40af; 
      border-radius: 12px; 
      font-size: 0.85em;
      margin-right: 10px;
    }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .questao {
      background: #f9fafb;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }
    .alternativa { 
      padding: 10px; 
      margin: 8px 0; 
      background: white; 
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .alternativa.correta { 
      background: #d1fae5; 
      border-color: #10b981;
      font-weight: 600;
    }
    .explicacao {
      background: #fef3c7;
      padding: 15px;
      margin-top: 15px;
      border-radius: 4px;
      border-left: 4px solid #f59e0b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 0.85em;
    }
    @media print {
      body { background: white; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${conteudo.disciplina_nome} - ${conteudo.tipo.toUpperCase()}</h1>
    <div class="meta">
      <span class="badge">📅 ${new Date(conteudo.created_at).toLocaleDateString('pt-BR')}</span>
      <span class="badge">⏱️ ${conteudo.tempo_minutos || 30} minutos</span>
    </div>

    <h2>📚 Tópicos</h2>
    <ul>
      ${conteudo.topicos.map((t: string) => `<li>${t}</li>`).join('')}
    </ul>

    <h2>🎯 Objetivos</h2>
    <ul>
      ${conteudo.objetivos.map((o: string) => `<li>${o}</li>`).join('')}
    </ul>

    ${conteudo.conteudo.introducao ? `
      <h2>📖 Introdução</h2>
      <p>${conteudo.conteudo.introducao}</p>
    ` : ''}

    ${conteudo.conteudo.secoes && conteudo.conteudo.secoes.length > 0 ? conteudo.conteudo.secoes.map((secao: any, idx: number) => `
      <h2>${idx + 1}. ${secao.titulo}</h2>
      ${secao.tempo_estimado ? `<p><strong>⏱️ Tempo estimado:</strong> ${secao.tempo_estimado} minutos</p>` : ''}
      ${secao.conteudo && secao.conteudo.teoria_completa ? `<div>${secao.conteudo.teoria_completa.replace(/\n/g, '<br>')}</div>` : ''}
      
      ${secao.conteudo && secao.conteudo.questoes && secao.conteudo.questoes.length > 0 ? `
        <h3>📝 Questões</h3>
        ${secao.conteudo.questoes.map((q: any, qIdx: number) => `
          <div class="questao">
            <h4>Questão ${qIdx + 1}</h4>
            <p>${q.enunciado}</p>
            ${q.alternativas && q.alternativas.length > 0 ? q.alternativas.map((alt: string, altIdx: number) => {
              const letra = String.fromCharCode(65 + altIdx)
              const isCorreta = altIdx === q.gabarito
              return `<div class="alternativa ${isCorreta ? 'correta' : ''}">${letra}) ${alt}</div>`
            }).join('') : ''}
            ${q.explicacao ? `<div class="explicacao"><strong>💡 Explicação:</strong> ${q.explicacao}</div>` : ''}
          </div>
        `).join('')}
      ` : ''}
    `).join('') : ''}

    ${conteudo.conteudo.proximos_passos ? `
      <h2>🚀 Próximos Passos</h2>
      <p>${conteudo.conteudo.proximos_passos}</p>
    ` : ''}

    <div class="footer">
      Gerado por IAprova em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </div>
</body>
</html>
  `
}

// Função auxiliar para vincular conteúdo gerado aos tópicos do edital
async function vincularConteudoTopicos(DB: any, conteudo_id: number, disciplina_id: number, topicosGerados: string[]) {
  try {
    // Buscar tópicos do edital para essa disciplina
    const { results: topicosEdital } = await DB.prepare(
      'SELECT id, nome FROM topicos_edital WHERE disciplina_id = ?'
    ).bind(disciplina_id).all()
    
    if (!topicosEdital || topicosEdital.length === 0) {
      console.log(`⚠️ Nenhum tópico do edital encontrado para disciplina ${disciplina_id}`)
      return
    }
    
    // Para cada tópico gerado, encontrar o melhor match no edital
    for (const topicoGerado of topicosGerados) {
      let melhorMatch = null
      let melhorSimilaridade = 0
      
      const topicoGeradoNorm = topicoGerado.toLowerCase().trim()
      
      for (const topicoEdital of topicosEdital) {
        const topicoEditalNorm = topicoEdital.nome.toLowerCase().trim()
        
        // Estratégia 1: Match exato ou por inclusão (prioridade máxima)
        if (topicoGeradoNorm === topicoEditalNorm) {
          melhorMatch = topicoEdital
          melhorSimilaridade = 1.0
          break
        } else if (topicoGeradoNorm.includes(topicoEditalNorm) || 
                   topicoEditalNorm.includes(topicoGeradoNorm)) {
          const similaridade = 0.9 // Alta similaridade por inclusão
          if (similaridade > melhorSimilaridade) {
            melhorMatch = topicoEdital
            melhorSimilaridade = similaridade
          }
        } else {
          // Estratégia 2: Similaridade por Levenshtein
          const similaridade = calcularSimilaridade(topicoGeradoNorm, topicoEditalNorm)
          if (similaridade > melhorSimilaridade) {
            melhorMatch = topicoEdital
            melhorSimilaridade = similaridade
          }
        }
      }
      
      // Vincular apenas se similaridade >= 60%
      if (melhorMatch && melhorSimilaridade >= 0.6) {
        await DB.prepare(`
          INSERT OR IGNORE INTO conteudo_topicos (conteudo_id, topico_id)
          VALUES (?, ?)
        `).bind(conteudo_id, melhorMatch.id).run()
        
        const percentual = Math.round(melhorSimilaridade * 100)
        console.log(`✅ Vinculado (${percentual}%): "${topicoGerado}" → "${melhorMatch.nome}"`)
      } else {
        console.log(`⚠️ Sem match suficiente para: "${topicoGerado}" (melhor: ${Math.round(melhorSimilaridade * 100)}%)`)
      }
    }
  } catch (error) {
    console.error('❌ Erro ao vincular conteúdo aos tópicos:', error)
  }
}

// ============== BIBLIOTECA EXPANDIDA DE TÓPICOS POR DISCIPLINA ==============
// 🆕 Base completa com 82+ disciplinas e 820+ tópicos
const TOPICOS_POR_DISCIPLINA: Record<string, Array<{nome: string, categoria: string, ordem: number, peso: number}>> = {
  'Direito Tributário': [
    { nome: 'Sistema Tributário Nacional', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Princípios do Direito Tributário', categoria: 'Fundamentos', ordem: 2, peso: 3 },
    { nome: 'Competência Tributária', categoria: 'Fundamentos', ordem: 3, peso: 3 },
    { nome: 'Impostos', categoria: 'Espécies Tributárias', ordem: 4, peso: 3 },
    { nome: 'Taxas e Contribuições', categoria: 'Espécies Tributárias', ordem: 5, peso: 2 },
    { nome: 'Obrigação Tributária', categoria: 'Relação Jurídica', ordem: 6, peso: 3 },
    { nome: 'Crédito Tributário', categoria: 'Relação Jurídica', ordem: 7, peso: 3 },
    { nome: 'Lançamento Tributário', categoria: 'Procedimentos', ordem: 8, peso: 2 },
    { nome: 'Suspensão e Extinção do Crédito', categoria: 'Procedimentos', ordem: 9, peso: 2 },
    { nome: 'Exclusão do Crédito Tributário', categoria: 'Procedimentos', ordem: 10, peso: 2 }
  ],
  'Direito Constitucional': [
    { nome: 'Princípios Fundamentais da República', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Direitos e Garantias Fundamentais', categoria: 'Direitos Fundamentais', ordem: 2, peso: 3 },
    { nome: 'Organização do Estado', categoria: 'Organização', ordem: 3, peso: 2 },
    { nome: 'Organização dos Poderes', categoria: 'Organização', ordem: 4, peso: 3 },
    { nome: 'Controle de Constitucionalidade', categoria: 'Controle', ordem: 5, peso: 3 },
    { nome: 'Poder Legislativo', categoria: 'Poderes', ordem: 6, peso: 2 },
    { nome: 'Poder Executivo', categoria: 'Poderes', ordem: 7, peso: 2 },
    { nome: 'Poder Judiciário', categoria: 'Poderes', ordem: 8, peso: 2 },
    { nome: 'Defesa do Estado e Instituições', categoria: 'Defesa', ordem: 9, peso: 2 },
    { nome: 'Ordem Econômica e Financeira', categoria: 'Ordem Econômica', ordem: 10, peso: 2 }
  ],
  'Direito Administrativo': [
    { nome: 'Princípios da Administração Pública', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Atos Administrativos', categoria: 'Atos', ordem: 2, peso: 3 },
    { nome: 'Poderes da Administração', categoria: 'Poderes', ordem: 3, peso: 2 },
    { nome: 'Organização Administrativa', categoria: 'Organização', ordem: 4, peso: 2 },
    { nome: 'Agentes Públicos', categoria: 'Pessoal', ordem: 5, peso: 3 },
    { nome: 'Licitações e Contratos', categoria: 'Contratações', ordem: 6, peso: 3 },
    { nome: 'Serviços Públicos', categoria: 'Serviços', ordem: 7, peso: 2 },
    { nome: 'Bens Públicos', categoria: 'Patrimônio', ordem: 8, peso: 2 },
    { nome: 'Intervenção do Estado', categoria: 'Intervenção', ordem: 9, peso: 2 },
    { nome: 'Responsabilidade Civil do Estado', categoria: 'Responsabilidade', ordem: 10, peso: 3 }
  ],
  'Português': [
    { nome: 'Interpretação de Textos', categoria: 'Compreensão', ordem: 1, peso: 3 },
    { nome: 'Ortografia', categoria: 'Norma Culta', ordem: 2, peso: 2 },
    { nome: 'Acentuação Gráfica', categoria: 'Norma Culta', ordem: 3, peso: 2 },
    { nome: 'Concordância Verbal e Nominal', categoria: 'Sintaxe', ordem: 4, peso: 3 },
    { nome: 'Regência Verbal e Nominal', categoria: 'Sintaxe', ordem: 5, peso: 3 },
    { nome: 'Crase', categoria: 'Sintaxe', ordem: 6, peso: 2 },
    { nome: 'Pronomes e Colocação Pronominal', categoria: 'Morfologia', ordem: 7, peso: 2 },
    { nome: 'Pontuação', categoria: 'Sintaxe', ordem: 8, peso: 2 },
    { nome: 'Semântica e Coesão', categoria: 'Sentido', ordem: 9, peso: 2 },
    { nome: 'Redação Oficial', categoria: 'Prática', ordem: 10, peso: 2 }
  ],
  'Raciocínio Lógico': [
    { nome: 'Lógica Proposicional', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Equivalências Lógicas', categoria: 'Fundamentos', ordem: 2, peso: 3 },
    { nome: 'Diagramas Lógicos', categoria: 'Lógica de Argumentação', ordem: 3, peso: 2 },
    { nome: 'Sequências e Padrões', categoria: 'Raciocínio', ordem: 4, peso: 2 },
    { nome: 'Análise Combinatória', categoria: 'Contagem', ordem: 5, peso: 2 },
    { nome: 'Probabilidade', categoria: 'Contagem', ordem: 6, peso: 2 },
    { nome: 'Raciocínio Quantitativo', categoria: 'Matemática', ordem: 7, peso: 2 },
    { nome: 'Operações com Conjuntos', categoria: 'Conjuntos', ordem: 8, peso: 2 },
    { nome: 'Raciocínio Analítico', categoria: 'Raciocínio', ordem: 9, peso: 2 },
    { nome: 'Verdades e Mentiras', categoria: 'Lógica de Argumentação', ordem: 10, peso: 2 }
  ],
  'Matemática': [
    { nome: 'Números e Operações', categoria: 'Aritmética', ordem: 1, peso: 2 },
    { nome: 'Frações e Decimais', categoria: 'Aritmética', ordem: 2, peso: 2 },
    { nome: 'Porcentagem', categoria: 'Matemática Financeira', ordem: 3, peso: 3 },
    { nome: 'Razão e Proporção', categoria: 'Matemática Básica', ordem: 4, peso: 2 },
    { nome: 'Regra de Três', categoria: 'Matemática Básica', ordem: 5, peso: 2 },
    { nome: 'Equações de 1º e 2º grau', categoria: 'Álgebra', ordem: 6, peso: 2 },
    { nome: 'Sistemas de Equações', categoria: 'Álgebra', ordem: 7, peso: 2 },
    { nome: 'Geometria Plana', categoria: 'Geometria', ordem: 8, peso: 2 },
    { nome: 'Matemática Financeira', categoria: 'Financeira', ordem: 9, peso: 3 },
    { nome: 'Estatística Básica', categoria: 'Estatística', ordem: 10, peso: 2 }
  ],
  'Direito Civil': [
    { nome: 'Lei de Introdução às Normas', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Pessoa Natural e Jurídica', categoria: 'Parte Geral', ordem: 2, peso: 2 },
    { nome: 'Fatos Jurídicos', categoria: 'Parte Geral', ordem: 3, peso: 2 },
    { nome: 'Negócio Jurídico', categoria: 'Parte Geral', ordem: 4, peso: 3 },
    { nome: 'Prescrição e Decadência', categoria: 'Parte Geral', ordem: 5, peso: 3 },
    { nome: 'Obrigações', categoria: 'Direito das Obrigações', ordem: 6, peso: 3 },
    { nome: 'Contratos', categoria: 'Direito das Obrigações', ordem: 7, peso: 3 },
    { nome: 'Responsabilidade Civil', categoria: 'Direito das Obrigações', ordem: 8, peso: 3 },
    { nome: 'Direito das Coisas', categoria: 'Direitos Reais', ordem: 9, peso: 2 },
    { nome: 'Direito de Família e Sucessões', categoria: 'Família', ordem: 10, peso: 2 }
  ],
  'Direito Penal': [
    { nome: 'Aplicação da Lei Penal', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Crime: Conceito e Elementos', categoria: 'Teoria do Crime', ordem: 2, peso: 3 },
    { nome: 'Tipicidade', categoria: 'Teoria do Crime', ordem: 3, peso: 3 },
    { nome: 'Ilicitude', categoria: 'Teoria do Crime', ordem: 4, peso: 2 },
    { nome: 'Culpabilidade', categoria: 'Teoria do Crime', ordem: 5, peso: 3 },
    { nome: 'Tentativa e Consumação', categoria: 'Iter Criminis', ordem: 6, peso: 2 },
    { nome: 'Concurso de Pessoas', categoria: 'Concurso', ordem: 7, peso: 2 },
    { nome: 'Penas e Medidas de Segurança', categoria: 'Penas', ordem: 8, peso: 3 },
    { nome: 'Crimes contra a Pessoa', categoria: 'Parte Especial', ordem: 9, peso: 3 },
    { nome: 'Crimes contra o Patrimônio', categoria: 'Parte Especial', ordem: 10, peso: 3 }
  ],
  'Direito Processual Civil': [
    { nome: 'Normas Processuais', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Jurisdição e Competência', categoria: 'Fundamentos', ordem: 2, peso: 3 },
    { nome: 'Atos Processuais', categoria: 'Processo', ordem: 3, peso: 2 },
    { nome: 'Sujeitos do Processo', categoria: 'Sujeitos', ordem: 4, peso: 2 },
    { nome: 'Petição Inicial', categoria: 'Procedimento', ordem: 5, peso: 3 },
    { nome: 'Resposta do Réu', categoria: 'Procedimento', ordem: 6, peso: 3 },
    { nome: 'Provas', categoria: 'Instrução', ordem: 7, peso: 3 },
    { nome: 'Sentença', categoria: 'Decisão', ordem: 8, peso: 3 },
    { nome: 'Recursos', categoria: 'Impugnação', ordem: 9, peso: 3 },
    { nome: 'Execução', categoria: 'Execução', ordem: 10, peso: 2 }
  ],
  'Direito Processual Penal': [
    { nome: 'Princípios do Processo Penal', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Inquérito Policial', categoria: 'Investigação', ordem: 2, peso: 2 },
    { nome: 'Ação Penal', categoria: 'Ação', ordem: 3, peso: 3 },
    { nome: 'Jurisdição e Competência', categoria: 'Fundamentos', ordem: 4, peso: 3 },
    { nome: 'Provas', categoria: 'Instrução', ordem: 5, peso: 3 },
    { nome: 'Prisão e Liberdade Provisória', categoria: 'Medidas Cautelares', ordem: 6, peso: 3 },
    { nome: 'Procedimentos', categoria: 'Procedimentos', ordem: 7, peso: 2 },
    { nome: 'Tribunal do Júri', categoria: 'Procedimentos Especiais', ordem: 8, peso: 3 },
    { nome: 'Recursos', categoria: 'Impugnação', ordem: 9, peso: 3 },
    { nome: 'Execução Penal', categoria: 'Execução', ordem: 10, peso: 2 }
  ],
  'Legislação Tributária': [
    { nome: 'ICMS: Conceito e Incidência', categoria: 'ICMS', ordem: 1, peso: 3 },
    { nome: 'ICMS: Base de Cálculo e Alíquotas', categoria: 'ICMS', ordem: 2, peso: 3 },
    { nome: 'ISS: Conceito e Fato Gerador', categoria: 'ISS', ordem: 3, peso: 2 },
    { nome: 'IPTU e ITBI', categoria: 'Impostos Municipais', ordem: 4, peso: 2 },
    { nome: 'Simples Nacional', categoria: 'Regimes Especiais', ordem: 5, peso: 2 },
    { nome: 'Substituição Tributária', categoria: 'Regimes Especiais', ordem: 6, peso: 3 },
    { nome: 'Obrigações Acessórias', categoria: 'Obrigações', ordem: 7, peso: 2 },
    { nome: 'Infrações e Penalidades', categoria: 'Fiscalização', ordem: 8, peso: 2 },
    { nome: 'Processo Administrativo Fiscal', categoria: 'Processo', ordem: 9, peso: 2 },
    { nome: 'Legislação Específica do Ente', categoria: 'Legislação Local', ordem: 10, peso: 2 }
  ],
  'Contabilidade Geral': [
    { nome: 'Princípios Contábeis', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Patrimônio e Equação Patrimonial', categoria: 'Patrimônio', ordem: 2, peso: 3 },
    { nome: 'Contas Patrimoniais e de Resultado', categoria: 'Contas', ordem: 3, peso: 3 },
    { nome: 'Escrituração Contábil', categoria: 'Prática', ordem: 4, peso: 2 },
    { nome: 'Operações com Mercadorias', categoria: 'Operações', ordem: 5, peso: 2 },
    { nome: 'Balanço Patrimonial', categoria: 'Demonstrações', ordem: 6, peso: 3 },
    { nome: 'DRE - Demonstração do Resultado', categoria: 'Demonstrações', ordem: 7, peso: 3 },
    { nome: 'DLPA e DMPL', categoria: 'Demonstrações', ordem: 8, peso: 2 },
    { nome: 'Análise das Demonstrações', categoria: 'Análise', ordem: 9, peso: 2 },
    { nome: 'Depreciação e Amortização', categoria: 'Ativo Imobilizado', ordem: 10, peso: 2 }
  ],
  'Contabilidade Pública': [
    { nome: 'Conceitos e Campo de Aplicação', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Orçamento Público', categoria: 'Orçamento', ordem: 2, peso: 3 },
    { nome: 'Receita Pública', categoria: 'Receita', ordem: 3, peso: 3 },
    { nome: 'Despesa Pública', categoria: 'Despesa', ordem: 4, peso: 3 },
    { nome: 'Restos a Pagar', categoria: 'Despesa', ordem: 5, peso: 2 },
    { nome: 'Dívida Ativa', categoria: 'Receita', ordem: 6, peso: 2 },
    { nome: 'Patrimônio Público', categoria: 'Patrimônio', ordem: 7, peso: 2 },
    { nome: 'NBCASP - Normas Brasileiras', categoria: 'Normas', ordem: 8, peso: 3 },
    { nome: 'Demonstrações Contábeis Públicas', categoria: 'Demonstrações', ordem: 9, peso: 3 },
    { nome: 'LRF - Lei de Responsabilidade Fiscal', categoria: 'LRF', ordem: 10, peso: 3 }
  ],
  'Auditoria': [
    { nome: 'Conceitos e Tipos de Auditoria', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Normas de Auditoria', categoria: 'Normas', ordem: 2, peso: 3 },
    { nome: 'Planejamento de Auditoria', categoria: 'Planejamento', ordem: 3, peso: 2 },
    { nome: 'Procedimentos de Auditoria', categoria: 'Procedimentos', ordem: 4, peso: 3 },
    { nome: 'Testes de Observância e Substantivos', categoria: 'Testes', ordem: 5, peso: 2 },
    { nome: 'Amostragem em Auditoria', categoria: 'Técnicas', ordem: 6, peso: 2 },
    { nome: 'Papéis de Trabalho', categoria: 'Documentação', ordem: 7, peso: 2 },
    { nome: 'Controle Interno', categoria: 'Controle', ordem: 8, peso: 3 },
    { nome: 'Relatório de Auditoria', categoria: 'Relatório', ordem: 9, peso: 3 },
    { nome: 'Auditoria Governamental', categoria: 'Setor Público', ordem: 10, peso: 2 }
  ],
  'Legislação Especial': [
    { nome: 'Lei de Drogas - Lei 11.343/06', categoria: 'Drogas', ordem: 1, peso: 3 },
    { nome: 'Crimes Hediondos - Lei 8.072/90', categoria: 'Crimes Graves', ordem: 2, peso: 3 },
    { nome: 'Estatuto do Desarmamento', categoria: 'Armas', ordem: 3, peso: 2 },
    { nome: 'Violência Doméstica - Lei Maria da Penha', categoria: 'Violência', ordem: 4, peso: 3 },
    { nome: 'Crimes de Trânsito', categoria: 'Trânsito', ordem: 5, peso: 2 },
    { nome: 'Juizados Especiais Criminais', categoria: 'JECRIM', ordem: 6, peso: 2 },
    { nome: 'Organizações Criminosas', categoria: 'Crime Organizado', ordem: 7, peso: 2 },
    { nome: 'Interceptação Telefônica', categoria: 'Investigação', ordem: 8, peso: 2 },
    { nome: 'Abuso de Autoridade', categoria: 'Abusos', ordem: 9, peso: 2 },
    { nome: 'Crimes contra a Ordem Tributária', categoria: 'Fiscal', ordem: 10, peso: 2 }
  ],
  'Direitos Humanos': [
    { nome: 'Evolução Histórica', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Gerações de Direitos', categoria: 'Teoria', ordem: 2, peso: 2 },
    { nome: 'Sistema Global de Proteção', categoria: 'ONU', ordem: 3, peso: 2 },
    { nome: 'Declaração Universal - 1948', categoria: 'Documentos', ordem: 4, peso: 3 },
    { nome: 'Pactos Internacionais', categoria: 'Tratados', ordem: 5, peso: 2 },
    { nome: 'Sistema Interamericano', categoria: 'Regional', ordem: 6, peso: 3 },
    { nome: 'Convenção Americana - Pacto de San José', categoria: 'Documentos', ordem: 7, peso: 3 },
    { nome: 'Direitos das Crianças e Adolescentes', categoria: 'Especiais', ordem: 8, peso: 2 },
    { nome: 'Direitos das Mulheres', categoria: 'Especiais', ordem: 9, peso: 2 },
    { nome: 'Direitos dos Refugiados', categoria: 'Especiais', ordem: 10, peso: 2 }
  ],
  'Informática': [
    { nome: 'Hardware: Componentes', categoria: 'Hardware', ordem: 1, peso: 2 },
    { nome: 'Sistemas Operacionais', categoria: 'Software', ordem: 2, peso: 2 },
    { nome: 'Windows: Básico', categoria: 'Windows', ordem: 3, peso: 2 },
    { nome: 'Linux: Fundamentos', categoria: 'Linux', ordem: 4, peso: 2 },
    { nome: 'Editor de Textos', categoria: 'Aplicativos', ordem: 5, peso: 3 },
    { nome: 'Planilhas Eletrônicas', categoria: 'Aplicativos', ordem: 6, peso: 3 },
    { nome: 'Redes de Computadores', categoria: 'Redes', ordem: 7, peso: 2 },
    { nome: 'Internet e Navegadores', categoria: 'Internet', ordem: 8, peso: 2 },
    { nome: 'Segurança da Informação', categoria: 'Segurança', ordem: 9, peso: 3 },
    { nome: 'Backup e Armazenamento', categoria: 'Segurança', ordem: 10, peso: 2 }
  ],
  'Atualidades': [
    { nome: 'Política Nacional', categoria: 'Política', ordem: 1, peso: 3 },
    { nome: 'Política Internacional', categoria: 'Política', ordem: 2, peso: 2 },
    { nome: 'Economia Brasileira', categoria: 'Economia', ordem: 3, peso: 3 },
    { nome: 'Economia Mundial', categoria: 'Economia', ordem: 4, peso: 2 },
    { nome: 'Meio Ambiente', categoria: 'Sociedade', ordem: 5, peso: 2 },
    { nome: 'Ciência e Tecnologia', categoria: 'Ciência', ordem: 6, peso: 2 },
    { nome: 'Cultura e Esportes', categoria: 'Cultura', ordem: 7, peso: 1 },
    { nome: 'Questões Sociais', categoria: 'Sociedade', ordem: 8, peso: 2 },
    { nome: 'Saúde Pública', categoria: 'Saúde', ordem: 9, peso: 2 },
    { nome: 'Educação', categoria: 'Educação', ordem: 10, peso: 2 }
  ],
  'Inglês': [
    { nome: 'Interpretação de Textos', categoria: 'Reading', ordem: 1, peso: 3 },
    { nome: 'Vocabulário', categoria: 'Vocabulary', ordem: 2, peso: 2 },
    { nome: 'Verb Tenses', categoria: 'Grammar', ordem: 3, peso: 3 },
    { nome: 'Pronouns', categoria: 'Grammar', ordem: 4, peso: 2 },
    { nome: 'Prepositions', categoria: 'Grammar', ordem: 5, peso: 2 },
    { nome: 'Conditionals', categoria: 'Grammar', ordem: 6, peso: 2 },
    { nome: 'Passive Voice', categoria: 'Grammar', ordem: 7, peso: 2 },
    { nome: 'Reported Speech', categoria: 'Grammar', ordem: 8, peso: 2 },
    { nome: 'Phrasal Verbs', categoria: 'Vocabulary', ordem: 9, peso: 2 },
    { nome: 'False Cognates', categoria: 'Vocabulary', ordem: 10, peso: 2 }
  ],
  'Redação': [
    { nome: 'Estrutura Textual', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Tipos Textuais', categoria: 'Tipologia', ordem: 2, peso: 2 },
    { nome: 'Texto Dissertativo-Argumentativo', categoria: 'Dissertação', ordem: 3, peso: 3 },
    { nome: 'Tese e Argumentação', categoria: 'Dissertação', ordem: 4, peso: 3 },
    { nome: 'Coesão e Coerência', categoria: 'Coesão', ordem: 5, peso: 3 },
    { nome: 'Conectivos', categoria: 'Coesão', ordem: 6, peso: 2 },
    { nome: 'Introdução e Conclusão', categoria: 'Estrutura', ordem: 7, peso: 2 },
    { nome: 'Desenvolvimento de Parágrafos', categoria: 'Estrutura', ordem: 8, peso: 2 },
    { nome: 'Proposta de Intervenção', categoria: 'Dissertação', ordem: 9, peso: 3 },
    { nome: 'Erros Comuns', categoria: 'Prática', ordem: 10, peso: 2 }
  ],
  // 🆕 NOVAS DISCIPLINAS EXPANDIDAS
  'Matemática Financeira': [
    { nome: 'Juros Simples', categoria: 'Juros', ordem: 1, peso: 3 },
    { nome: 'Juros Compostos', categoria: 'Juros', ordem: 2, peso: 3 },
    { nome: 'Descontos Simples e Compostos', categoria: 'Descontos', ordem: 3, peso: 2 },
    { nome: 'Taxas de Juros', categoria: 'Taxas', ordem: 4, peso: 2 },
    { nome: 'Séries de Pagamentos', categoria: 'Amortização', ordem: 5, peso: 2 },
    { nome: 'Sistema Price', categoria: 'Amortização', ordem: 6, peso: 2 },
    { nome: 'Sistema SAC', categoria: 'Amortização', ordem: 7, peso: 2 },
    { nome: 'Valor Presente e Futuro', categoria: 'Valor do Dinheiro', ordem: 8, peso: 3 },
    { nome: 'Taxa Interna de Retorno', categoria: 'Análise', ordem: 9, peso: 2 },
    { nome: 'Análise de Investimentos', categoria: 'Análise', ordem: 10, peso: 2 }
  ],
  'Estatística': [
    { nome: 'Estatística Descritiva', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Medidas de Posição', categoria: 'Medidas', ordem: 2, peso: 3 },
    { nome: 'Medidas de Dispersão', categoria: 'Medidas', ordem: 3, peso: 3 },
    { nome: 'Distribuição de Frequências', categoria: 'Distribuições', ordem: 4, peso: 2 },
    { nome: 'Probabilidade Básica', categoria: 'Probabilidade', ordem: 5, peso: 3 },
    { nome: 'Probabilidade Condicional', categoria: 'Probabilidade', ordem: 6, peso: 2 },
    { nome: 'Distribuição Normal', categoria: 'Distribuições', ordem: 7, peso: 3 },
    { nome: 'Amostragem', categoria: 'Inferência', ordem: 8, peso: 2 },
    { nome: 'Testes de Hipóteses', categoria: 'Inferência', ordem: 9, peso: 2 },
    { nome: 'Correlação e Regressão', categoria: 'Análise', ordem: 10, peso: 2 }
  ],
  'Ética no Serviço Público': [
    { nome: 'Princípios Éticos', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Código de Ética Profissional', categoria: 'Normas', ordem: 2, peso: 3 },
    { nome: 'Probidade Administrativa', categoria: 'Integridade', ordem: 3, peso: 3 },
    { nome: 'Conflito de Interesses', categoria: 'Integridade', ordem: 4, peso: 3 },
    { nome: 'Vedações ao Servidor', categoria: 'Deveres', ordem: 5, peso: 2 },
    { nome: 'Nepotismo', categoria: 'Vedações', ordem: 6, peso: 2 },
    { nome: 'Transparência Pública', categoria: 'Princípios', ordem: 7, peso: 2 },
    { nome: 'Improbidade Administrativa', categoria: 'Responsabilidade', ordem: 8, peso: 3 },
    { nome: 'Responsabilização do Servidor', categoria: 'Responsabilidade', ordem: 9, peso: 2 },
    { nome: 'Compliance no Setor Público', categoria: 'Integridade', ordem: 10, peso: 2 }
  ],
  'Administração Geral': [
    { nome: 'Teorias Administrativas', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Funções Administrativas', categoria: 'Processo', ordem: 2, peso: 3 },
    { nome: 'Planejamento Estratégico', categoria: 'Planejamento', ordem: 3, peso: 3 },
    { nome: 'Estruturas Organizacionais', categoria: 'Organização', ordem: 4, peso: 2 },
    { nome: 'Cultura Organizacional', categoria: 'Comportamento', ordem: 5, peso: 2 },
    { nome: 'Liderança', categoria: 'Direção', ordem: 6, peso: 3 },
    { nome: 'Motivação', categoria: 'Comportamento', ordem: 7, peso: 2 },
    { nome: 'Comunicação Organizacional', categoria: 'Direção', ordem: 8, peso: 2 },
    { nome: 'Controle Gerencial', categoria: 'Controle', ordem: 9, peso: 2 },
    { nome: 'Tomada de Decisão', categoria: 'Processo', ordem: 10, peso: 3 }
  ],
  'Administração Pública': [
    { nome: 'Evolução da Administração Pública', categoria: 'História', ordem: 1, peso: 2 },
    { nome: 'Modelos de Gestão Pública', categoria: 'Modelos', ordem: 3, peso: 3 },
    { nome: 'Governança Pública', categoria: 'Governança', ordem: 3, peso: 3 },
    { nome: 'Gestão por Resultados', categoria: 'Gestão', ordem: 4, peso: 3 },
    { nome: 'Excelência no Serviço Público', categoria: 'Qualidade', ordem: 5, peso: 2 },
    { nome: 'Inovação no Setor Público', categoria: 'Inovação', ordem: 6, peso: 2 },
    { nome: 'Gestão de Projetos Públicos', categoria: 'Projetos', ordem: 7, peso: 2 },
    { nome: 'Contratos de Gestão', categoria: 'Contratos', ordem: 8, peso: 2 },
    { nome: 'Agências Reguladoras', categoria: 'Organização', ordem: 9, peso: 2 },
    { nome: 'Parceria Público-Privada', categoria: 'Parcerias', ordem: 10, peso: 2 }
  ],
  'Gestão de Pessoas': [
    { nome: 'Planejamento de RH', categoria: 'Planejamento', ordem: 1, peso: 2 },
    { nome: 'Recrutamento e Seleção', categoria: 'Provisão', ordem: 2, peso: 3 },
    { nome: 'Treinamento e Desenvolvimento', categoria: 'Desenvolvimento', ordem: 3, peso: 3 },
    { nome: 'Avaliação de Desempenho', categoria: 'Monitoramento', ordem: 4, peso: 3 },
    { nome: 'Gestão por Competências', categoria: 'Competências', ordem: 5, peso: 3 },
    { nome: 'Remuneração e Benefícios', categoria: 'Compensação', ordem: 6, peso: 2 },
    { nome: 'Qualidade de Vida no Trabalho', categoria: 'Bem-estar', ordem: 7, peso: 2 },
    { nome: 'Clima Organizacional', categoria: 'Comportamento', ordem: 8, peso: 2 },
    { nome: 'Gestão de Conflitos', categoria: 'Relações', ordem: 9, peso: 2 },
    { nome: 'Liderança de Equipes', categoria: 'Liderança', ordem: 10, peso: 3 }
  ],
  'AFO - Administração Financeira e Orçamentária': [
    { nome: 'Orçamento Público: Conceito', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Princípios Orçamentários', categoria: 'Princípios', ordem: 2, peso: 3 },
    { nome: 'Ciclo Orçamentário', categoria: 'Processo', ordem: 3, peso: 3 },
    { nome: 'PPA - Plano Plurianual', categoria: 'Planejamento', ordem: 4, peso: 3 },
    { nome: 'LDO - Lei de Diretrizes Orçamentárias', categoria: 'Planejamento', ordem: 5, peso: 3 },
    { nome: 'LOA - Lei Orçamentária Anual', categoria: 'Execução', ordem: 6, peso: 3 },
    { nome: 'Créditos Adicionais', categoria: 'Execução', ordem: 7, peso: 2 },
    { nome: 'Receita Pública', categoria: 'Receita', ordem: 8, peso: 3 },
    { nome: 'Despesa Pública', categoria: 'Despesa', ordem: 9, peso: 3 },
    { nome: 'LRF e Controle', categoria: 'LRF', ordem: 10, peso: 3 }
  ],
  'Direito Financeiro': [
    { nome: 'Finanças Públicas', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Receitas Públicas', categoria: 'Receita', ordem: 2, peso: 3 },
    { nome: 'Despesas Públicas', categoria: 'Despesa', ordem: 3, peso: 3 },
    { nome: 'Orçamento Público', categoria: 'Orçamento', ordem: 4, peso: 3 },
    { nome: 'Dívida Pública', categoria: 'Dívida', ordem: 5, peso: 2 },
    { nome: 'Crédito Público', categoria: 'Crédito', ordem: 6, peso: 2 },
    { nome: 'LRF - Limites e Controles', categoria: 'LRF', ordem: 7, peso: 3 },
    { nome: 'Responsabilidade Fiscal', categoria: 'LRF', ordem: 8, peso: 3 },
    { nome: 'Precatórios', categoria: 'Dívida', ordem: 9, peso: 2 },
    { nome: 'Fiscalização Orçamentária', categoria: 'Controle', ordem: 10, peso: 2 }
  ],
  'Direito Previdenciário': [
    { nome: 'Seguridade Social', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Princípios Previdenciários', categoria: 'Princípios', ordem: 2, peso: 2 },
    { nome: 'Regime Geral - RGPS', categoria: 'RGPS', ordem: 3, peso: 3 },
    { nome: 'Segurados do RGPS', categoria: 'Filiação', ordem: 4, peso: 3 },
    { nome: 'Dependentes', categoria: 'Filiação', ordem: 5, peso: 2 },
    { nome: 'Benefícios Previdenciários', categoria: 'Benefícios', ordem: 6, peso: 3 },
    { nome: 'Aposentadorias', categoria: 'Benefícios', ordem: 7, peso: 3 },
    { nome: 'Custeio da Seguridade', categoria: 'Custeio', ordem: 8, peso: 3 },
    { nome: 'Salário-de-Contribuição', categoria: 'Custeio', ordem: 9, peso: 2 },
    { nome: 'Regimes Próprios - RPPS', categoria: 'RPPS', ordem: 10, peso: 2 }
  ],
  'Direito Empresarial': [
    { nome: 'Empresário e Empresa', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Estabelecimento Empresarial', categoria: 'Estabelecimento', ordem: 2, peso: 2 },
    { nome: 'Registro de Empresas', categoria: 'Registro', ordem: 3, peso: 2 },
    { nome: 'Nome Empresarial', categoria: 'Registro', ordem: 4, peso: 2 },
    { nome: 'Sociedades Empresárias', categoria: 'Sociedades', ordem: 5, peso: 3 },
    { nome: 'Sociedade Limitada', categoria: 'Sociedades', ordem: 6, peso: 3 },
    { nome: 'Sociedade Anônima', categoria: 'Sociedades', ordem: 7, peso: 3 },
    { nome: 'Títulos de Crédito', categoria: 'Títulos', ordem: 8, peso: 3 },
    { nome: 'Falência e Recuperação', categoria: 'Crise', ordem: 9, peso: 2 },
    { nome: 'Contratos Empresariais', categoria: 'Contratos', ordem: 10, peso: 2 }
  ],
  'Direito Ambiental': [
    { nome: 'Princípios do Direito Ambiental', categoria: 'Princípios', ordem: 1, peso: 3 },
    { nome: 'Política Nacional do Meio Ambiente', categoria: 'Legislação', ordem: 2, peso: 3 },
    { nome: 'Competências Ambientais', categoria: 'Competência', ordem: 3, peso: 2 },
    { nome: 'Licenciamento Ambiental', categoria: 'Controle', ordem: 4, peso: 3 },
    { nome: 'Estudos Ambientais', categoria: 'Controle', ordem: 5, peso: 2 },
    { nome: 'Áreas Protegidas', categoria: 'Proteção', ordem: 6, peso: 2 },
    { nome: 'Código Florestal', categoria: 'Legislação', ordem: 7, peso: 3 },
    { nome: 'Recursos Hídricos', categoria: 'Recursos', ordem: 8, peso: 2 },
    { nome: 'Responsabilidade Ambiental', categoria: 'Responsabilidade', ordem: 9, peso: 3 },
    { nome: 'Crimes Ambientais', categoria: 'Sanções', ordem: 10, peso: 3 }
  ],
  'Direito do Consumidor': [
    { nome: 'Relação de Consumo', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Consumidor e Fornecedor', categoria: 'Sujeitos', ordem: 2, peso: 3 },
    { nome: 'Princípios do CDC', categoria: 'Princípios', ordem: 3, peso: 2 },
    { nome: 'Direitos Básicos do Consumidor', categoria: 'Direitos', ordem: 4, peso: 3 },
    { nome: 'Qualidade de Produtos e Serviços', categoria: 'Qualidade', ordem: 5, peso: 2 },
    { nome: 'Vícios e Defeitos', categoria: 'Responsabilidade', ordem: 6, peso: 3 },
    { nome: 'Responsabilidade do Fornecedor', categoria: 'Responsabilidade', ordem: 7, peso: 3 },
    { nome: 'Práticas Comerciais', categoria: 'Práticas', ordem: 8, peso: 2 },
    { nome: 'Proteção Contratual', categoria: 'Contratos', ordem: 9, peso: 2 },
    { nome: 'Sanções Administrativas', categoria: 'Sanções', ordem: 10, peso: 2 }
  ],
  'LGPD - Proteção de Dados': [
    { nome: 'Fundamentos da LGPD', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Princípios de Proteção de Dados', categoria: 'Princípios', ordem: 2, peso: 3 },
    { nome: 'Dados Pessoais e Sensíveis', categoria: 'Dados', ordem: 3, peso: 3 },
    { nome: 'Bases Legais', categoria: 'Tratamento', ordem: 4, peso: 3 },
    { nome: 'Direitos do Titular', categoria: 'Direitos', ordem: 5, peso: 3 },
    { nome: 'Agentes de Tratamento', categoria: 'Agentes', ordem: 6, peso: 2 },
    { nome: 'Segurança da Informação', categoria: 'Segurança', ordem: 7, peso: 3 },
    { nome: 'Incidentes de Segurança', categoria: 'Segurança', ordem: 8, peso: 2 },
    { nome: 'ANPD - Autoridade Nacional', categoria: 'Fiscalização', ordem: 9, peso: 2 },
    { nome: 'Sanções Administrativas', categoria: 'Sanções', ordem: 10, peso: 2 }
  ],
  'Conhecimentos Bancários': [
    { nome: 'Sistema Financeiro Nacional', categoria: 'Sistema', ordem: 1, peso: 3 },
    { nome: 'Banco Central do Brasil', categoria: 'Instituições', ordem: 2, peso: 3 },
    { nome: 'Produtos Bancários', categoria: 'Produtos', ordem: 3, peso: 3 },
    { nome: 'Operações de Crédito', categoria: 'Crédito', ordem: 4, peso: 3 },
    { nome: 'Garantias Bancárias', categoria: 'Crédito', ordem: 5, peso: 2 },
    { nome: 'Mercado de Capitais', categoria: 'Mercado', ordem: 6, peso: 2 },
    { nome: 'Fundos de Investimento', categoria: 'Investimento', ordem: 7, peso: 2 },
    { nome: 'Títulos Públicos e Privados', categoria: 'Investimento', ordem: 8, peso: 2 },
    { nome: 'Prevenção à Lavagem de Dinheiro', categoria: 'Compliance', ordem: 9, peso: 3 },
    { nome: 'Autorregulação Bancária', categoria: 'Regulação', ordem: 10, peso: 2 }
  ],
  'Arquivologia': [
    { nome: 'Conceitos Fundamentais', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Princípios Arquivísticos', categoria: 'Princípios', ordem: 2, peso: 3 },
    { nome: 'Classificação de Documentos', categoria: 'Classificação', ordem: 3, peso: 3 },
    { nome: 'Protocolo e Controle', categoria: 'Protocolo', ordem: 4, peso: 2 },
    { nome: 'Gestão Documental', categoria: 'Gestão', ordem: 5, peso: 3 },
    { nome: 'Tabela de Temporalidade', categoria: 'Avaliação', ordem: 6, peso: 3 },
    { nome: 'Arquivos Correntes', categoria: 'Ciclo', ordem: 7, peso: 2 },
    { nome: 'Arquivos Intermediários', categoria: 'Ciclo', ordem: 8, peso: 2 },
    { nome: 'Arquivos Permanentes', categoria: 'Ciclo', ordem: 9, peso: 2 },
    { nome: 'Documentos Digitais', categoria: 'Digital', ordem: 10, peso: 3 }
  ],
  'Legislação do SUS': [
    { nome: 'Princípios do SUS', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Diretrizes do SUS', categoria: 'Fundamentos', ordem: 2, peso: 3 },
    { nome: 'Organização do SUS', categoria: 'Organização', ordem: 3, peso: 3 },
    { nome: 'Competências dos Entes', categoria: 'Competências', ordem: 4, peso: 2 },
    { nome: 'Participação Popular', categoria: 'Participação', ordem: 5, peso: 2 },
    { nome: 'Financiamento do SUS', categoria: 'Financiamento', ordem: 6, peso: 2 },
    { nome: 'Atenção Básica', categoria: 'Atenção', ordem: 7, peso: 3 },
    { nome: 'Vigilância em Saúde', categoria: 'Vigilância', ordem: 8, peso: 2 },
    { nome: 'Programas de Saúde', categoria: 'Programas', ordem: 9, peso: 2 },
    { nome: 'Políticas de Saúde', categoria: 'Políticas', ordem: 10, peso: 2 }
  ],
  
  // ============== 🆕 NOVAS DISCIPLINAS DO DATASET (82 TOTAL) ==============
  'Direito Eleitoral': [
    { nome: 'Código Eleitoral', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Direitos Políticos', categoria: 'Direitos', ordem: 2, peso: 3 },
    { nome: 'Partidos Políticos', categoria: 'Partidos', ordem: 3, peso: 2 },
    { nome: 'Alistamento e Elegibilidade', categoria: 'Elegibilidade', ordem: 4, peso: 3 },
    { nome: 'Inelegibilidades', categoria: 'Elegibilidade', ordem: 5, peso: 3 },
    { nome: 'Registro de Candidatura', categoria: 'Processo', ordem: 6, peso: 2 },
    { nome: 'Propaganda Eleitoral', categoria: 'Processo', ordem: 7, peso: 2 },
    { nome: 'Crimes Eleitorais', categoria: 'Penal', ordem: 8, peso: 2 },
    { nome: 'Justiça Eleitoral', categoria: 'Organização', ordem: 9, peso: 2 },
    { nome: 'Processo Eleitoral', categoria: 'Processo', ordem: 10, peso: 2 }
  ],
  'Direito do Trabalho': [
    { nome: 'Fontes do Direito do Trabalho', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Contrato de Trabalho', categoria: 'Contratos', ordem: 2, peso: 3 },
    { nome: 'Relação de Emprego', categoria: 'Relação', ordem: 3, peso: 3 },
    { nome: 'Direitos Trabalhistas', categoria: 'Direitos', ordem: 4, peso: 3 },
    { nome: 'Jornada de Trabalho', categoria: 'Jornada', ordem: 5, peso: 3 },
    { nome: 'Férias e Descanso', categoria: 'Direitos', ordem: 6, peso: 2 },
    { nome: 'Remuneração e Salário', categoria: 'Remuneração', ordem: 7, peso: 3 },
    { nome: 'FGTS', categoria: 'Verbas', ordem: 8, peso: 2 },
    { nome: 'Extinção do Contrato', categoria: 'Extinção', ordem: 9, peso: 3 },
    { nome: 'Estabilidades', categoria: 'Proteção', ordem: 10, peso: 2 }
  ],
  'Direito Processual do Trabalho': [
    { nome: 'Organização da Justiça do Trabalho', categoria: 'Organização', ordem: 1, peso: 2 },
    { nome: 'Competência Trabalhista', categoria: 'Competência', ordem: 2, peso: 3 },
    { nome: 'Reclamação Trabalhista', categoria: 'Procedimento', ordem: 3, peso: 3 },
    { nome: 'Provas no Processo Trabalhista', categoria: 'Provas', ordem: 4, peso: 2 },
    { nome: 'Audiência Trabalhista', categoria: 'Audiência', ordem: 5, peso: 3 },
    { nome: 'Recursos Trabalhistas', categoria: 'Recursos', ordem: 6, peso: 3 },
    { nome: 'Execução Trabalhista', categoria: 'Execução', ordem: 7, peso: 3 },
    { nome: 'Processo Sumaríssimo', categoria: 'Procedimentos', ordem: 8, peso: 2 },
    { nome: 'Dissídio Coletivo', categoria: 'Coletivo', ordem: 9, peso: 2 },
    { nome: 'Súmulas do TST', categoria: 'Jurisprudência', ordem: 10, peso: 3 }
  ],
  'Direito Urbanístico': [
    { nome: 'Estatuto da Cidade', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Política Urbana', categoria: 'Política', ordem: 2, peso: 3 },
    { nome: 'Plano Diretor', categoria: 'Planejamento', ordem: 3, peso: 3 },
    { nome: 'Parcelamento do Solo', categoria: 'Urbanização', ordem: 4, peso: 2 },
    { nome: 'Zoneamento', categoria: 'Ordenamento', ordem: 5, peso: 2 },
    { nome: 'Uso e Ocupação do Solo', categoria: 'Ordenamento', ordem: 6, peso: 2 },
    { nome: 'Instrumentos Urbanísticos', categoria: 'Instrumentos', ordem: 7, peso: 2 },
    { nome: 'Regularização Fundiária', categoria: 'Regularização', ordem: 8, peso: 2 },
    { nome: 'IPTU Progressivo', categoria: 'Tributação', ordem: 9, peso: 2 },
    { nome: 'Desapropriação Urbanística', categoria: 'Intervenção', ordem: 10, peso: 2 }
  ],
  'Direito Internacional Público': [
    { nome: 'Fontes do Direito Internacional', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Tratados Internacionais', categoria: 'Tratados', ordem: 2, peso: 3 },
    { nome: 'Sujeitos de Direito Internacional', categoria: 'Sujeitos', ordem: 3, peso: 2 },
    { nome: 'ONU e Organismos Internacionais', categoria: 'Organizações', ordem: 4, peso: 3 },
    { nome: 'Jurisdição Internacional', categoria: 'Jurisdição', ordem: 5, peso: 2 },
    { nome: 'Conflitos Armados', categoria: 'Conflitos', ordem: 6, peso: 2 },
    { nome: 'Direitos Humanos Internacionais', categoria: 'Direitos', ordem: 7, peso: 3 },
    { nome: 'Asilo e Refúgio', categoria: 'Proteção', ordem: 8, peso: 2 },
    { nome: 'Extradição', categoria: 'Cooperação', ordem: 9, peso: 2 },
    { nome: 'Responsabilidade Internacional', categoria: 'Responsabilidade', ordem: 10, peso: 2 }
  ],
  'Sociologia': [
    { nome: 'Clássicos da Sociologia', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Fato Social', categoria: 'Conceitos', ordem: 2, peso: 2 },
    { nome: 'Estratificação Social', categoria: 'Estrutura', ordem: 3, peso: 2 },
    { nome: 'Cultura e Sociedade', categoria: 'Cultura', ordem: 4, peso: 2 },
    { nome: 'Movimentos Sociais', categoria: 'Movimentos', ordem: 5, peso: 3 },
    { nome: 'Instituições Sociais', categoria: 'Instituições', ordem: 6, peso: 2 },
    { nome: 'Trabalho e Sociedade', categoria: 'Trabalho', ordem: 7, peso: 2 },
    { nome: 'Globalização', categoria: 'Contemporâneo', ordem: 8, peso: 2 },
    { nome: 'Ideologia', categoria: 'Conceitos', ordem: 9, peso: 2 },
    { nome: 'Sociologia Brasileira', categoria: 'Brasil', ordem: 10, peso: 2 }
  ],
  'Filosofia': [
    { nome: 'História da Filosofia', categoria: 'História', ordem: 1, peso: 2 },
    { nome: 'Filosofia Antiga', categoria: 'Períodos', ordem: 2, peso: 2 },
    { nome: 'Filosofia Medieval', categoria: 'Períodos', ordem: 3, peso: 2 },
    { nome: 'Filosofia Moderna', categoria: 'Períodos', ordem: 4, peso: 2 },
    { nome: 'Filosofia Contemporânea', categoria: 'Períodos', ordem: 5, peso: 2 },
    { nome: 'Ética e Moral', categoria: 'Ética', ordem: 6, peso: 3 },
    { nome: 'Epistemologia', categoria: 'Conhecimento', ordem: 7, peso: 2 },
    { nome: 'Lógica Filosófica', categoria: 'Lógica', ordem: 8, peso: 2 },
    { nome: 'Política e Sociedade', categoria: 'Política', ordem: 9, peso: 2 },
    { nome: 'Estética', categoria: 'Arte', ordem: 10, peso: 1 }
  ],
  'História do Brasil': [
    { nome: 'Brasil Colônia', categoria: 'Colonial', ordem: 1, peso: 3 },
    { nome: 'Independência do Brasil', categoria: 'Imperial', ordem: 2, peso: 3 },
    { nome: 'Primeiro Reinado', categoria: 'Imperial', ordem: 3, peso: 2 },
    { nome: 'Período Regencial', categoria: 'Imperial', ordem: 4, peso: 2 },
    { nome: 'Segundo Reinado', categoria: 'Imperial', ordem: 5, peso: 2 },
    { nome: 'Proclamação da República', categoria: 'República', ordem: 6, peso: 3 },
    { nome: 'Era Vargas', categoria: 'República', ordem: 7, peso: 3 },
    { nome: 'Ditadura Militar', categoria: 'República', ordem: 8, peso: 3 },
    { nome: 'Redemocratização', categoria: 'Contemporânea', ordem: 9, peso: 2 },
    { nome: 'Brasil Contemporâneo', categoria: 'Contemporânea', ordem: 10, peso: 2 }
  ],
  'Geografia': [
    { nome: 'Geografia Física', categoria: 'Física', ordem: 1, peso: 2 },
    { nome: 'Cartografia', categoria: 'Técnicas', ordem: 2, peso: 2 },
    { nome: 'Clima e Vegetação', categoria: 'Física', ordem: 3, peso: 2 },
    { nome: 'Relevo e Hidrografia', categoria: 'Física', ordem: 4, peso: 2 },
    { nome: 'Geografia Humana', categoria: 'Humana', ordem: 5, peso: 2 },
    { nome: 'População', categoria: 'Humana', ordem: 6, peso: 2 },
    { nome: 'Urbanização', categoria: 'Urbana', ordem: 7, peso: 2 },
    { nome: 'Geografia do Brasil', categoria: 'Brasil', ordem: 8, peso: 3 },
    { nome: 'Geografia Econômica', categoria: 'Economia', ordem: 9, peso: 2 },
    { nome: 'Geopolítica', categoria: 'Política', ordem: 10, peso: 2 }
  ],
  'Biologia': [
    { nome: 'Citologia', categoria: 'Célula', ordem: 1, peso: 2 },
    { nome: 'Bioquímica', categoria: 'Molecular', ordem: 2, peso: 2 },
    { nome: 'Genética', categoria: 'Hereditariedade', ordem: 3, peso: 3 },
    { nome: 'Evolução', categoria: 'Evolução', ordem: 4, peso: 2 },
    { nome: 'Ecologia', categoria: 'Ecologia', ordem: 5, peso: 3 },
    { nome: 'Fisiologia Humana', categoria: 'Humana', ordem: 6, peso: 2 },
    { nome: 'Botânica', categoria: 'Vegetal', ordem: 7, peso: 2 },
    { nome: 'Zoologia', categoria: 'Animal', ordem: 8, peso: 2 },
    { nome: 'Microbiologia', categoria: 'Microrganismos', ordem: 9, peso: 2 },
    { nome: 'Biotecnologia', categoria: 'Aplicada', ordem: 10, peso: 2 }
  ],
  'Física': [
    { nome: 'Mecânica', categoria: 'Clássica', ordem: 1, peso: 3 },
    { nome: 'Cinemática', categoria: 'Movimento', ordem: 2, peso: 3 },
    { nome: 'Dinâmica', categoria: 'Forças', ordem: 3, peso: 3 },
    { nome: 'Energia e Trabalho', categoria: 'Energia', ordem: 4, peso: 2 },
    { nome: 'Termodinâmica', categoria: 'Térmica', ordem: 5, peso: 2 },
    { nome: 'Óptica', categoria: 'Luz', ordem: 6, peso: 2 },
    { nome: 'Eletricidade', categoria: 'Elétrica', ordem: 7, peso: 3 },
    { nome: 'Magnetismo', categoria: 'Magnetismo', ordem: 8, peso: 2 },
    { nome: 'Ondulatória', categoria: 'Ondas', ordem: 9, peso: 2 },
    { nome: 'Física Moderna', categoria: 'Moderna', ordem: 10, peso: 2 }
  ],
  'Química': [
    { nome: 'Atomística', categoria: 'Geral', ordem: 1, peso: 2 },
    { nome: 'Tabela Periódica', categoria: 'Geral', ordem: 2, peso: 3 },
    { nome: 'Ligações Químicas', categoria: 'Geral', ordem: 3, peso: 3 },
    { nome: 'Funções Inorgânicas', categoria: 'Inorgânica', ordem: 4, peso: 2 },
    { nome: 'Reações Químicas', categoria: 'Geral', ordem: 5, peso: 3 },
    { nome: 'Estequiometria', categoria: 'Quantitativa', ordem: 6, peso: 2 },
    { nome: 'Soluções', categoria: 'Físico-Química', ordem: 7, peso: 2 },
    { nome: 'Termoquímica', categoria: 'Físico-Química', ordem: 8, peso: 2 },
    { nome: 'Química Orgânica', categoria: 'Orgânica', ordem: 9, peso: 3 },
    { nome: 'Equilíbrio Químico', categoria: 'Físico-Química', ordem: 10, peso: 2 }
  ],
  'Economia': [
    { nome: 'Introdução à Economia', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Microeconomia', categoria: 'Micro', ordem: 2, peso: 3 },
    { nome: 'Macroeconomia', categoria: 'Macro', ordem: 3, peso: 3 },
    { nome: 'Oferta e Demanda', categoria: 'Mercados', ordem: 4, peso: 3 },
    { nome: 'Estruturas de Mercado', categoria: 'Mercados', ordem: 5, peso: 2 },
    { nome: 'PIB e Contas Nacionais', categoria: 'Macro', ordem: 6, peso: 2 },
    { nome: 'Inflação', categoria: 'Macro', ordem: 7, peso: 3 },
    { nome: 'Política Monetária', categoria: 'Política', ordem: 8, peso: 2 },
    { nome: 'Política Fiscal', categoria: 'Política', ordem: 9, peso: 2 },
    { nome: 'Comércio Internacional', categoria: 'Internacional', ordem: 10, peso: 2 }
  ],
  'Psicologia': [
    { nome: 'Introdução à Psicologia', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Psicologia do Desenvolvimento', categoria: 'Desenvolvimento', ordem: 2, peso: 2 },
    { nome: 'Psicologia Social', categoria: 'Social', ordem: 3, peso: 2 },
    { nome: 'Psicologia Organizacional', categoria: 'Organizacional', ordem: 4, peso: 3 },
    { nome: 'Teorias da Personalidade', categoria: 'Personalidade', ordem: 5, peso: 2 },
    { nome: 'Psicopatologia', categoria: 'Clínica', ordem: 6, peso: 2 },
    { nome: 'Avaliação Psicológica', categoria: 'Técnicas', ordem: 7, peso: 2 },
    { nome: 'Psicologia da Aprendizagem', categoria: 'Educacional', ordem: 8, peso: 2 },
    { nome: 'Ética Profissional', categoria: 'Ética', ordem: 9, peso: 2 },
    { nome: 'Recrutamento e Seleção', categoria: 'RH', ordem: 10, peso: 3 }
  ],
  'Pedagogia': [
    { nome: 'História da Educação', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Filosofia da Educação', categoria: 'Fundamentos', ordem: 2, peso: 2 },
    { nome: 'Teorias da Aprendizagem', categoria: 'Aprendizagem', ordem: 3, peso: 3 },
    { nome: 'Didática', categoria: 'Prática', ordem: 4, peso: 3 },
    { nome: 'Currículo Escolar', categoria: 'Currículo', ordem: 5, peso: 2 },
    { nome: 'Avaliação Educacional', categoria: 'Avaliação', ordem: 6, peso: 3 },
    { nome: 'Gestão Escolar', categoria: 'Gestão', ordem: 7, peso: 2 },
    { nome: 'Educação Inclusiva', categoria: 'Inclusão', ordem: 8, peso: 2 },
    { nome: 'LDB - Lei de Diretrizes e Bases', categoria: 'Legislação', ordem: 9, peso: 3 },
    { nome: 'ECA na Educação', categoria: 'Legislação', ordem: 10, peso: 2 }
  ],
  'Políticas Públicas': [
    { nome: 'Conceitos de Políticas Públicas', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Ciclo de Políticas Públicas', categoria: 'Ciclo', ordem: 2, peso: 3 },
    { nome: 'Formulação de Políticas', categoria: 'Formulação', ordem: 3, peso: 2 },
    { nome: 'Implementação', categoria: 'Implementação', ordem: 4, peso: 2 },
    { nome: 'Avaliação de Políticas', categoria: 'Avaliação', ordem: 5, peso: 3 },
    { nome: 'Atores e Redes', categoria: 'Atores', ordem: 6, peso: 2 },
    { nome: 'Políticas Sociais', categoria: 'Setoriais', ordem: 7, peso: 2 },
    { nome: 'Políticas de Saúde', categoria: 'Setoriais', ordem: 8, peso: 2 },
    { nome: 'Políticas Educacionais', categoria: 'Setoriais', ordem: 9, peso: 2 },
    { nome: 'Participação Social', categoria: 'Participação', ordem: 10, peso: 2 }
  ],
  'Tecnologia da Informação': [
    { nome: 'Banco de Dados', categoria: 'Dados', ordem: 1, peso: 3 },
    { nome: 'SQL e NoSQL', categoria: 'Dados', ordem: 2, peso: 3 },
    { nome: 'Programação', categoria: 'Desenvolvimento', ordem: 3, peso: 2 },
    { nome: 'Estruturas de Dados', categoria: 'Algoritmos', ordem: 4, peso: 2 },
    { nome: 'Engenharia de Software', categoria: 'Desenvolvimento', ordem: 5, peso: 2 },
    { nome: 'Redes de Computadores', categoria: 'Redes', ordem: 6, peso: 2 },
    { nome: 'Segurança da Informação', categoria: 'Segurança', ordem: 7, peso: 3 },
    { nome: 'Cloud Computing', categoria: 'Infraestrutura', ordem: 8, peso: 2 },
    { nome: 'DevOps', categoria: 'Operações', ordem: 9, peso: 2 },
    { nome: 'Governança de TI', categoria: 'Governança', ordem: 10, peso: 3 }
  ],
  'Sistemas Operacionais': [
    { nome: 'Fundamentos de SO', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Gerenciamento de Processos', categoria: 'Processos', ordem: 2, peso: 3 },
    { nome: 'Gerenciamento de Memória', categoria: 'Memória', ordem: 3, peso: 2 },
    { nome: 'Sistema de Arquivos', categoria: 'Arquivos', ordem: 4, peso: 2 },
    { nome: 'Entrada e Saída', categoria: 'Hardware', ordem: 5, peso: 2 },
    { nome: 'Concorrência', categoria: 'Processos', ordem: 6, peso: 2 },
    { nome: 'Escalonamento', categoria: 'Processos', ordem: 7, peso: 2 },
    { nome: 'Linux', categoria: 'Prática', ordem: 8, peso: 3 },
    { nome: 'Windows', categoria: 'Prática', ordem: 9, peso: 2 },
    { nome: 'Virtualização', categoria: 'Avançado', ordem: 10, peso: 2 }
  ],
  'Análise de Sistemas': [
    { nome: 'Análise de Requisitos', categoria: 'Requisitos', ordem: 1, peso: 3 },
    { nome: 'Modelagem de Dados', categoria: 'Modelagem', ordem: 2, peso: 3 },
    { nome: 'UML', categoria: 'Modelagem', ordem: 3, peso: 2 },
    { nome: 'Casos de Uso', categoria: 'Requisitos', ordem: 4, peso: 2 },
    { nome: 'Diagrama de Classes', categoria: 'Modelagem', ordem: 5, peso: 2 },
    { nome: 'Projeto de Software', categoria: 'Projeto', ordem: 6, peso: 2 },
    { nome: 'Padrões de Projeto', categoria: 'Projeto', ordem: 7, peso: 2 },
    { nome: 'Teste de Software', categoria: 'Qualidade', ordem: 8, peso: 3 },
    { nome: 'Metodologias Ágeis', categoria: 'Gestão', ordem: 9, peso: 3 },
    { nome: 'SCRUM', categoria: 'Gestão', ordem: 10, peso: 2 }
  ],
  'Gestão de Projetos': [
    { nome: 'PMBoK', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Ciclo de Vida do Projeto', categoria: 'Fundamentos', ordem: 2, peso: 2 },
    { nome: 'Escopo', categoria: 'Áreas', ordem: 3, peso: 3 },
    { nome: 'Cronograma', categoria: 'Áreas', ordem: 4, peso: 3 },
    { nome: 'Custos', categoria: 'Áreas', ordem: 5, peso: 2 },
    { nome: 'Qualidade', categoria: 'Áreas', ordem: 6, peso: 2 },
    { nome: 'Riscos', categoria: 'Áreas', ordem: 7, peso: 3 },
    { nome: 'Recursos Humanos', categoria: 'Áreas', ordem: 8, peso: 2 },
    { nome: 'Comunicação', categoria: 'Áreas', ordem: 9, peso: 2 },
    { nome: 'Stakeholders', categoria: 'Áreas', ordem: 10, peso: 2 }
  ],
  'Logística': [
    { nome: 'Introdução à Logística', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Gestão de Estoques', categoria: 'Estoques', ordem: 2, peso: 3 },
    { nome: 'Armazenagem', categoria: 'Armazenagem', ordem: 3, peso: 2 },
    { nome: 'Transporte', categoria: 'Transporte', ordem: 4, peso: 3 },
    { nome: 'Distribuição', categoria: 'Distribuição', ordem: 5, peso: 2 },
    { nome: 'Supply Chain', categoria: 'Cadeia', ordem: 6, peso: 3 },
    { nome: 'Logística Reversa', categoria: 'Sustentabilidade', ordem: 7, peso: 2 },
    { nome: 'Custos Logísticos', categoria: 'Custos', ordem: 8, peso: 2 },
    { nome: 'Indicadores Logísticos', categoria: 'Gestão', ordem: 9, peso: 2 },
    { nome: 'Tecnologia na Logística', categoria: 'Tecnologia', ordem: 10, peso: 2 }
  ],
  'Gestão de Qualidade': [
    { nome: 'Fundamentos da Qualidade', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Ferramentas da Qualidade', categoria: 'Ferramentas', ordem: 2, peso: 3 },
    { nome: 'Controle Estatístico', categoria: 'Estatística', ordem: 3, peso: 2 },
    { nome: 'ISO 9001', categoria: 'Normas', ordem: 4, peso: 3 },
    { nome: 'Melhoria Contínua', categoria: 'Melhoria', ordem: 5, peso: 2 },
    { nome: 'Six Sigma', categoria: 'Metodologias', ordem: 6, peso: 2 },
    { nome: 'Kaizen', categoria: 'Metodologias', ordem: 7, peso: 2 },
    { nome: '5S', categoria: 'Ferramentas', ordem: 8, peso: 2 },
    { nome: 'Auditoria de Qualidade', categoria: 'Auditoria', ordem: 9, peso: 2 },
    { nome: 'Gestão de Não Conformidades', categoria: 'Gestão', ordem: 10, peso: 2 }
  ],
  'Direito Sanitário': [
    { nome: 'Fundamentos do Direito Sanitário', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Direito à Saúde', categoria: 'Direitos', ordem: 2, peso: 3 },
    { nome: 'Lei 8.080/90', categoria: 'Legislação', ordem: 3, peso: 3 },
    { nome: 'Lei 8.142/90', categoria: 'Legislação', ordem: 4, peso: 2 },
    { nome: 'Vigilância Sanitária', categoria: 'Vigilância', ordem: 5, peso: 3 },
    { nome: 'Anvisa', categoria: 'Órgãos', ordem: 6, peso: 2 },
    { nome: 'Regulação em Saúde', categoria: 'Regulação', ordem: 7, peso: 2 },
    { nome: 'Saúde Suplementar', categoria: 'Saúde Suplementar', ordem: 8, peso: 2 },
    { nome: 'ANS', categoria: 'Órgãos', ordem: 9, peso: 2 },
    { nome: 'Responsabilidade em Saúde', categoria: 'Responsabilidade', ordem: 10, peso: 2 }
  ],
  'Engenharia de Segurança do Trabalho': [
    { nome: 'NR-1 Disposições Gerais', categoria: 'NRs', ordem: 1, peso: 2 },
    { nome: 'NR-5 CIPA', categoria: 'NRs', ordem: 2, peso: 3 },
    { nome: 'NR-6 EPI', categoria: 'NRs', ordem: 3, peso: 3 },
    { nome: 'NR-7 PCMSO', categoria: 'NRs', ordem: 4, peso: 2 },
    { nome: 'NR-9 PPRA', categoria: 'NRs', ordem: 5, peso: 3 },
    { nome: 'NR-10 Eletricidade', categoria: 'NRs', ordem: 6, peso: 2 },
    { nome: 'NR-12 Máquinas e Equipamentos', categoria: 'NRs', ordem: 7, peso: 2 },
    { nome: 'NR-15 Insalubridade', categoria: 'NRs', ordem: 8, peso: 3 },
    { nome: 'NR-16 Periculosidade', categoria: 'NRs', ordem: 9, peso: 2 },
    { nome: 'Acidentes de Trabalho', categoria: 'Prevenção', ordem: 10, peso: 3 }
  ],
  'Metrologia': [
    { nome: 'Conceitos de Metrologia', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Sistema Internacional de Unidades', categoria: 'SI', ordem: 2, peso: 3 },
    { nome: 'Instrumentos de Medição', categoria: 'Instrumentos', ordem: 3, peso: 2 },
    { nome: 'Paquímetro', categoria: 'Instrumentos', ordem: 4, peso: 2 },
    { nome: 'Micrômetro', categoria: 'Instrumentos', ordem: 5, peso: 2 },
    { nome: 'Calibração', categoria: 'Calibração', ordem: 6, peso: 3 },
    { nome: 'Incerteza de Medição', categoria: 'Análise', ordem: 7, peso: 2 },
    { nome: 'Tolerâncias e Ajustes', categoria: 'Especificação', ordem: 8, peso: 2 },
    { nome: 'Inmetro', categoria: 'Órgãos', ordem: 9, peso: 2 },
    { nome: 'Normas ISO de Metrologia', categoria: 'Normas', ordem: 10, peso: 2 }
  ],
  'Gestão Ambiental': [
    { nome: 'Introdução à Gestão Ambiental', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Política Nacional do Meio Ambiente', categoria: 'Legislação', ordem: 2, peso: 3 },
    { nome: 'Licenciamento Ambiental', categoria: 'Instrumentos', ordem: 3, peso: 3 },
    { nome: 'Estudo de Impacto Ambiental', categoria: 'Avaliação', ordem: 4, peso: 2 },
    { nome: 'ISO 14001', categoria: 'Normas', ordem: 5, peso: 3 },
    { nome: 'Recursos Hídricos', categoria: 'Recursos', ordem: 6, peso: 2 },
    { nome: 'Resíduos Sólidos', categoria: 'Resíduos', ordem: 7, peso: 2 },
    { nome: 'Mudanças Climáticas', categoria: 'Clima', ordem: 8, peso: 2 },
    { nome: 'Desenvolvimento Sustentável', categoria: 'Sustentabilidade', ordem: 9, peso: 2 },
    { nome: 'Educação Ambiental', categoria: 'Educação', ordem: 10, peso: 2 }
  ],
  'Agricultura': [
    { nome: 'Solos', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Climatologia Agrícola', categoria: 'Clima', ordem: 2, peso: 2 },
    { nome: 'Culturas Anuais', categoria: 'Culturas', ordem: 3, peso: 2 },
    { nome: 'Culturas Perenes', categoria: 'Culturas', ordem: 4, peso: 2 },
    { nome: 'Fertilização', categoria: 'Manejo', ordem: 5, peso: 2 },
    { nome: 'Irrigação e Drenagem', categoria: 'Água', ordem: 6, peso: 2 },
    { nome: 'Fitossanidade', categoria: 'Proteção', ordem: 7, peso: 3 },
    { nome: 'Mecanização Agrícola', categoria: 'Tecnologia', ordem: 8, peso: 2 },
    { nome: 'Agronegócio', categoria: 'Economia', ordem: 9, peso: 2 },
    { nome: 'Agricultura Sustentável', categoria: 'Sustentabilidade', ordem: 10, peso: 2 }
  ],
  'Zootecnia': [
    { nome: 'Nutrição Animal', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Reprodução Animal', categoria: 'Reprodução', ordem: 2, peso: 2 },
    { nome: 'Genética Animal', categoria: 'Genética', ordem: 3, peso: 2 },
    { nome: 'Bovinocultura de Leite', categoria: 'Bovinos', ordem: 4, peso: 2 },
    { nome: 'Bovinocultura de Corte', categoria: 'Bovinos', ordem: 5, peso: 2 },
    { nome: 'Suinocultura', categoria: 'Suínos', ordem: 6, peso: 2 },
    { nome: 'Avicultura', categoria: 'Aves', ordem: 7, peso: 2 },
    { nome: 'Pastagens', categoria: 'Forrageiras', ordem: 8, peso: 2 },
    { nome: 'Sanidade Animal', categoria: 'Sanidade', ordem: 9, peso: 3 },
    { nome: 'Bem-estar Animal', categoria: 'Ética', ordem: 10, peso: 2 }
  ],
  'Medicina Veterinária': [
    { nome: 'Anatomia Veterinária', categoria: 'Básicas', ordem: 1, peso: 2 },
    { nome: 'Fisiologia Veterinária', categoria: 'Básicas', ordem: 2, peso: 2 },
    { nome: 'Patologia Veterinária', categoria: 'Patologia', ordem: 3, peso: 3 },
    { nome: 'Clínica Veterinária', categoria: 'Clínica', ordem: 4, peso: 3 },
    { nome: 'Cirurgia Veterinária', categoria: 'Cirurgia', ordem: 5, peso: 2 },
    { nome: 'Doenças Infecciosas', categoria: 'Doenças', ordem: 6, peso: 3 },
    { nome: 'Parasitologia Veterinária', categoria: 'Parasitologia', ordem: 7, peso: 2 },
    { nome: 'Farmacologia Veterinária', categoria: 'Farmacologia', ordem: 8, peso: 2 },
    { nome: 'Inspeção Sanitária', categoria: 'Saúde Pública', ordem: 9, peso: 2 },
    { nome: 'Defesa Sanitária', categoria: 'Saúde Pública', ordem: 10, peso: 2 }
  ],
  'Enfermagem': [
    { nome: 'Fundamentos de Enfermagem', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Semiologia', categoria: 'Semiologia', ordem: 2, peso: 3 },
    { nome: 'Processo de Enfermagem', categoria: 'Processo', ordem: 3, peso: 2 },
    { nome: 'Administração em Enfermagem', categoria: 'Gestão', ordem: 4, peso: 2 },
    { nome: 'Enfermagem Clínica', categoria: 'Clínica', ordem: 5, peso: 3 },
    { nome: 'Enfermagem Cirúrgica', categoria: 'Cirúrgica', ordem: 6, peso: 2 },
    { nome: 'Urgência e Emergência', categoria: 'Emergência', ordem: 7, peso: 3 },
    { nome: 'Saúde Coletiva', categoria: 'Coletiva', ordem: 8, peso: 2 },
    { nome: 'Enfermagem Obstétrica', categoria: 'Obstétrica', ordem: 9, peso: 2 },
    { nome: 'Ética em Enfermagem', categoria: 'Ética', ordem: 10, peso: 2 }
  ],
  'Fisioterapia': [
    { nome: 'Anatomia do Movimento', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Cinesiologia', categoria: 'Fundamentos', ordem: 2, peso: 3 },
    { nome: 'Avaliação Fisioterapêutica', categoria: 'Avaliação', ordem: 3, peso: 3 },
    { nome: 'Fisioterapia Ortopédica', categoria: 'Ortopedia', ordem: 4, peso: 3 },
    { nome: 'Fisioterapia Neurológica', categoria: 'Neurologia', ordem: 5, peso: 2 },
    { nome: 'Fisioterapia Respiratória', categoria: 'Respiratória', ordem: 6, peso: 3 },
    { nome: 'Fisioterapia Desportiva', categoria: 'Desportiva', ordem: 7, peso: 2 },
    { nome: 'Recursos Terapêuticos', categoria: 'Recursos', ordem: 8, peso: 2 },
    { nome: 'Eletroterapia', categoria: 'Recursos', ordem: 9, peso: 2 },
    { nome: 'Reabilitação', categoria: 'Reabilitação', ordem: 10, peso: 2 }
  ],
  'Odontologia': [
    { nome: 'Anatomia Dentária', categoria: 'Básicas', ordem: 1, peso: 2 },
    { nome: 'Histologia Oral', categoria: 'Básicas', ordem: 2, peso: 2 },
    { nome: 'Radiologia Odontológica', categoria: 'Diagnóstico', ordem: 3, peso: 2 },
    { nome: 'Dentística', categoria: 'Restauradora', ordem: 4, peso: 3 },
    { nome: 'Endodontia', categoria: 'Especialidades', ordem: 5, peso: 3 },
    { nome: 'Periodontia', categoria: 'Especialidades', ordem: 6, peso: 2 },
    { nome: 'Cirurgia Oral', categoria: 'Cirurgia', ordem: 7, peso: 2 },
    { nome: 'Prótese Dentária', categoria: 'Reabilitação', ordem: 8, peso: 2 },
    { nome: 'Ortodontia', categoria: 'Especialidades', ordem: 9, peso: 2 },
    { nome: 'Odontopediatria', categoria: 'Especialidades', ordem: 10, peso: 2 }
  ],
  'Nutrição': [
    { nome: 'Bioquímica da Nutrição', categoria: 'Básicas', ordem: 1, peso: 2 },
    { nome: 'Fisiologia da Nutrição', categoria: 'Básicas', ordem: 2, peso: 2 },
    { nome: 'Avaliação Nutricional', categoria: 'Avaliação', ordem: 3, peso: 3 },
    { nome: 'Dietoterapia', categoria: 'Clínica', ordem: 4, peso: 3 },
    { nome: 'Nutrição Clínica', categoria: 'Clínica', ordem: 5, peso: 3 },
    { nome: 'Nutrição Esportiva', categoria: 'Esportiva', ordem: 6, peso: 2 },
    { nome: 'Alimentação Coletiva', categoria: 'Coletiva', ordem: 7, peso: 2 },
    { nome: 'Segurança Alimentar', categoria: 'Saúde Pública', ordem: 8, peso: 2 },
    { nome: 'Tecnologia de Alimentos', categoria: 'Tecnologia', ordem: 9, peso: 2 },
    { nome: 'Nutrição Materno-Infantil', categoria: 'Materno-Infantil', ordem: 10, peso: 2 }
  ],
  'Farmácia': [
    { nome: 'Farmacologia Geral', categoria: 'Farmacologia', ordem: 1, peso: 3 },
    { nome: 'Farmacocinética', categoria: 'Farmacologia', ordem: 2, peso: 2 },
    { nome: 'Farmacotécnica', categoria: 'Tecnologia', ordem: 3, peso: 3 },
    { nome: 'Química Farmacêutica', categoria: 'Química', ordem: 4, peso: 2 },
    { nome: 'Controle de Qualidade', categoria: 'Qualidade', ordem: 5, peso: 2 },
    { nome: 'Farmácia Clínica', categoria: 'Clínica', ordem: 6, peso: 3 },
    { nome: 'Atenção Farmacêutica', categoria: 'Clínica', ordem: 7, peso: 2 },
    { nome: 'Farmácia Hospitalar', categoria: 'Hospitalar', ordem: 8, peso: 2 },
    { nome: 'Análises Clínicas', categoria: 'Análises', ordem: 9, peso: 2 },
    { nome: 'Legislação Farmacêutica', categoria: 'Legislação', ordem: 10, peso: 2 }
  ],
  'Serviço Social': [
    { nome: 'Fundamentos do Serviço Social', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Questão Social', categoria: 'Teoria', ordem: 2, peso: 3 },
    { nome: 'Políticas Sociais', categoria: 'Políticas', ordem: 3, peso: 3 },
    { nome: 'SUAS - Sistema Único de Assistência', categoria: 'SUAS', ordem: 4, peso: 3 },
    { nome: 'CRAS e CREAS', categoria: 'SUAS', ordem: 5, peso: 2 },
    { nome: 'Legislação da Assistência Social', categoria: 'Legislação', ordem: 6, peso: 2 },
    { nome: 'Instrumentos e Técnicas', categoria: 'Prática', ordem: 7, peso: 2 },
    { nome: 'Trabalho com Famílias', categoria: 'Intervenção', ordem: 8, peso: 2 },
    { nome: 'Direitos Sociais', categoria: 'Direitos', ordem: 9, peso: 2 },
    { nome: 'Ética Profissional', categoria: 'Ética', ordem: 10, peso: 2 }
  ],
  'Ciências Contábeis': [
    { nome: 'Teoria da Contabilidade', categoria: 'Teoria', ordem: 1, peso: 2 },
    { nome: 'Contabilidade Comercial', categoria: 'Comercial', ordem: 2, peso: 3 },
    { nome: 'Contabilidade de Custos', categoria: 'Custos', ordem: 3, peso: 3 },
    { nome: 'Contabilidade Gerencial', categoria: 'Gerencial', ordem: 4, peso: 2 },
    { nome: 'Contabilidade Tributária', categoria: 'Tributária', ordem: 5, peso: 3 },
    { nome: 'Perícia Contábil', categoria: 'Perícia', ordem: 6, peso: 2 },
    { nome: 'Controladoria', categoria: 'Controladoria', ordem: 7, peso: 2 },
    { nome: 'Normas Brasileiras de Contabilidade', categoria: 'Normas', ordem: 8, peso: 2 },
    { nome: 'Contabilidade Avançada', categoria: 'Avançada', ordem: 9, peso: 2 },
    { nome: 'Legislação Societária', categoria: 'Legislação', ordem: 10, peso: 2 }
  ],
  'Arquitetura e Urbanismo': [
    { nome: 'História da Arquitetura', categoria: 'História', ordem: 1, peso: 2 },
    { nome: 'Projeto Arquitetônico', categoria: 'Projeto', ordem: 3, peso: 3 },
    { nome: 'Desenho Técnico', categoria: 'Representação', ordem: 3, peso: 2 },
    { nome: 'Urbanismo', categoria: 'Urbanismo', ordem: 4, peso: 3 },
    { nome: 'Planejamento Urbano', categoria: 'Planejamento', ordem: 5, peso: 2 },
    { nome: 'Conforto Ambiental', categoria: 'Conforto', ordem: 6, peso: 2 },
    { nome: 'Estruturas', categoria: 'Técnicas', ordem: 7, peso: 2 },
    { nome: 'Instalações Prediais', categoria: 'Técnicas', ordem: 8, peso: 2 },
    { nome: 'Legislação Urbanística', categoria: 'Legislação', ordem: 9, peso: 2 },
    { nome: 'Sustentabilidade na Arquitetura', categoria: 'Sustentabilidade', ordem: 10, peso: 2 }
  ],
  'Engenharia Civil': [
    { nome: 'Mecânica dos Solos', categoria: 'Geotecnia', ordem: 1, peso: 2 },
    { nome: 'Fundações', categoria: 'Geotecnia', ordem: 2, peso: 2 },
    { nome: 'Resistência dos Materiais', categoria: 'Estruturas', ordem: 3, peso: 3 },
    { nome: 'Estruturas de Concreto', categoria: 'Estruturas', ordem: 4, peso: 3 },
    { nome: 'Estruturas de Aço', categoria: 'Estruturas', ordem: 5, peso: 2 },
    { nome: 'Instalações Hidráulicas', categoria: 'Instalações', ordem: 6, peso: 2 },
    { nome: 'Instalações Elétricas', categoria: 'Instalações', ordem: 7, peso: 2 },
    { nome: 'Construção Civil', categoria: 'Construção', ordem: 8, peso: 3 },
    { nome: 'Gerenciamento de Obras', categoria: 'Gestão', ordem: 9, peso: 2 },
    { nome: 'Orçamento e Custos', categoria: 'Gestão', ordem: 10, peso: 2 }
  ],
  'Engenharia Elétrica': [
    { nome: 'Circuitos Elétricos', categoria: 'Fundamentos', ordem: 1, peso: 3 },
    { nome: 'Eletromagnetismo', categoria: 'Fundamentos', ordem: 2, peso: 2 },
    { nome: 'Eletrônica Analógica', categoria: 'Eletrônica', ordem: 3, peso: 2 },
    { nome: 'Eletrônica Digital', categoria: 'Eletrônica', ordem: 4, peso: 3 },
    { nome: 'Máquinas Elétricas', categoria: 'Máquinas', ordem: 5, peso: 2 },
    { nome: 'Sistemas de Potência', categoria: 'Potência', ordem: 6, peso: 3 },
    { nome: 'Instalações Elétricas', categoria: 'Instalações', ordem: 7, peso: 2 },
    { nome: 'Controle e Automação', categoria: 'Automação', ordem: 8, peso: 2 },
    { nome: 'Telecomunicações', categoria: 'Telecomunicações', ordem: 9, peso: 2 },
    { nome: 'Eficiência Energética', categoria: 'Energia', ordem: 10, peso: 2 }
  ],
  'Engenharia Mecânica': [
    { nome: 'Termodinâmica', categoria: 'Térmica', ordem: 1, peso: 3 },
    { nome: 'Mecânica dos Fluidos', categoria: 'Fluidos', ordem: 2, peso: 2 },
    { nome: 'Transferência de Calor', categoria: 'Térmica', ordem: 3, peso: 2 },
    { nome: 'Elementos de Máquinas', categoria: 'Máquinas', ordem: 4, peso: 3 },
    { nome: 'Processos de Fabricação', categoria: 'Fabricação', ordem: 5, peso: 2 },
    { nome: 'Máquinas Térmicas', categoria: 'Térmica', ordem: 6, peso: 2 },
    { nome: 'Sistemas Hidráulicos', categoria: 'Hidráulica', ordem: 7, peso: 2 },
    { nome: 'Manutenção Industrial', categoria: 'Manutenção', ordem: 8, peso: 2 },
    { nome: 'Projetos Mecânicos', categoria: 'Projetos', ordem: 9, peso: 3 },
    { nome: 'Automação Industrial', categoria: 'Automação', ordem: 10, peso: 2 }
  ],
  'Direito Internacional Privado': [
    { nome: 'Fontes do DIP', categoria: 'Fundamentos', ordem: 1, peso: 2 },
    { nome: 'Conflito de Leis', categoria: 'Conflitos', ordem: 2, peso: 3 },
    { nome: 'Nacionalidade', categoria: 'Nacionalidade', ordem: 3, peso: 2 },
    { nome: 'Domicílio Internacional', categoria: 'Domicílio', ordem: 4, peso: 2 },
    { nome: 'Contratos Internacionais', categoria: 'Obrigações', ordem: 5, peso: 3 },
    { nome: 'Arbitragem Internacional', categoria: 'Solução de Conflitos', ordem: 6, peso: 2 },
    { nome: 'Reconhecimento de Sentenças', categoria: 'Cooperação', ordem: 7, peso: 2 },
    { nome: 'Família Internacional', categoria: 'Família', ordem: 8, peso: 2 },
    { nome: 'Sucessões Internacionais', categoria: 'Sucessões', ordem: 9, peso: 2 },
    { nome: 'Comércio Internacional', categoria: 'Comércio', ordem: 10, peso: 2 }
  ]
}

// ============== ROTAS DE ENTREVISTA ==============
app.post('/api/interviews', async (c) => {
  const { DB } = c.env
  const data = await c.req.json()

  try {
    // Validar que há disciplinas
    if (!data.disciplinas || data.disciplinas.length === 0) {
      return c.json({ 
        error: 'Você precisa selecionar pelo menos uma disciplina para continuar',
        code: 'NO_DISCIPLINES'
      }, 400)
    }

    // Validar que o usuário existe
    const userExists = await DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(data.user_id)
      .first()
    
    if (!userExists) {
      return c.json({ 
        error: 'Usuário não encontrado. Faça login novamente.',
        code: 'USER_NOT_FOUND'
      }, 404)
    }

    // Inserir entrevista
    // ✅ NOVO: Incluir banca_organizadora e bancas_preferidas
    const bancaOrganizadora = data.banca_organizadora || null
    const bancasPreferidas = data.bancas_preferidas ? JSON.stringify(data.bancas_preferidas) : null
    
    console.log('🏛️ Banca organizadora:', bancaOrganizadora)
    console.log('🏛️ Bancas preferidas:', bancasPreferidas)
    
    const interview = await DB.prepare(`
      INSERT INTO interviews (
        user_id, objetivo_tipo, concurso_nome, cargo, area_geral,
        tempo_disponivel_dia, experiencia, ja_estudou_antes,
        prazo_prova, reprovacoes, concursos_prestados, experiencias_detalhadas, peso_prova, dias_semana,
        banca_organizadora, bancas_preferidas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.user_id,
      data.objetivo_tipo,
      data.concurso_nome || null,
      data.cargo || null,
      data.area_geral || null,
      data.tempo_disponivel_dia,
      data.experiencia,
      data.ja_estudou_antes ? 1 : 0,
      data.prazo_prova || null,
      data.reprovacoes || data.concursos_prestados || 0,
      data.concursos_prestados || 0,
      data.experiencias_detalhadas || null,
      data.peso_prova || null,
      JSON.stringify(data.dias_semana || [1, 2, 3, 4, 5]),
      bancaOrganizadora,
      bancasPreferidas
    ).run()

    const interview_id = interview.meta.last_row_id

    // 🆕 PROCESSAR DISCIPLINAS PERSONALIZADAS (criar no banco se não existem)
    if (data.disciplinasCustom && data.disciplinasCustom.length > 0) {
      console.log(`📚 Processando ${data.disciplinasCustom.length} disciplinas personalizadas...`)
      
      for (const disc of data.disciplinasCustom) {
        // Verificar se disciplina já existe
        const existe = await DB.prepare(`
          SELECT id FROM disciplinas WHERE nome = ? AND area = ?
        `).bind(disc.nome, disc.area).first()
        
        if (!existe) {
          // Criar nova disciplina personalizada
          const result = await DB.prepare(`
            INSERT INTO disciplinas (nome, area, descricao)
            VALUES (?, ?, ?)
          `).bind(
            disc.nome, 
            disc.area,
            'Disciplina personalizada criada pelo usuário'
          ).run()
          
          disc.disciplina_id = result.meta.last_row_id
          console.log(`✅ Disciplina "${disc.nome}" criada com ID ${disc.disciplina_id}`)
        } else {
          disc.disciplina_id = existe.id
          console.log(`ℹ️ Disciplina "${disc.nome}" já existia (ID ${disc.disciplina_id})`)
        }
        
        // Adicionar à lista de disciplinas padrão para processar junto
        data.disciplinas.push({
          disciplina_id: disc.disciplina_id,
          ja_estudou: disc.ja_estudou || false,
          nivel_atual: disc.nivel_atual || 0,
          dificuldade: disc.dificuldade || false
        })
      }
    }

    // 🆕 LIMPAR disciplinas antigas do usuário APENAS se não houver plano ativo
    // (se houver plano ativo, as disciplinas serão atualizadas via upsert)
    const { results: planosAtivos } = await DB.prepare(
      'SELECT id FROM planos_estudo WHERE user_id = ? AND ativo = 1'
    ).bind(data.user_id).all()
    
    if (planosAtivos.length === 0) {
      console.log(`🗑️ Limpando disciplinas antigas do usuário ${data.user_id} (sem plano ativo)...`)
      await DB.prepare('DELETE FROM user_disciplinas WHERE user_id = ?').bind(data.user_id).run()
      console.log('✅ Disciplinas antigas removidas')
    } else {
      console.log('ℹ️ Usuário possui plano ativo - disciplinas serão atualizadas via upsert')
    }
    
    // Inserir as NOVAS disciplinas do usuário (padrão + personalizadas)
    if (data.disciplinas && data.disciplinas.length > 0) {
      console.log(`📚 Processando ${data.disciplinas.length} disciplinas (insert ou update)...`)
      console.log(`📋 Disciplinas recebidas:`, data.disciplinas.map(d => d.disciplina_id || d.nome).join(', '))
      for (const disc of data.disciplinas) {
        // ✅ VALIDAÇÃO: Verificar se disciplina_id existe
        if (!disc.disciplina_id) {
          console.error(`❌ ERRO: disciplina sem ID:`, disc)
          continue // Pular esta disciplina
        }

        // ✅ VALIDAÇÃO: Verificar se disciplina existe no banco
        const discExists = await DB.prepare('SELECT id FROM disciplinas WHERE id = ?')
          .bind(disc.disciplina_id)
          .first()
        
        if (!discExists) {
          console.error(`❌ ERRO: disciplina_id ${disc.disciplina_id} não existe na tabela disciplinas`)
          continue // Pular esta disciplina
        }

        await DB.prepare(`
          INSERT INTO user_disciplinas (
            user_id, disciplina_id, ja_estudou, nivel_atual, dificuldade, peso, nivel_dominio, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, disciplina_id) DO UPDATE SET
            ja_estudou = excluded.ja_estudou,
            nivel_atual = excluded.nivel_atual,
            dificuldade = excluded.dificuldade,
            peso = excluded.peso,
            nivel_dominio = excluded.nivel_dominio,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          data.user_id,
          disc.disciplina_id,
          disc.ja_estudou ? 1 : 0,
          disc.nivel_atual || 0,
          disc.dificuldade ? 1 : 0,
          disc.peso || null,
          disc.nivel_dominio || 0  // ✅ NOVO: Nível de domínio 0-10
        ).run()
        
        // Popular tópicos do edital para essa disciplina
        await popularTopicosEdital(DB, disc.disciplina_id)
      }
      console.log(`✅ ${data.disciplinas.length} disciplinas inseridas com sucesso`)
    }

    // Gerar diagnóstico
    const diagnostico = await gerarDiagnostico(DB, data.user_id, interview_id)

    // 🆕 CRIAR PLANO AUTOMATICAMENTE
    try {
      console.log('🎯 Criando plano automaticamente para entrevista', interview_id)
      
      // ✅ LIMITE: Verificar se usuário já tem 3 planos
      const { results: planosExistentes } = await DB.prepare(`
        SELECT id, nome FROM planos_estudo WHERE user_id = ?
      `).bind(data.user_id).all()
      
      const MAX_PLANOS = 3
      
      // ✅ NOVO: Verificar se já existe plano com o mesmo nome
      const nomePlanoAuto = `Plano ${data.concurso_nome || data.area_geral || 'Novo'}`
      const planoExistenteAuto = await DB.prepare(`
        SELECT id, nome FROM planos_estudo WHERE user_id = ? AND nome = ?
      `).bind(data.user_id, nomePlanoAuto).first() as any
      
      // Se o plano com mesmo nome já existe, vamos substituí-lo (não conta como novo)
      // Se não existe e já tem 3 planos, bloquear
      if (!planoExistenteAuto && planosExistentes.length >= MAX_PLANOS) {
        console.log(`⚠️ Usuário ${data.user_id} já atingiu o limite de ${MAX_PLANOS} planos`)
        return c.json({
          success: true,
          interview: { id: interview_id },
          diagnostico,
          warning: `Limite de ${MAX_PLANOS} planos de estudo atingido. Exclua um plano existente para criar um novo.`,
          limitReached: true,
          maxPlanos: MAX_PLANOS,
          planosAtuais: planosExistentes.length
        }, 200)
      }
      
      if (planoExistenteAuto) {
        console.log(`🔄 Plano "${nomePlanoAuto}" já existe (ID ${planoExistenteAuto.id}). Substituindo...`)
        
        // Deletar dados relacionados ao plano antigo
        await DB.prepare('DELETE FROM metas_diarias WHERE plano_id = ?').bind(planoExistenteAuto.id).run()
        await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id = ?').bind(planoExistenteAuto.id).run()
        await DB.prepare('DELETE FROM semanas_estudo WHERE plano_id = ?').bind(planoExistenteAuto.id).run()
        await DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(planoExistenteAuto.id).run()
        
        console.log(`✅ Plano antigo ${planoExistenteAuto.id} removido`)
      }
      
      // Buscar APENAS as disciplinas desta entrevista (não todas do usuário)
      const disciplinaIds = data.disciplinas.map(d => d.disciplina_id).filter(id => id) // Remover nulls/undefined
      
      if (disciplinaIds.length === 0) {
        throw new Error('Nenhuma disciplina válida foi selecionada')
      }
      
      console.log(`📋 IDs de disciplinas selecionadas (${disciplinaIds.length}):`, disciplinaIds.join(', '))
      
      const placeholders = disciplinaIds.map(() => '?').join(',')
      
      const { results: userDisciplinas } = await DB.prepare(`
        SELECT ud.*, d.nome, d.area 
        FROM user_disciplinas ud
        JOIN disciplinas d ON ud.disciplina_id = d.id
        WHERE ud.user_id = ? AND ud.disciplina_id IN (${placeholders})
      `).bind(data.user_id, ...disciplinaIds).all()
      
      console.log(`📊 Disciplinas encontradas no banco (${userDisciplinas.length}):`, userDisciplinas.map(d => `${d.nome} (ID: ${d.disciplina_id})`).join(', '))
      
      // ✅ VALIDAÇÃO EXTRA: Garantir que userDisciplinas só tem as disciplinas selecionadas
      const disciplinasValidadas = userDisciplinas.filter(d => disciplinaIds.includes(d.disciplina_id))
      console.log(`✅ Disciplinas validadas para o plano (${disciplinasValidadas.length}):`, disciplinasValidadas.map(d => d.nome).join(', '))
      
      // Buscar entrevista completa
      const interview = await DB.prepare('SELECT * FROM interviews WHERE id = ?').bind(interview_id).first()
      
      // Gerar diagnóstico completo e mapa de prioridades (usar disciplinas validadas)
      const diagnosticoCompleto = gerarDiagnosticoCompleto(interview, disciplinasValidadas)
      const mapaPrioridades = gerarMapaPrioridades(disciplinasValidadas)
      
      // Desativar planos antigos
      await DB.prepare('UPDATE planos_estudo SET ativo = 0 WHERE user_id = ?').bind(data.user_id).run()
      
      // Criar novo plano (com data_prova se fornecida)
      const planoResult = await DB.prepare(`
        INSERT INTO planos_estudo (
          user_id, interview_id, diagnostico, mapa_prioridades, ativo, nome, data_prova
        ) VALUES (?, ?, ?, ?, 1, ?, ?)
      `).bind(
        data.user_id,
        interview_id,
        JSON.stringify(diagnosticoCompleto),
        JSON.stringify(mapaPrioridades),
        nomePlanoAuto,  // ✅ Usa a variável já definida
        data.prazo_prova || null  // ✅ NOVO: Salvar data da prova
      ).run()
      
      const plano_id = planoResult.meta.last_row_id
      console.log(`✅ Plano ${plano_id} criado com sucesso!`)
      
      // Gerar ciclos de estudo (usar disciplinas validadas)
      await gerarCiclosEstudo(DB, plano_id, disciplinasValidadas, interview.tempo_disponivel_dia)
      console.log('✅ Ciclos de estudo gerados!')
      
      return c.json({ 
        interview_id,
        plano_id,
        diagnostico,
        message: 'Entrevista e plano criados com sucesso!'
      })
    } catch (planError) {
      console.error('❌ Erro ao criar plano automático:', planError)
      // Retorna a entrevista mesmo se o plano falhar
      return c.json({ 
        interview_id, 
        diagnostico,
        warning: 'Entrevista criada, mas houve erro ao criar o plano. Use POST /api/planos para criar manualmente.'
      })
    }
  } catch (error) {
    console.error('Erro ao salvar entrevista:', error)
    return c.json({ error: 'Erro ao salvar entrevista' }, 500)
  }
})

app.get('/api/interviews/user/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const { results } = await DB.prepare(
    'SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user_id).all()

  return c.json(results)
})

// ✅ NOVO: Buscar entrevista por ID
app.get('/api/interviews/:interview_id', async (c) => {
  const { DB } = c.env
  const interview_id = c.req.param('interview_id')

  const interview = await DB.prepare(
    'SELECT * FROM interviews WHERE id = ?'
  ).bind(interview_id).first()

  if (!interview) {
    return c.json({ error: 'Entrevista não encontrada' }, 404)
  }

  return c.json(interview)
})

// ============== ROTAS DE PLANO DE ESTUDOS ==============
const MAX_PLANOS_POR_USUARIO = 3

app.post('/api/planos', async (c) => {
  const { DB } = c.env
  const { user_id, interview_id, substituir_existente } = await c.req.json()

  try {
    // Buscar dados da entrevista
    const interview = await DB.prepare(
      'SELECT * FROM interviews WHERE id = ?'
    ).bind(interview_id).first() as any

    if (!interview) {
      return c.json({ error: 'Entrevista não encontrada' }, 404)
    }

    // ✅ NOVO: Verificar se já existe plano com o mesmo nome
    const nomePlano = `Plano ${interview.concurso_nome || interview.area_geral || 'Novo'}`
    const planoExistente = await DB.prepare(`
      SELECT id, nome, ativo, created_at 
      FROM planos_estudo 
      WHERE user_id = ? AND nome = ?
    `).bind(user_id, nomePlano).first() as any
    
    // ✅ LIMITE: Verificar quantidade de planos do usuário
    const { results: todosPlanosUsuario } = await DB.prepare(`
      SELECT id, nome FROM planos_estudo WHERE user_id = ?
    `).bind(user_id).all()
    
    // Se não é substituição e já tem 3+ planos, bloquear
    if (!planoExistente && todosPlanosUsuario.length >= MAX_PLANOS_POR_USUARIO) {
      return c.json({
        error: 'LIMITE_PLANOS_ATINGIDO',
        message: `Você atingiu o limite de ${MAX_PLANOS_POR_USUARIO} planos de estudo.`,
        limite: MAX_PLANOS_POR_USUARIO,
        planosAtuais: todosPlanosUsuario.length,
        planos: todosPlanosUsuario.map(p => ({ id: p.id, nome: p.nome })),
        dica: 'Exclua um plano existente para criar um novo.'
      }, 403)
    }

    if (planoExistente && !substituir_existente) {
      // Plano já existe - perguntar se quer substituir
      return c.json({
        error: 'PLANO_EXISTENTE',
        message: `Já existe um plano "${nomePlano}" em andamento.`,
        plano_existente: {
          id: planoExistente.id,
          nome: planoExistente.nome,
          ativo: planoExistente.ativo,
          created_at: planoExistente.created_at
        },
        pergunta: 'Deseja substituir o plano existente?'
      }, 409) // 409 Conflict
    }

    // Se substituir_existente = true, deletar o plano antigo e dados relacionados
    if (planoExistente && substituir_existente) {
      console.log(`🔄 Substituindo plano existente ID ${planoExistente.id}: ${nomePlano}`)
      
      // Deletar dados relacionados ao plano antigo
      await DB.prepare('DELETE FROM metas_diarias WHERE plano_id = ?').bind(planoExistente.id).run()
      await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id = ?').bind(planoExistente.id).run()
      await DB.prepare('DELETE FROM semanas_estudo WHERE plano_id = ?').bind(planoExistente.id).run()
      await DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(planoExistente.id).run()
      
      console.log(`✅ Plano antigo ${planoExistente.id} removido com sucesso`)
    }

    // ✅ CORREÇÃO: Buscar APENAS disciplinas da entrevista específica
    const { results: disciplinasEntrevista } = await DB.prepare(`
      SELECT DISTINCT disciplina_id 
      FROM user_disciplinas 
      WHERE user_id = ?
      AND created_at >= (SELECT created_at FROM interviews WHERE id = ?)
    `).bind(user_id, interview_id).all()
    
    const disciplinaIds = disciplinasEntrevista.map(d => d.disciplina_id)
    
    if (disciplinaIds.length === 0) {
      return c.json({ error: 'Nenhuma disciplina encontrada para esta entrevista' }, 400)
    }
    
    console.log(`📋 POST /api/planos - IDs da entrevista ${interview_id}:`, disciplinaIds.join(', '))
    
    const placeholders = disciplinaIds.map(() => '?').join(',')
    
    // Buscar dados completos das disciplinas selecionadas
    const { results: userDisciplinas } = await DB.prepare(`
      SELECT ud.*, d.nome, d.area 
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      WHERE ud.user_id = ? AND ud.disciplina_id IN (${placeholders})
    `).bind(user_id, ...disciplinaIds).all()
    
    console.log(`📊 POST /api/planos - Disciplinas encontradas (${userDisciplinas.length}):`, userDisciplinas.map(d => d.nome).join(', '))

    // Gerar diagnóstico e plano
    const diagnostico = gerarDiagnosticoCompleto(interview, userDisciplinas)
    const mapaPrioridades = gerarMapaPrioridades(userDisciplinas)

    // 🆕 Desativar planos antigos
    await DB.prepare('UPDATE planos_estudo SET ativo = 0 WHERE user_id = ?').bind(user_id).run()
    
    // ✅ CORREÇÃO: Desativar semanas antigas ao criar novo plano
    await DB.prepare('UPDATE semanas_estudo SET status = ? WHERE user_id = ?').bind('inativa', user_id).run()
    console.log('✅ Semanas antigas desativadas para user_id:', user_id)

    // Salvar plano com nome automático (incluindo data_prova)
    const plano = await DB.prepare(`
      INSERT INTO planos_estudo (
        user_id, interview_id, diagnostico, mapa_prioridades, ativo, nome, data_prova
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(
      user_id,
      interview_id,
      JSON.stringify(diagnostico),
      JSON.stringify(mapaPrioridades),
      nomePlano,  // ✅ Usa a variável já definida
      interview.prazo_prova || null  // ✅ NOVO: Salvar data da prova
    ).run()

    const plano_id = plano.meta.last_row_id

    // Gerar ciclos de estudo
    await gerarCiclosEstudo(DB, plano_id, userDisciplinas, interview.tempo_disponivel_dia)

    return c.json({ 
      plano_id,
      diagnostico,
      mapa_prioridades: mapaPrioridades,
      message: 'Plano criado com sucesso!'
    })
  } catch (error) {
    console.error('Erro ao gerar plano:', error)
    return c.json({ error: 'Erro ao gerar plano de estudos' }, 500)
  }
})

// Contar planos do usuário e verificar limite
app.get('/api/planos/count/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  try {
    const { results: planos } = await DB.prepare(`
      SELECT id, nome, ativo, created_at FROM planos_estudo WHERE user_id = ?
    `).bind(user_id).all()
    
    return c.json({
      total: planos.length,
      limite: MAX_PLANOS_POR_USUARIO,
      podecriarNovo: planos.length < MAX_PLANOS_POR_USUARIO,
      restante: Math.max(0, MAX_PLANOS_POR_USUARIO - planos.length),
      planos: planos.map(p => ({
        id: p.id,
        nome: p.nome,
        ativo: p.ativo === 1,
        created_at: p.created_at
      }))
    })
  } catch (error) {
    console.error('Erro ao contar planos:', error)
    return c.json({ error: 'Erro ao contar planos' }, 500)
  }
})

// Listar TODOS os planos do usuário (ativos e inativos)
app.get('/api/planos/list/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const { results: planos } = await DB.prepare(`
    SELECT 
      p.*,
      i.objetivo_tipo,
      i.concurso_nome,
      i.area_geral,
      i.tempo_disponivel_dia,
      COUNT(DISTINCT ce.disciplina_id) as total_disciplinas,
      COUNT(DISTINCT md.id) as total_metas,
      SUM(CASE WHEN md.concluida = 1 THEN 1 ELSE 0 END) as metas_concluidas
    FROM planos_estudo p
    LEFT JOIN interviews i ON p.interview_id = i.id
    LEFT JOIN ciclos_estudo ce ON p.id = ce.plano_id
    LEFT JOIN metas_diarias md ON p.id = md.plano_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).bind(user_id).all()

  return c.json(planos.map(p => ({
    ...p,
    diagnostico: p.diagnostico ? JSON.parse(p.diagnostico) : null,
    mapa_prioridades: p.mapa_prioridades ? JSON.parse(p.mapa_prioridades) : null
  })))
})

// Ativar um plano específico (desativa os outros)
app.post('/api/planos/:plano_id/ativar', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  
  try {
    // Buscar o plano
    const plano = await DB.prepare('SELECT * FROM planos_estudo WHERE id = ?').bind(plano_id).first() as any
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }
    
    // Desativar todos os planos do usuário
    await DB.prepare('UPDATE planos_estudo SET ativo = 0 WHERE user_id = ?').bind(plano.user_id).run()
    
    // ✅ NOVO: Desativar todas as semanas de outros planos (não do novo plano ativo)
    await DB.prepare(`
      UPDATE semanas_estudo 
      SET status = 'concluida' 
      WHERE user_id = ? AND plano_id != ? AND status = 'ativa'
    `).bind(plano.user_id, plano_id).run()
    console.log(`✅ Semanas de outros planos desativadas para user_id ${plano.user_id}`)
    
    // Ativar o plano selecionado
    await DB.prepare('UPDATE planos_estudo SET ativo = 1 WHERE id = ?').bind(plano_id).run()
    
    return c.json({ success: true, message: 'Plano ativado com sucesso' })
  } catch (error) {
    console.error('Erro ao ativar plano:', error)
    return c.json({ error: 'Erro ao ativar plano' }, 500)
  }
})

// ✅ NOVO: Atualizar data da prova do plano
app.put('/api/planos/:plano_id/data-prova', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  const { data_prova, user_id } = await c.req.json()
  
  try {
    // Verificar se o plano pertence ao usuário
    const plano = await DB.prepare('SELECT * FROM planos_estudo WHERE id = ? AND user_id = ?').bind(plano_id, user_id).first()
    if (!plano) {
      return c.json({ error: 'Plano não encontrado ou sem permissão' }, 404)
    }
    
    // Validar data (deve ser futura ou null para remover)
    if (data_prova) {
      const dataProva = new Date(data_prova)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      if (dataProva < hoje) {
        return c.json({ error: 'A data da prova deve ser futura' }, 400)
      }
    }
    
    // Atualizar data da prova
    await DB.prepare('UPDATE planos_estudo SET data_prova = ? WHERE id = ?')
      .bind(data_prova || null, plano_id).run()
    
    console.log(`✅ Data da prova atualizada para plano ${plano_id}: ${data_prova || 'removida'}`)
    
    return c.json({ 
      success: true, 
      message: data_prova ? `Data da prova definida para ${data_prova}` : 'Data da prova removida',
      data_prova: data_prova || null
    })
  } catch (error) {
    console.error('Erro ao atualizar data da prova:', error)
    return c.json({ error: 'Erro ao atualizar data da prova' }, 500)
  }
})

// Buscar plano ativo do usuário
app.get('/api/planos/user/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const plano = await DB.prepare(
    'SELECT * FROM planos_estudo WHERE user_id = ? AND ativo = 1 ORDER BY created_at DESC LIMIT 1'
  ).bind(user_id).first()

  if (!plano) {
    return c.json({ error: 'Nenhum plano ativo encontrado' }, 404)
  }

  // Buscar ciclos do plano
  const { results: ciclos } = await DB.prepare(`
    SELECT c.*, d.nome as disciplina_nome
    FROM ciclos_estudo c
    JOIN disciplinas d ON c.disciplina_id = d.id
    WHERE c.plano_id = ?
    ORDER BY c.dia_semana, c.ordem
  `).bind(plano.id).all()

  // 🆕 CORRIGIR total_disciplinas: contar disciplinas ÚNICAS do plano (através dos ciclos)
  const disciplinasUnicas = new Set(ciclos.map(c => c.disciplina_id))
  const diagnostico = JSON.parse(plano.diagnostico)
  diagnostico.total_disciplinas = disciplinasUnicas.size  // Atualizar com contagem real

  return c.json({
    ...plano,
    diagnostico: diagnostico,  // diagnostico corrigido
    mapa_prioridades: JSON.parse(plano.mapa_prioridades),
    ciclos
  })
})

// Endpoint: Buscar plano ativo (alias para /planos/user/:user_id)
app.get('/api/planos/ativo/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const plano = await DB.prepare(
    'SELECT * FROM planos_estudo WHERE user_id = ? AND ativo = 1 ORDER BY created_at DESC LIMIT 1'
  ).bind(user_id).first()

  if (!plano) {
    return c.json({ error: 'Nenhum plano ativo encontrado' }, 404)
  }

  // Buscar ciclos do plano
  const { results: ciclos } = await DB.prepare(`
    SELECT c.*, d.nome as disciplina_nome
    FROM ciclos_estudo c
    JOIN disciplinas d ON c.disciplina_id = d.id
    WHERE c.plano_id = ?
    ORDER BY c.dia_semana, c.ordem
  `).bind(plano.id).all()

  const disciplinasUnicas = new Set(ciclos.map(c => c.disciplina_id))
  const diagnostico = JSON.parse(plano.diagnostico)
  diagnostico.total_disciplinas = disciplinasUnicas.size

  return c.json({
    ...plano,
    diagnostico: diagnostico,
    mapa_prioridades: JSON.parse(plano.mapa_prioridades),
    ciclos
  })
})

// ============== ANÁLISE DE VIABILIDADE DO PLANO ==============
// Calcula se o tempo disponível é suficiente para o conteúdo considerando peso e domínio
app.get('/api/planos/:plano_id/analise-viabilidade', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')

  try {
    // Buscar plano com data da prova
    const plano = await DB.prepare(`
      SELECT p.*, i.tempo_disponivel_dia 
      FROM planos_estudo p
      JOIN interviews i ON p.interview_id = i.id
      WHERE p.id = ?
    `).bind(plano_id).first() as any

    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }

    // Buscar disciplinas do plano com nível de domínio
    const { results: disciplinas } = await DB.prepare(`
      SELECT 
        ud.disciplina_id,
        ud.nivel_dominio,
        ud.peso,
        d.nome as disciplina_nome,
        (SELECT COUNT(*) FROM topicos_edital te WHERE te.disciplina_id = ud.disciplina_id AND te.user_id = ud.user_id) as total_topicos
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      WHERE ud.user_id = ?
    `).bind(plano.user_id).all() as any[]

    // Calcular métricas
    const tempoDisponivel = plano.tempo_disponivel_dia || 120 // minutos por dia
    const dataProva = plano.data_prova ? new Date(plano.data_prova + 'T00:00:00') : null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    // Dias até a prova
    let diasRestantes = 0
    if (dataProva) {
      const diffTime = dataProva.getTime() - hoje.getTime()
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Calcular carga de estudo necessária
    // Fórmula: Para cada disciplina, horas = (10 - domínio) * peso * fator_base * total_topicos
    // Onde fator_base = 2 horas por ponto de "déficit" por tópico
    const MINUTOS_POR_TOPICO_BASE = 30 // 30 min base por tópico
    
    let cargaTotalMinutos = 0
    let cargaPorDisciplina: any[] = []
    
    for (const disc of disciplinas) {
      const dominio = disc.nivel_dominio || 0
      const peso = disc.peso || 1
      const topicos = disc.total_topicos || 5 // mínimo 5 tópicos se não tiver
      
      // Déficit = quanto falta dominar (10 - domínio atual)
      const deficit = 10 - dominio
      
      // Carga = déficit * peso * topicos * tempo_base / 10
      // Disciplina com domínio 0, peso 3 e 10 tópicos = muito tempo
      // Disciplina com domínio 8, peso 1 e 10 tópicos = pouco tempo
      const minutosNecessarios = Math.round((deficit / 10) * peso * topicos * MINUTOS_POR_TOPICO_BASE)
      
      cargaTotalMinutos += minutosNecessarios
      cargaPorDisciplina.push({
        disciplina_id: disc.disciplina_id,
        nome: disc.disciplina_nome,
        dominio,
        peso,
        topicos,
        minutos_necessarios: minutosNecessarios,
        horas_necessarias: Math.round(minutosNecessarios / 60 * 10) / 10,
        prioridade: deficit * peso // Maior déficit * maior peso = maior prioridade
      })
    }

    // Ordenar por prioridade (maior primeiro)
    cargaPorDisciplina.sort((a, b) => b.prioridade - a.prioridade)

    // Calcular tempo total disponível até a prova
    // Considerando apenas dias úteis de estudo (5 dias por semana em média)
    const diasEstudoSemana = 5.5 // média realista
    let tempoTotalDisponivelMinutos = 0
    
    if (diasRestantes > 0) {
      // Estimativa de dias de estudo
      const diasEstudoEstimados = Math.floor(diasRestantes * (diasEstudoSemana / 7))
      tempoTotalDisponivelMinutos = diasEstudoEstimados * tempoDisponivel
    }

    // Calcular viabilidade
    let viabilidade: 'impossivel' | 'critico' | 'apertado' | 'adequado' | 'confortavel' | 'sem_data' = 'sem_data'
    let percentualCobertura = 0
    let mensagem = ''
    let icone = ''
    let cor = ''

    if (!dataProva) {
      viabilidade = 'sem_data'
      mensagem = 'Defina a data da prova para análise completa'
      icone = 'fa-calendar-plus'
      cor = 'gray'
    } else if (diasRestantes <= 0) {
      viabilidade = 'impossivel'
      mensagem = 'A prova já passou'
      icone = 'fa-times-circle'
      cor = 'gray'
    } else {
      percentualCobertura = tempoTotalDisponivelMinutos > 0 
        ? Math.round((tempoTotalDisponivelMinutos / cargaTotalMinutos) * 100) 
        : 0

      if (percentualCobertura >= 150) {
        viabilidade = 'confortavel'
        mensagem = `Tempo suficiente! Você tem ${percentualCobertura}% do tempo necessário`
        icone = 'fa-check-circle'
        cor = 'green'
      } else if (percentualCobertura >= 100) {
        viabilidade = 'adequado'
        mensagem = `Tempo adequado (${percentualCobertura}%), mas mantenha o foco`
        icone = 'fa-thumbs-up'
        cor = 'blue'
      } else if (percentualCobertura >= 70) {
        viabilidade = 'apertado'
        mensagem = `Tempo apertado (${percentualCobertura}%). Priorize disciplinas de alto peso`
        icone = 'fa-exclamation-triangle'
        cor = 'amber'
      } else if (percentualCobertura >= 40) {
        viabilidade = 'critico'
        mensagem = `Tempo crítico (${percentualCobertura}%). Foque nas matérias com maior peso`
        icone = 'fa-exclamation-circle'
        cor = 'orange'
      } else {
        viabilidade = 'impossivel'
        mensagem = `Tempo insuficiente (${percentualCobertura}%). Considere adiar ou intensificar estudos`
        icone = 'fa-times-circle'
        cor = 'red'
      }
    }

    // Calcular distribuição semanal recomendada
    const semanasRestantes = diasRestantes > 0 ? Math.ceil(diasRestantes / 7) : 0
    const horasPorSemana = tempoDisponivel * diasEstudoSemana / 60
    
    // Sugestões baseadas na análise
    const sugestoes: string[] = []
    
    if (viabilidade === 'critico' || viabilidade === 'impossivel') {
      sugestoes.push('Aumente o tempo de estudo diário se possível')
      sugestoes.push('Foque nas disciplinas com maior peso (Conhecimentos Específicos)')
      if (cargaPorDisciplina.length > 0 && cargaPorDisciplina[0].dominio < 3) {
        sugestoes.push(`Priorize "${cargaPorDisciplina[0].nome}" - baixo domínio e alta prioridade`)
      }
    } else if (viabilidade === 'apertado') {
      sugestoes.push('Mantenha uma rotina consistente de estudos')
      sugestoes.push('Evite gastar muito tempo em matérias que já domina')
    } else if (viabilidade === 'adequado' || viabilidade === 'confortavel') {
      sugestoes.push('Continue com o ritmo atual')
      sugestoes.push('Reserve tempo para revisões e simulados')
    }

    return c.json({
      plano_id: parseInt(plano_id),
      data_prova: plano.data_prova,
      dias_restantes: diasRestantes,
      semanas_restantes: semanasRestantes,
      
      // Tempo disponível
      tempo_disponivel_dia: tempoDisponivel,
      horas_por_semana: horasPorSemana,
      tempo_total_disponivel_horas: Math.round(tempoTotalDisponivelMinutos / 60 * 10) / 10,
      
      // Carga necessária
      carga_total_horas: Math.round(cargaTotalMinutos / 60 * 10) / 10,
      disciplinas_analise: cargaPorDisciplina.slice(0, 10), // Top 10 prioridades
      
      // Viabilidade
      viabilidade,
      percentual_cobertura: percentualCobertura,
      mensagem,
      icone,
      cor,
      sugestoes,
      
      // Resumo
      resumo: {
        total_disciplinas: disciplinas.length,
        dominio_medio: disciplinas.length > 0 
          ? Math.round(disciplinas.reduce((acc, d) => acc + (d.nivel_dominio || 0), 0) / disciplinas.length * 10) / 10 
          : 0,
        peso_medio: disciplinas.length > 0
          ? Math.round(disciplinas.reduce((acc, d) => acc + (d.peso || 1), 0) / disciplinas.length * 10) / 10
          : 1
      }
    })
  } catch (error) {
    console.error('Erro ao calcular viabilidade:', error)
    return c.json({ error: 'Erro ao calcular viabilidade', details: String(error) }, 500)
  }
})

// ============== PROGRESSO GERAL DO EDITAL/PLANO ==============
// Calcula o progresso geral considerando tópicos estudados e pesos das disciplinas
app.get('/api/planos/:plano_id/progresso-geral', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')

  try {
    // Buscar plano e tipo (concurso específico ou área geral)
    const plano = await DB.prepare(`
      SELECT p.*, i.objetivo_tipo, i.concurso_nome, i.area_geral
      FROM planos_estudo p
      JOIN interviews i ON p.interview_id = i.id
      WHERE p.id = ?
    `).bind(plano_id).first() as any

    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }

    // Buscar disciplinas do plano com progresso de tópicos
    const { results: disciplinasProgresso } = await DB.prepare(`
      SELECT 
        ud.disciplina_id,
        ud.nivel_dominio,
        COALESCE(ud.peso, ed.peso, 1) as peso,
        d.nome as disciplina_nome,
        d.area,
        COUNT(DISTINCT te.id) as total_topicos,
        SUM(CASE WHEN COALESCE(utp.vezes_estudado, 0) > 0 THEN 1 ELSE 0 END) as topicos_estudados,
        COALESCE(AVG(utp.nivel_dominio), 0) as nivel_medio_topicos
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      LEFT JOIN edital_disciplinas ed ON ed.disciplina_id = ud.disciplina_id
      LEFT JOIN topicos_edital te ON te.disciplina_id = ud.disciplina_id AND te.user_id = ud.user_id
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ud.user_id
      WHERE ud.user_id = ?
      GROUP BY ud.disciplina_id, ud.nivel_dominio, ud.peso, d.nome, d.area
    `).bind(plano.user_id).all() as any[]

    if (disciplinasProgresso.length === 0) {
      return c.json({
        progresso_percentual: 0,
        tipo: plano.objetivo_tipo === 'concurso_especifico' ? 'edital' : 'geral',
        titulo: plano.objetivo_tipo === 'concurso_especifico' ? plano.concurso_nome : 'Progresso Geral',
        total_topicos: 0,
        topicos_estudados: 0,
        disciplinas: []
      })
    }

    // Calcular progresso ponderado por peso das disciplinas
    let progressoPonderado = 0
    let pesoTotal = 0
    let totalTopicos = 0
    let topicosEstudados = 0
    const disciplinasDetalhes: any[] = []

    for (const disc of disciplinasProgresso) {
      const peso = disc.peso || 1
      const topicos = disc.total_topicos || 0
      const estudados = disc.topicos_estudados || 0
      
      // Progresso da disciplina (0-100%)
      const progressoDisc = topicos > 0 ? (estudados / topicos) * 100 : 0
      
      // Ponderar pelo peso
      progressoPonderado += progressoDisc * peso
      pesoTotal += peso
      totalTopicos += topicos
      topicosEstudados += estudados

      disciplinasDetalhes.push({
        disciplina_id: disc.disciplina_id,
        nome: disc.disciplina_nome,
        area: disc.area,
        peso,
        total_topicos: topicos,
        topicos_estudados: estudados,
        progresso_percentual: Math.round(progressoDisc),
        nivel_dominio: disc.nivel_dominio || 0,
        nivel_medio_topicos: Math.round((disc.nivel_medio_topicos || 0) * 10) / 10
      })
    }

    // Calcular progresso final ponderado
    const progressoFinal = pesoTotal > 0 ? Math.round(progressoPonderado / pesoTotal) : 0

    // Determinar cor e status baseado no progresso
    let cor = 'gray'
    let status = 'Não iniciado'
    let icone = 'fa-hourglass-start'
    
    if (progressoFinal >= 90) {
      cor = 'green'
      status = 'Quase lá!'
      icone = 'fa-trophy'
    } else if (progressoFinal >= 70) {
      cor = 'emerald'
      status = 'Avançado'
      icone = 'fa-rocket'
    } else if (progressoFinal >= 50) {
      cor = 'blue'
      status = 'Bom progresso'
      icone = 'fa-chart-line'
    } else if (progressoFinal >= 25) {
      cor = 'amber'
      status = 'Em andamento'
      icone = 'fa-spinner'
    } else if (progressoFinal > 0) {
      cor = 'orange'
      status = 'Iniciando'
      icone = 'fa-seedling'
    }

    // Ordenar disciplinas por progresso (menor primeiro = mais urgente)
    disciplinasDetalhes.sort((a, b) => a.progresso_percentual - b.progresso_percentual)

    return c.json({
      plano_id: parseInt(plano_id),
      progresso_percentual: progressoFinal,
      tipo: plano.objetivo_tipo === 'concurso_especifico' ? 'edital' : 'geral',
      titulo: plano.objetivo_tipo === 'concurso_especifico' 
        ? `Edital: ${plano.concurso_nome || 'Concurso'}` 
        : 'Progresso Geral',
      cor,
      status,
      icone,
      
      // Resumo
      total_topicos: totalTopicos,
      topicos_estudados: topicosEstudados,
      total_disciplinas: disciplinasProgresso.length,
      
      // Detalhes por disciplina
      disciplinas: disciplinasDetalhes,
      
      // Top 3 disciplinas mais urgentes (menor progresso)
      mais_urgentes: disciplinasDetalhes.slice(0, 3).map(d => ({
        nome: d.nome,
        progresso: d.progresso_percentual
      }))
    })
  } catch (error) {
    console.error('Erro ao calcular progresso geral:', error)
    return c.json({ error: 'Erro ao calcular progresso geral', details: String(error) }, 500)
  }
})

// Recriar ciclos de um plano (útil para aplicar novas regras)
app.post('/api/planos/:plano_id/recriar-ciclos', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  
  try {
    // Buscar plano
    const plano = await DB.prepare('SELECT * FROM planos_estudo WHERE id = ?').bind(plano_id).first()
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }
    
    // Buscar interview para pegar tempo disponível
    const interview = await DB.prepare('SELECT * FROM interviews WHERE id = ?').bind(plano.interview_id).first()
    if (!interview) {
      return c.json({ error: 'Entrevista não encontrada' }, 404)
    }
    
    // ✅ CORREÇÃO: Buscar APENAS disciplinas da entrevista específica, não todas do usuário
    // Primeiro, buscar quais disciplinas foram selecionadas na entrevista
    const { results: disciplinasEntrevista } = await DB.prepare(`
      SELECT DISTINCT disciplina_id 
      FROM user_disciplinas 
      WHERE user_id = ?
      AND created_at >= (SELECT created_at FROM interviews WHERE id = ?)
    `).bind(plano.user_id, plano.interview_id).all()
    
    const disciplinaIds = disciplinasEntrevista.map(d => d.disciplina_id)
    
    if (disciplinaIds.length === 0) {
      return c.json({ error: 'Nenhuma disciplina encontrada para esta entrevista' }, 400)
    }
    
    const placeholders = disciplinaIds.map(() => '?').join(',')
    
    // Buscar dados completos das disciplinas selecionadas
    const { results: userDisciplinas } = await DB.prepare(`
      SELECT ud.*, d.nome, d.area 
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      WHERE ud.user_id = ? AND ud.disciplina_id IN (${placeholders})
    `).bind(plano.user_id, ...disciplinaIds).all()
    
    console.log(`📊 Recriando ciclos com ${userDisciplinas.length} disciplinas:`, userDisciplinas.map(d => d.nome).join(', '))
    
    // Ordem de deleção (respeitando foreign keys):
    // 1. conteudo_estudo (referencia metas_diarias)
    // 2. metas_diarias (referencia ciclos_estudo)
    // 3. ciclos_estudo (referencia plano)
    
    console.log('🗑️ Deletando conteúdos vinculados às metas...')
    const conteudoResult = await DB.prepare(`
      DELETE FROM conteudo_estudo 
      WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)
    `).bind(plano_id).run()
    console.log(`✅ ${conteudoResult.meta.changes} conteúdos deletados`)
    
    console.log('🗑️ Deletando metas antigas...')
    const metasResult = await DB.prepare('DELETE FROM metas_diarias WHERE plano_id = ?').bind(plano_id).run()
    console.log(`✅ ${metasResult.meta.changes} metas deletadas`)
    
    console.log('🗑️ Deletando ciclos antigos...')
    const ciclosResult = await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id = ?').bind(plano_id).run()
    console.log(`✅ ${ciclosResult.meta.changes} ciclos deletados`)
    
    console.log('🔄 Gerando novos ciclos...')
    // Recriar ciclos com nova lógica
    await gerarCiclosEstudo(DB, plano_id, userDisciplinas, interview.tempo_disponivel_dia)
    console.log('✅ Ciclos recriados com sucesso!')
    
    return c.json({ success: true, message: 'Ciclos recriados com sucesso' })
  } catch (error) {
    console.error('Erro ao recriar ciclos:', error)
    return c.json({ error: 'Erro ao recriar ciclos' }, 500)
  }
})

// ============== GESTÃO DE PLANOS ==============

// Renomear plano
app.put('/api/planos/:plano_id/nome', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  const { nome } = await c.req.json()
  
  try {
    if (!nome || nome.trim().length === 0) {
      return c.json({ error: 'Nome não pode ser vazio' }, 400)
    }
    
    if (nome.length > 100) {
      return c.json({ error: 'Nome muito longo (máximo 100 caracteres)' }, 400)
    }
    
    // Verificar se o plano existe
    const plano = await DB.prepare('SELECT * FROM planos_estudo WHERE id = ?').bind(plano_id).first()
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }
    
    // Atualizar nome
    await DB.prepare('UPDATE planos_estudo SET nome = ? WHERE id = ?').bind(nome.trim(), plano_id).run()
    
    return c.json({ 
      success: true, 
      message: 'Plano renomeado com sucesso',
      nome: nome.trim()
    })
  } catch (error) {
    console.error('Erro ao renomear plano:', error)
    return c.json({ error: 'Erro ao renomear plano' }, 500)
  }
})

// Excluir plano (com cascata manual)
app.delete('/api/planos/:plano_id', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  
  try {
    // Verificar se o plano existe
    const plano = await DB.prepare('SELECT * FROM planos_estudo WHERE id = ?').bind(plano_id).first()
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }
    
    // Verificar se não é o único plano do usuário
    const { results: planosUsuario } = await DB.prepare(
      'SELECT id FROM planos_estudo WHERE user_id = ?'
    ).bind(plano.user_id).all()
    
    const force = c.req.query('force') === 'true'
    
    if (planosUsuario.length === 1 && !force) {
      return c.json({ 
        error: 'Este é seu único plano de estudos. Deseja deletá-lo e criar um novo?',
        code: 'ULTIMO_PLANO',
        canForceDelete: true  // Frontend pode forçar com ?force=true
      }, 400)
    }
    
    console.log(`🗑️ Iniciando exclusão do plano ${plano_id}...`)
    
    // Desabilitar FKs temporariamente para evitar erros de constraint
    await DB.prepare('PRAGMA foreign_keys = OFF').run()
    
    try {
      // Exclusão em cascata manual (ordem correta para respeitar FKs)
      
      // 1. Deletar conteúdos gerados (referência em metas_diarias via meta_id OU user_id do plano)
      console.log('🗑️ Deletando conteúdos vinculados ao plano...')
      // Deletar conteúdos vinculados a metas deste plano
      const conteudosMetasResult = await DB.prepare(`
        DELETE FROM conteudo_estudo 
        WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)
      `).bind(plano_id).run()
      console.log(`  ✓ ${conteudosMetasResult.meta.changes} conteúdos de metas deletados`)
      
      // 2. Deletar metas semanais (novo sistema)
      console.log('🗑️ Deletando metas semanais...')
      // Primeiro deletar metas_semana que referenciam semanas_estudo
      const metasSemanaisResult = await DB.prepare(`
        DELETE FROM metas_semana 
        WHERE semana_id IN (SELECT id FROM semanas_estudo WHERE plano_id = ?)
      `).bind(plano_id).run()
      console.log(`  ✓ ${metasSemanaisResult.meta.changes} metas semanais deletadas`)
      
      // Depois deletar as semanas
      const semanasResult = await DB.prepare('DELETE FROM semanas_estudo WHERE plano_id = ?').bind(plano_id).run()
      console.log(`  ✓ ${semanasResult.meta.changes} semanas deletadas`)
      
      // 3. Deletar metas diárias
      console.log('🗑️ Deletando metas diárias...')
      const metasResult = await DB.prepare('DELETE FROM metas_diarias WHERE plano_id = ?').bind(plano_id).run()
      console.log(`  ✓ ${metasResult.meta.changes} metas deletadas`)
      
      // 4. Deletar ciclos
      console.log('🗑️ Deletando ciclos de estudo...')
      const ciclosResult = await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id = ?').bind(plano_id).run()
      console.log(`  ✓ ${ciclosResult.meta.changes} ciclos deletados`)
      
      // 5. Deletar o plano
      console.log('🗑️ Deletando plano...')
      await DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(plano_id).run()
      console.log(`✅ Plano ${plano_id} deletado com sucesso!`)
    } finally {
      // Reabilitar FKs
      await DB.prepare('PRAGMA foreign_keys = ON').run()
    }
    
    // 6. Se o plano deletado era o ativo, ativar o mais recente
    if (plano.ativo === 1 && planosUsuario.length > 1) {
      console.log('🔄 Ativando plano mais recente...')
      const planoMaisRecente = await DB.prepare(
        'SELECT id FROM planos_estudo WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 1'
      ).bind(plano.user_id, plano_id).first()
      
      if (planoMaisRecente) {
        await DB.prepare('UPDATE planos_estudo SET ativo = 0 WHERE user_id = ?').bind(plano.user_id).run()
        await DB.prepare('UPDATE planos_estudo SET ativo = 1 WHERE id = ?').bind(planoMaisRecente.id).run()
        console.log(`✅ Plano ${planoMaisRecente.id} ativado automaticamente`)
      } else {
        console.log('ℹ️ Nenhum outro plano disponível para ativar')
      }
    } else if (planosUsuario.length === 1) {
      console.log('ℹ️ Último plano deletado - usuário sem planos ativos')
    }
    
    return c.json({ 
      success: true, 
      message: 'Plano excluído com sucesso',
      plano_id: parseInt(plano_id)
    })
  } catch (error) {
    console.error('Erro ao excluir plano:', error)
    return c.json({ error: 'Erro ao excluir plano', details: error.message }, 500)
  }
})

// Obter detalhes de um plano específico
app.get('/api/planos/:plano_id', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  
  try {
    // Buscar plano com informações da entrevista
    const plano = await DB.prepare(`
      SELECT 
        p.*,
        i.objetivo_tipo,
        i.concurso_nome,
        i.cargo,
        i.area_geral,
        i.tempo_disponivel_dia,
        i.experiencia,
        i.ja_estudou_antes,
        i.prazo_prova
      FROM planos_estudo p
      LEFT JOIN interviews i ON p.interview_id = i.id
      WHERE p.id = ?
    `).bind(plano_id).first()
    
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }
    
    // Buscar ciclos
    const { results: ciclos } = await DB.prepare(`
      SELECT c.*, d.nome as disciplina_nome
      FROM ciclos_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      WHERE c.plano_id = ?
      ORDER BY c.dia_semana, c.ordem
    `).bind(plano_id).all()
    
    // Buscar estatísticas
    const stats = await DB.prepare(`
      SELECT 
        COUNT(DISTINCT ce.disciplina_id) as total_disciplinas,
        COUNT(DISTINCT md.id) as total_metas,
        SUM(CASE WHEN md.concluida = 1 THEN 1 ELSE 0 END) as metas_concluidas,
        SUM(md.tempo_real_minutos) as tempo_total_estudado
      FROM planos_estudo p
      LEFT JOIN ciclos_estudo ce ON p.id = ce.plano_id
      LEFT JOIN metas_diarias md ON p.id = md.plano_id
      WHERE p.id = ?
    `).bind(plano_id).first()
    
    return c.json({
      ...plano,
      diagnostico: plano.diagnostico ? JSON.parse(plano.diagnostico) : null,
      mapa_prioridades: plano.mapa_prioridades ? JSON.parse(plano.mapa_prioridades) : null,
      ciclos,
      estatisticas: stats
    })
  } catch (error) {
    console.error('Erro ao buscar plano:', error)
    return c.json({ error: 'Erro ao buscar plano' }, 500)
  }
})

// Alias para compatibilidade
app.get('/api/plano/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const plano = await DB.prepare(
    'SELECT * FROM planos_estudo WHERE user_id = ? AND ativo = 1 ORDER BY created_at DESC LIMIT 1'
  ).bind(user_id).first()

  if (!plano) {
    return c.json({ error: 'Nenhum plano ativo encontrado' }, 404)
  }

  // Buscar ciclos do plano
  const { results: ciclos } = await DB.prepare(`
    SELECT c.*, d.nome as disciplina_nome
    FROM ciclos_estudo c
    JOIN disciplinas d ON c.disciplina_id = d.id
    WHERE c.plano_id = ?
    ORDER BY c.dia_semana, c.ordem
  `).bind(plano.id).all()

  return c.json({
    ...plano,
    diagnostico: JSON.parse(plano.diagnostico),
    mapa_prioridades: JSON.parse(plano.mapa_prioridades),
    ciclos
  })
})

// ============== ROTAS DE METAS DIÁRIAS ==============
app.get('/api/metas/hoje/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const hoje = new Date().toISOString().split('T')[0]

  const { results: metas } = await DB.prepare(`
    SELECT 
      m.*, 
      c.tipo, 
      c.tempo_minutos, 
      c.disciplina_id, 
      d.nome as disciplina_nome,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM conteudo_estudo ce WHERE ce.meta_id = m.id
        ) THEN 1 
        ELSE 0 
      END as conteudo_gerado,
      (SELECT ce.id FROM conteudo_estudo ce WHERE ce.meta_id = m.id LIMIT 1) as conteudo_id
    FROM metas_diarias m
    JOIN ciclos_estudo c ON m.ciclo_id = c.id
    JOIN disciplinas d ON c.disciplina_id = d.id
    JOIN planos_estudo p ON c.plano_id = p.id
    WHERE m.user_id = ? AND m.data = ? AND p.ativo = 1
    ORDER BY c.ordem
  `).bind(user_id, hoje).all()

  // Para cada meta, buscar APENAS 1 tópico (para garantir qualidade do material gerado)
  for (const meta of metas) {
    const { results: topicos } = await DB.prepare(`
      SELECT te.id, te.nome, te.categoria, te.peso
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
      WHERE te.disciplina_id = ?
      ORDER BY 
        COALESCE(utp.nivel_dominio, 0) ASC,
        te.peso DESC,
        te.ordem ASC
      LIMIT 1
    `).bind(user_id, meta.disciplina_id).all()
    
    meta.topicos_sugeridos = topicos
  }

  return c.json(metas)
})

app.post('/api/metas/concluir', async (c) => {
  const { DB } = c.env
  const { meta_id, tempo_real_minutos, tipo_meta = 'diaria' } = await c.req.json()

  console.log(`🎯 Concluindo meta ${meta_id}, tipo: ${tipo_meta}, tempo: ${tempo_real_minutos}min`)

  // Tentar atualizar em metas_semana primeiro (fonte principal)
  const resultSemana = await DB.prepare(`
    UPDATE metas_semana 
    SET concluida = 1, tempo_real_minutos = ?
    WHERE id = ?
  `).bind(tempo_real_minutos, meta_id).run()

  if (resultSemana.meta.changes > 0) {
    console.log('✅ Meta semanal concluída')
    
    // Buscar dados para atualizar histórico
    const metaSemana = await DB.prepare(`
      SELECT user_id, data FROM metas_semana WHERE id = ?
    `).bind(meta_id).first()
    
    if (metaSemana) {
      await atualizarHistoricoDia(DB, metaSemana.user_id, metaSemana.data)
    }
    
    return c.json({ success: true, tipo: 'semana' })
  }

  // Fallback: atualizar em metas_diarias
  await DB.prepare(`
    UPDATE metas_diarias 
    SET concluida = 1, tempo_real_minutos = ?
    WHERE id = ?
  `).bind(tempo_real_minutos, meta_id).run()

  // Atualizar histórico do dia
  const meta = await DB.prepare('SELECT user_id, data FROM metas_diarias WHERE id = ?').bind(meta_id).first()
  if (meta) {
    await atualizarHistoricoDia(DB, meta.user_id, meta.data)
  }

  return c.json({ success: true, tipo: 'diaria' })
})

// Atualizar meta (desmarcar conclusão ou editar)
app.put('/api/metas/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = c.req.param('meta_id')
  const { concluida, tempo_estudado } = await c.req.json()

  await DB.prepare(`
    UPDATE metas_diarias 
    SET concluida = ?, tempo_real_minutos = ?
    WHERE id = ?
  `).bind(concluida ? 1 : 0, tempo_estudado || 0, meta_id).run()

  // Atualizar histórico do dia
  const meta = await DB.prepare('SELECT user_id, data FROM metas_diarias WHERE id = ?').bind(meta_id).first()
  if (meta) {
    await atualizarHistoricoDia(DB, meta.user_id, meta.data)
  }

  return c.json({ success: true })
})

// ============== ENDPOINTS DE EXERCÍCIOS E SCORE ==============

// Salvar resultado de exercício
app.post('/api/exercicios/resultado', async (c) => {
  const { DB } = c.env
  
  try {
    const { user_id, disciplina_id, topico_id, total_questoes, acertos, tempo_segundos } = await c.req.json()
    
    const percentual = total_questoes > 0 ? Math.round((acertos / total_questoes) * 100) : 0
    
    const result = await DB.prepare(`
      INSERT INTO exercicios_resultados (user_id, disciplina_id, topico_id, total_questoes, acertos, percentual, tempo_segundos)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user_id, disciplina_id, topico_id || null, total_questoes, acertos, percentual, tempo_segundos || null).run()
    
    console.log(`✅ Exercício salvo: ${acertos}/${total_questoes} (${percentual}%) - User ${user_id}, Disciplina ${disciplina_id}`)
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      percentual 
    })
  } catch (error) {
    console.error('Erro ao salvar resultado:', error)
    return c.json({ error: 'Erro ao salvar resultado' }, 500)
  }
})

// Buscar histórico de exercícios do usuário
app.get('/api/exercicios/historico/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const disciplina_id = c.req.query('disciplina_id')
  
  try {
    let query = `
      SELECT er.*, d.nome as disciplina_nome
      FROM exercicios_resultados er
      JOIN disciplinas d ON er.disciplina_id = d.id
      WHERE er.user_id = ?
    `
    const params: any[] = [user_id]
    
    if (disciplina_id) {
      query += ' AND er.disciplina_id = ?'
      params.push(disciplina_id)
    }
    
    query += ' ORDER BY er.created_at DESC LIMIT 50'
    
    const { results } = await DB.prepare(query).bind(...params).all()
    
    return c.json(results)
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return c.json({ error: 'Erro ao buscar histórico' }, 500)
  }
})

// Calcular score geral do usuário (0-10)
app.get('/api/score/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  
  try {
    // 1. Buscar disciplinas ÚNICAS do usuário com pesos (agrupando para evitar duplicatas)
    const { results: disciplinas } = await DB.prepare(`
      SELECT 
        ud.disciplina_id,
        ud.nivel_atual,
        ud.ja_estudou,
        d.nome,
        COALESCE(MAX(ed.peso), 1) as peso
      FROM user_disciplinas ud
      JOIN disciplinas d ON ud.disciplina_id = d.id
      LEFT JOIN edital_disciplinas ed ON ed.disciplina_id = ud.disciplina_id
      WHERE ud.user_id = ?
      GROUP BY ud.disciplina_id, ud.nivel_atual, ud.ja_estudou, d.nome
    `).bind(user_id).all()
    
    if (disciplinas.length === 0) {
      return c.json({ score: 0, detalhes: { disciplinas: 0 } })
    }
    
    // 2. Buscar progresso de tópicos por disciplina (com join na tabela de progresso do usuário)
    const { results: topicosProgresso } = await DB.prepare(`
      SELECT 
        te.disciplina_id,
        COUNT(*) as total_topicos,
        SUM(CASE WHEN COALESCE(utp.vezes_estudado, 0) > 0 THEN 1 ELSE 0 END) as topicos_estudados,
        COALESCE(AVG(utp.nivel_dominio), 0) as nivel_medio
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
      WHERE te.disciplina_id IN (SELECT disciplina_id FROM user_disciplinas WHERE user_id = ?)
      GROUP BY te.disciplina_id
    `).bind(user_id, user_id).all()
    
    // 3. Buscar média de exercícios por disciplina
    const { results: exerciciosMedia } = await DB.prepare(`
      SELECT 
        disciplina_id,
        AVG(percentual) as media_exercicios,
        COUNT(*) as total_exercicios
      FROM exercicios_resultados
      WHERE user_id = ?
      GROUP BY disciplina_id
    `).bind(user_id).all()
    
    // Criar mapas para lookup rápido
    const topicosMap = new Map(topicosProgresso.map((t: any) => [t.disciplina_id, t]))
    const exerciciosMap = new Map(exerciciosMedia.map((e: any) => [e.disciplina_id, e]))
    
    // 4. Calcular score ponderado
    let scoreTotal = 0
    let pesoTotal = 0
    const detalhes: any[] = []
    
    for (const disc of disciplinas as any[]) {
      const peso = disc.peso || 1
      const topicos = topicosMap.get(disc.disciplina_id) || { total_topicos: 0, topicos_estudados: 0, nivel_medio: 0 }
      const exercicios = exerciciosMap.get(disc.disciplina_id) || { media_exercicios: 0, total_exercicios: 0 }
      
      // Componentes do score da disciplina (cada um vale até 10)
      const progressoTopicos = topicos.total_topicos > 0 
        ? (topicos.topicos_estudados / topicos.total_topicos) * 10 
        : 0
      
      const nivelDominio = (topicos.nivel_medio || 0)
      
      const mediaExercicios = exercicios.total_exercicios > 0 
        ? (exercicios.media_exercicios / 100) * 10 
        : 0
      
      const bonusJaEstudou = disc.ja_estudou ? 1 : 0
      
      // Score da disciplina: média ponderada dos componentes
      // 40% progresso de tópicos, 30% nível de domínio, 30% exercícios
      let scoreDisc = 0
      if (exercicios.total_exercicios > 0) {
        scoreDisc = (progressoTopicos * 0.35) + (nivelDominio * 0.25) + (mediaExercicios * 0.35) + bonusJaEstudou * 0.5
      } else {
        // Sem exercícios: 60% progresso, 40% nível
        scoreDisc = (progressoTopicos * 0.5) + (nivelDominio * 0.4) + bonusJaEstudou * 1.0
      }
      
      scoreDisc = Math.min(10, scoreDisc) // Cap em 10
      
      scoreTotal += scoreDisc * peso
      pesoTotal += peso
      
      detalhes.push({
        disciplina_id: disc.disciplina_id,
        nome: disc.nome,
        peso,
        score: Math.round(scoreDisc * 10) / 10,
        topicos_estudados: topicos.topicos_estudados || 0,
        total_topicos: topicos.total_topicos || 0,
        exercicios_feitos: exercicios.total_exercicios || 0,
        media_exercicios: Math.round(exercicios.media_exercicios || 0)
      })
    }
    
    const scoreFinal = pesoTotal > 0 ? Math.round((scoreTotal / pesoTotal) * 10) / 10 : 0
    
    console.log(`📊 Score calculado para user ${user_id}: ${scoreFinal}/10`)
    
    return c.json({
      score: scoreFinal,
      detalhes: {
        disciplinas: disciplinas.length,
        por_disciplina: detalhes.sort((a, b) => b.score - a.score)
      }
    })
  } catch (error) {
    console.error('Erro ao calcular score:', error)
    return c.json({ error: 'Erro ao calcular score' }, 500)
  }
})

// ============== ENDPOINTS DE CONTEÚDO GERADO ==============

// Visualizar conteúdo gerado (com opção de download)
app.get('/api/conteudo/:conteudo_id', async (c) => {
  const { DB } = c.env
  const conteudo_id = c.req.param('conteudo_id')
  const format = c.req.query('format') || 'json' // json, markdown, html

  try {
    const conteudo = await DB.prepare(`
      SELECT c.*, d.nome as disciplina_nome
      FROM conteudo_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      WHERE c.id = ?
    `).bind(conteudo_id).first()

    if (!conteudo) {
      return c.json({ error: 'Conteúdo não encontrado' }, 404)
    }

    const conteudoObj = {
      ...conteudo,
      topicos: JSON.parse(conteudo.topicos),
      objetivos: JSON.parse(conteudo.objetivos),
      conteudo: JSON.parse(conteudo.conteudo)
    }

    // Formato JSON (padrão)
    if (format === 'json') {
      return c.json(conteudoObj)
    }

    // Formato Markdown para download
    if (format === 'markdown' || format === 'md') {
      const markdown = gerarMarkdown(conteudoObj)
      return c.text(markdown, 200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="conteudo_${conteudo_id}_${conteudoObj.disciplina_nome.replace(/\s+/g, '_')}.md"`
      })
    }

    // Formato HTML para visualização
    if (format === 'html') {
      const html = gerarHTML(conteudoObj)
      return c.html(html)
    }

    return c.json(conteudoObj)
  } catch (error) {
    console.error('Erro ao buscar conteúdo:', error)
    return c.json({ error: 'Erro ao buscar conteúdo' }, 500)
  }
})

// Listar todos os conteúdos gerados do usuário
app.get('/api/conteudos/usuario/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const { results: conteudos } = await DB.prepare(`
      SELECT 
        c.id,
        c.tipo,
        c.disciplina_id,
        c.topicos,
        c.created_at,
        d.nome as disciplina_nome,
        m.data as data_estudo
      FROM conteudo_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      LEFT JOIN metas_diarias m ON c.meta_id = m.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user_id, limit, offset).all()

    const conteudosFormatados = conteudos.map(c => ({
      ...c,
      topicos: JSON.parse(c.topicos)
    }))

    return c.json({
      conteudos: conteudosFormatados,
      total: conteudos.length,
      limit,
      offset
    })
  } catch (error) {
    console.error('Erro ao listar conteúdos:', error)
    return c.json({ error: 'Erro ao listar conteúdos' }, 500)
  }
})

// Gerar metas do dia automaticamente
app.post('/api/metas/gerar/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const hoje = new Date().toISOString().split('T')[0]
  const diaSemana = new Date().getDay()

  try {
    // Buscar plano ativo
    const plano = await DB.prepare(
      'SELECT * FROM planos_estudo WHERE user_id = ? AND ativo = 1 ORDER BY created_at DESC LIMIT 1'
    ).bind(user_id).first()

    if (!plano) {
      return c.json({ error: 'Nenhum plano ativo encontrado' }, 404)
    }

    // Verificar se já existem metas para hoje DESTE PLANO ATIVO
    const { results: metasExistentes } = await DB.prepare(
      'SELECT * FROM metas_diarias WHERE user_id = ? AND data = ? AND plano_id = ?'
    ).bind(user_id, hoje, plano.id).all()

    if (metasExistentes.length > 0) {
      return c.json({ message: 'Metas já geradas para hoje', metas: metasExistentes })
    }
    
    // Deletar metas antigas de outros planos para hoje (se existirem)
    await DB.prepare(
      'DELETE FROM metas_diarias WHERE user_id = ? AND data = ? AND plano_id != ?'
    ).bind(user_id, hoje, plano.id).run()

    // Buscar ciclos do dia
    const { results: ciclos } = await DB.prepare(`
      SELECT * FROM ciclos_estudo 
      WHERE plano_id = ? AND dia_semana = ?
      ORDER BY ordem
    `).bind(plano.id, diaSemana).all()

    if (ciclos.length === 0) {
      return c.json({ message: 'Nenhum ciclo programado para hoje' })
    }

    // Criar metas
    const metas = []
    for (const ciclo of ciclos) {
      const result = await DB.prepare(`
        INSERT INTO metas_diarias (user_id, plano_id, data, ciclo_id, concluida, tempo_real_minutos)
        VALUES (?, ?, ?, ?, 0, 0)
      `).bind(user_id, plano.id, hoje, ciclo.id).run()

      metas.push({
        id: result.meta.last_row_id,
        ciclo_id: ciclo.id,
        data: hoje
      })
    }

    // Criar registro no histórico
    await DB.prepare(`
      INSERT OR REPLACE INTO historico_estudos 
      (user_id, data, metas_total, metas_concluidas, tempo_total_minutos, tempo_estudado_minutos, percentual_conclusao, status)
      VALUES (?, ?, ?, 0, ?, 0, 0, 'nao_estudou')
    `).bind(
      user_id, 
      hoje, 
      ciclos.length,
      ciclos.reduce((sum: number, c: any) => sum + c.tempo_minutos, 0)
    ).run()

    return c.json({ success: true, metas_criadas: metas.length, metas })
  } catch (error) {
    console.error('Erro ao gerar metas:', error)
    return c.json({ error: 'Erro ao gerar metas do dia' }, 500)
  }
})

// Obter calendário de estudos
app.get('/api/calendario/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const mes = c.req.query('mes') || new Date().getMonth() + 1
  const ano = c.req.query('ano') || new Date().getFullYear()

  const { results: historico } = await DB.prepare(`
    SELECT * FROM historico_estudos
    WHERE user_id = ? 
    AND strftime('%m', data) = ?
    AND strftime('%Y', data) = ?
    ORDER BY data
  `).bind(user_id, String(mes).padStart(2, '0'), String(ano)).all()

  return c.json(historico)
})

// Obter estatísticas gerais
app.get('/api/estatisticas/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  // Total de dias estudados
  const diasEstudados = await DB.prepare(`
    SELECT COUNT(*) as total FROM historico_estudos
    WHERE user_id = ? AND status != 'nao_estudou'
  `).bind(user_id).first()

  // Streak atual
  const streak = await calcularStreak(DB, user_id)

  // Total de horas estudadas
  const horasTotal = await DB.prepare(`
    SELECT SUM(tempo_estudado_minutos) as total FROM historico_estudos
    WHERE user_id = ?
  `).bind(user_id).first()

  // Média de conclusão
  const mediaConlusao = await DB.prepare(`
    SELECT AVG(percentual_conclusao) as media FROM historico_estudos
    WHERE user_id = ? AND status != 'nao_estudou'
  `).bind(user_id).first()

  return c.json({
    dias_estudados: diasEstudados?.total || 0,
    streak_atual: streak,
    horas_totais: Math.round((horasTotal?.total || 0) / 60 * 10) / 10,
    media_conclusao: Math.round(mediaConlusao?.media || 0)
  })
})

// ✅ Endpoint para retornar progresso de metas desde a Semana 1 até a prova (ou indefinidamente)
app.get('/api/estatisticas/:user_id/progresso-semanal', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const visualizacao = c.req.query('view') || 'semana' // 'semana' ou 'mes'
  
  try {
    // Buscar plano ativo do usuário com data_prova (já na tabela planos_estudo)
    const plano = await DB.prepare(`
      SELECT * FROM planos_estudo 
      WHERE user_id = ? AND ativo = 1
      ORDER BY created_at DESC LIMIT 1
    `).bind(user_id).first() as any
    
    if (!plano) {
      return c.json({ 
        semanas: [], 
        meses: [],
        mediaGeral: 0,
        temDataProva: false,
        semanasAteFim: 0
      })
    }
    
    const dataInicioPlano = new Date(plano.created_at)
    const hoje = new Date()
    const dataProva = plano.data_prova ? new Date(plano.data_prova) : null
    
    // Calcular semanas desde o início do plano
    const semanas: any[] = []
    const meses: any[] = []
    
    // Calcular quantas semanas mostrar
    let dataFinal = dataProva || hoje
    if (dataFinal < hoje) dataFinal = hoje // Se a prova já passou, mostrar até hoje
    
    const diffMs = dataFinal.getTime() - dataInicioPlano.getTime()
    const totalSemanas = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
    const semanaAtual = Math.ceil((hoje.getTime() - dataInicioPlano.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // Gerar dados para cada semana
    for (let i = 1; i <= totalSemanas; i++) {
      const inicioSemana = new Date(dataInicioPlano)
      inicioSemana.setDate(dataInicioPlano.getDate() + ((i - 1) * 7))
      
      const fimSemana = new Date(inicioSemana)
      fimSemana.setDate(inicioSemana.getDate() + 6)
      
      const inicioStr = inicioSemana.toISOString().split('T')[0]
      const fimStr = fimSemana.toISOString().split('T')[0]
      
      // Só buscar dados para semanas passadas ou atual
      let metasConcluidas = 0
      let metasTotal = 0
      let diasEstudados = 0
      let tempoMinutos = 0
      
      if (inicioSemana <= hoje) {
        // Buscar dados do historico_estudos que já tem metas_concluidas agregadas por dia
        const historicoRes = await DB.prepare(`
          SELECT 
            COALESCE(SUM(metas_concluidas), 0) as metas_concluidas,
            COALESCE(SUM(metas_total), 0) as metas_total,
            COUNT(DISTINCT CASE WHEN status != 'nao_estudou' THEN data END) as dias_estudados,
            COALESCE(SUM(tempo_estudado_minutos), 0) as tempo_minutos
          FROM historico_estudos
          WHERE user_id = ? AND data >= ? AND data <= ?
        `).bind(user_id, inicioStr, fimStr).first() as any
        
        metasConcluidas = historicoRes?.metas_concluidas || 0
        metasTotal = historicoRes?.metas_total || 0
        diasEstudados = historicoRes?.dias_estudados || 0
        tempoMinutos = historicoRes?.tempo_minutos || 0
      }
      
      const percentual = metasTotal > 0 ? Math.round((metasConcluidas / metasTotal) * 100) : 0
      const isFutura = inicioSemana > hoje
      const isAtual = i === semanaAtual
      const isProva = dataProva && i === totalSemanas
      
      semanas.push({
        numero: i,
        label: `Sem ${i}`,
        inicio: inicioStr,
        fim: fimStr,
        metasConcluidas,
        metasTotal,
        diasEstudados,
        tempoMinutos,
        percentual,
        isFutura,
        isAtual,
        isProva
      })
    }
    
    // Agrupar por mês
    const mesesMap = new Map<string, any>()
    semanas.forEach(sem => {
      const mesAno = sem.inicio.substring(0, 7) // YYYY-MM
      const [ano, mes] = mesAno.split('-')
      const labelMes = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      
      if (!mesesMap.has(mesAno)) {
        mesesMap.set(mesAno, {
          label: labelMes,
          mesAno,
          metasConcluidas: 0,
          metasTotal: 0,
          diasEstudados: 0,
          tempoMinutos: 0,
          semanasCount: 0
        })
      }
      
      const mesData = mesesMap.get(mesAno)
      mesData.metasConcluidas += sem.metasConcluidas
      mesData.metasTotal += sem.metasTotal
      mesData.diasEstudados += sem.diasEstudados
      mesData.tempoMinutos += sem.tempoMinutos
      mesData.semanasCount++
    })
    
    mesesMap.forEach((mes, key) => {
      mes.percentual = mes.metasTotal > 0 ? Math.round((mes.metasConcluidas / mes.metasTotal) * 100) : 0
      meses.push(mes)
    })
    
    // Calcular média geral (apenas semanas passadas)
    const semanasConcluidas = semanas.filter(s => !s.isFutura)
    const mediaGeral = semanasConcluidas.length > 0 
      ? Math.round(semanasConcluidas.reduce((acc, s) => acc + s.percentual, 0) / semanasConcluidas.length)
      : 0
    
    return c.json({
      semanas,
      meses,
      mediaGeral,
      temDataProva: !!dataProva,
      dataProva: dataProva?.toISOString().split('T')[0] || null,
      semanaAtual,
      totalSemanas,
      semanasRestantes: Math.max(0, totalSemanas - semanaAtual)
    })
  } catch (error) {
    console.error('Erro ao buscar progresso semanal:', error)
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500)
  }
})

// ============== ROTAS DE METAS SEMANAIS ==============

// 1. Gerar metas para uma semana completa
app.post('/api/metas/gerar-semana/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))
  const { plano_id, data_inicio } = await c.req.json()

  console.log('📅 Gerando metas semanais:', { user_id, plano_id, data_inicio })

  try {
    // ✅ CORREÇÃO: Desativar TODAS as semanas antigas do usuário antes de criar nova
    await DB.prepare(`
      UPDATE semanas_estudo 
      SET status = 'concluida' 
      WHERE user_id = ? AND status = 'ativa'
    `).bind(user_id).run()
    
    console.log(`✅ Semanas antigas desativadas para user_id ${user_id}`)

    // Calcular data_fim (domingo da mesma semana)
    const dataInicio = new Date(data_inicio)
    const diaInicioNum = dataInicio.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
    
    // ✅ CORREÇÃO: Calcular data_fim como o próximo domingo
    // Se hoje é quinta (4), faltam 6-4=2 dias até sábado + 1 = 3 dias até domingo
    // Mas domingo é 0, então: (7 - diaInicio) % 7 = dias até domingo
    const dataFim = new Date(dataInicio)
    const diasAteDomingo = diaInicioNum === 0 ? 0 : (7 - diaInicioNum)
    dataFim.setDate(dataFim.getDate() + diasAteDomingo)
    
    console.log(`📆 Semana: ${data_inicio} (${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][diaInicioNum]}) até ${dataFim.toISOString().split('T')[0]} (Dom)`)

    // Calcular número da semana baseado na DATA do plano (não no COUNT)
    const plano = await DB.prepare('SELECT id, created_at FROM planos_estudo WHERE id = ?').bind(plano_id).first()
    
    // ✅ CORREÇÃO: Validar se plano existe
    if (!plano || !plano.id) {
      console.error(`❌ Plano não encontrado: ${plano_id}`)
      return c.json({ error: 'Plano de estudos não encontrado', code: 'PLAN_NOT_FOUND' }, 404)
    }
    
    const dataInicioPlano = new Date(plano.created_at || new Date())
    const diffTime = Math.abs(dataInicio.getTime() - dataInicioPlano.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const numeroSemana = Math.max(1, Math.floor(diffDays / 7) + 1) // Garante mínimo 1

    // Criar registro de semana
    const semanaResult = await DB.prepare(`
      INSERT INTO semanas_estudo (user_id, plano_id, numero_semana, data_inicio, data_fim, status)
      VALUES (?, ?, ?, ?, ?, 'ativa')
    `).bind(user_id, plano_id, numeroSemana, data_inicio, dataFim.toISOString().split('T')[0]).run()

    const semana_id = semanaResult.meta.last_row_id

    // Buscar ciclos do plano
    const { results: ciclos } = await DB.prepare(`
      SELECT * FROM ciclos_estudo 
      WHERE plano_id = ? 
      ORDER BY ordem
    `).bind(plano_id).all()

    // ✅ CORREÇÃO: Validar se existem ciclos
    if (!ciclos || ciclos.length === 0) {
      console.error(`❌ Nenhum ciclo encontrado para o plano ${plano_id}`)
      return c.json({ 
        error: 'Nenhum ciclo de estudos encontrado. Crie um novo plano.', 
        code: 'NO_CYCLES_IN_PLAN' 
      }, 400)
    }

    // ✅ CORREÇÃO v19.5: Buscar APENAS disciplinas ÚNICAS do PLANO (ciclos_estudo)
    // Não usar edital completo, apenas as disciplinas SELECIONADAS pelo usuário
    
    const { results: disciplinasDoPlano } = await DB.prepare(`
      SELECT 
        c.disciplina_id,
        d.nome,
        MAX(ed.id) as edital_disciplina_id
      FROM ciclos_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      LEFT JOIN edital_disciplinas ed ON LOWER(TRIM(ed.nome)) = LOWER(TRIM(d.nome))
      WHERE c.plano_id = ?
      GROUP BY c.disciplina_id, d.nome
    `).bind(plano_id).all()

    console.log(`📋 METAS - Disciplinas do plano: ${disciplinasDoPlano.map(d => d.nome).join(', ')}`)
    console.log(`📊 Total: ${disciplinasDoPlano.length} disciplinas`)

    // ✅ CORREÇÃO: Validar se existem disciplinas no plano
    if (!disciplinasDoPlano || disciplinasDoPlano.length === 0) {
      console.error(`❌ Nenhuma disciplina encontrada para o plano ${plano_id}`)
      return c.json({ 
        error: 'Nenhuma disciplina encontrada no plano. Crie um novo plano com disciplinas selecionadas.', 
        code: 'NO_DISCIPLINES_IN_PLAN' 
      }, 400)
    }

    const userDisciplinas = disciplinasDoPlano.map(d => ({
      disciplina_id: d.disciplina_id,
      nome: d.nome,
      dificuldade: 5, // Padrão: média
      edital_disciplina_id: d.edital_disciplina_id
    }))

    // Buscar tempo disponível por dia e dias da semana do plano
    const planoInfo = await DB.prepare(`
      SELECT i.tempo_disponivel_dia, i.dias_semana
      FROM planos_estudo p
      JOIN interviews i ON p.interview_id = i.id
      WHERE p.id = ?
    `).bind(plano_id).first() as any
    
    const TEMPO_DISPONIVEL_DIA = planoInfo?.tempo_disponivel_dia || 120 // padrão: 2h
    
    // ✅ NOVO: Dias da semana que o usuário pode estudar (0=Dom, 1=Seg, ..., 6=Sáb)
    let diasDisponiveis: number[] = [1, 2, 3, 4, 5] // Default: seg a sex
    if (planoInfo?.dias_semana) {
      try {
        diasDisponiveis = JSON.parse(planoInfo.dias_semana)
      } catch (e) {
        console.warn('⚠️ Erro ao parsear dias_semana, usando default')
      }
    }
    console.log(`⏰ Limite de tempo por dia: ${TEMPO_DISPONIVEL_DIA} minutos`)
    console.log(`📅 Dias disponíveis para estudo: ${diasDisponiveis.join(', ')} (0=Dom...6=Sáb)`)

    // ✅ NOVO: Calcular apenas dias a partir de data_inicio até fim da semana
    // Se hoje é quinta (dia 4), só gera metas de quinta a domingo
    const dataInicioDate = new Date(data_inicio)
    const diaInicioSemana = dataInicioDate.getDay() // 0=Dom, 1=Seg, ..., 6=Sáb
    console.log(`📆 Data início: ${data_inicio}, dia da semana: ${diaInicioSemana}`)

    // Distribuir metas pelos dias da semana RESPEITANDO O LIMITE DIÁRIO E DIAS DISPONÍVEIS
    const metas = []
    const tempoPorDia = [0, 0, 0, 0, 0, 0, 0] // Tempo usado em cada dia (índice = dia da semana 0-6)
    const disciplinasPorDia = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()] // Disciplinas únicas por dia
    const MAX_DISCIPLINAS_DIA = 4 // LIMITE: máximo 4 disciplinas por dia
    let ordem = 0
    
    // ✅ CORREÇÃO: Calcular quais dias efetivamente usar nesta semana
    // Começar do dia de início até domingo (ou até o fim da semana)
    const diasAtivos: number[] = []
    
    // Se começa no domingo (0), considerar a semana toda (0-6)
    if (diaInicioSemana === 0) {
      for (let d = 0; d <= 6; d++) {
        if (diasDisponiveis.includes(d)) {
          diasAtivos.push(d)
        }
      }
    } else {
      // Se começa em outro dia, vai até o sábado (6)
      for (let d = diaInicioSemana; d <= 6; d++) {
        if (diasDisponiveis.includes(d)) {
          diasAtivos.push(d)
        }
      }
      // E também inclui o domingo (0) se estiver disponível e for depois do início
      if (diasDisponiveis.includes(0) && diaInicioSemana > 0) {
        diasAtivos.push(0)
      }
    }
    console.log(`✅ Dias ativos para metas nesta semana: ${diasAtivos.join(', ')}`)

    // Estratégia: RODAR ciclos entre disciplinas
    // Exemplo: Disc1-Teoria, Disc2-Teoria, Disc3-Teoria, Disc1-Exercícios, Disc2-Exercícios...
    // Isso garante que TODAS as disciplinas sejam contempladas
    
    const atividades = []
    for (const ciclo of ciclos) {
      for (const disciplina of userDisciplinas) {
        atividades.push({ disciplina, ciclo })
      }
    }

    console.log(`📚 Total de atividades a alocar: ${atividades.length} (${userDisciplinas.length} disciplinas × ${ciclos.length} ciclos)`)

    // 🎯 NOVO: Carregar TODOS os tópicos de cada disciplina do edital (EM ORDEM)
    const topicosCache = new Map<number, any[]>()
    const topicoIndex = new Map<number, number>() // Rastrear índice atual por disciplina
    
    for (const disc of userDisciplinas) {
      if (disc.edital_disciplina_id) {
        const { results: todosTopicos } = await DB.prepare(`
          SELECT id, nome, ordem
          FROM edital_topicos
          WHERE edital_disciplina_id = ?
          ORDER BY ordem ASC
        `).bind(disc.edital_disciplina_id).all()
        
        topicosCache.set(disc.edital_disciplina_id, todosTopicos)
        topicoIndex.set(disc.edital_disciplina_id, 0) // Começar no tópico 0
        
        console.log(`  📖 ${disc.nome}: ${todosTopicos.length} tópicos carregados`)
      }
    }

    // ✅ CORREÇÃO: Se não houver dias ativos, avisar e retornar
    if (diasAtivos.length === 0) {
      console.error(`❌ Nenhum dia disponível para estudo nesta semana`)
      return c.json({ 
        error: 'Nenhum dia disponível para estudo nesta semana. Verifique os dias selecionados na entrevista.', 
        code: 'NO_DAYS_AVAILABLE' 
      }, 400)
    }

    // Distribuir atividades dia a dia, respeitando o limite E APENAS nos dias ativos
    for (const { disciplina, ciclo } of atividades) {
      // Encontrar próximo dia disponível (que tenha tempo suficiente E não exceda 4 disciplinas)
      let diaEncontrado = false
      
      // ✅ NOVO: Iterar apenas sobre os dias ativos (respeitando dias da semana e data início)
      for (const dia of diasAtivos) {
        const jaTemDisciplina = disciplinasPorDia[dia].has(disciplina.disciplina_id)
        const quantidadeDisciplinas = disciplinasPorDia[dia].size
        
        // Validações: tempo disponível E (já tem disciplina OU menos de 4 disciplinas)
        if (tempoPorDia[dia] + ciclo.tempo_minutos <= TEMPO_DISPONIVEL_DIA && 
            (jaTemDisciplina || quantidadeDisciplinas < MAX_DISCIPLINAS_DIA)) {
          // Dia tem espaço disponível!
          
          // ✅ NOVO: Calcular a data correta baseada no dia da semana
          const dataMeta = new Date(dataInicioDate)
          const diffDias = dia - diaInicioSemana
          if (diffDias >= 0) {
            dataMeta.setDate(dataMeta.getDate() + diffDias)
          } else {
            // Se o dia é antes do início (ex: domingo quando começou quinta), pula
            continue
          }

          // 🎯 NOVO: Pegar próximo tópico EM ORDEM (não sempre os mesmos 3)
          let topicosArray = []

          // 1️⃣ Se disciplina veio do edital, pegar próximos tópicos em ORDEM
          if (disciplina.edital_disciplina_id && topicosCache.has(disciplina.edital_disciplina_id)) {
            const todosTopicos = topicosCache.get(disciplina.edital_disciplina_id)!
            const indiceAtual = topicoIndex.get(disciplina.edital_disciplina_id)!
            
            // Pegar 1 tópico por vez (sequencial)
            if (todosTopicos && todosTopicos.length > 0) {
              if (indiceAtual < todosTopicos.length) {
                const topicoAtual = todosTopicos[indiceAtual]
                if (topicoAtual && topicoAtual.id !== undefined) {
                  topicosArray = [{ id: topicoAtual.id, nome: topicoAtual.nome || 'Tópico sem nome' }]
                  topicoIndex.set(disciplina.edital_disciplina_id, indiceAtual + 1)
                  console.log(`    ➡️ ${disciplina.nome} → Tópico ${indiceAtual + 1}/${todosTopicos.length}: ${topicoAtual.nome}`)
                }
              } else if (todosTopicos[0]) {
                // Reiniciar do início (ciclo completo)
                topicoIndex.set(disciplina.edital_disciplina_id, 0)
                const primeiroTopico = todosTopicos[0]
                topicosArray = [{ id: primeiroTopico.id, nome: primeiroTopico.nome || 'Tópico sem nome' }]
                console.log(`    🔄 ${disciplina.nome} → Reiniciando ciclo: ${primeiroTopico.nome}`)
              }
            }
          }

          // 2️⃣ Se não houver tópicos do edital, buscar da base padrão
          if (topicosArray.length === 0 && disciplina.disciplina_id > 0) {
            const { results: topicosPadrao } = await DB.prepare(`
              SELECT te.id, te.nome
              FROM topicos_edital te
              LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
              WHERE te.disciplina_id = ?
              ORDER BY COALESCE(utp.nivel_dominio, 0) ASC, te.peso DESC
              LIMIT 1
            `).bind(user_id, disciplina.disciplina_id).all()

            topicosArray = topicosPadrao.map(t => ({ id: t.id, nome: t.nome }))
          }

          // 3️⃣ Fallback: tópico genérico baseado no tipo de ciclo
          if (topicosArray.length === 0) {
            const tituloGenerico = ciclo.tipo === 'teoria' 
              ? `Conceitos fundamentais de ${disciplina.nome}`
              : ciclo.tipo === 'exercicios'
              ? `Exercícios práticos de ${disciplina.nome}`
              : `Revisão geral de ${disciplina.nome}`
            
            topicosArray = [{ id: 0, nome: tituloGenerico }]
          }

          // ✅ CORREÇÃO: Converter dia_semana de 0-6 (JS) para 1-7 (frontend: 1=Seg, 7=Dom)
          // JavaScript: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
          // Frontend:   7=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
          const diaSemanaParaBanco = dia === 0 ? 7 : dia // Converte domingo de 0 para 7
          
          // Inserir meta
          const metaResult = await DB.prepare(`
            INSERT INTO metas_semana (
              semana_id, user_id, disciplina_id, dia_semana, data, 
              tipo, tempo_minutos, topicos_sugeridos, ordem
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            semana_id,
            user_id,
            disciplina.disciplina_id,
            diaSemanaParaBanco, // ✅ CORRIGIDO: Formato 1-7 para o frontend
            dataMeta.toISOString().split('T')[0],
            ciclo.tipo,
            ciclo.tempo_minutos,
            JSON.stringify(topicosArray),
            ordem
          ).run()

          metas.push({
            id: metaResult.meta.last_row_id,
            disciplina_nome: disciplina.nome,
            dia_semana: diaSemanaParaBanco, // ✅ CORRIGIDO: Formato 1-7 para o frontend
            data: dataMeta.toISOString().split('T')[0],
            tipo: ciclo.tipo,
            tempo_minutos: ciclo.tempo_minutos,
            topicos: topicosArray
          })

          // Atualizar tempo usado no dia e adicionar disciplina ao Set
          tempoPorDia[dia] += ciclo.tempo_minutos
          disciplinasPorDia[dia].add(disciplina.disciplina_id)
          const nomeDia = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dia]
          console.log(`📌 ${nomeDia} (${dataMeta.toISOString().split('T')[0]}): ${disciplina.nome} (${ciclo.tipo}) +${ciclo.tempo_minutos}min (total: ${tempoPorDia[dia]}/${TEMPO_DISPONIVEL_DIA}min, ${disciplinasPorDia[dia].size} disciplinas)`)
          
          ordem++
          diaEncontrado = true
          break
        }
      }

      if (!diaEncontrado) {
        console.warn(`⚠️ Não foi possível alocar ${ciclo.tipo} de ${disciplina.nome} (${ciclo.tempo_minutos}min) - semana cheia`)
      }
    }

    console.log(`✅ ${metas.length} metas geradas para semana ${numeroSemana}`)

    return c.json({
      semana_id,
      numero_semana: numeroSemana,
      data_inicio,
      data_fim: dataFim.toISOString().split('T')[0],
      metas
    })

  } catch (error) {
    console.error('❌ Erro ao gerar metas semanais:', error)
    return c.json({ error: 'Erro ao gerar metas semanais' }, 500)
  }
})

// Endpoint: Sincronizar metas semanais → metas diárias (hoje)
app.post('/api/metas/sincronizar-dia/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))

  console.log('🔄 Sincronizando metas semanais → diárias para user:', user_id)

  try {
    const hoje = new Date().toISOString().split('T')[0]
    const diaSemanaHoje = new Date().getDay() || 7 // 1-7 (seg-dom, domingo=7)

    // Buscar metas semanais de hoje da semana ativa
    const { results: metasSemanais } = await DB.prepare(`
      SELECT 
        ms.*,
        d.nome as disciplina_nome,
        se.plano_id
      FROM metas_semana ms
      JOIN semanas_estudo se ON ms.semana_id = se.id
      JOIN disciplinas d ON ms.disciplina_id = d.id
      WHERE ms.user_id = ?
        AND se.status = 'ativa'
        AND ms.dia_semana = ?
      ORDER BY ms.ordem
    `).bind(user_id, diaSemanaHoje).all()

    if (metasSemanais.length === 0) {
      return c.json({ message: 'Nenhuma meta semanal para hoje', criadas: 0 })
    }

    // Verificar se já existem metas diárias para hoje
    const { results: metasExistentes } = await DB.prepare(`
      SELECT id FROM metas_diarias 
      WHERE user_id = ? AND data = ?
    `).bind(user_id, hoje).all()

    if (metasExistentes.length > 0) {
      console.log(`ℹ️  Já existem ${metasExistentes.length} metas diárias para hoje`)
      return c.json({ message: 'Metas diárias já existem para hoje', criadas: 0 })
    }

    // ✅ CORREÇÃO v19.6: Buscar ciclo_id correspondente para cada meta
    const metasCriadas = []
    for (const metaSemanal of metasSemanais) {
      // Buscar ciclo_id correspondente à disciplina e tipo
      const ciclo = await DB.prepare(`
        SELECT id FROM ciclos_estudo 
        WHERE plano_id = ? 
          AND disciplina_id = ? 
          AND tipo = ?
        LIMIT 1
      `).bind(
        metaSemanal.plano_id,
        metaSemanal.disciplina_id,
        metaSemanal.tipo
      ).first()

      if (!ciclo) {
        console.warn(`⚠️  Ciclo não encontrado para ${metaSemanal.disciplina_nome} (${metaSemanal.tipo})`)
        continue
      }

      try {
        const result = await DB.prepare(`
          INSERT INTO metas_diarias (
            user_id, plano_id, data, ciclo_id
          ) VALUES (?, ?, ?, ?)
        `).bind(
          user_id,
          metaSemanal.plano_id,
          hoje,
          ciclo.id
        ).run()

        metasCriadas.push({
          id: result.meta.last_row_id,
          disciplina: metaSemanal.disciplina_nome,
          tipo: metaSemanal.tipo,
          tempo: metaSemanal.tempo_minutos
        })
      } catch (insertError) {
        // Se der erro de UNIQUE constraint, significa que meta já existe - ignorar
        if (insertError.message.includes('UNIQUE constraint failed')) {
          console.log(`ℹ️  Meta já existe para ${metaSemanal.disciplina_nome} (${metaSemanal.tipo})`)
        } else {
          throw insertError // Re-lançar outros erros
        }
      }
    }

    console.log(`✅ ${metasCriadas.length} metas diárias criadas a partir das metas semanais`)

    return c.json({
      message: 'Metas diárias sincronizadas com sucesso',
      criadas: metasCriadas.length,
      metas: metasCriadas
    })

  } catch (error) {
    console.error('❌ Erro ao sincronizar metas:', error)
    return c.json({ error: 'Erro ao sincronizar metas' }, 500)
  }
})

// 2. Buscar metas de uma semana
app.get('/api/metas/semana/:semana_id', async (c) => {
  const { DB } = c.env
  const semana_id = parseInt(c.req.param('semana_id'))

  try {
    // Buscar informações da semana
    const semana = await DB.prepare(
      'SELECT * FROM semanas_estudo WHERE id = ?'
    ).bind(semana_id).first()

    if (!semana) {
      return c.json({ error: 'Semana não encontrada' }, 404)
    }

    // Buscar metas da semana
    const { results: metas } = await DB.prepare(`
      SELECT 
        ms.*,
        d.nome as disciplina_nome,
        ce.id as conteudo_id
      FROM metas_semana ms
      JOIN disciplinas d ON ms.disciplina_id = d.id
      LEFT JOIN conteudo_estudo ce ON ms.conteudo_id = ce.id
      WHERE ms.semana_id = ?
      ORDER BY ms.dia_semana, ms.ordem
    `).bind(semana_id).all()

    return c.json({
      semana,
      metas: metas.map(m => ({
        ...m,
        topicos_sugeridos: m.topicos_sugeridos ? JSON.parse(m.topicos_sugeridos) : []
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao buscar metas da semana:', error)
    return c.json({ error: 'Erro ao buscar metas da semana' }, 500)
  }
})

// 3. Buscar semana ativa do usuário
app.get('/api/metas/semana-ativa/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))

  try {
    // ✅ CORREÇÃO: Buscar plano ativo do usuário primeiro
    const planoAtivo = await DB.prepare(`
      SELECT id FROM planos_estudo 
      WHERE user_id = ? AND ativo = 1 
      ORDER BY created_at DESC LIMIT 1
    `).bind(user_id).first()
    
    if (!planoAtivo) {
      console.log(`⚠️ Nenhum plano ativo para user_id ${user_id}`)
      return c.json({ semana: null, metas: [] })
    }

    // ✅ CORREÇÃO: Buscar semana ativa DO PLANO ATIVO (não apenas do usuário)
    const semana = await DB.prepare(`
      SELECT * FROM semanas_estudo 
      WHERE user_id = ? 
      AND plano_id = ?
      AND status = 'ativa'
      ORDER BY id DESC
      LIMIT 1
    `).bind(user_id, planoAtivo.id).first()

    if (!semana) {
      console.log(`ℹ️ Nenhuma semana ativa para plano ${planoAtivo.id}`)
      return c.json({ semana: null, metas: [], plano_id: planoAtivo.id })
    }

    // Buscar metas da semana com conteudo_id (sem duplicatas)
    const { results: metas } = await DB.prepare(`
      SELECT 
        ms.*,
        d.nome as disciplina_nome,
        (SELECT id FROM conteudo_estudo WHERE meta_id = ms.id LIMIT 1) as conteudo_id
      FROM metas_semana ms
      JOIN disciplinas d ON ms.disciplina_id = d.id
      WHERE ms.semana_id = ?
      GROUP BY ms.id
      ORDER BY ms.dia_semana, ms.ordem
    `).bind(semana.id).all()

    return c.json({
      semana,
      metas: metas.map(m => ({
        ...m,
        topicos_sugeridos: m.topicos_sugeridos ? JSON.parse(m.topicos_sugeridos) : []
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao buscar semana ativa:', error)
    return c.json({ error: 'Erro ao buscar semana ativa' }, 500)
  }
})

// 4. Remanejar meta (drag-and-drop)
app.put('/api/metas/remanejar/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { novo_dia_semana, nova_data, nova_ordem } = await c.req.json()

  console.log('🔄 Remanejando meta:', { meta_id, novo_dia_semana, nova_data, nova_ordem })

  try {
    await DB.prepare(`
      UPDATE metas_semana 
      SET dia_semana = ?, data = ?, ordem = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(novo_dia_semana, nova_data, nova_ordem || 0, meta_id).run()

    return c.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao remanejar meta:', error)
    return c.json({ error: 'Erro ao remanejar meta' }, 500)
  }
})

// 5. Editar meta
app.put('/api/metas/editar/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { tempo_minutos, tipo, topicos_sugeridos, observacoes } = await c.req.json()

  console.log('✏️ Editando meta:', { meta_id, tempo_minutos, tipo })

  try {
    // Buscar meta atual para calcular diferença de tempo
    const metaAtual = await DB.prepare('SELECT * FROM metas_semana WHERE id = ?').bind(meta_id).first()
    
    if (!metaAtual) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // Atualizar meta
    await DB.prepare(`
      UPDATE metas_semana 
      SET 
        tempo_minutos = ?,
        tipo = ?,
        topicos_sugeridos = ?,
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      tempo_minutos || metaAtual.tempo_minutos,
      tipo || metaAtual.tipo,
      topicos_sugeridos ? JSON.stringify(topicos_sugeridos) : metaAtual.topicos_sugeridos,
      observacoes || metaAtual.observacoes,
      meta_id
    ).run()

    // Atualizar tempo total da semana se tempo mudou
    if (tempo_minutos && tempo_minutos !== metaAtual.tempo_minutos) {
      const diferenca = tempo_minutos - metaAtual.tempo_minutos
      await DB.prepare(`
        UPDATE semanas_estudo 
        SET tempo_total_minutos = tempo_total_minutos + ?
        WHERE id = ?
      `).bind(diferenca, metaAtual.semana_id).run()
    }

    return c.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao editar meta:', error)
    return c.json({ error: 'Erro ao editar meta' }, 500)
  }
})

// 6. Excluir meta
app.delete('/api/metas/excluir/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))

  console.log('🗑️ Excluindo meta:', meta_id)

  try {
    // Trigger já atualiza os totais da semana automaticamente
    await DB.prepare('DELETE FROM metas_semana WHERE id = ?').bind(meta_id).run()

    return c.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao excluir meta:', error)
    return c.json({ error: 'Erro ao excluir meta' }, 500)
  }
})

// 7. Adicionar nova meta
app.post('/api/metas/adicionar', async (c) => {
  const { DB } = c.env
  const { semana_id, user_id, disciplina_id, dia_semana, data, tipo, tempo_minutos, topicos_sugeridos } = await c.req.json()

  console.log('➕ Adicionando nova meta:', { semana_id, disciplina_id, dia_semana, tipo })

  try {
    // Buscar ordem máxima do dia
    const maxOrdem = await DB.prepare(`
      SELECT COALESCE(MAX(ordem), -1) as max_ordem
      FROM metas_semana
      WHERE semana_id = ? AND dia_semana = ?
    `).bind(semana_id, dia_semana).first()

    const novaOrdem = (maxOrdem?.max_ordem || 0) + 1

    // Inserir meta (trigger atualiza totais automaticamente)
    const result = await DB.prepare(`
      INSERT INTO metas_semana (
        semana_id, user_id, disciplina_id, dia_semana, data,
        tipo, tempo_minutos, topicos_sugeridos, ordem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      semana_id,
      user_id,
      disciplina_id,
      dia_semana,
      data,
      tipo,
      tempo_minutos,
      JSON.stringify(topicos_sugeridos || []),
      novaOrdem
    ).run()

    return c.json({ id: result.meta.last_row_id, success: true })

  } catch (error) {
    console.error('❌ Erro ao adicionar meta:', error)
    return c.json({ error: 'Erro ao adicionar meta' }, 500)
  }
})

// 8. Marcar meta como concluída
app.put('/api/metas/concluir/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { tempo_real_minutos } = await c.req.json()

  console.log('✅ Concluindo meta:', { meta_id, tempo_real_minutos })

  try {
    // 1. Buscar dados da meta
    const meta = await DB.prepare(`
      SELECT user_id, data, disciplina_id 
      FROM metas_semana 
      WHERE id = ?
    `).bind(meta_id).first()
    
    if (!meta) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // 2. Atualizar meta como concluída
    await DB.prepare(`
      UPDATE metas_semana 
      SET concluida = 1, tempo_real_minutos = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tempo_real_minutos, meta_id).run()

    // 3. Criar/atualizar registro no historico_estudos (para estatísticas)
    const dataFormatada = meta.data // Já está no formato YYYY-MM-DD
    
    // Verificar se já existe registro para esse dia
    const registroExistente = await DB.prepare(`
      SELECT id, tempo_estudado_minutos 
      FROM historico_estudos 
      WHERE user_id = ? AND data = ?
    `).bind(meta.user_id, dataFormatada).first()
    
    if (registroExistente) {
      // Atualizar registro existente (somar minutos)
      await DB.prepare(`
        UPDATE historico_estudos 
        SET tempo_estudado_minutos = tempo_estudado_minutos + ?,
            status = 'concluido',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(tempo_real_minutos, registroExistente.id).run()
    } else {
      // Criar novo registro
      await DB.prepare(`
        INSERT INTO historico_estudos (user_id, data, tempo_estudado_minutos, status, percentual_conclusao)
        VALUES (?, ?, ?, 'concluido', 100)
      `).bind(meta.user_id, dataFormatada, tempo_real_minutos).run()
    }

    console.log('✅ Meta concluída + Histórico atualizado')
    return c.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao concluir meta:', error)
    return c.json({ error: 'Erro ao concluir meta' }, 500)
  }
})

// 8.5. Atualizar tópico sugerido da meta (trocar por outro estudado)
app.put('/api/metas/atualizar-topico/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { topico_id, topico_nome } = await c.req.json()

  console.log('🔄 Atualizando tópico da meta:', meta_id, '→', topico_nome)

  try {
    // Buscar meta atual
    const meta = await DB.prepare('SELECT topicos_sugeridos FROM metas_semana WHERE id = ?')
      .bind(meta_id).first()
    
    if (!meta) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // Criar novo array de tópicos com o tópico atualizado
    const novoTopico = JSON.stringify([{ id: topico_id, nome: topico_nome }])
    
    // Atualizar a meta com o novo tópico
    await DB.prepare(`
      UPDATE metas_semana 
      SET topicos_sugeridos = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(novoTopico, meta_id).run()

    console.log('✅ Tópico da meta atualizado')
    return c.json({ success: true, topico_nome })

  } catch (error) {
    console.error('❌ Erro ao atualizar tópico da meta:', error)
    return c.json({ error: 'Erro ao atualizar tópico' }, 500)
  }
})

// 9. Desmarcar meta como concluída
app.put('/api/metas/desmarcar/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))

  console.log('↩️ Desmarcando meta:', meta_id)

  try {
    // 1. Buscar dados da meta (incluindo tempo_real_minutos)
    const meta = await DB.prepare(`
      SELECT user_id, data, tempo_real_minutos 
      FROM metas_semana 
      WHERE id = ?
    `).bind(meta_id).first()
    
    if (!meta) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // 2. Desmarcar meta
    await DB.prepare(`
      UPDATE metas_semana 
      SET concluida = 0, tempo_real_minutos = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(meta_id).run()

    // 3. Atualizar historico_estudos (subtrair minutos)
    if (meta.tempo_real_minutos && meta.tempo_real_minutos > 0) {
      const dataFormatada = meta.data
      
      const registroHistorico = await DB.prepare(`
        SELECT id, tempo_estudado_minutos 
        FROM historico_estudos 
        WHERE user_id = ? AND data = ?
      `).bind(meta.user_id, dataFormatada).first()
      
      if (registroHistorico) {
        const novoTempo = Math.max(0, registroHistorico.tempo_estudado_minutos - meta.tempo_real_minutos)
        
        if (novoTempo === 0) {
          // Se zerou, deletar registro
          await DB.prepare(`
            DELETE FROM historico_estudos WHERE id = ?
          `).bind(registroHistorico.id).run()
        } else {
          // Se ainda tem tempo, atualizar
          await DB.prepare(`
            UPDATE historico_estudos 
            SET tempo_estudado_minutos = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(novoTempo, registroHistorico.id).run()
        }
      }
    }

    console.log('↩️ Meta desmarcada + Histórico ajustado')
    return c.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao desmarcar meta:', error)
    return c.json({ error: 'Erro ao desmarcar meta' }, 500)
  }
})

// ============== ROTAS DE MATERIAIS ==============
// (Movido para seção de materiais_salvos no final do arquivo)

// ============== ROTAS DE DESEMPENHO ==============
app.get('/api/desempenho/user/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')

  const { results } = await DB.prepare(`
    SELECT d.*, disc.nome as disciplina_nome
    FROM desempenho d
    JOIN disciplinas disc ON d.disciplina_id = disc.id
    WHERE d.user_id = ?
    ORDER BY d.data_avaliacao DESC
  `).bind(user_id).all()

  return c.json(results)
})

app.post('/api/desempenho', async (c) => {
  const { DB } = c.env
  const { user_id, disciplina_id, nivel, tipo_avaliacao } = await c.req.json()
  const hoje = new Date().toISOString().split('T')[0]

  await DB.prepare(`
    INSERT INTO desempenho (user_id, disciplina_id, nivel, data_avaliacao, tipo_avaliacao)
    VALUES (?, ?, ?, ?, ?)
  `).bind(user_id, disciplina_id, nivel, hoje, tipo_avaliacao).run()

  // Atualizar nível na tabela user_disciplinas
  await DB.prepare(`
    UPDATE user_disciplinas
    SET nivel_atual = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND disciplina_id = ?
  `).bind(nivel, user_id, disciplina_id).run()

  return c.json({ success: true })
})

// ============== ROTAS DE CONTEÚDO GERADO POR IA ==============
app.post('/api/conteudo/gerar', async (c) => {
  const { DB } = c.env
  const requestData = await c.req.json()
  const { meta_id, user_id, disciplina_id, tipo, tempo_minutos, topicos: topicosRequest, config_ia } = requestData

  // Carregar configuração de personalização da IA
  const iaConfig = config_ia || {
    tom: 'didatico',
    temperatura: 0.5,
    intensidade: 'intermediaria',
    profundidade: 'aplicada',
    extensao: 'medio',
    formatoTeoria: 'completa'
  }

  console.log('📥 /api/conteudo/gerar - Dados recebidos:', { meta_id, user_id, disciplina_id, tipo, tempo_minutos, topicos: topicosRequest })
  console.log('🎆 Configuração de IA:', iaConfig)

  try {
    // Verificar se a meta existe (metas_diarias OU metas_semana)
    const metaDiaria = await DB.prepare('SELECT id FROM metas_diarias WHERE id = ?').bind(meta_id).first()
    const metaSemanal = await DB.prepare('SELECT id FROM metas_semana WHERE id = ?').bind(meta_id).first()
    
    if (!metaDiaria && !metaSemanal) {
      console.error(`❌ Meta ${meta_id} não encontrada em metas_diarias nem metas_semana`)
      return c.json({ error: `Meta ${meta_id} não encontrada` }, 404)
    }
    console.log(`✅ Meta ${meta_id} existe em ${metaDiaria ? 'metas_diarias' : 'metas_semana'}`)
    
    // Buscar informações da disciplina
    const disciplina = await DB.prepare('SELECT * FROM disciplinas WHERE id = ?').bind(disciplina_id).first()
    const userDisc = await DB.prepare(
      'SELECT * FROM user_disciplinas WHERE user_id = ? AND disciplina_id = ?'
    ).bind(user_id, disciplina_id).first()

    if (!disciplina) {
      return c.json({ error: 'Disciplina não encontrada' }, 404)
    }

    // 🎯 Buscar tópicos AINDA NÃO GERADOS para esta disciplina
    const { results: topicosJaGerados } = await DB.prepare(`
      SELECT DISTINCT json_each.value as topico_nome
      FROM conteudo_estudo, json_each(conteudo_estudo.topicos)
      WHERE conteudo_estudo.user_id = ? 
      AND conteudo_estudo.disciplina_id = ?
      AND conteudo_estudo.created_at >= date('now', '-7 days')
    `).bind(user_id, disciplina_id).all()
    
    const nomesJaGerados = topicosJaGerados.map((t: any) => t.topico_nome)
    console.log(`🚫 Tópicos já gerados recentemente (últimos 7 dias): ${nomesJaGerados.join(', ') || 'nenhum'}`)

    // Buscar tópicos disponíveis EXCLUINDO os já gerados
    let topicosQuery = `
      SELECT te.id, te.nome, te.categoria, te.peso
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.user_id = ?
      WHERE te.disciplina_id = ?
    `
    
    // Adicionar filtro para excluir tópicos já gerados
    if (nomesJaGerados.length > 0) {
      const placeholders = nomesJaGerados.map(() => '?').join(',')
      topicosQuery += ` AND te.nome NOT IN (${placeholders})`
    }
    
    topicosQuery += `
      ORDER BY 
        COALESCE(utp.nivel_dominio, 0) ASC,
        te.peso DESC,
        te.ordem ASC
      LIMIT 3
    `
    
    const bindings = [user_id, disciplina_id, ...nomesJaGerados]
    const { results: topicosEdital } = await DB.prepare(topicosQuery).bind(...bindings).all()

    console.log(`📚 Tópicos NOVOS encontrados: ${topicosEdital.map((t: any) => t.nome).join(', ') || 'nenhum disponível'}`)
    
    // Se não houver tópicos novos, buscar os mais antigos (resetar ciclo)
    if (topicosEdital.length === 0) {
      console.log('🔄 Todos tópicos já foram gerados, reiniciando ciclo...')
      const { results: todosTopicos } = await DB.prepare(`
        SELECT te.id, te.nome, te.categoria, te.peso
        FROM topicos_edital te
        WHERE te.disciplina_id = ?
        ORDER BY te.peso DESC, te.ordem ASC
        LIMIT 3
      `).bind(disciplina_id).all()
      topicosEdital.push(...todosTopicos)
    }

    // Buscar contexto da entrevista (concurso/cargo/área)
    const interview = await DB.prepare(`
      SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(user_id).first()

    // Gerar conteúdo baseado no tipo, tempo, contexto, TÓPICOS ESPECÍFICOS E CONFIGURAÇÃO DE IA
    console.log('🤖 Gerando conteúdo IA focado nos tópicos prioritários...')
    const conteudo = await gerarConteudoIA(disciplina, userDisc, tipo, tempo_minutos, interview, c.env, topicosEdital, iaConfig)
    console.log('✅ Conteúdo IA gerado:', { 
      topicos: conteudo.topicos, 
      objetivos: conteudo.objetivos,
      numSecoes: conteudo.conteudo?.secoes?.length 
    })

    // Salvar no banco
    console.log('💾 Tentando salvar no banco:', { user_id, meta_id, disciplina_id, tipo, tempo_minutos })
    
    let result;
    try {
      result = await DB.prepare(`
        INSERT INTO conteudo_estudo (user_id, meta_id, disciplina_id, tipo, tempo_minutos, conteudo, topicos, objetivos, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
      `).bind(
        user_id,
        meta_id,
        disciplina_id,
        tipo,
        tempo_minutos,
        JSON.stringify(conteudo.conteudo),
        JSON.stringify(conteudo.topicos),
        JSON.stringify(conteudo.objetivos)
      ).run()
      
      console.log('✅ Conteúdo salvo com ID:', result.meta.last_row_id)
    } catch (insertError) {
      console.error('❌ Erro no INSERT:', insertError)
      console.error('Valores sendo inseridos:', { 
        user_id, 
        meta_id, 
        disciplina_id, 
        tipo, 
        tempo_minutos,
        conteudo_length: JSON.stringify(conteudo.conteudo).length,
        topicos_length: JSON.stringify(conteudo.topicos).length
      })
      throw insertError
    }

    // Marcar meta como tendo conteúdo gerado (verifica ambas tabelas)
    if (metaDiaria) {
      await DB.prepare('UPDATE metas_diarias SET conteudo_gerado = 1 WHERE id = ?').bind(meta_id).run()
    }
    if (metaSemanal) {
      await DB.prepare('UPDATE metas_semana SET conteudo_gerado = 1 WHERE id = ?').bind(meta_id).run()
    }
    
    // Vincular conteúdo aos tópicos do edital
    const conteudo_id = result.meta.last_row_id
    await vincularConteudoTopicos(DB, conteudo_id, disciplina_id, conteudo.topicos)

    return c.json({
      id: conteudo_id,
      tipo,
      disciplina_id,
      topicos: conteudo.topicos,
      objetivos: conteudo.objetivos,
      conteudo: conteudo.conteudo
    })
  } catch (error) {
    console.error('Erro ao gerar conteúdo:', error)
    return c.json({ error: 'Erro ao gerar conteúdo de estudo' }, 500)
  }
})

app.get('/api/conteudo/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = c.req.param('meta_id')

  // Buscar conteúdo mais recente para essa meta
  const conteudo = await DB.prepare(
    'SELECT * FROM conteudo_estudo WHERE meta_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(meta_id).first()

  if (!conteudo) {
    return c.json({ error: 'Conteúdo não encontrado' }, 404)
  }

  return c.json({
    ...conteudo,
    conteudo: JSON.parse(conteudo.conteudo),
    topicos: JSON.parse(conteudo.topicos),
    objetivos: JSON.parse(conteudo.objetivos)
  })
})

// ENDPOINT DUPLICADO REMOVIDO - usando o de cima (linha 2296) que tem paginação

// Buscar conteúdo por ID (com tópicos do edital vinculados)
app.get('/api/conteudos/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const format = c.req.query('format') || 'json'

  // Buscar conteúdo com JOIN para pegar nome da disciplina
  const conteudo = await DB.prepare(`
    SELECT ce.*, d.nome as disciplina_nome
    FROM conteudo_estudo ce
    JOIN disciplinas d ON d.id = ce.disciplina_id
    WHERE ce.id = ?
  `).bind(id).first()

  if (!conteudo) {
    return c.json({ error: 'Conteúdo não encontrado' }, 404)
  }

  // 🆕 Buscar tópicos do edital vinculados
  const { results: topicosVinculados } = await DB.prepare(`
    SELECT te.id, te.nome, te.categoria, te.peso, te.ordem
    FROM conteudo_topicos ct
    JOIN topicos_edital te ON ct.topico_id = te.id
    WHERE ct.conteudo_id = ?
    ORDER BY te.ordem
  `).bind(id).all()

  const resultado = {
    ...conteudo,
    conteudo: JSON.parse(conteudo.conteudo),
    topicos: JSON.parse(conteudo.topicos),
    objetivos: JSON.parse(conteudo.objetivos),
    topicos_edital: topicosVinculados || []
  }

  // Suporte a diferentes formatos
  if (format === 'txt') {
    const txt = gerarTXT(resultado)
    const nomeArquivo = `${conteudo.disciplina_nome || 'conteudo'}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.txt`
    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`
      }
    })
  }
  
  if (format === 'markdown') {
    const md = gerarMarkdown(resultado)
    const nomeArquivo = `${conteudo.disciplina_nome || 'conteudo'}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.md`
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`
      }
    })
  }
  
  if (format === 'html') {
    const html = gerarHTML(resultado)
    return c.html(html)
  }

  return c.json(resultado)
})

// GET /api/conteudos/tipos/:disciplina_id/:topico_id - Buscar tipos de conteúdo gerados
// Retorna quais tipos (teoria, exercicios, resumo, flashcards) foram gerados para um tópico
app.get('/api/conteudos/tipos/:disciplina_id/:topico_id', async (c) => {
  const { DB } = c.env
  const disciplina_id = parseInt(c.req.param('disciplina_id'))
  const topico_id = c.req.param('topico_id')
  const user_id = c.req.query('user_id')

  try {
    // Buscar conteúdos que contêm este tópico (nos topicos JSON)
    const { results } = await DB.prepare(`
      SELECT DISTINCT tipo, id, created_at
      FROM conteudo_estudo 
      WHERE disciplina_id = ? 
      AND user_id = ?
      AND topicos LIKE ?
      ORDER BY created_at DESC
    `).bind(disciplina_id, user_id, `%"id":${topico_id}%`).all()

    // Também buscar por meta_id se houver
    const { results: byMeta } = await DB.prepare(`
      SELECT DISTINCT ce.tipo, ce.id, ce.created_at
      FROM conteudo_estudo ce
      JOIN metas_semana ms ON ce.meta_id = ms.id
      WHERE ms.disciplina_id = ?
      AND ce.user_id = ?
    `).bind(disciplina_id, user_id).all()

    // Combinar resultados únicos
    const tiposMap: Record<string, { id: number, created_at: string }> = {}
    
    for (const r of [...results, ...byMeta]) {
      if (!tiposMap[r.tipo]) {
        tiposMap[r.tipo] = { id: r.id as number, created_at: r.created_at as string }
      }
    }

    return c.json({
      disciplina_id,
      topico_id,
      tipos_gerados: tiposMap,
      tem_teoria: !!tiposMap['teoria'],
      tem_exercicios: !!tiposMap['exercicios'],
      tem_resumo: !!tiposMap['resumo'],
      tem_flashcards: !!tiposMap['flashcards']
    })
  } catch (error: any) {
    console.error('Erro ao buscar tipos de conteúdo:', error)
    return c.json({ error: error.message }, 500)
  }
})

// GET /api/conteudos/meta/:meta_id - Buscar conteúdos gerados para uma meta específica
// Busca de conteudo_estudo E materiais_salvos (por meta_id direto ou disciplina/topico)
app.get('/api/conteudos/meta/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))

  try {
    // 1. Buscar de conteudo_estudo
    const { results: fromConteudoEstudo } = await DB.prepare(`
      SELECT id, tipo, created_at, disciplina_id, 'conteudo_estudo' as source
      FROM conteudo_estudo 
      WHERE meta_id = ?
      ORDER BY created_at DESC
    `).bind(meta_id).all()

    // 2. Buscar de materiais_salvos DIRETO pelo meta_id (mais confiável)
    const { results: fromMateriaisMetaId } = await DB.prepare(`
      SELECT id, tipo, created_at, disciplina_id, 'materiais_salvos' as source
      FROM materiais_salvos 
      WHERE meta_id = ?
      ORDER BY created_at DESC
    `).bind(meta_id).all()

    // 3. Buscar info da meta para fallback por disciplina/tópico
    const meta = await DB.prepare(`
      SELECT disciplina_id, topicos_sugeridos 
      FROM metas_semana 
      WHERE id = ?
    `).bind(meta_id).first()

    let fromMateriaisFallback: any[] = []
    if (meta && fromMateriaisMetaId.length === 0) {
      // Fallback: buscar de materiais_salvos pela disciplina e tópico
      const topicos = meta.topicos_sugeridos ? JSON.parse(meta.topicos_sugeridos as string) : []
      const topicoId = topicos[0]?.id
      
      if (topicoId && topicoId > 0) {
        const { results } = await DB.prepare(`
          SELECT id, tipo, created_at, disciplina_id, 'materiais_salvos' as source
          FROM materiais_salvos 
          WHERE disciplina_id = ? AND topico_id = ? AND meta_id IS NULL
          ORDER BY created_at DESC
        `).bind(meta.disciplina_id, topicoId).all()
        fromMateriaisFallback = results
      }
    }

    // Combinar resultados (priorizar meta_id direto, depois fallback)
    const allResults = [...fromConteudoEstudo, ...fromMateriaisMetaId, ...fromMateriaisFallback]
    
    // Criar mapa de tipos (primeiro encontrado vence)
    const tiposMap: Record<string, { id: number, source: string }> = {}
    for (const r of allResults) {
      if (!tiposMap[r.tipo as string]) {
        tiposMap[r.tipo as string] = { 
          id: r.id as number, 
          source: r.source as string 
        }
      }
    }

    return c.json({
      meta_id,
      conteudos: allResults,
      tipos_gerados: Object.fromEntries(
        Object.entries(tiposMap).map(([k, v]) => [k, v.id])
      ),
      tipos_sources: tiposMap,
      tem_teoria: !!tiposMap['teoria'],
      tem_exercicios: !!tiposMap['exercicios'],
      tem_resumo: !!tiposMap['resumo'],
      tem_flashcards: !!tiposMap['flashcards']
    })
  } catch (error: any) {
    console.error('Erro ao buscar conteúdos da meta:', error)
    return c.json({ error: error.message }, 500)
  }
})

// DELETE /api/conteudos/:id - Deletar conteúdo
app.delete('/api/conteudos/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  try {
    // Deletar conteúdo
    await DB.prepare('DELETE FROM conteudo_estudo WHERE id = ?').bind(id).run()
    
    // Resetar flag de conteúdo gerado nas metas
    await DB.prepare(`
      UPDATE metas_diarias SET conteudo_gerado = 0, conteudo_id = NULL 
      WHERE conteudo_id = ?
    `).bind(id).run()
    
    await DB.prepare(`
      UPDATE metas_semana SET conteudo_gerado = 0, conteudo_id = NULL 
      WHERE conteudo_id = ?
    `).bind(id).run()

    return c.json({ sucesso: true, mensagem: 'Conteúdo deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar conteúdo:', error)
    return c.json({ erro: error.message }, 500)
  }
})

// GET /api/materiais/ver/:id - Visualizar material por ID
app.get('/api/materiais/ver/:id', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))

  try {
    const material = await DB.prepare(`
      SELECT m.*, d.nome as disciplina_nome, t.nome as topico_nome
      FROM materiais_salvos m
      LEFT JOIN disciplinas d ON m.disciplina_id = d.id
      LEFT JOIN topicos_edital t ON m.topico_id = t.id
      WHERE m.id = ?
    `).bind(id).first()

    if (!material) {
      return c.json({ error: 'Material não encontrado' }, 404)
    }

    return c.json(material)
  } catch (error: any) {
    console.error('Erro ao buscar material:', error)
    return c.json({ error: error.message }, 500)
  }
})

// GET /api/conteudos/meta/:metaId - Buscar conteúdos gerados para uma meta
app.get('/api/conteudos/meta/:metaId', async (c) => {
  const { DB } = c.env
  const metaId = parseInt(c.req.param('metaId'))
  const user_id = c.req.header('X-User-ID')
  
  try {
    // Buscar todos os materiais salvos para esta meta
    const { results: materiais } = await DB.prepare(`
      SELECT id, tipo, titulo, created_at
      FROM materiais_salvos
      WHERE meta_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `).bind(metaId, parseInt(user_id || '0')).all()
    
    // Organizar por tipo
    const conteudos: any = {
      teoria: null,
      exercicios: null,
      resumo: null,
      flashcards: null
    }
    
    // Pegar o mais recente de cada tipo
    for (const material of materiais) {
      if (!conteudos[material.tipo]) {
        conteudos[material.tipo] = {
          id: material.id,
          titulo: material.titulo,
          gerado_em: material.created_at
        }
      }
    }
    
    // Formato esperado pelo frontend
    const tipos_gerados: any = {}
    const tipos_sources: any = {}
    
    if (conteudos.teoria) {
      tipos_gerados.teoria = conteudos.teoria.id
      tipos_sources.teoria = { id: conteudos.teoria.id, source: 'materiais_salvos' }
    }
    if (conteudos.exercicios) {
      tipos_gerados.exercicios = conteudos.exercicios.id
      tipos_sources.exercicios = { id: conteudos.exercicios.id, source: 'materiais_salvos' }
    }
    if (conteudos.resumo) {
      tipos_gerados.resumo = conteudos.resumo.id
      tipos_sources.resumo = { id: conteudos.resumo.id, source: 'materiais_salvos' }
    }
    if (conteudos.flashcards) {
      tipos_gerados.flashcards = conteudos.flashcards.id
      tipos_sources.flashcards = { id: conteudos.flashcards.id, source: 'materiais_salvos' }
    }
    
    return c.json({
      meta_id: metaId,
      tipos_gerados,
      tipos_sources,
      tem_teoria: conteudos.teoria !== null,
      tem_exercicios: conteudos.exercicios !== null,
      tem_resumo: conteudos.resumo !== null,
      tem_flashcards: conteudos.flashcards !== null
    })
  } catch (error: any) {
    console.error('Erro ao buscar conteúdos da meta:', error)
    return c.json({ error: error.message }, 500)
  }
})

// ============== GOOGLE DRIVE SYNC ==============

// Exportar dados do usuário para backup
app.get('/api/backup/export/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  
  try {
    console.log(`📦 Exportando dados do usuário ${user_id}...`)
    
    // Buscar todos os dados do usuário
    const user = await DB.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').bind(user_id).first()
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    // Buscar entrevistas
    const { results: interviews } = await DB.prepare('SELECT * FROM interviews WHERE user_id = ?').bind(user_id).all()
    
    // Buscar planos
    const { results: planos } = await DB.prepare('SELECT * FROM planos_estudo WHERE user_id = ?').bind(user_id).all()
    
    // Buscar ciclos de estudo
    const planoIds = planos.map((p: any) => p.id).join(',') || '0'
    const { results: ciclos } = await DB.prepare(`SELECT * FROM ciclos_estudo WHERE plano_id IN (${planoIds})`).all()
    
    // Buscar disciplinas do usuário
    const { results: userDisciplinas } = await DB.prepare('SELECT * FROM user_disciplinas WHERE user_id = ?').bind(user_id).all()
    
    // Buscar histórico de estudos
    const { results: historico } = await DB.prepare('SELECT * FROM historico_estudos WHERE user_id = ?').bind(user_id).all()
    
    // Buscar metas
    const { results: metasDiarias } = await DB.prepare('SELECT * FROM metas_diarias WHERE user_id = ?').bind(user_id).all()
    const { results: metasSemana } = await DB.prepare('SELECT * FROM metas_semana WHERE user_id = ?').bind(user_id).all()
    const { results: semanas } = await DB.prepare('SELECT * FROM semanas_estudo WHERE user_id = ?').bind(user_id).all()
    
    // Buscar simulados (tabela correta: simulados_historico)
    const { results: simulados } = await DB.prepare('SELECT * FROM simulados_historico WHERE user_id = ?').bind(user_id).all()
    
    // Buscar progresso em tópicos
    const { results: progressoTopicos } = await DB.prepare('SELECT * FROM user_topicos_progresso WHERE user_id = ?').bind(user_id).all()
    
    // Buscar conteúdos gerados
    const { results: conteudos } = await DB.prepare('SELECT * FROM conteudo_estudo WHERE user_id = ?').bind(user_id).all()
    
    // Buscar exercícios
    const { results: exercicios } = await DB.prepare('SELECT * FROM exercicios_resultados WHERE user_id = ?').bind(user_id).all()
    
    // Buscar materiais salvos
    const { results: materiais } = await DB.prepare('SELECT * FROM materiais_salvos WHERE user_id = ?').bind(user_id).all()
    
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      },
      data: {
        interviews,
        planos,
        ciclos,
        userDisciplinas,
        historico,
        metasDiarias,
        metasSemana,
        semanas,
        simulados,
        progressoTopicos,
        conteudos,
        exercicios,
        materiais
      },
      stats: {
        totalPlanos: planos.length,
        totalDisciplinas: userDisciplinas.length,
        totalMetas: metasDiarias.length + metasSemana.length,
        totalSimulados: simulados.length,
        diasEstudados: historico.length
      }
    }
    
    console.log(`✅ Backup exportado: ${JSON.stringify(backup.stats)}`)
    
    return c.json(backup)
  } catch (error: any) {
    console.error('Erro ao exportar backup:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Importar dados de backup
app.post('/api/backup/import/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const { backup, mode = 'merge' } = await c.req.json() // mode: 'merge' ou 'replace'
  
  try {
    console.log(`📥 Importando backup para usuário ${user_id}, modo: ${mode}`)
    
    if (!backup || !backup.data) {
      return c.json({ error: 'Backup inválido' }, 400)
    }
    
    // Verificar versão do backup
    if (backup.version !== '1.0') {
      return c.json({ error: 'Versão de backup não suportada' }, 400)
    }
    
    const stats = { inserted: 0, updated: 0, skipped: 0 }
    
    // Se modo 'replace', limpar dados existentes
    if (mode === 'replace') {
      console.log('🗑️ Modo replace: limpando dados existentes...')
      await DB.prepare('DELETE FROM materiais_salvos WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM exercicios_resultados WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM conteudo_estudo WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM user_topicos_progresso WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM simulados_historico WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM metas_semana WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM metas_diarias WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM semanas_estudo WHERE user_id = ?').bind(user_id).run()
      await DB.prepare('DELETE FROM historico_estudos WHERE user_id = ?').bind(user_id).run()
      // Não deletar ciclos, planos, disciplinas e entrevistas para preservar estrutura
    }
    
    // Importar histórico de estudos
    if (backup.data.historico?.length > 0) {
      for (const h of backup.data.historico) {
        try {
          await DB.prepare(`
            INSERT OR REPLACE INTO historico_estudos 
            (user_id, data, metas_total, metas_concluidas, tempo_total_minutos, tempo_estudado_minutos, percentual_conclusao, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(user_id, h.data, h.metas_total, h.metas_concluidas, h.tempo_total_minutos, h.tempo_estudado_minutos, h.percentual_conclusao, h.status).run()
          stats.inserted++
        } catch (e) {
          stats.skipped++
        }
      }
    }
    
    // Importar progresso em tópicos
    if (backup.data.progressoTopicos?.length > 0) {
      for (const p of backup.data.progressoTopicos) {
        try {
          await DB.prepare(`
            INSERT OR REPLACE INTO user_topicos_progresso 
            (user_id, topico_id, nivel_dominio, vezes_estudado, ultima_revisao)
            VALUES (?, ?, ?, ?, ?)
          `).bind(user_id, p.topico_id, p.nivel_dominio, p.vezes_estudado, p.ultima_revisao).run()
          stats.inserted++
        } catch (e) {
          stats.skipped++
        }
      }
    }
    
    // Importar resultados de exercícios
    if (backup.data.exercicios?.length > 0) {
      for (const ex of backup.data.exercicios) {
        try {
          await DB.prepare(`
            INSERT INTO exercicios_resultados 
            (user_id, disciplina_id, topico_id, total_questoes, acertos, percentual, tempo_segundos, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(user_id, ex.disciplina_id, ex.topico_id, ex.total_questoes, ex.acertos, ex.percentual, ex.tempo_segundos, ex.created_at).run()
          stats.inserted++
        } catch (e) {
          stats.skipped++
        }
      }
    }
    
    // Atualizar data do último sync
    await DB.prepare('UPDATE users SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?').bind(user_id).run()
    
    console.log(`✅ Backup importado: ${JSON.stringify(stats)}`)
    
    return c.json({ 
      success: true, 
      message: 'Backup importado com sucesso',
      stats 
    })
  } catch (error: any) {
    console.error('Erro ao importar backup:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Salvar backup no Google Drive
app.post('/api/backup/google-drive/save', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  try {
    // Buscar token do usuário
    const user = await DB.prepare(`
      SELECT google_access_token, google_token_expires 
      FROM users WHERE id = ?
    `).bind(user_id).first() as any
    
    if (!user?.google_access_token) {
      return c.json({ error: 'Conecte sua conta Google primeiro' }, 400)
    }
    
    // Verificar se token expirou
    if (new Date(user.google_token_expires) < new Date()) {
      return c.json({ error: 'Token expirado, reconecte sua conta Google', needsReauth: true }, 401)
    }
    
    // Exportar dados
    const exportResponse = await fetch(`${c.req.url.split('/api')[0]}/api/backup/export/${user_id}`)
    const backup = await exportResponse.json()
    
    // Criar arquivo no Google Drive
    const metadata = {
      name: `iaprova_backup_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
      parents: ['appDataFolder'] // Pasta oculta específica do app
    }
    
    // Primeiro, verificar se já existe um backup anterior
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name contains 'iaprova_backup'`,
      { headers: { 'Authorization': `Bearer ${user.google_access_token}` } }
    )
    const searchResult = await searchResponse.json() as any
    
    let fileId = null
    if (searchResult.files?.length > 0) {
      // Atualizar arquivo existente
      fileId = searchResult.files[0].id
    }
    
    // Upload do arquivo
    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`
    
    const multipartBody = 
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(backup) +
      closeDelimiter
    
    const uploadUrl = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
    
    const uploadResponse = await fetch(uploadUrl, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `Bearer ${user.google_access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    })
    
    const uploadResult = await uploadResponse.json() as any
    
    if (uploadResult.error) {
      console.error('Erro no upload:', uploadResult.error)
      return c.json({ error: 'Falha ao salvar no Google Drive' }, 500)
    }
    
    // Atualizar data do último sync
    await DB.prepare('UPDATE users SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?').bind(user_id).run()
    
    console.log(`✅ Backup salvo no Google Drive: ${uploadResult.id}`)
    
    return c.json({ 
      success: true, 
      message: 'Backup salvo no Google Drive',
      fileId: uploadResult.id,
      fileName: metadata.name
    })
  } catch (error: any) {
    console.error('Erro ao salvar no Google Drive:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Carregar backup do Google Drive
app.post('/api/backup/google-drive/load', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  try {
    const user = await DB.prepare(`
      SELECT google_access_token, google_token_expires 
      FROM users WHERE id = ?
    `).bind(user_id).first() as any
    
    if (!user?.google_access_token) {
      return c.json({ error: 'Conecte sua conta Google primeiro' }, 400)
    }
    
    if (new Date(user.google_token_expires) < new Date()) {
      return c.json({ error: 'Token expirado', needsReauth: true }, 401)
    }
    
    // Buscar arquivo de backup
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name contains 'iaprova_backup'&orderBy=modifiedTime desc`,
      { headers: { 'Authorization': `Bearer ${user.google_access_token}` } }
    )
    const searchResult = await searchResponse.json() as any
    
    if (!searchResult.files?.length) {
      return c.json({ error: 'Nenhum backup encontrado no Google Drive' }, 404)
    }
    
    const fileId = searchResult.files[0].id
    
    // Download do arquivo
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { 'Authorization': `Bearer ${user.google_access_token}` } }
    )
    
    const backup = await downloadResponse.json()
    
    return c.json({ 
      success: true, 
      backup,
      fileInfo: {
        id: fileId,
        name: searchResult.files[0].name,
        modifiedTime: searchResult.files[0].modifiedTime
      }
    })
  } catch (error: any) {
    console.error('Erro ao carregar do Google Drive:', error)
    return c.json({ error: error.message }, 500)
  }
})

// ============== FUNÇÕES AUXILIARES ==============
async function atualizarHistoricoDia(DB: D1Database, user_id: number, data: string) {
  // ✅ CORREÇÃO: Buscar metas de AMBAS as tabelas (metas_diarias E metas_semana)
  // metas_diarias não tem tempo_minutos diretamente, precisa fazer JOIN com ciclos_estudo
  const { results: metasDiarias } = await DB.prepare(`
    SELECT m.id, m.concluida, m.tempo_real_minutos, COALESCE(c.tempo_minutos, 60) as tempo_minutos 
    FROM metas_diarias m 
    LEFT JOIN ciclos_estudo c ON m.ciclo_id = c.id 
    WHERE m.user_id = ? AND m.data = ?
  `).bind(user_id, data).all()
  
  // metas_semana já tem tempo_minutos diretamente
  const { results: metasSemana } = await DB.prepare(
    'SELECT id, concluida, tempo_minutos, tempo_real_minutos FROM metas_semana WHERE user_id = ? AND data = ?'
  ).bind(user_id, data).all()
  
  // Combinar todas as metas do dia
  const todasMetas = [...metasDiarias, ...metasSemana]

  if (todasMetas.length === 0) return

  const metasConcluidas = todasMetas.filter((m: any) => m.concluida).length
  const tempoTotal = todasMetas.reduce((sum: number, m: any) => {
    const ciclo = m.tempo_minutos || 0
    return sum + ciclo
  }, 0)
  const tempoEstudado = todasMetas.reduce((sum: number, m: any) => sum + (m.tempo_real_minutos || 0), 0)
  const percentual = Math.round((metasConcluidas / todasMetas.length) * 100)
  
  let status = 'nao_estudou'
  if (percentual === 100) status = 'completo'
  else if (percentual > 0) status = 'parcial'

  console.log(`📊 Atualizando histórico: user=${user_id}, data=${data}, metas=${todasMetas.length}, concluidas=${metasConcluidas}, tempo=${tempoEstudado}min`)

  await DB.prepare(`
    INSERT OR REPLACE INTO historico_estudos 
    (user_id, data, metas_total, metas_concluidas, tempo_total_minutos, tempo_estudado_minutos, percentual_conclusao, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(user_id, data, todasMetas.length, metasConcluidas, tempoTotal, tempoEstudado, percentual, status).run()
}

async function calcularStreak(DB: D1Database, user_id: number): Promise<number> {
  const { results: historico } = await DB.prepare(`
    SELECT data, status FROM historico_estudos
    WHERE user_id = ? AND status != 'nao_estudou'
    ORDER BY data DESC
    LIMIT 365
  `).bind(user_id).all()

  if (historico.length === 0) return 0

  let streak = 0
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  for (const dia of historico) {
    const dataDia = new Date(dia.data + 'T00:00:00')
    const diffDays = Math.floor((hoje.getTime() - dataDia.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === streak) {
      streak++
    } else {
      break
    }
  }

  return streak
}

// Função auxiliar para inicializar OpenAI client
function getOpenAIClient(env: any) {
  try {
    return new OpenAI({
      apiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
    })
  } catch (error) {
    console.error('❌ Erro ao inicializar OpenAI:', error)
    return null
  }
}

// 🆕 Gerar conteúdo usando Groq (FALLBACK GRATUITO)
async function gerarConteudoComGroq(disciplina: string, tipo: string, tempo_minutos: number, dificuldade: string, contexto: any, env: any, userDisc: any = null, topicos: string[] = []) {
  const GROQ_API_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY
  const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
  
  // Usar Gemini como fallback se Groq não estiver configurado
  const useGemini = !GROQ_API_KEY && GEMINI_API_KEY
  
  if (!GROQ_API_KEY) {
    console.log('⚠️ GROQ_API_KEY não configurada')
    return null
  }

  try {
    console.log('🚀 Gerando conteúdo com Groq API (Llama 3.3 70B - 840 tokens/s)...')
    
    // ✅ CORREÇÃO: usar TODOS os tópicos específicos do edital
    const topicosEspecificos = topicos.length > 0 ? topicos.join(', ') : 'Conteúdo Geral'
    const nivelAluno = userDisc?.nivel_atual || 5
    
    console.log(`📚 Tópicos específicos para Groq: ${topicosEspecificos}`)
    
    const prompt = `Você é um Professor Especialista em Concursos Públicos do Brasil. Gere material de estudo DETALHADO para ${disciplina}.

DADOS DO ALUNO:
- Disciplina: ${disciplina}
- Tópicos Específicos do Edital: ${topicosEspecificos}
- Nível: ${nivelAluno}/10 (${dificuldade})
- Concurso: ${contexto.concurso || contexto.area || 'Concursos Gerais'}
- Tempo: ${tempo_minutos} minutos

⚠️ IMPORTANTE: Gere conteúdo EXCLUSIVAMENTE sobre os tópicos específicos listados acima, não sobre conceitos gerais da disciplina.

${tipo === 'teoria' ? `
GERE TEORIA COMPLETA (mínimo 3000 palavras):
- Conceitos fundamentais detalhados
- Exemplos práticos extensos
- Jurisprudência relevante
- Tabelas comparativas
- Dicas de prova
` : tipo === 'exercicios' ? `
GERE 10+ QUESTÕES DE MÚLTIPLA ESCOLHA:
- Estilo CESPE/FCC/FGV
- 5 alternativas por questão
- Enunciados contextualizados (100+ palavras)
- Explicação detalhada (200+ palavras) para cada
- Fundamentação legal completa
` : `
GERE MATERIAL DE REVISÃO:
- Resumo executivo (800+ palavras)
- 5+ mnemônicos criativos
- 5-8 questões de fixação
`}

**CRÍTICO: Retorne APENAS JSON válido no formato:**
{
  "topicos": ["${topicos[0] || 'Tópico Principal'}"],
  "objetivos": ["Objetivo 1", "Objetivo 2"],
  "conteudo": {
    "introducao": "Introdução contextualizada",
    "secoes": [
      {
        "titulo": "${topicos[0] || 'Seção Principal'}",
        "tempo_estimado": ${tempo_minutos},
        "ordem": 1,
        "conteudo": {
          "teoria_completa": "# Conteúdo em Markdown\\n\\n...",
          "questoes": [
            {
              "enunciado": "Enunciado completo da questão...",
              "alternativas": ["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4", "Alternativa 5"],
              "gabarito": 0,
              "explicacao": "Explicação detalhada..."
            }
          ]
        }
      }
    ],
    "proximos_passos": "Próximos passos recomendados"
  }
}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Modelo gratuito, rápido e poderoso
        messages: [{
          role: 'system',
          content: 'Você é um professor especialista em concursos públicos. Sempre retorne JSON válido.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erro na API do Groq:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const resposta = data.choices?.[0]?.message?.content || ''
    
    if (!resposta) {
      console.error('❌ Groq não retornou conteúdo')
      return null
    }
    
    console.log('✅ Groq respondeu, parseando JSON...')
    
    // 🔧 SANITIZAR JSON: Remover caracteres de controle inválidos
    let jsonText = resposta.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    let resultado
    try {
      resultado = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('❌ Erro no parse do JSON do Groq:', parseError.message)
      return null
    }
    
    if (!resultado.topicos || !resultado.objetivos || !resultado.conteudo?.secoes) {
      console.error('❌ JSON do Groq inválido: faltam campos obrigatórios')
      return null
    }
    
    console.log('✅ Conteúdo gerado com Groq com sucesso!')
    return resultado
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo com Groq:', error)
    return null
  }
}

// Gerar conteúdo usando Gemini GEM (Professor de Concurso Público)
async function gerarConteudoComGPT(disciplina: string, tipo: string, tempo_minutos: number, dificuldade: string, contexto: any, env: any, userDisc: any = null, topicos: string[] = []) {
  const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
  
  if (!GEMINI_API_KEY) {
    console.log('⚠️ GEMINI_API_KEY não configurada')
    return null
  }

  try {
    console.log('🤖 Gerando conteúdo com Gemini API...')
    
    // ✅ CORREÇÃO: usar TODOS os tópicos específicos do edital, não apenas o primeiro
    const topicosEspecificos = topicos.length > 0 ? topicos.join(', ') : 'Conceitos fundamentais'
    const nivelAluno = userDisc?.nivel_atual || 5
    const jaEstudou = userDisc?.ja_estudou ? 'Sim' : 'Não'
    
    console.log(`📚 Tópicos específicos para IA: ${topicosEspecificos}`)
    
    // Identificar se é disciplina jurídica (requer jurisprudência/doutrina)
    const disciplinasJuridicas = [
      'Direito Constitucional', 'Direito Administrativo', 'Direito Tributário',
      'Direito Civil', 'Direito Penal', 'Direito Processual Civil',
      'Direito Processual Penal', 'Direito do Trabalho', 'Direito Empresarial'
    ]
    const ehDisciplinaJuridica = disciplinasJuridicas.some(d => disciplina.includes(d))
    
    // 🎯 PROMPT MASTER V3 - Especialista em Concursos Públicos Brasileiros (Otimizado e Adaptável)
    const systemPrompt = `Você é o PROFESSOR MESTRE EM CONCURSOS PÚBLICOS BRASILEIROS, com 20 anos de experiência em aprovações em concursos de alto nível.

SUAS CREDENCIAIS:
- Aprovado em 15+ concursos públicos de elite (TJ, STJ, Receita Federal, Polícia Federal, INSS)
- Professor de cursinhos preparatórios renomados (Gran Cursos, Estratégia Concursos, CERS)
- Especialista em bancas: CESPE/CEBRASPE, FCC, FGV, VUNESP, IBFC
- Domínio de legislação atualizada${ehDisciplinaJuridica ? ', jurisprudência (STF, STJ) e doutrina' : ' e conteúdo técnico específico'}

SEU OBJETIVO: Criar material de estudo COMPLETO, DETALHADO e ESTRATÉGICO que prepare o aluno para APROVAÇÃO.

PRINCÍPIOS:
1. Profundidade Técnica (sem superficialidade)
2. Contextualização Prática (exemplos reais${ehDisciplinaJuridica ? ', casos concretos' : ', aplicações'})
3. Estratégia de Prova (técnicas por banca)
4. Progressão Pedagógica (básico ao avançado)
5. Memorização Ativa (mnemônicos, esquemas, tabelas)

ADAPTAÇÃO POR DISCIPLINA:
${ehDisciplinaJuridica ? 
'- Para disciplinas JURÍDICAS: Inclua jurisprudência consolidada (STF/STJ), súmulas, doutrina e fundamentação legal completa' : 
'- Para disciplinas NÃO JURÍDICAS: Foque em conceitos técnicos, fórmulas, aplicações práticas, legislação específica quando aplicável (evite forçar jurisprudência onde não se aplica)'}

Sempre retorne JSON válido, estruturado e completo.`

    const prompt = `🎯 MISSÃO: Gere material de estudo COMPLETO e ESTRATÉGICO para concursos públicos

📚 CONTEXTO DO ALUNO:
- Disciplina: ${disciplina}
- Tópicos Específicos do Edital: ${topicosEspecificos}
- Área de Concurso: ${contexto.area || 'Geral'} (${contexto.concurso || 'Concursos Gerais'})
- Cargo Almejado: ${contexto.cargo || 'Não especificado'}
- Nível Atual: ${nivelAluno}/10 (${dificuldade})
- Já Estudou: ${jaEstudou}
- Experiência: ${contexto.experiencia}
- Tempo Disponível: ${tempo_minutos} minutos

⚠️ ATENÇÃO: Gere conteúdo EXCLUSIVAMENTE sobre os tópicos específicos listados acima. Não gere conteúdo genérico sobre a disciplina.

📋 TIPO DE MATERIAL: ${tipo}

---

## DIRETRIZES DE CRIAÇÃO:

${tipo === 'teoria' ? `
### TEORIA COMPLETA (mínimo 3500 palavras - MÁXIMO DETALHAMENTO):

**OBRIGATÓRIO INCLUIR:**
1. **Introdução Contextualizada** (400+ palavras):
   - Importância do tópico em editais recentes
   - Frequência de cobrança por banca (CESPE, FCC, FGV)
   - Peso na prova e conexões com outros tópicos

2. **Conceitos Fundamentais** (800+ palavras):
   - Definições técnicas precisas${ehDisciplinaJuridica ? ' (doutrina + lei)' : ' (legislação + conceitos técnicos)'}
   - Diferenciações cruciais entre conceitos similares
   - Fundamentos ${ehDisciplinaJuridica ? 'constitucionais/' : ''}legais aplicáveis
   - Princípios norteadores

3. **Desenvolvimento Profundo** (1500+ palavras):
   - Explicação detalhada ponto a ponto
   - Mínimo 8 exemplos práticos contextualizados (cenários reais, ${ehDisciplinaJuridica ? 'casos concretos' : 'aplicações práticas'})
   ${ehDisciplinaJuridica ? '- Jurisprudência consolidada (STF, STJ quando relevante)\n   - Súmulas vinculantes e informativos recentes\n   - Posicionamento de autores referência (doutrina)' : '- Metodologias e técnicas aplicáveis\n   - Resolução de problemas típicos\n   - Interpretação correta da legislação'}

4. **Recursos Visuais** (obrigatório):
   - Tabela comparativa (quando aplicável)
   - Esquema de memorização (mapa mental textual)
   - Quadro-resumo de legislação

5. **Mnemônicos** (mínimo 8 CRIATIVOS):
   - Siglas criativas (ex: "LIMPE" para princípios)
   - Frases mnemônicas
   - Associações visuais

6. **Estratégia por Banca**:
   - CESPE: Como cobra (certo/errado, pegadinhas)
   - FCC: Estilo (literal da lei, doutrina)
   - FGV: Características (jurisprudência)

7. **Legislação Aplicável**:
   - Artigos específicos com número e texto
   ${ehDisciplinaJuridica ? '- Súmulas relevantes (quando aplicável)\n   - Jurisprudência recente (quando aplicável)' : '- Normas técnicas e regulamentações\n   - Instruções normativas relevantes'}

8. **Questões Comentadas** (mínimo 5):
   - Questões reais de provas anteriores (preferencialmente recentes)
   - Comentário ULTRA DETALHADO (400+ palavras cada)
   - Explicação minuciosa do erro e do acerto
   - Base legal${ehDisciplinaJuridica ? ' e doutrinária' : ''} completa
   - Estratégia de resolução passo-a-passo
` : tipo === 'exercicios' ? `
### EXERCÍCIOS COMPLETOS (mínimo 15 questões - MÁXIMA QUALIDADE):

**FORMATO POR QUESTÃO:**
- Enunciado contextualizado e realista (120+ palavras, estilo bancas)
- 5 alternativas bem elaboradas (pegadinhas sutis, distratores de qualidade)
- Gabarito identificado
- Comentário ULTRA DETALHADO (500+ palavras POR QUESTÃO):
  * Análise completa da questão e do que a banca quis testar
  * Fundamentação legal COMPLETA (artigos específicos${ehDisciplinaJuridica ? ', súmulas, jurisprudência, doutrina' : ', normas, regulamentos'})
  * Análise INDIVIDUAL de cada uma das 5 alternativas (por que está certa/errada)
  * Pegadinhas e armadilhas comuns
  * Dica estratégica e metodologia de resolução
  * Tópicos relacionados e conexões interdisciplinares

**DISTRIBUIÇÃO (15 questões):**
- 5 questões BÁSICAS (conceitos fundamentais, literais)
- 6 questões INTERMEDIÁRIAS (aplicação prática, ${ehDisciplinaJuridica ? 'casos concretos' : 'problemas típicos'})
- 4 questões AVANÇADAS (${ehDisciplinaJuridica ? 'jurisprudência recente, ' : ''}situações complexas, multidisciplinares)

**BANCAS (15 questões):**
- 5 questões estilo CESPE (certo/errado, pegadinhas literais)
- 4 questões estilo FCC (múltipla escolha, literais)
- 3 questões estilo FGV (aplicação prática${ehDisciplinaJuridica ? ', jurisprudência' : ''})
- 3 questões estilo VUNESP/IBFC (intermediárias)
` : `
### MATERIAL DE REVISÃO:

1. **Resumo Executivo** (600+ palavras)
2. **Mapa Mental Textual** estruturado
3. **Tabela de Memorização Rápida**
4. **Mnemônicos Master** (5+)
5. **Quiz de Fixação** (15 questões objetivas)
${ehDisciplinaJuridica ? '6. **Jurisprudência Essencial** (Top 5 quando aplicável)\n7. **Checklist de Domínio**' : '6. **Conceitos-Chave** (Top 5 essenciais)\n7. **Checklist de Domínio**'}
`}

---

## ADAPTAÇÃO POR NÍVEL:

${nivelAluno <= 3 ? `
**NÍVEL BÁSICO/INICIANTE:**
- Linguagem didática e acessível
- Mais exemplos práticos e analogias
- Conceitos passo-a-passo
- Menos jurisprudência, mais lei seca
- Questões diretas e literais
` : nivelAluno <= 6 ? `
**NÍVEL INTERMEDIÁRIO:**
- Linguagem técnica equilibrada
- Aprofundamento moderado
- Jurisprudência consolidada
- Questões de aplicação prática
- Comparações e diferenciações
` : `
**NÍVEL AVANÇADO:**
- Linguagem técnica especializada
- Máxima profundidade teórica
- Jurisprudência recente e polêmica
- Doutrinas minoritárias
- Questões complexas e multidisciplinares
`}

---

## FORMATO JSON OBRIGATÓRIO:

Retorne APENAS JSON válido (sem markdown, sem texto extra):

{
  "topicos": ["${topicosEspecificos}"],
  "objetivos": [
    "Dominar ${topicosEspecificos} com profundidade",
    "Resolver 90%+ das questões deste tópico",
    "Diferenciar conceitos-chave sem erros"
  ],
  "conteudo": {
    "introducao": "Contextualização completa (200+ palavras)",
    "importancia_editais": "Por que é crucial? Frequência por banca.",
    "orientacoes": ["Dica estratégica 1", "Dica 2", "Como a banca cobra"],
    "secoes": [
      {
        "titulo": "Conceitos Fundamentais",
        "tempo_estimado": 15,
        "ordem": 1,
        "conteudo": {
          "teoria_completa": "## Conceitos\\n\\n[Markdown completo]\\n\\n### Definição Legal\\n...\\n\\n### Doutrina\\n...\\n\\n### Jurisprudência\\n..."
        }
      }
    ],
    "mnemonicos": [
      {
        "topico": "Nome do conceito",
        "tecnica": "SIGLA ou frase",
        "descricao": "O que significa",
        "associacao": "Como memorizar"
      }
    ],
    "legislacao_aplicavel": [
      {
        "lei": "Lei/CF",
        "artigos": "Art. X",
        "texto_relevante": "Texto literal",
        "importancia": "Por que é crucial"
      }
    ],
    "estrategias_banca": {
      "CESPE": "Como cobra este tópico",
      "FCC": "Estilo de questões",
      "FGV": "Características"
    },
    "erros_comuns": ["Erro 1", "Erro 2", "Erro 3"],
    "proximos_passos": "1. Revisar em 24h\\n2. Resolver 10 questões\\n3. Estudar: [Próximo Tópico]"
  }
}

**VALIDAÇÃO CRÍTICA antes de retornar**:
✅ JSON VÁLIDO e COMPLETO (todas as chaves fechadas corretamente)
✅ Conteúdo com teoria clara e objetiva (800-1500 palavras por seção)
✅ Mnemônicos incluídos (3-5 criativos)
✅ Legislação/artigos quando aplicável
✅ Erros comuns e dicas estratégicas

**IMPORTANTE**: 
- Retorne JSON COMPLETO e VÁLIDO
- Feche todas as chaves e colchetes corretamente
- Não corte o conteúdo no meio
- Seja detalhado mas COMPLETE o JSON

Agora gere o material em JSON válido:`

    // Configurar temperatura baseada na iaConfig do usuário
    const temperaturaMap: Record<string, number> = {
      'conservador': 0.3,
      'equilibrado': 0.5,
      'criativo': 0.7,
      'muito_criativo': 0.9
    }
    const temperatura = temperaturaMap[contexto.iaConfig?.temperatura] || contexto.iaConfig?.temperatura || 0.7
    
    // Usar modelo mais potente para melhor qualidade
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    console.log(`🎛️ Configuração IA: temperatura=${temperatura}, tom=${contexto.iaConfig?.tom || 'didatico'}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Entendido! Sou um Professor Mestre em Concursos Públicos. Vou gerar material de altíssima qualidade, detalhado e estratégico em formato JSON válido.' }] },
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: Number(temperatura),  // Usar temperatura da config do usuário
          maxOutputTokens: 8192,  // Máximo para gemini-2.5-flash
          topP: 0.95,
          topK: 40
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Erro Gemini ao gerar conteúdo:', errorData.error || { status: response.status })
      
      // Se for rate limit (429), tentar novamente após delay
      if (response.status === 429) {
        console.log('⏳ Rate limit - aguardando 5 segundos para retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        // Tentar uma vez mais
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              { role: 'model', parts: [{ text: 'Entendido! Sou um Professor Mestre em Concursos Públicos. Vou gerar material de altíssima qualidade.' }] },
              { role: 'user', parts: [{ text: prompt }] }
            ],
            generationConfig: {
              temperature: Number(temperatura),
              maxOutputTokens: 8192,
              topP: 0.95,
              topK: 40
            }
          })
        })
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json()
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text
          if (retryText) {
            console.log('✅ Retry bem sucedido!')
            // Processar como o fluxo normal
            const jsonMatch = retryText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                return JSON.parse(jsonMatch[0])
              } catch {
                console.log('⚠️ JSON do retry inválido')
              }
            }
          }
        }
        console.log('❌ Retry também falhou')
      }
      
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('❌ Resposta vazia do Gemini')
      return null
    }

    console.log('📝 Resposta recebida, parseando JSON...')
    
    // Limpar markdown se existir
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    // 🔧 SANITIZAR JSON: Remover caracteres de controle inválidos
    // Remove control characters except newline (\n), carriage return (\r), and tab (\t)
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Corrigir strings não terminadas (tentar fechar aspas não fechadas)
    const openQuotes = (jsonText.match(/(?<!\\)"/g) || []).length
    if (openQuotes % 2 !== 0) {
      console.warn('⚠️ JSON com número ímpar de aspas, tentando corrigir...')
      // Adiciona aspas faltantes antes de fechar objetos/arrays
      jsonText = jsonText.replace(/([^"\\])([\]}])/g, '$1"$2')
    }
    
    let resultado
    try {
      resultado = JSON.parse(jsonText)
      console.log('✅ Conteúdo gerado com sucesso!')
    } catch (parseError) {
      console.error('❌ Erro no parse do JSON:', parseError.message)
      console.log('🔧 Tentando recuperar JSON incompleto...')
      
      // Tentar recuperar JSON incompleto (comum quando output é truncado)
      try {
        // Encontrar última estrutura válida
        let lastValidIndex = jsonText.length - 1
        
        // Remover conteúdo após última vírgula ou colchete válido
        const lastValidChar = jsonText.lastIndexOf('}')
        if (lastValidChar > 0) {
          // Tentar fechar o JSON
          let fixedJson = jsonText.substring(0, lastValidChar + 1)
          
          // Contar chaves e colchetes para fechar corretamente
          const openBraces = (fixedJson.match(/{/g) || []).length
          const closeBraces = (fixedJson.match(/}/g) || []).length
          const openBrackets = (fixedJson.match(/\[/g) || []).length
          const closeBrackets = (fixedJson.match(/]/g) || []).length
          
          // Adicionar fechamentos faltantes
          for (let i = 0; i < openBrackets - closeBrackets; i++) fixedJson += ']'
          for (let i = 0; i < openBraces - closeBraces; i++) fixedJson += '}'
          
          resultado = JSON.parse(fixedJson)
          console.log('✅ JSON recuperado com sucesso!')
        }
      } catch (recoveryError) {
        console.error('❌ Não foi possível recuperar o JSON:', recoveryError.message)
        console.error('Primeiros 300 caracteres:', jsonText.substring(0, 300))
        return null
      }
    }
    
    return resultado
    
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo com Gemini:', error.message)
    return null
  }
}


async function gerarConteudoIA(disciplina: any, userDisc: any, tipo: string, tempo_minutos: number, interview: any = null, env: any = null, topicosEdital: any[] = [], iaConfig: any = null) {
  const nivel = userDisc?.nivel_atual || 0
  const jaEstudou = userDisc?.ja_estudou || false
  
  let dificuldade = 'básico'
  if (nivel >= 7) dificuldade = 'avançado'
  else if (nivel >= 4) dificuldade = 'intermediário'

  // Configuração padrão de IA se não fornecida
  const config = iaConfig || {
    tom: 'didatico',
    temperatura: 0.5,
    intensidade: 'intermediaria',
    profundidade: 'aplicada',
    extensao: 'medio',
    formatoTeoria: 'completa'
  }

  // Contexto do concurso/cargo para personalização
  const contexto = {
    tipo: interview?.objetivo_tipo || 'area_geral',
    concurso: interview?.concurso_nome,
    cargo: interview?.cargo,
    area: interview?.area_geral,
    experiencia: interview?.experiencia || 'iniciante',
    iaConfig: config // Adicionar config ao contexto
  }

  // Usar tópicos do edital se fornecidos, senão gerar genéricos
  let topicos: string[]
  if (topicosEdital && topicosEdital.length > 0) {
    topicos = topicosEdital.map(t => t.nome)
    console.log(`📚 Usando tópicos específicos do edital: ${topicos.join(', ')}`)
  } else {
    topicos = gerarTopicos(disciplina.nome, tipo, tempo_minutos, dificuldade, jaEstudou, contexto)
    console.log(`📝 Usando tópicos genéricos: ${topicos.join(', ')}`)
  }
  
  // ESTRATÉGIA DE FALLBACK EM CASCATA:
  // 1º) Google Gemini (CONFIGURADO e FUNCIONAL)
  // 2º) Groq (backup se Gemini falhar)
  // 3º) Conteúdo estático (fallback final)
  
  if (env) {
    console.log('🚀 Tentando gerar conteúdo com Google Gemini (Gemini 2.0 Flash)...')
    const conteudoGemini = await gerarConteudoComGPT(disciplina.nome, tipo, tempo_minutos, dificuldade, contexto, env, userDisc, topicos)
    
    if (conteudoGemini) {
      console.log('✅ Conteúdo gerado com Gemini!')
      return conteudoGemini
    }
    
    console.log('⚠️ Gemini falhou, tentando Groq...')
    const conteudoGroq = await gerarConteudoComGroq(disciplina.nome, tipo, tempo_minutos, dificuldade, contexto, env, userDisc, topicos)
    
    if (conteudoGroq) {
      console.log('✅ Conteúdo gerado com Groq!')
      return conteudoGroq
    }
    
    console.log('⚠️ Groq também falhou')
  }

  // FALLBACK FINAL: usar conteúdo estático
  console.log('⚠️ Todas LLMs falharam, usando conteúdo estático (fallback final)')
  const objetivos = gerarObjetivos(disciplina.nome, tipo, dificuldade, contexto)
  const conteudo = gerarConteudoDetalhado(disciplina.nome, tipo, tempo_minutos, topicos, dificuldade, contexto)

  return {
    topicos,
    objetivos,
    conteudo
  }
}

function gerarTopicos(disciplina: string, tipo: string, tempo: number, dificuldade: string, jaEstudou: boolean, contexto: any = {}): string[] {
  // MUDANÇA: Reduzir para 1-2 tópicos MUITO aprofundados ao invés de 3+ superficiais
  const quantidadeTopicos = tempo >= 45 ? 2 : 1  // 1 tópico EXTREMAMENTE detalhado (ou 2 se tempo >= 45min)
  
  const topicosBase: any = {
    'Direito Constitucional': {
      teoria: ['Princípios Fundamentais da República', 'Direitos e Garantias Fundamentais', 'Organização do Estado Brasileiro', 'Poder Legislativo e Processo Legislativo', 'Poder Executivo e Atribuições', 'Poder Judiciário e Funções Essenciais', 'Controle de Constitucionalidade', 'Defesa do Estado e Instituições Democráticas'],
      exercicios: ['Questões de Direitos Fundamentais', 'Casos práticos sobre competências constitucionais', 'Análise de jurisprudência do STF', 'Questões sobre princípios', 'Controle de constitucionalidade em provas'],
      revisao: ['Revisão de princípios constitucionais', 'Súmulas vinculantes importantes', 'Esquemas de direitos fundamentais', 'Mapas mentais de competências']
    },
    'Direito Administrativo': {
      teoria: ['Princípios da Administração Pública', 'Atos Administrativos: conceito e atributos', 'Contratos Administrativos', 'Licitações e Lei 14.133/2021', 'Servidores Públicos e Regime Jurídico', 'Responsabilidade Civil do Estado', 'Processo Administrativo', 'Improbidade Administrativa'],
      exercicios: ['Questões sobre licitações', 'Casos de vícios em atos administrativos', 'Análise de contratos públicos', 'Responsabilidade civil em situações práticas'],
      revisao: ['Revisão de princípios administrativos', 'Lei 8.666/93 vs Lei 14.133/21', 'Atos administrativos: esquemas', 'Servidores: regime e direitos']
    },
    'Direito Tributário': {
      teoria: ['Sistema Tributário Nacional', 'Princípios do Direito Tributário', 'Competência Tributária', 'Impostos Federais', 'Impostos Estaduais', 'Impostos Municipais', 'Obrigação Tributária', 'Crédito Tributário e Lançamento'],
      exercicios: ['Questões de competência tributária', 'Cálculos de impostos', 'Casos de lançamento tributário', 'Análise de isenções e imunidades'],
      revisao: ['Revisão de impostos por ente', 'Princípios tributários essenciais', 'CTN: principais artigos', 'Jurisprudência tributária']
    },
    'Português': {
      teoria: ['Sintaxe: termos da oração', 'Morfologia: classes gramaticais', 'Semântica e significação', 'Interpretação de Textos', 'Redação Oficial e Correspondências', 'Concordância Verbal e Nominal', 'Regência Verbal e Nominal', 'Crase: regras e exceções'],
      exercicios: ['Questões de gramática contextualizada', 'Interpretação de textos diversos', 'Reescrita e paráfrase', 'Questões de ortografia e acentuação'],
      revisao: ['Regras de concordância', 'Regência: principais casos', 'Crase: quando usar', 'Interpretação: técnicas']
    },
    'Raciocínio Lógico': {
      teoria: ['Lógica Proposicional', 'Tabelas-Verdade', 'Equivalências Lógicas', 'Diagramas Lógicos', 'Argumentos Válidos', 'Sequências e Padrões', 'Análise Combinatória', 'Probabilidade Básica'],
      exercicios: ['Questões de proposições', 'Tabelas-verdade aplicadas', 'Diagramas de Venn', 'Problemas de contagem', 'Questões de probabilidade'],
      revisao: ['Revisão de conectivos lógicos', 'Equivalências mais cobradas', 'Diagramas: casos especiais', 'Fórmulas de combinatória']
    },
    'Matemática': {
      teoria: ['Conjuntos Numéricos', 'Operações Básicas e Propriedades', 'Porcentagem e Juros', 'Regra de Três', 'Equações e Sistemas', 'Geometria Plana', 'Matemática Financeira'],
      exercicios: ['Questões de porcentagem', 'Problemas de juros', 'Regra de três composta', 'Equações do 1º e 2º grau', 'Geometria: áreas e perímetros'],
      revisao: ['Fórmulas essenciais', 'Porcentagem: casos clássicos', 'Juros simples vs compostos', 'Geometria: principais fórmulas']
    }
  }

  let topicos = topicosBase[disciplina]?.[tipo] || [
    `Fundamentos de ${disciplina}`,
    `Conceitos essenciais`,
    `Teoria aprofundada`,
    `Aplicações práticas`,
    `Questões frequentes em provas`,
    `Pontos de atenção`,
    `Jurisprudência relevante`,
    `Dicas para a prova`
  ]

  // Ajustar complexidade SEM prefixos
  if (!jaEstudou) {
    topicos = topicos.slice(0, Math.min(topicos.length, 4)) // Menos tópicos para iniciantes
  } else if (dificuldade === 'avançado') {
    // Manter todos os tópicos disponíveis para avançados
  }

  return topicos.slice(0, quantidadeTopicos)
}

function gerarObjetivos(disciplina: string, tipo: string, dificuldade: string, contexto: any = {}): string[] {
  if (tipo === 'teoria') {
    return [`Dominar ${disciplina}`, 'Entender aplicações práticas']
  } else if (tipo === 'exercicios') {
    return ['Resolver questões corretamente', 'Identificar pegadinhas']
  } else {
    return ['Consolidar conhecimento', 'Fixar conceitos principais']
  }
}

function gerarConteudoDetalhado(disciplina: string, tipo: string, tempo: number, topicos: string[], dificuldade: string, contexto: any = {}) {
  // Criar introdução simples e direta
  let introducao = `Sessão de ${tipo === 'teoria' ? 'estudo teórico' : tipo === 'exercicios' ? 'prática de questões' : 'revisão'} de ${disciplina} - ${tempo} minutos.`
  
  if (contexto.tipo === 'concurso_especifico' && contexto.concurso) {
    introducao += ` Adaptado para ${contexto.concurso}.`
  }
  
  const conteudoBase = {
    introducao,
    orientacoes: tipo === 'teoria' ? [
      'Faça anotações dos pontos principais',
      'Marque dúvidas para revisar depois'
    ] : tipo === 'exercicios' ? [
      'Analise cada erro cometido',
      'Anote as questões erradas'
    ] : [
      'Teste sua memória antes de reler',
      'Foque nos pontos de dificuldade'
    ],
    secoes: topicos.map((topico, index) => {
      const tempoSecao = Math.round(tempo / topicos.length)
      return {
        titulo: topico,
        tempo_estimado: tempoSecao,
        ordem: index + 1,
        conteudo: gerarConteudoSecao(topico, tipo, dificuldade, disciplina, tempoSecao)
      }
    }),
    recursos_adicionais: [],
    proximos_passos: tipo === 'teoria' ? `Faça um resumo e resolva questões sobre o tema.` : tipo === 'exercicios' ? `Revise os erros e estude a teoria correspondente.` : `Revise novamente em 3 dias.`
  }

  return conteudoBase
}

function gerarQuestoesSimulado(topico: string, disciplina: string, dificuldade: string): any[] {
  // Base de questões por tópico
  const questoesBase: any = {
    // DIREITO TRIBUTÁRIO
    'Sistema Tributário Nacional': [
      {
        enunciado: 'Sobre o Sistema Tributário Nacional, assinale a alternativa CORRETA:',
        alternativas: [
          'A União, os Estados, o Distrito Federal e os Municípios podem instituir taxas em razão do exercício do poder de polícia ou pela utilização de serviços públicos específicos e divisíveis.',
          'Os impostos são tributos vinculados a uma contraprestação estatal específica.',
          'As contribuições de melhoria podem ser cobradas independentemente de obra pública.',
          'O empréstimo compulsório é tributo de competência concorrente de todos os entes.',
          'As taxas podem ter base de cálculo própria de impostos.'
        ],
        gabarito: 0,
        explicacao: 'Correta a alternativa A. Conforme art. 145, II da CF/88, a União, Estados, DF e Municípios podem instituir taxas em razão do poder de polícia ou serviços públicos específicos e divisíveis. Impostos são não vinculados (alternativa B errada), contribuições de melhoria dependem de obra pública (C errada), empréstimo compulsório é só da União (D errada), e taxas não podem ter base de cálculo de impostos (E errada, art. 145, §2º).'
      },
      {
        enunciado: 'Quantas são as espécies tributárias reconhecidas pela doutrina majoritária e pelo STF?',
        alternativas: [
          'Três: impostos, taxas e contribuições',
          'Quatro: impostos, taxas, contribuições e empréstimos compulsórios',
          'Cinco: impostos, taxas, contribuições de melhoria, empréstimos compulsórios e contribuições especiais',
          'Duas: impostos e taxas',
          'Seis: impostos, taxas, contribuições de melhoria, empréstimos compulsórios, contribuições sociais e CIDE'
        ],
        gabarito: 2,
        explicacao: 'Correta a alternativa C. O STF adota a teoria pentapartite (5 espécies): impostos, taxas, contribuições de melhoria, empréstimos compulsórios e contribuições especiais (estas subdivididas em sociais, CIDE e corporativas).'
      }
    ],
    'Princípios do Direito Tributário': [
      {
        enunciado: 'Sobre o princípio da anterioridade tributária, analise as afirmativas:\n\nI. O IPI e o IOF são exceções ao princípio da anterioridade anual.\nII. O princípio da anterioridade nonagesimal exige 90 dias entre a publicação da lei e a cobrança do tributo.\nIII. O ICMS-combustível respeita ambas as anterioridades.\n\nEstá CORRETO o que se afirma em:',
        alternativas: [
          'I, apenas',
          'II, apenas',
          'I e II, apenas',
          'II e III, apenas',
          'I, II e III'
        ],
        gabarito: 2,
        explicacao: 'Correta a alternativa C (I e II). Item I correto: IPI e IOF são exceções à anterioridade anual (art. 150, §1º, CF/88). Item II correto: anterioridade nonagesimal é de 90 dias (art. 150, III, "c"). Item III INCORRETO: ICMS-combustível é exceção às duas anterioridades conforme EC 33/2001.'
      }
    ],
    'Competência Tributária': [
      {
        enunciado: 'Sobre competência tributária, assinale a alternativa INCORRETA:',
        alternativas: [
          'A competência tributária é indelegável.',
          'A competência tributária é irrenunciável.',
          'A capacidade tributária ativa pode ser delegada por lei.',
          'O não exercício da competência tributária por determinado ente não a defere a outro ente.',
          'A União pode delegar sua competência para instituir impostos aos Estados.'
        ],
        gabarito: 4,
        explicacao: 'Incorreta a alternativa E. A competência tributária é INDELEGÁVEL (art. 7º, CTN). O que pode ser delegado é a capacidade tributária ativa (funções de arrecadar e fiscalizar). Todas as demais estão corretas.'
      }
    ],
    
    // DIREITO CONSTITUCIONAL
    'Direitos e Garantias Fundamentais': [
      {
        enunciado: 'São direitos sociais previstos no art. 6º da Constituição Federal, EXCETO:',
        alternativas: [
          'Educação e saúde',
          'Alimentação e moradia',
          'Transporte e lazer',
          'Segurança e previdência social',
          'Liberdade de expressão e reunião'
        ],
        gabarito: 4,
        explicacao: 'Correta a alternativa E. Liberdade de expressão e reunião são direitos individuais (art. 5º), não direitos sociais. O art. 6º lista: educação, saúde, alimentação, trabalho, moradia, transporte, lazer, segurança, previdência social, proteção à maternidade e à infância, assistência aos desamparados.'
      }
    ],
    'Princípios Fundamentais da República': [
      {
        enunciado: 'Constituem fundamentos da República Federativa do Brasil, EXCETO:',
        alternativas: [
          'Soberania',
          'Cidadania',
          'Dignidade da pessoa humana',
          'Valores sociais do trabalho e da livre iniciativa',
          'Independência nacional'
        ],
        gabarito: 4,
        explicacao: 'Correta a alternativa E. Independência nacional é OBJETIVO fundamental (art. 3º), não fundamento. Os fundamentos (art. 1º) são: SO-CI-DI-VA-PLU (Soberania, Cidadania, Dignidade da pessoa humana, Valores sociais do trabalho e livre iniciativa, Pluralismo político).'
      }
    ],
    
    // DIREITO ADMINISTRATIVO
    'Princípios da Administração Pública': [
      {
        enunciado: 'Sobre os princípios administrativos, analise:\n\nI. O princípio da legalidade permite ao administrador fazer tudo que a lei não proíbe.\nII. O princípio da impessoalidade veda o uso da máquina pública para promoção pessoal.\nIII. O princípio da eficiência exige resultado com menor custo possível.\n\nEstá CORRETO:',
        alternativas: [
          'Apenas I',
          'Apenas II',
          'Apenas III',
          'Apenas II e III',
          'I, II e III'
        ],
        gabarito: 3,
        explicacao: 'Correta D (II e III). I está ERRADO: para o administrador vale a legalidade ESTRITA (só pode fazer o que a lei permite). II CORRETO: impessoalidade proíbe promoção pessoal (art. 37, §1º). III CORRETO: eficiência busca melhor resultado com menor custo.'
      }
    ],
    'Atos Administrativos: conceito e atributos': [
      {
        enunciado: 'São atributos dos atos administrativos, EXCETO:',
        alternativas: [
          'Presunção de legitimidade',
          'Imperatividade',
          'Autoexecutoriedade',
          'Tipicidade',
          'Imutabilidade'
        ],
        gabarito: 4,
        explicacao: 'Correta E. IMUTABILIDADE não é atributo do ato administrativo (atos podem ser revogados ou anulados). Os atributos são: presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade.'
      }
    ],
    
    // PORTUGUÊS
    'Interpretação de Textos': [
      {
        enunciado: 'Em "O ministro afirmou que as medidas seriam tomadas", o pronome "as" retoma:',
        alternativas: [
          'O ministro',
          'As medidas',
          'Elemento não presente no enunciado',
          'O verbo afirmar',
          'O substantivo medidas, mas com função de sujeito'
        ],
        gabarito: 1,
        explicacao: 'Correta B. O pronome "as" (artigo definido feminino plural) retoma "as medidas". É um caso de coesão referencial anafórica, onde "as" evita repetição do termo.'
      }
    ],
    'Concordância Verbal e Nominal': [
      {
        enunciado: 'Assinale a alternativa com ERRO de concordância verbal:',
        alternativas: [
          'Faz dois anos que ele partiu.',
          'Deve haver problemas na reunião.',
          'Haviam muitos candidatos na sala.',
          'Faltam três dias para a prova.',
          'Existe solução para o problema.'
        ],
        gabarito: 2,
        explicacao: 'Correta C. O correto é "HAVIA muitos candidatos" (singular). O verbo HAVER no sentido de EXISTIR é impessoal (não tem sujeito) e fica sempre no singular. "Haviam" está ERRADO.'
      }
    ],
    
    // RACIOCÍNIO LÓGICO
    'Lógica Proposicional': [
      {
        enunciado: 'A negação de "Se estudo, então passo no concurso" é:',
        alternativas: [
          'Se não estudo, então não passo no concurso',
          'Estudo e não passo no concurso',
          'Não estudo ou passo no concurso',
          'Se passo no concurso, então estudo',
          'Estudo ou não passo no concurso'
        ],
        gabarito: 1,
        explicacao: 'Correta B. A negação de "p → q" é "p ∧ ~q". Portanto, a negação de "Se estudo, então passo" é "Estudo E não passo".'
      }
    ],
    'Equivalências Lógicas': [
      {
        enunciado: 'A proposição "Se chove, então a rua fica molhada" é logicamente equivalente a:',
        alternativas: [
          'Se a rua não fica molhada, então não chove',
          'Se a rua fica molhada, então chove',
          'Chove e a rua fica molhada',
          'Não chove ou a rua não fica molhada',
          'Chove se e somente se a rua fica molhada'
        ],
        gabarito: 0,
        explicacao: 'Correta A. A contrapositiva de "p → q" é "~q → ~p" e são logicamente equivalentes. Portanto, "Se chove → rua molhada" ≡ "Se rua não molhada → não chove".'
      }
    ]
  };

  const questoesTopico = questoesBase[topico] || [];
  
  // Se não houver questões específicas, gerar questões genéricas
  if (questoesTopico.length === 0) {
    return [
      {
        enunciado: `Sobre ${topico} em ${disciplina}, assinale a alternativa CORRETA:`,
        alternativas: [
          'Alternativa A - Primeira opção sobre o tema',
          'Alternativa B - Segunda opção sobre o tema',
          'Alternativa C - Terceira opção sobre o tema',
          'Alternativa D - Quarta opção sobre o tema',
          'Alternativa E - Quinta opção sobre o tema'
        ],
        gabarito: 0,
        explicacao: `Esta é uma questão modelo sobre ${topico}. Consulte a teoria acima para entender o conceito.`
      }
    ];
  }
  
  // Ajustar quantidade baseado na dificuldade
  // 🆕 GARANTIR MÍNIMO DE 10 QUESTÕES PARA EXERCÍCIOS
  let quantidade = 1
  if (tipo === 'exercicios') {
    // Para exercícios, MÍNIMO 10 questões (ou todas disponíveis)
    quantidade = Math.max(10, questoesTopico.length)
  } else {
    // Para teoria/revisão, quantidade menor
    quantidade = dificuldade === 'avançado' ? questoesTopico.length : dificuldade === 'intermediário' ? Math.min(2, questoesTopico.length) : 1
  }
  
  // Se não tiver questões suficientes, repetir/duplicar
  const questoesFinais = []
  for (let i = 0; i < quantidade; i++) {
    questoesFinais.push(questoesTopico[i % questoesTopico.length])
  }
  
  return questoesFinais;
}

function obterConteudoReal(topico: string, disciplina: string): any {
  // Base de conhecimento real por tópico
  const conteudos: any = {
    'Sistema Tributário Nacional': {
      intro: 'O Sistema Tributário Nacional está previsto nos artigos 145 a 162 da Constituição Federal e define a estrutura de arrecadação de tributos no Brasil.',
      pontos: [
        'União, Estados, DF e Municípios possuem competência para instituir tributos',
        'Cinco espécies tributárias: impostos, taxas, contribuições de melhoria, empréstimos compulsórios e contribuições especiais',
        'Impostos não têm vinculação a atividade estatal específica',
        'Taxas são vinculadas ao exercício do poder de polícia ou serviço público',
        'CTN (Lei 5.172/66) é a lei complementar que regulamenta normas gerais'
      ],
      exemplos: [
        'União: IR, IPI, IOF, II, IE, ITR, IGF',
        'Estados: ICMS, IPVA, ITCMD',
        'Municípios: IPTU, ISS, ITBI'
      ]
    },
    'Princípios do Direito Tributário': {
      intro: 'Os princípios tributários limitam o poder de tributar e protegem o contribuinte contra arbítrios.',
      pontos: [
        'Legalidade: tributo só pode ser criado ou majorado por lei',
        'Anterioridade anual: não se pode cobrar tributo no mesmo exercício financeiro',
        'Anterioridade nonagesimal: espera de 90 dias após publicação da lei',
        'Irretroatividade: lei tributária não retroage',
        'Isonomia: tratamento igual aos contribuintes em situação equivalente',
        'Capacidade contributiva: quem pode mais, paga mais',
        'Vedação ao confisco: tributo não pode ter efeito confiscatório'
      ],
      exemplos: [
        'IR, IPTU e IPVA respeitam anterioridade anual e nonagesimal',
        'IPI e IOF são exceções à anterioridade',
        'ITCMD progressivo aplica capacidade contributiva'
      ]
    },
    'Competência Tributária': {
      intro: 'Competência tributária é o poder constitucionalmente atribuído aos entes federados para instituir tributos.',
      pontos: [
        'Indelegável: não pode ser transferida',
        'Facultativa: o ente pode ou não instituir o tributo',
        'Irrenunciável: não pode ser abandonada',
        'Privativa: exclusiva de cada ente',
        'Residual da União: criar novos impostos por lei complementar',
        'Extraordinária: imposto extraordinário de guerra'
      ],
      exemplos: [
        'União cria IR, Estados criam ICMS, Municípios criam IPTU',
        'Se município não instituir ISS, não perde competência',
        'CF/88 define taxativamente os tributos de cada ente'
      ]
    },
    'Princípios Fundamentais da República': {
      intro: 'Os princípios fundamentais (arts. 1º a 4º da CF/88) estabelecem os fundamentos e objetivos do Estado Brasileiro.',
      pontos: [
        'Fundamentos: soberania, cidadania, dignidade, valores sociais do trabalho, pluralismo político (art. 1º)',
        'Forma de governo: República',
        'Sistema de governo: Presidencialismo',
        'Forma de Estado: Federação',
        'Regime político: Democrático',
        'Objetivos: construir sociedade justa, garantir desenvolvimento, erradicar pobreza, promover bem de todos (art. 3º)',
        'Relações internacionais: autodeterminação, não-intervenção, igualdade, solução pacífica, asilo político (art. 4º)'
      ],
      exemplos: [
        'SO-CI-DI-VAL-PLU: mnemônico para fundamentos',
        'Brasil é República Federativa Presidencialista',
        'Princípio da não-intervenção rege relações com outros países'
      ]
    },
    'Direitos e Garantias Fundamentais': {
      intro: 'Direitos fundamentais (arts. 5º a 17) são essenciais e irrenunciáveis, protegendo a pessoa contra arbítrio do Estado.',
      pontos: [
        'Direitos individuais (art. 5º): vida, liberdade, igualdade, segurança, propriedade',
        'Direitos sociais (art. 6º): educação, saúde, trabalho, moradia, lazer',
        'Direitos de nacionalidade (arts. 12-13): brasileiro nato e naturalizado',
        'Direitos políticos (arts. 14-16): votar e ser votado',
        'Remédios constitucionais: HC, MS, MI, HD, AP',
        'Características: universalidade, imprescritibilidade, inalienabilidade, irrenunciabilidade'
      ],
      exemplos: [
        'Habeas Corpus: protege liberdade de locomoção',
        'Mandado de Segurança: protege direito líquido e certo',
        'Direito à vida é absoluto, mas legítima defesa é exceção'
      ]
    },
    'Princípios da Administração Pública': {
      intro: 'Os princípios administrativos (art. 37, CF/88) orientam toda atividade da Administração Pública e são de observância obrigatória.',
      pontos: [
        'Legalidade: administrador só pode fazer o que a lei permite (legalidade estrita)',
        'Impessoalidade: vedação à promoção pessoal e tratamento imparcial',
        'Moralidade: atuação com ética e boa-fé',
        'Publicidade: divulgação oficial dos atos (transparência)',
        'Eficiência: melhor resultado com menor custo (EC 19/98)'
      ],
      exemplos: [
        'LIMPE: mnemônico para lembrar os 5 princípios constitucionais expressos',
        'Ato praticado sem lei é nulo (legalidade)',
        'Propaganda oficial com nome/imagem do agente público é vedada (impessoalidade)'
      ]
    },
    'Atos Administrativos: conceito e atributos': {
      intro: 'Ato administrativo é manifestação unilateral de vontade da Administração que cria, modifica ou extingue direitos.',
      pontos: [
        'Presunção de legitimidade: presume-se que o ato é legal (não absoluta)',
        'Imperatividade: pode impor obrigações independente de concordância',
        'Autoexecutoriedade: pode executar seus próprios atos sem ordem judicial',
        'Tipicidade: deve corresponder a figura definida em lei'
      ],
      exemplos: [
        'Multa de trânsito: presume-se válida, cabe ao multado provar erro',
        'Interdição de restaurante insalubre: autoexecutoriedade',
        'Demolição de construção irregular: imperatividade'
      ]
    },
    'Interpretação de Textos': {
      intro: 'Interpretação de textos envolve compreensão literal, inferencial e crítica do conteúdo, identificando tema, tese e argumentos.',
      pontos: [
        'Tema: assunto geral do texto',
        'Tese: posição defendida pelo autor',
        'Argumentos: provas e raciocínios que sustentam a tese',
        'Coesão: conexão entre palavras, orações e parágrafos',
        'Coerência: lógica interna das ideias',
        'Tipos textuais: narrativo, descritivo, dissertativo, injuntivo, expositivo'
      ],
      exemplos: [
        'Anáfora: retomada de elemento anterior (ex: pronome)',
        'Catáfora: antecipação de elemento posterior',
        'Ambiguidade deve ser evitada na redação oficial'
      ]
    },
    'Concordância Verbal e Nominal': {
      intro: 'Concordância é a adaptação entre elementos (sujeito-verbo, nome-adjetivo) para expressar harmonia gramatical.',
      pontos: [
        'Concordância verbal: verbo concorda com sujeito em número e pessoa',
        'Sujeito composto: verbo no plural',
        'Sujeito simples: verbo concorda com o núcleo',
        'Verbos impessoais (haver, fazer): sempre singular',
        'Concordância nominal: adjetivo concorda com substantivo'
      ],
      exemplos: [
        '"Faz dois anos" (verbo fazer impessoal = singular)',
        '"Havia muitos candidatos" (verbo haver = existir = impessoal = singular)',
        '"A casa e o carro são novos" (sujeito composto = verbo plural)'
      ]
    },
    'Lógica Proposicional': {
      intro: 'Lógica proposicional estuda proposições (afirmações verdadeiras ou falsas) e conectivos lógicos.',
      pontos: [
        'Conectivos: negação (~), conjunção (∧), disjunção (∨), condicional (→), bicondicional (↔)',
        'Negação de "p": ~p',
        'Negação de "p ∧ q": ~p ∨ ~q (Lei de De Morgan)',
        'Negação de "p ∨ q": ~p ∧ ~q (Lei de De Morgan)',
        'Negação de "p → q": p ∧ ~q'
      ],
      exemplos: [
        'Negação de "João é alto E Maria é baixa" = "João não é alto OU Maria não é baixa"',
        'Negação de "Se chove, então a rua fica molhada" = "Chove E a rua não fica molhada"',
        'p → q tem 3 casos verdadeiros e 1 falso (VV=V, VF=F, FV=V, FF=V)'
      ]
    },
    'Equivalências Lógicas': {
      intro: 'Duas proposições são equivalentes quando têm os mesmos valores lógicos (V/F) em todas as situações.',
      pontos: [
        'Contrapositiva: p → q ≡ ~q → ~p',
        'Condicional em disjunção: p → q ≡ ~p ∨ q',
        'Dupla negação: ~~p ≡ p',
        'Leis de De Morgan: ~(p ∧ q) ≡ ~p ∨ ~q e ~(p ∨ q) ≡ ~p ∧ ~q',
        'Bicondicional: p ↔ q ≡ (p → q) ∧ (q → p)'
      ],
      exemplos: [
        '"Se estudo, passo" ≡ "Se não passo, não estudo" (contrapositiva)',
        '"Se chove, molha" ≡ "Não chove OU molha"',
        '"João é médico E advogado" - negação = "João NÃO é médico OU NÃO é advogado"'
      ]
    }
  }
  
  return conteudos[topico] || null
}

function gerarConteudoSecao(topico: string, tipo: string, dificuldade: string, disciplina: string, tempoMinutos: number) {
  if (tipo === 'teoria') {
    const conteudoReal = obterConteudoReal(topico, disciplina)
    
    if (conteudoReal) {
      // Gerar teoria completa e extensa
      const teoriaCompleta = `
## ${topico}

${conteudoReal.intro}

### Conceitos Fundamentais

${conteudoReal.pontos.map((p: string, i: number) => `${i + 1}. **${p}**`).join('\n\n')}

### Aplicação Prática

Este tema é fundamental para ${disciplina} e frequentemente cobrado em concursos públicos. ${dificuldade === 'básico' ? 'Para iniciantes, é essencial memorizar as definições básicas e compreender a estrutura geral do tema.' : dificuldade === 'intermediário' ? 'Com conhecimento intermediário, o foco deve ser na resolução de questões e análise de casos práticos.' : 'Em nível avançado, é necessário dominar as controvérsias doutrinárias e jurisprudência divergente.'}

As bancas organizadoras como CESPE, FCC e FGV frequentemente exploram ${topico} através de questões que ${dificuldade === 'avançado' ? 'mesclam jurisprudência recente com legislação, exigindo análise aprofundada' : 'testam a literalidade da norma e conceitos básicos'}. ${dificuldade === 'básico' ? 'Atenção para palavras-chave como "exceto", "incorreto" ou "não".' : 'Analise cuidadosamente o enunciado identificando pegadinhas comuns.'}

### Exemplos

${conteudoReal.exemplos.map((e: string, i: number) => `**Exemplo ${i + 1}:** ${e}`).join('\n\n')}

### Dicas de Memorização

- **Mnemônicos:** Crie acrônimos com as primeiras letras dos conceitos principais
- **Mapas Mentais:** Visualize as conexões entre ${topico} e outros temas de ${disciplina}
- **Repetição Espaçada:** Revise em 3, 7, 15 e 30 dias para fixação de longo prazo
- **Questões:** Resolva ao menos 10 questões sobre este tema após o estudo
      `.trim();
      
      return {
        teoria_completa: teoriaCompleta,
        questoes: gerarQuestoesSimulado(topico, disciplina, dificuldade)
      }
    }
    
    // Fallback para tópicos sem conteúdo específico
    return {
      teoria_completa: `## ${topico}\n\n${topico} é um tema importante em ${disciplina}.`,
      questoes: []
    }
  } else if (tipo === 'exercicios') {
    return {
      questoes: gerarQuestoesSimulado(topico, disciplina, dificuldade)
    }
  } else {
    // Revisão
    return {
      teoria_completa: `### Revisão: ${topico}\n\nRevisão ativa dos conceitos de ${topico}.`,
      
      pontos_chave: [
        `📌 Conceito: ${topico} refere-se aos elementos centrais que fundamentam a compreensão desta matéria. É essencial dominar a definição legal e doutrinária do tema.`,
        `📌 Características: Os aspectos distintivos incluem suas particularidades técnicas, requisitos legais e forma de aplicação prática no contexto do serviço público.`,
        `📌 Base Legal: A fundamentação jurídica encontra-se na legislação específica, jurisprudência consolidada e entendimento doutrinário predominante.`,
        `📌 Aplicação Prática: Na rotina do cargo, este conhecimento é aplicado em situações de ${dificuldade === 'avançado' ? 'alta complexidade e casos excepcionais' : 'rotina administrativa e casos usuais'}.`,
        `📌 Relação com outros temas: ${topico} se conecta diretamente com outros institutos de ${disciplina}, formando um sistema integrado de conhecimento.`
      ],
      
      desenvolvimento: [
        `O estudo de ${topico} exige compreensão dos fundamentos teóricos e capacidade de aplicação prática. Os concursos públicos frequentemente exploram tanto a literalidade da lei quanto situações hipotéticas que exigem raciocínio jurídico.`,
        
        dificuldade === 'básico' ? 
          `Para iniciantes, é fundamental memorizar as definições básicas e compreender a estrutura geral do tema. Utilize mnemônicos e resumos para facilitar a memorização dos pontos principais.` :
        dificuldade === 'intermediário' ?
          `Com conhecimento intermediário, o foco deve ser na resolução de questões e análise de casos práticos. Procure entender as pegadinhas comuns e os erros mais frequentes cometidos pelos candidatos.` :
          `Em nível avançado, é necessário dominar as controvérsias doutrinárias, jurisprudência divergente e casos complexos. Estude posicionamentos minoritários e saiba quando cada corrente é aplicável.`,
        
        `A jurisprudência dos tribunais superiores é fonte essencial para compreender a aplicação prática de ${topico}. Súmulas, informativos e decisões recentes devem ser consultados regularmente.`,
        
        `Em provas de concurso, este tema costuma ser cobrado através de questões que mesclam conhecimento teórico com situações práticas. ${dificuldade === 'avançado' ? 'Questões de alto nível podem envolver múltiplos institutos combinados.' : 'As questões geralmente seguem o padrão das bancas organizadoras.'}`,
        
        tempoMinutos >= 20 ? 
          `Dedique tempo para criar esquemas visuais e mapas mentais conectando ${topico} com outros temas de ${disciplina}. Esta técnica facilita a memorização e compreensão sistemática da matéria.` : '',
        
        tempoMinutos >= 25 ?
          `Questões discursivas podem exigir desenvolvimento argumentativo sobre ${topico}. Pratique a elaboração de respostas estruturadas, com introdução, desenvolvimento e conclusão, sempre fundamentadas na legislação e doutrina.` : ''
      ].filter(p => p.length > 0),
      
      exemplos: [
        `📖 Exemplo 1: Em situação típica de concurso, considere que ${dificuldade === 'básico' ? 'uma questão solicita a definição literal do conceito' : dificuldade === 'intermediário' ? 'um caso prático exige aplicação da norma' : 'um caso complexo envolve conflito entre princípios'}. A resposta correta demanda ${dificuldade === 'avançado' ? 'análise aprofundada e ponderação de interesses' : 'conhecimento da lei e sua aplicação direta'}.`,
        
        `📖 Exemplo 2: Bancas como CESPE, FCC e FGV frequentemente exploram ${topico} através de questões que ${dificuldade === 'avançado' ? 'mesclam jurisprudência recente com legislação' : 'testam a literalidade da norma'}. É essencial ${dificuldade === 'básico' ? 'conhecer a redação legal' : 'analisar o contexto da questão'}.`,
        
        tempoMinutos >= 15 ?
          `📖 Exemplo 3: Na prática profissional do cargo, ${topico} é relevante em situações de ${dificuldade === 'avançado' ? 'decisões estratégicas e casos omissos' : 'rotina administrativa'}. O servidor deve saber aplicar o conhecimento teórico nas atividades diárias.` : ''
      ].filter(e => e.length > 0),
      
      dicas: [
        `💡 Atenção: Não confunda ${topico} com institutos similares. As bancas adoram explorar essas diferenças sutis.`,
        `💡 Memorização: Crie acrônimos ou frases para memorizar os elementos essenciais (ex: primeira letra de cada requisito).`,
        `💡 Jurisprudência: Acompanhe as decisões recentes do STF e STJ que envolvam ${topico}. Súmulas são frequentemente cobradas.`,
        `💡 Pegadinhas: ${dificuldade === 'avançado' ? 'Cuidado com questões que invertem conceitos ou misturam posições doutrinárias conflitantes' : 'Leia atentamente o enunciado, procurando palavras como "exceto", "incorreto" ou "não"'}`,
        tempoMinutos >= 20 ? `💡 Revisão: Agende revisões periódicas de ${topico} usando a técnica de repetição espaçada (3 dias, 7 dias, 15 dias, 30 dias).` : ''
      ].filter(d => d.length > 0)
    }
  }
}

async function gerarDiagnostico(DB: D1Database, user_id: number, interview_id: number) {
  // ✅ CORREÇÃO v20.7: Buscar disciplinas criadas NO MOMENTO da entrevista (intervalo de 2 minutos)
  // Isso evita pegar disciplinas de entrevistas anteriores ou posteriores
  const { results: disciplinasEntrevista } = await DB.prepare(`
    SELECT DISTINCT disciplina_id 
    FROM user_disciplinas 
    WHERE user_id = ?
    AND ABS(
      (julianday(created_at) - julianday((SELECT created_at FROM interviews WHERE id = ?))) * 24 * 60
    ) <= 2
  `).bind(user_id, interview_id).all()
  
  const disciplinaIds = disciplinasEntrevista.map(d => d.disciplina_id)
  
  if (disciplinaIds.length === 0) {
    console.log('⚠️ gerarDiagnostico: Nenhuma disciplina encontrada')
    return { 
      nivel_geral: 'Sem dados',
      prioridades: [],
      lacunas: [],
      recomendacao: 'Nenhuma disciplina foi selecionada. Retorne à entrevista e selecione as disciplinas que deseja estudar.'
    }
  }
  
  const placeholders = disciplinaIds.map(() => '?').join(',')
  
  const { results: disciplinas } = await DB.prepare(`
    SELECT ud.*, d.nome, d.area
    FROM user_disciplinas ud
    JOIN disciplinas d ON ud.disciplina_id = d.id
    WHERE ud.user_id = ? AND ud.disciplina_id IN (${placeholders})
  `).bind(user_id, ...disciplinaIds).all()
  
  console.log(`📊 gerarDiagnostico - Disciplinas (${disciplinas.length}):`, disciplinas.map(d => d.nome).join(', '))

  const interview = await DB.prepare(
    'SELECT * FROM interviews WHERE id = ?'
  ).bind(interview_id).first()

  // Calcular nível geral
  const nivelMedio = disciplinas.reduce((sum: number, d: any) => sum + d.nivel_atual, 0) / disciplinas.length
  let nivelGeral = 'Iniciante'
  if (nivelMedio >= 7) nivelGeral = 'Avançado'
  else if (nivelMedio >= 4) nivelGeral = 'Intermediário'

  // Identificar prioridades
  const prioridades = disciplinas
    .filter((d: any) => !d.ja_estudou || d.nivel_atual < 6 || d.dificuldade)
    .map((d: any) => ({
      disciplina_id: d.disciplina_id,
      nome: d.nome,
      peso: calcularPeso(d),
      razao: gerarRazaoPrioridade(d)
    }))
    .sort((a, b) => b.peso - a.peso)

  // Identificar lacunas
  const lacunas = disciplinas
    .filter((d: any) => !d.ja_estudou)
    .map((d: any) => d.nome)

  return {
    nivel_geral: nivelGeral,
    prioridades: prioridades.slice(0, 5),
    lacunas,
    recomendacao: gerarRecomendacao(interview, disciplinas, nivelGeral)
  }
}

function calcularPeso(disciplina: any): number {
  let peso = 0
  if (!disciplina.ja_estudou) peso += 10
  if (disciplina.nivel_atual < 4) peso += 8
  if (disciplina.dificuldade) peso += 6
  peso += (10 - disciplina.nivel_atual)
  return peso
}

function gerarRazaoPrioridade(disciplina: any): string {
  if (!disciplina.ja_estudou) return 'Conteúdo nunca estudado'
  if (disciplina.nivel_atual < 4) return 'Nível muito baixo'
  if (disciplina.dificuldade) return 'Disciplina com dificuldade histórica'
  return 'Necessita reforço'
}

function gerarRecomendacao(interview: any, disciplinas: any[], nivelGeral: string): string {
  const tempoDia = interview.tempo_disponivel_dia
  const nuncaEstudou = disciplinas.filter((d: any) => !d.ja_estudou).length

  if (nivelGeral === 'Iniciante' && nuncaEstudou > 5) {
    return `Com ${tempoDia} minutos por dia, foque em construir uma base sólida. Comece pelas disciplinas que nunca estudou, dedicando 70% do tempo à teoria e 30% a exercícios básicos.`
  }
  
  if (nivelGeral === 'Intermediário') {
    return `Você já tem uma base. Distribua seu tempo: 40% teoria (focando nas lacunas), 40% exercícios e 20% revisão. Mantenha consistência diária.`
  }
  
  return `Nível avançado! Foque em: 20% revisão de conceitos, 50% resolução intensiva de questões e 30% em pontos fracos identificados.`
}

function gerarDiagnosticoCompleto(interview: any, disciplinas: any[]) {
  const nivelMedio = disciplinas.reduce((sum, d: any) => sum + d.nivel_atual, 0) / disciplinas.length
  return {
    nivel_medio: Math.round(nivelMedio * 10) / 10,
    total_disciplinas: disciplinas.length,
    nunca_estudadas: disciplinas.filter((d: any) => !d.ja_estudou).length,
    com_dificuldade: disciplinas.filter((d: any) => d.dificuldade).length,
    experiencia: interview.experiencia
  }
}

function gerarMapaPrioridades(disciplinas: any[]) {
  return disciplinas
    .map((d: any) => ({
      disciplina_id: d.disciplina_id,
      nome: d.nome,
      peso: calcularPeso(d),
      percentual_tempo: 0 // será calculado na distribuição de ciclos
    }))
    .sort((a, b) => b.peso - a.peso)
}

async function gerarCiclosEstudo(
  DB: D1Database, 
  plano_id: number, 
  disciplinas: any[], 
  tempoDiario: number
) {
  const diasSemana = [0, 1, 2, 3, 4, 5, 6] // Domingo a Sábado
  const prioridades = gerarMapaPrioridades(disciplinas)
  
  // 🎯 NOVA LÓGICA: Distribuir TODAS as disciplinas ao longo da semana (ROUND-ROBIN)
  const TEMPO_MINIMO_MATERIA = 30
  const TEMPO_MAXIMO_SESSAO = 60
  const totalDisciplinas = prioridades.length
  
  console.log(`📊 Criando plano com ${totalDisciplinas} disciplinas, ${tempoDiario}min/dia`)
  
  // Calcular quantas sessões cabem na semana
  const tempoSemanalTotal = 7 * tempoDiario
  const sessoesDisponiveis = Math.floor(tempoSemanalTotal / TEMPO_MINIMO_MATERIA)
  
  // Distribuir sessões entre disciplinas de forma justa
  const sessoesPorDisciplina = Math.max(1, Math.floor(sessoesDisponiveis / totalDisciplinas))
  
  console.log(`📊 ${sessoesDisponiveis} sessões disponíveis, ${sessoesPorDisciplina} sessões por disciplina`)
  
  // Criar lista de todas as sessões a distribuir (round-robin)
  const todasSessoes = []
  for (let rodada = 0; rodada < sessoesPorDisciplina; rodada++) {
    for (const disc of prioridades) {
      // Calcular tempo da sessão baseado na prioridade
      const tempoBase = Math.round((disc.peso / 10) * TEMPO_MAXIMO_SESSAO)
      const tempoSessao = Math.max(TEMPO_MINIMO_MATERIA, Math.min(tempoBase, TEMPO_MAXIMO_SESSAO))
      
      todasSessoes.push({
        disciplina_id: disc.disciplina_id,
        peso: disc.peso,
        tempoSessao
      })
    }
  }
  
  console.log(`📋 Total de ${todasSessoes.length} sessões criadas (${totalDisciplinas} disciplinas × ${sessoesPorDisciplina} sessões)`)
  
  // Distribuir sessões pelos dias da semana
  let sessaoIndex = 0
  
  for (const dia of diasSemana) {
    let ordemDia = 0
    let tempoRestante = tempoDiario
    const sessoesDia = []

    // Adicionar sessões até preencher o tempo do dia
    while (tempoRestante >= TEMPO_MINIMO_MATERIA && sessaoIndex < todasSessoes.length) {
      const sessao = todasSessoes[sessaoIndex]
      
      if (sessao.tempoSessao <= tempoRestante) {
        sessoesDia.push(sessao)
        tempoRestante -= sessao.tempoSessao
        sessaoIndex++
      } else {
        break // Não cabe mais nada neste dia
      }
    }

    // Inserir ciclos no banco
    for (const sessao of sessoesDia) {
      const disciplinaCompleta = disciplinas.find((d: any) => d.disciplina_id === sessao.disciplina_id)
      let tipo = 'teoria'
      
      if (disciplinaCompleta?.ja_estudou && disciplinaCompleta.nivel_atual >= 6) {
        tipo = dia % 3 === 0 ? 'revisao' : 'exercicios'
      } else if (disciplinaCompleta?.ja_estudou) {
        tipo = dia % 2 === 0 ? 'teoria' : 'exercicios'
      }

      await DB.prepare(`
        INSERT INTO ciclos_estudo (plano_id, disciplina_id, tipo, dia_semana, tempo_minutos, ordem)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(plano_id, sessao.disciplina_id, tipo, dia, sessao.tempoSessao, ordemDia).run()

      ordemDia++
    }
    
    const disciplinasUnicas = new Set(sessoesDia.map(s => s.disciplina_id)).size
    console.log(`📅 Dia ${dia}: ${sessoesDia.length} sessões (${disciplinasUnicas} disciplinas únicas) - ${tempoDiario - tempoRestante}min de ${tempoDiario}min`)
  }
  
  console.log(`✅ ${sessaoIndex} sessões distribuídas de ${todasSessoes.length} planejadas`)
}

// ============== CHATBOT IA ==============
app.post('/api/chat', async (c) => {
  const { DB } = c.env
  const { message, user_id } = await c.req.json()
  
  const GEMINI_API_KEY = c.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    return c.json({ error: 'API Key não configurada' }, 500)
  }
  
  try {
    // Buscar dados do usuário para contexto
    const user = await DB.prepare('SELECT * FROM users WHERE id = ?').bind(user_id).first()
    
    const plano = await DB.prepare(`
      SELECT p.*, COUNT(DISTINCT c.disciplina_id) as total_disciplinas
      FROM planos_estudo p
      LEFT JOIN ciclos_estudo c ON c.plano_id = p.id
      WHERE p.user_id = ? AND p.ativo = 1
      GROUP BY p.id
    `).bind(user_id).first()
    
    const disciplinas = await DB.prepare(`
      SELECT d.nome, ud.nivel_atual, ud.ja_estudou
      FROM user_disciplinas ud
      JOIN disciplinas d ON d.id = ud.disciplina_id
      WHERE ud.user_id = ?
    `).bind(user_id).all()
    
    const conteudos = await DB.prepare(`
      SELECT c.tipo, c.created_at, d.nome as disciplina
      FROM conteudo_estudo c
      JOIN disciplinas d ON d.id = c.disciplina_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `).bind(user_id).all()
    
    // Contexto do sistema
    const systemContext = `Você é o ASSISTENTE IA DO IAPROVA, uma plataforma de estudos para concursos públicos brasileiros.

SUAS FUNÇÕES:
1. Responder perguntas sobre COMO O SISTEMA FUNCIONA
2. Explicar funcionalidades (entrevista, planos, ciclos, conteúdo, simulados)
3. Fornecer insights sobre OS DADOS DO USUÁRIO
4. Dar dicas de estudo personalizadas

DADOS DO USUÁRIO ATUAL:
- Nome: ${user?.name || 'Não informado'}
- Email: ${user?.email || 'Não informado'}
- Plano Ativo: ${plano ? plano.nome : 'Nenhum plano ativo'}
- Total de Disciplinas: ${plano?.total_disciplinas || 0}
- Tempo de Estudo Diário: ${plano?.tempo_diario || 0} minutos

DISCIPLINAS DO USUÁRIO:
${disciplinas.results.map((d: any) => `- ${d.nome} (Nível: ${d.nivel_atual}/10, Já estudou: ${d.ja_estudou ? 'Sim' : 'Não'})`).join('\n')}

ÚLTIMOS CONTEÚDOS GERADOS:
${conteudos.results.map((c: any) => `- ${c.disciplina}: ${c.tipo} (${new Date(c.created_at).toLocaleDateString()})`).join('\n')}

FUNCIONALIDADES DO SISTEMA:
- Entrevista inicial: coleta cargo, disciplinas, tempo disponível
- Geração de plano: cria ciclos de estudo distribuídos pela semana
- Conteúdo IA: gera teoria, exercícios e revisão personalizados com Gemini 2.0
- Simulados: questões comentadas para praticar
- Dashboard: acompanhamento de progresso e metas
- Histórico: visualização de estudos anteriores

INSTRUÇÕES:
- Seja DIRETO e OBJETIVO (máximo 3 parágrafos)
- Use DADOS REAIS do usuário quando relevante
- Dê dicas PRÁTICAS e ACIONÁVEIS
- Use emojis para tornar a conversa mais amigável
- Se não souber algo, seja honesto`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemContext}\n\nPERGUNTA DO USUÁRIO:\n${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          topP: 0.95
        }
      })
    })
    
    const data: any = await response.json()
    
    if (data.error) {
      console.error('❌ Erro Gemini:', data.error)
      return c.json({ 
        error: 'Erro ao gerar resposta',
        reply: '😅 Desculpe, tive um problema técnico. Tente novamente!' 
      }, 500)
    }
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  'Desculpe, não consegui processar sua mensagem.'
    
    return c.json({ reply })
    
  } catch (error) {
    console.error('Erro no chat:', error)
    return c.json({ 
      error: 'Erro no servidor',
      reply: '😅 Ops! Algo deu errado. Tente novamente em instantes.'
    }, 500)
  }
})

// ============== UPLOAD E RESUMO PERSONALIZADO ==============
app.post('/api/topicos/resumo-personalizado', async (c) => {
  const { DB } = c.env
  
  try {
    // Parse do FormData
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const topicoId = formData.get('topico_id') as string
    const topicoNome = formData.get('topico_nome') as string
    const disciplinaNome = formData.get('disciplina_nome') as string
    const metaId = formData.get('meta_id') as string
    const userIdHeader = formData.get('user_id') as string || c.req.header('X-User-ID')
    const configIaStr = formData.get('config_ia') as string
    
    // Parse da configuração de IA
    let iaConfig = {
      tom: 'didatico',
      intensidade: 'intermediaria',
      profundidade: 'aplicada',
      extensao: 'medio',
      extensaoCustom: 2000,
      formatoResumo: 'detalhado'
    }
    
    if (configIaStr) {
      try {
        iaConfig = JSON.parse(configIaStr)
      } catch (e) {
        console.log('⚠️ Não foi possível parsear config_ia, usando padrão')
      }
    }
    
    if (!file) {
      return c.json({ error: 'Arquivo não fornecido' }, 400)
    }
    
    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT.' }, 400)
    }
    
    // Limitar tamanho do arquivo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, 400)
    }
    
    console.log('📄 Processando arquivo:', file.name, file.type, file.size, 'bytes')
    
    let textoExtraido = ''
    
    // Extrair texto baseado no tipo de arquivo
    if (file.type === 'application/pdf') {
      // Extrair texto do PDF usando Gemini
      const arrayBuffer = await file.arrayBuffer()
      const geminiKey = c.env.GEMINI_API_KEY || ''
      
      if (!geminiKey) {
        return c.json({ error: 'API key do Gemini não configurada' }, 500)
      }
      
      try {
        textoExtraido = await extractTextFromPDF(arrayBuffer, geminiKey)
      } catch (error: any) {
        console.error('Erro ao extrair PDF:', error)
        return c.json({ 
          error: 'Erro ao processar PDF. Tente converter para TXT.',
          details: error?.message || 'Falha na extração do texto',
          suggestion: 'Use https://smallpdf.com/pdf-to-text para converter o PDF em TXT'
        }, 500)
      }
    } else if (file.type === 'text/plain') {
      // Arquivo de texto simples
      textoExtraido = await file.text()
    } else {
      // Para DOC/DOCX, por enquanto vamos pedir para converter
      return c.json({ 
        error: 'Por favor, converta o arquivo para PDF ou TXT. Suporte para DOC/DOCX em breve.' 
      }, 400)
    }
    
    if (!textoExtraido || textoExtraido.length < 100) {
      return c.json({ error: 'Não foi possível extrair texto suficiente do arquivo' }, 400)
    }
    
    console.log('📝 Texto extraído:', textoExtraido.length, 'caracteres')
    console.log('🎨 Configuração IA:', JSON.stringify(iaConfig))
    
    // Gerar resumo personalizado usando Gemini
    const geminiKey = c.env.GEMINI_API_KEY || ''
    
    // Instruções baseadas na configuração de IA
    const tomInstrucoes: Record<string, string> = {
      formal: 'Use linguagem formal, acadêmica e protocolar.',
      tecnico: 'Use terminologia técnica específica e precisa.',
      didatico: 'Seja explicativo e pedagógico, facilitando o entendimento.',
      direto: 'Seja objetivo e direto ao ponto, sem rodeios.',
      casual: 'Use linguagem conversacional e amigável.'
    }
    
    const intensidadeInstrucoes: Record<string, string> = {
      superficial: 'Forneça uma visão geral básica do conteúdo.',
      intermediaria: 'Equilibre conceitos básicos com aprofundamentos moderados.',
      aprofundada: 'Seja detalhado e completo, cobrindo todos os aspectos.'
    }
    
    const profundidadeInstrucoes: Record<string, string> = {
      conceitual: 'Foque em definições e conceitos teóricos.',
      aplicada: 'Combine teoria com exemplos práticos e aplicações.',
      analitica: 'Inclua análise crítica, comparações e diferentes perspectivas.'
    }
    
    const formatoResumoInstrucoes: Record<string, string> = {
      detalhado: 'Desenvolva cada ponto com explicações completas e exemplos.',
      topicos: 'Organize em listas de tópicos e subtópicos para fácil consulta.',
      esquematico: 'Use esquemas visuais, tabelas e mapas mentais.',
      executivo: 'Seja conciso e destaque apenas os pontos mais críticos.'
    }
    
    // Definir limite de palavras baseado na extensão
    let limiteResumo = 'entre 1500 e 2500 palavras'
    if (iaConfig.extensao === 'curto') limiteResumo = 'entre 500 e 800 palavras'
    else if (iaConfig.extensao === 'medio') limiteResumo = 'entre 1500 e 2500 palavras'
    else if (iaConfig.extensao === 'longo') limiteResumo = 'entre 3000 e 5000 palavras'
    else if (iaConfig.extensao === 'personalizado' && iaConfig.extensaoCustom) {
      const palavras = Math.round(iaConfig.extensaoCustom / 5) // ~5 chars por palavra
      limiteResumo = `aproximadamente ${palavras} palavras`
    }
    
    const promptResumo = `
    TAREFA: Criar um RESUMO PERSONALIZADO do documento fornecido.
    
    CONTEXTO:
    - Disciplina: ${disciplinaNome}
    - Tópico: ${topicoNome}
    - Arquivo: ${file.name}
    
    ═══════════════════════════════════════════════
    🎨 PERSONALIZAÇÃO DO CONTEÚDO (seguir obrigatoriamente):
    ═══════════════════════════════════════════════
    - TOM: ${tomInstrucoes[iaConfig.tom] || tomInstrucoes.didatico}
    - INTENSIDADE: ${intensidadeInstrucoes[iaConfig.intensidade] || intensidadeInstrucoes.intermediaria}
    - PROFUNDIDADE: ${profundidadeInstrucoes[iaConfig.profundidade] || profundidadeInstrucoes.aplicada}
    - FORMATO: ${formatoResumoInstrucoes[iaConfig.formatoResumo] || formatoResumoInstrucoes.detalhado}
    - EXTENSÃO: ${limiteResumo}
    
    DOCUMENTO FORNECIDO:
    ${textoExtraido.substring(0, 50000)}
    
    INSTRUÇÕES PARA O RESUMO:
    1. SIGA as instruções de personalização acima
    2. Identifique os pontos principais do documento
    3. Organize em tópicos e subtópicos claros
    4. Destaque conceitos-chave e definições importantes
    5. Inclua exemplos relevantes quando houver
    6. Mantenha informações críticas e elimine redundâncias
    7. Use formatação HTML para melhor legibilidade
    
    FORMATO DO RESUMO (use classes Tailwind com azul #122D6A):
    <div class="resumo-personalizado">
      <h2 class="text-2xl font-bold text-[#122D6A] mb-4">📄 Resumo: ${file.name}</h2>
      
      <div class="info-documento bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <p><strong>Documento original:</strong> ${file.name}</p>
        <p><strong>Tamanho:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
        <p><strong>Processado em:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      
      <h3 class="text-xl font-bold text-[#122D6A] mb-4">📌 Pontos Principais</h3>
      [Liste os principais pontos do documento]
      
      <h3 class="text-xl font-bold text-[#122D6A] mb-4 mt-6">📚 Conteúdo Detalhado</h3>
      [Desenvolva o resumo organizado]
      
      <h3 class="text-xl font-bold text-[#122D6A] mb-4 mt-6">💡 Conceitos-Chave</h3>
      [Destaque definições e conceitos importantes]
      
      <h3 class="text-xl font-bold text-[#122D6A] mb-4 mt-6">📝 Observações Importantes</h3>
      [Notas e destaques relevantes]
    </div>
    
    IMPORTANTE: Respeite o limite de ${limiteResumo}, preservando as informações essenciais.
    `
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptResumo }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
            topP: 0.95
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na API Gemini:', response.status, errorText)
      
      // Se for rate limit, dar mensagem específica
      if (response.status === 429) {
        return c.json({ 
          error: 'API Gemini com limite de uso. Aguarde alguns segundos e tente novamente.',
          errorType: 'RATE_LIMIT'
        }, 429)
      }
      
      return c.json({ error: 'Erro ao gerar resumo com IA. Tente novamente em alguns segundos.' }, 500)
    }
    
    const data = await response.json() as any
    const resumoGerado = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!resumoGerado) {
      return c.json({ error: 'Não foi possível gerar o resumo' }, 500)
    }
    
    // Salvar o resumo no banco de dados
    const titulo = `Resumo Personalizado: ${file.name}`
    
    const result = await DB.prepare(
      `INSERT INTO materiais_salvos (user_id, disciplina_id, topico_id, tipo, titulo, conteudo, meta_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      parseInt(userIdHeader),
      null, // disciplina_id pode ser null para resumo personalizado
      topicoId ? parseInt(topicoId) : null,
      'resumo_personalizado',
      titulo,
      resumoGerado,
      metaId ? parseInt(metaId) : null
    ).run()
    
    console.log('✅ Resumo personalizado salvo:', result.meta.last_row_id)
    
    return c.json({
      success: true,
      message: 'Resumo personalizado gerado com sucesso!',
      material_id: result.meta.last_row_id,
      metaId: metaId ? parseInt(metaId) : null,
      conteudo: resumoGerado
    })
    
  } catch (error) {
    console.error('Erro ao processar documento:', error)
    return c.json({ 
      error: 'Erro ao processar documento. Tente novamente ou use um arquivo menor.' 
    }, 500)
  }
})

// ============== GERAR CONTEÚDO DO TÓPICO COM IA ==============
app.post('/api/topicos/gerar-conteudo', async (c) => {
  const { DB } = c.env
  const { topico_id, topico_nome, disciplina_nome, tipo, quantidade, meta_id, config_ia } = await c.req.json()
  
  // tipo: 'teoria' | 'exercicios' | 'resumo' | 'flashcards'
  const tipoConteudo = tipo || 'teoria'
  const qtdExercicios = quantidade || 10
  const qtdFlashcards = quantidade || 15
  
  // Configurações de personalização (usar padrão se não enviado)
  const iaConfig = config_ia || {
    tom: 'didatico',
    temperatura: 0.5,
    intensidade: 'intermediaria',
    profundidade: 'aplicada',
    extensao: 'medio',
    extensaoCustom: 2000,
    formatoResumo: 'detalhado',
    formatoTeoria: 'completa',
    formatoFlashcards: 'objetivos',
    formatoExercicios: 'padrao'
  }
  
  const GEMINI_API_KEY = c.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    return c.json({ error: 'API Key não configurada' }, 500)
  }
  
  try {
    console.log(`📚 Gerando conteúdo ${tipoConteudo} para: ${topico_nome} (${disciplina_nome}) - Quantidade: ${quantidade || 'padrão'}`)
    
    // ✅ NOVO: Buscar banca do usuário (se disponível)
    let bancaUsuario = null
    let caracteristicasBanca = null
    const user_id_header = c.req.header('X-User-ID') || c.req.query('user_id')
    
    if (user_id_header) {
      // Buscar banca da entrevista mais recente do usuário
      const entrevista: any = await DB.prepare(`
        SELECT banca_organizadora, bancas_preferidas FROM interviews 
        WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(parseInt(user_id_header)).first()
      
      if (entrevista) {
        bancaUsuario = entrevista.banca_organizadora
        
        // Se não tem banca específica, usar a primeira das bancas preferidas
        if (!bancaUsuario && entrevista.bancas_preferidas) {
          try {
            const bancasPreferidas = JSON.parse(entrevista.bancas_preferidas)
            if (bancasPreferidas && bancasPreferidas.length > 0) {
              bancaUsuario = bancasPreferidas[0]
            }
          } catch (e) {}
        }
        
        // Buscar características da banca (com try-catch para caso a tabela não exista)
        if (bancaUsuario) {
          try {
            // Normalizar nome da banca para busca
            const bancaNome = bancaUsuario.toUpperCase().includes('CESPE') ? 'CEBRASPE' : bancaUsuario.split('/')[0].trim()
            const bancaInfo: any = await DB.prepare(`
              SELECT estilo_questoes, dicas_estudo FROM bancas_caracteristicas 
              WHERE nome LIKE ? OR nome LIKE ?
            `).bind(`%${bancaNome}%`, `%${bancaUsuario}%`).first()
            
            if (bancaInfo) {
              caracteristicasBanca = {
                nome: bancaUsuario,
                estilo: bancaInfo.estilo_questoes ? JSON.parse(bancaInfo.estilo_questoes) : null,
                dicas: bancaInfo.dicas_estudo
              }
              console.log(`🏛️ Banca identificada: ${bancaUsuario}`, caracteristicasBanca)
            }
          } catch (e) {
            console.log('⚠️ Tabela bancas_caracteristicas não encontrada, continuando sem características específicas')
          }
        }
      }
    }
    
    // Definir prompt baseado no tipo de conteúdo
    let systemPrompt = ''
    
    // Construir instruções de personalização
    const tomInstrucoes = {
      formal: 'Use linguagem formal, acadêmica e protocolar.',
      tecnico: 'Use terminologia técnica específica e precisa.',
      didatico: 'Seja explicativo e pedagógico, facilitando o entendimento.',
      direto: 'Seja objetivo e direto ao ponto, sem rodeios.',
      casual: 'Use linguagem conversacional e amigável.'
    }
    
    const intensidadeInstrucoes = {
      superficial: 'Forneça uma visão geral básica do conteúdo.',
      intermediaria: 'Equilibre conceitos básicos com aprofundamentos moderados.',
      aprofundada: 'Seja detalhado e completo, cobrindo todos os aspectos.'
    }
    
    const profundidadeInstrucoes = {
      conceitual: 'Foque em definições e conceitos teóricos.',
      aplicada: 'Combine teoria com exemplos práticos e aplicações.',
      analitica: 'Inclua análise crítica, comparações e diferentes perspectivas.'
    }
    
    // Determinar limite real de caracteres
    let limiteCaracteres = 2000;
    if (iaConfig.extensao === 'curto') limiteCaracteres = 500;
    else if (iaConfig.extensao === 'medio') limiteCaracteres = 2000;
    else if (iaConfig.extensao === 'longo') limiteCaracteres = 5000;
    else if (iaConfig.extensao === 'personalizado' && iaConfig.extensaoCustom) {
      limiteCaracteres = parseInt(iaConfig.extensaoCustom);
    }
    
    console.log(`🎆 Limite de caracteres configurado: ${limiteCaracteres}`);
    
    const extensaoLimites = {
      curto: 'EXATAMENTE 500 caracteres',
      medio: 'EXATAMENTE 2000 caracteres', 
      longo: 'EXATAMENTE 5000 caracteres',
      personalizado: `EXATAMENTE ${iaConfig.extensaoCustom} caracteres`
    }
    
    // Instruções de personalização comuns (SEM criatividade - sempre objetivo)
    const personalizacao = `
=== CONFIGURAÇÕES DE PERSONALIZAÇÃO OBRIGATÓRIAS ===
1. TOM: ${tomInstrucoes[iaConfig.tom] || tomInstrucoes['didatico']}
2. ESTILO: Seja OBJETIVO, DIRETO e PRECISO. Sem rodeios ou enrolação.
3. INTENSIDADE: ${intensidadeInstrucoes[iaConfig.intensidade] || intensidadeInstrucoes['intermediaria']}
4. PROFUNDIDADE: ${profundidadeInstrucoes[iaConfig.profundidade] || profundidadeInstrucoes['aplicada']}
5. EXTENSÃO MÍNIMA: ${limiteCaracteres} caracteres (pode ultrapassar um pouco, mas NUNCA gere menos que isso)

⚠️ REGRA CRÍTICA: O conteúdo DEVE ter NO MÍNIMO ${limiteCaracteres} caracteres. Gere conteúdo COMPLETO e DETALHADO.
==================================================
`
    
    switch(tipoConteudo) {
      case 'teoria':
        const formatoTeoria = iaConfig.formatoTeoria === 'basica' ? 'Teoria BÁSICA com conceitos fundamentais apenas.' :
                             iaConfig.formatoTeoria === 'avancada' ? 'Teoria AVANÇADA com detalhes técnicos complexos.' :
                             'Teoria COMPLETA cobrindo todos os aspectos.'
        
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.
${personalizacao}
6. FORMATO: ${formatoTeoria}

Crie um CONTEÚDO TEÓRICO sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

ESTRUTURA OBRIGATÓRIA:
1. **Introdução** - Contexto e importância para concursos
2. **Conceitos Fundamentais** - Definições claras e objetivas
3. **Desenvolvimento** - Explicação detalhada com exemplos práticos
4. **Pontos de Atenção** - O que mais cai em provas
5. **Dicas de Memorização** - Macetes e técnicas para lembrar
6. **Resumo Final** - Pontos-chave em bullets

REGRAS OBRIGATÓRIAS:
- 🔴 EXTENSÃO: O conteúdo COMPLETO deve ter EXATAMENTE ${limiteCaracteres} caracteres
- Use linguagem clara e didática
- Inclua exemplos práticos e casos reais
- Destaque palavras-chave em negrito
- Cite legislação e jurisprudência quando aplicável
- Máximo 2000 palavras
- Formate em Markdown`
        break
        
      case 'exercicios':
        const formatoExercicios = iaConfig.formatoExercicios === 'simples' ? 'Questões de nível BÁSICO/SIMPLES.' :
                                 iaConfig.formatoExercicios === 'complexo' ? 'Questões COMPLEXAS que exigem raciocínio avançado.' :
                                 'Questões de nível PADRÃO/INTERMEDIÁRIO.';
        
        // ✅ NOVO: Instruções específicas da banca
        let instrucoesBanca = 'Use estilo variado de bancas como CESPE, FCC, FGV.'
        if (caracteristicasBanca) {
          const estilo = caracteristicasBanca.estilo
          if (estilo?.tipo === 'certo_errado') {
            instrucoesBanca = `🏛️ BANCA: ${caracteristicasBanca.nome}
ESTILO OBRIGATÓRIO: Questões no formato CERTO/ERRADO (julgue os itens)
- Cada questão apresenta uma afirmação que deve ser julgada como CERTA ou ERRADA
- Use afirmações que exigem atenção aos detalhes e interpretação
- Inclua pegadinhas típicas da banca (generalização, inversão de conceitos)
- ${caracteristicasBanca.dicas || ''}`
          } else {
            instrucoesBanca = `🏛️ BANCA: ${caracteristicasBanca.nome}
ESTILO: Questões de múltipla escolha no padrão da banca
- Complexidade: ${estilo?.complexidade || 'média'}
- ${caracteristicasBanca.dicas || ''}`
          }
        }
        
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.
${personalizacao}
6. FORMATO: ${formatoExercicios}

${instrucoesBanca}

════════════════════════════════════════════════════════════════
🎯 TÓPICO ESPECÍFICO: "${topico_nome}"
📚 DISCIPLINA: "${disciplina_nome}"
════════════════════════════════════════════════════════════════

⚠️ REGRA CRÍTICA: TODAS as ${qtdExercicios} questões devem ser EXCLUSIVAMENTE sobre o tópico "${topico_nome}".
- NÃO misture com outros tópicos da disciplina
- NÃO generalize para assuntos não relacionados ao tópico
- Cada questão deve abordar um aspecto diferente DESTE MESMO TÓPICO

CRIE EXATAMENTE ${qtdExercicios} QUESTÕES DE CONCURSO focadas 100% no tópico "${topico_nome}".

IMPORTANTE: Você DEVE criar EXATAMENTE ${qtdExercicios} questões, numeradas de 1 a ${qtdExercicios}.

${caracteristicasBanca?.estilo?.tipo === 'certo_errado' ? `
ESTRUTURA OBRIGATÓRIA PARA CADA QUESTÃO (FORMATO CERTO/ERRADO):

**Questão 1**
[Afirmação para ser julgada como CERTA ou ERRADA]

**Gabarito:** CERTO / ERRADO
**Comentário:** Explicação detalhada.

---
` : `
ESTRUTURA OBRIGATÓRIA PARA CADA QUESTÃO:

**Questão 1** (Nível: Fácil)
[Enunciado claro e objetivo da questão]

a) Primeira alternativa
b) Segunda alternativa
c) Terceira alternativa
d) Quarta alternativa
e) Quinta alternativa

**Gabarito:** Letra X
**Comentário:** Explicação detalhada.

---
`}

**Questão 2** (Nível: Médio)
[Continue até a Questão ${qtdExercicios}...]

REGRAS OBRIGATÓRIAS:
- CRIE EXATAMENTE ${qtdExercicios} questões (nem mais, nem menos)
- Numere de 1 a ${qtdExercicios} sequencialmente
${caracteristicasBanca?.estilo?.tipo === 'certo_errado' ? 
  '- Cada questão é uma AFIRMAÇÃO para julgar como CERTA ou ERRADA\n- Inclua pegadinhas de interpretação e detalhes' :
  '- Cada questão DEVE ter exatamente 5 alternativas (a, b, c, d, e)\n- Varie os níveis: Fácil, Médio e Difícil'}
- Cada questão DEVE ter Gabarito e Comentário separados
- Use o separador --- entre questões
- Inclua pegadinhas comuns de prova`
        break
        
      case 'resumo':
        const formatoResumo = iaConfig.formatoResumo === 'curto' ? 'Resumo CURTO com pontos-chave apenas.' :
                             'Resumo DETALHADO com explicações completas.';
        
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.
${personalizacao}
6. FORMATO: ${formatoResumo}

Crie um RESUMO sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

ESTRUTURA OBRIGATÓRIA:
📌 **CONCEITO PRINCIPAL**
[Definição em 1-2 linhas]

📋 **PONTOS-CHAVE**
• Ponto 1
• Ponto 2
• Ponto 3
[...]

⚠️ **ATENÇÃO - PEGADINHAS DE PROVA**
• O que parece mas não é
• Erros comuns dos candidatos

📊 **COMPARATIVO** (se aplicável)
| Aspecto | Opção A | Opção B |
|---------|---------|---------|

🎯 **MNEMÔNICOS**
[Macetes para memorização]

✅ **PALAVRAS-CHAVE PARA PROVA**
[Lista das palavras que indicam a resposta correta]

REGRAS:
- Seja OBJETIVO e DIRETO
- Use bullets e tabelas
- Máximo 500 palavras
- Formate em Markdown`
        break
        
      case 'flashcards':
        const formatoFlashcards = iaConfig.formatoFlashcards === 'objetivos' ? 
          'Flashcards OBJETIVOS: FRENTE com termo/conceito (1-5 palavras), VERSO com definição direta (1-2 linhas).' :
          'Flashcards APROFUNDADOS: FRENTE com termo/conceito (1-5 palavras), VERSO com explicação detalhada e exemplo (2-4 linhas).'
        
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.
${personalizacao}
6. FORMATO: ${formatoFlashcards}

CRIE EXATAMENTE ${qtdFlashcards} FLASHCARDS sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

IMPORTANTE: Você DEVE criar EXATAMENTE ${qtdFlashcards} flashcards, numerados de 1 a ${qtdFlashcards}.

⚠️ REGRA CRÍTICA DO FORMATO:
- FRENTE = TERMO/CONCEITO/PALAVRA-CHAVE (curto, 1-5 palavras)
- VERSO = DEFINIÇÃO/EXPLICAÇÃO (1-3 linhas)

O flashcard é como um cartão de memorização onde você vê o TERMO e tenta lembrar o SIGNIFICADO.

FORMATO OBRIGATÓRIO PARA CADA FLASHCARD:

**Flashcard 1**
**FRENTE:** [TERMO ou CONCEITO - máximo 5 palavras]
**VERSO:** [Definição ou explicação em 1-3 linhas]

---

**Flashcard 2**
**FRENTE:** [Outro TERMO ou CONCEITO]
**VERSO:** [Sua definição]

---

[Continue até Flashcard ${qtdFlashcards}...]

EXEMPLOS CORRETOS:
✅ FRENTE: "Princípio da Legalidade" → VERSO: "A Administração só pode fazer o que a lei permite."
✅ FRENTE: "LIMPE" → VERSO: "Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência"
✅ FRENTE: "Mandado de Segurança" → VERSO: "Remédio constitucional para proteger direito líquido e certo não amparado por HC ou HD."

EXEMPLOS INCORRETOS (NÃO FAÇA):
❌ FRENTE: "Qual princípio diz que a Administração só pode fazer o que a lei permite?"
❌ FRENTE: "Cite os 5 princípios do art. 37 da CF"

REGRAS OBRIGATÓRIAS:
- CRIE EXATAMENTE ${qtdFlashcards} flashcards
- FRENTE deve ser CURTA (termo/conceito) - NÃO faça perguntas na frente!
- VERSO deve ser a explicação/definição
- Use o separador --- entre flashcards
- Foque em conceitos importantes para provas`
        break
        
      default:
        systemPrompt = `Crie um conteúdo educativo sobre "${topico_nome}" de "${disciplina_nome}" para concursos públicos.`
    }
    
    // Usar apenas 1 modelo para evitar rate limit
    const modelos = ['gemini-2.5-flash']
    
    // ✅ SEMPRE usar temperatura BAIXA (0.2) para conteúdo mais objetivo e consistente
    const temperaturaFixa = 0.2
    
    // ✅ Calcular maxOutputTokens baseado no tipo e extensão
    // 1 token ≈ 4 caracteres, então multiplicamos por fator de segurança
    let maxTokens = 8192 // padrão alto
    if (tipoConteudo === 'flashcards') {
      maxTokens = Math.max(qtdFlashcards * 200, 4000)
    } else if (tipoConteudo === 'exercicios') {
      maxTokens = Math.max(qtdExercicios * 400, 6000)
    } else {
      // Para teoria/resumo: garantir tokens suficientes para a extensão desejada
      // limiteCaracteres / 3 (tokens) * 2 (margem de segurança)
      maxTokens = Math.max(Math.ceil(limiteCaracteres / 1.5), 4000)
    }
    
    console.log(`🎯 Configuração: temperatura=${temperaturaFixa}, maxTokens=${maxTokens}, extensão=${limiteCaracteres} chars`)
    
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: temperaturaFixa,
        maxOutputTokens: maxTokens,
        topP: 0.9,
        topK: 40
      }
    }
    
    let data: any = null
    let lastError: any = null
    
    // Tentar cada modelo em ordem até um funcionar
    for (const modelo of modelos) {
      console.log(`🤖 Tentando modelo: ${modelo}...`)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        data = await response.json()
        
        // Se não houver erro, sucesso!
        if (!data.error) {
          console.log(`✅ Modelo ${modelo} respondeu com sucesso!`)
          break
        }
        
        // Se erro 429 (rate limit), aguardar e tentar próximo modelo
        if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
          console.log(`⏳ Rate limit no modelo ${modelo}, tentando próximo...`)
          lastError = data.error
          await new Promise(resolve => setTimeout(resolve, 2000)) // Aguarda 2s antes do próximo
          continue
        }
        
        // Outro erro, guardar e tentar próximo
        lastError = data.error
        console.log(`⚠️ Erro no modelo ${modelo}:`, data.error.message)
        
      } catch (fetchError) {
        console.log(`❌ Erro de fetch no modelo ${modelo}:`, fetchError)
        lastError = { message: 'Erro de conexão' }
      }
    }
    
    // Se ainda com erro após todos os modelos
    if (data?.error || !data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const errorInfo = data?.error || lastError
      if (errorInfo?.code === 429 || errorInfo?.status === 'RESOURCE_EXHAUSTED') {
        console.error('❌ Rate limit em todos os modelos')
        return c.json({ 
          error: 'API temporariamente ocupada. Aguarde 2-3 minutos e tente novamente.',
          details: 'Rate limit da API Gemini. Muitas requisições simultâneas.'
        }, 429)
      }
    }
    
    if (data?.error) {
      console.error('❌ Erro Gemini ao gerar conteúdo:', data.error)
      return c.json({ 
        error: 'Erro ao gerar conteúdo',
        details: data.error.message 
      }, 500)
    }
    
    const conteudo = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!conteudo || conteudo.length < 100) {
      return c.json({ error: 'Conteúdo gerado muito curto ou vazio' }, 500)
    }
    
    console.log(`✅ Conteúdo ${tipoConteudo} gerado: ${conteudo.length} caracteres`)
    
    // Buscar disciplina_id pelo nome ou pelo topico
    let disciplina_id = null
    if (topico_id) {
      const topico = await DB.prepare('SELECT disciplina_id FROM topicos_edital WHERE id = ?').bind(topico_id).first()
      if (topico) {
        disciplina_id = topico.disciplina_id
      }
    }
    if (!disciplina_id) {
      const disc = await DB.prepare('SELECT id FROM disciplinas WHERE nome LIKE ?').bind(`%${disciplina_nome}%`).first()
      if (disc) {
        disciplina_id = disc.id
      }
    }
    
    // Auto-salvar o conteúdo gerado em materiais_salvos (se user_id fornecido via header ou query)
    let material_id = null
    // user_id_header já definido anteriormente para buscar banca
    if (user_id_header) {
      try {
        const tipoLabel = {
          'teoria': 'Teoria',
          'exercicios': 'Exercícios',
          'resumo': 'Resumo',
          'flashcards': 'Flashcards'
        }[tipoConteudo] || 'Conteúdo'
        
        const titulo = `${tipoLabel}: ${topico_nome || disciplina_nome}`
        
        const saveResult = await DB.prepare(`
          INSERT INTO materiais_salvos (user_id, disciplina_id, topico_id, tipo, titulo, conteudo, meta_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(parseInt(user_id_header), disciplina_id || null, topico_id || null, tipoConteudo, titulo, conteudo, meta_id || null).run()
        
        material_id = saveResult.meta.last_row_id
        console.log(`💾 Material auto-salvo com ID: ${material_id}`)
        
        // Se tem meta_id, salvar também em conteudo_estudo para rastreamento
        if (meta_id) {
          try {
            const conteudoEstudoResult = await DB.prepare(`
              INSERT INTO conteudo_estudo (user_id, meta_id, disciplina_id, tipo, tempo_minutos, conteudo, topicos, objetivos, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'gerado')
            `).bind(
              parseInt(user_id_header),
              meta_id,
              disciplina_id,
              tipoConteudo,
              60,
              JSON.stringify({ texto: conteudo, material_id }),
              JSON.stringify([{ id: topico_id, nome: topico_nome }]),
              JSON.stringify([])
            ).run()
            
            // Guardar ID do conteudo_estudo para retornar
            const conteudo_estudo_id = conteudoEstudoResult.meta.last_row_id
            
            // Marcar meta como tendo conteúdo gerado
            await DB.prepare('UPDATE metas_semana SET conteudo_gerado = 1 WHERE id = ?').bind(meta_id).run()
            console.log(`📌 Conteúdo vinculado à meta ${meta_id}, conteudo_estudo_id: ${conteudo_estudo_id}`)
          } catch (metaError) {
            console.error('Erro ao vincular à meta:', metaError)
          }
        }
      } catch (saveError) {
        console.error('Erro ao auto-salvar material:', saveError)
        // Não bloquear a resposta se falhar o save
      }
    }
    
    return c.json({ 
      success: true,
      topico_id,
      topico_nome,
      disciplina_id,
      disciplina_nome,
      tipo: tipoConteudo,
      conteudo,
      caracteres: conteudo.length,
      gerado_em: new Date().toISOString(),
      material_id // ID do material salvo
    })
    
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo do tópico:', error)
    return c.json({ 
      error: 'Erro no servidor ao gerar conteúdo',
      details: error instanceof Error ? error.message : 'Erro interno no servidor'
    }, 500)
  }
})

// ============== SIMULADOS ==============
app.post('/api/simulado/gerar', async (c) => {
  const { DB } = c.env
  const { user_id, disciplinas, topicos, quantidade } = await c.req.json()
  
  const GEMINI_API_KEY = c.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    return c.json({ error: 'API Key não configurada' }, 500)
  }
  
  try {
    console.log(`📝 Gerando simulado: ${quantidade} questões para ${disciplinas.length} disciplinas`)
    
    // Buscar nomes das disciplinas
    const disciplinasInfo: any[] = []
    for (const discId of disciplinas) {
      const disc = await DB.prepare('SELECT id, nome FROM disciplinas WHERE id = ?').bind(discId).first()
      if (disc) {
        disciplinasInfo.push(disc)
      }
    }
    
    // Buscar tópicos se especificados
    let topicosInfo: any[] = []
    if (topicos && topicos.length > 0) {
      for (const topId of topicos) {
        const top = await DB.prepare('SELECT id, nome, disciplina_id FROM topicos_edital WHERE id = ?').bind(topId).first()
        if (top) {
          topicosInfo.push(top)
        }
      }
    }
    
    // Calcular distribuição de questões por disciplina
    const questoesPorDisciplina = Math.ceil(quantidade / disciplinasInfo.length)
    
    // Construir prompt
    const disciplinasTexto = disciplinasInfo.map(d => d.nome).join(', ')
    const topicosTexto = topicosInfo.length > 0 
      ? `Foque especialmente nos seguintes tópicos: ${topicosInfo.map(t => t.nome).join(', ')}.`
      : ''
    
    const systemPrompt = `Você é um elaborador de provas de concursos públicos brasileiros.
CRIE EXATAMENTE ${quantidade} QUESTÕES para um simulado abrangendo as seguintes disciplinas: ${disciplinasTexto}.

${topicosTexto}

IMPORTANTE: 
- Você DEVE criar EXATAMENTE ${quantidade} questões, numeradas de 1 a ${quantidade}
- Distribua as questões equilibradamente entre as disciplinas
- Cada questão deve indicar a qual disciplina pertence

ESTRUTURA OBRIGATÓRIA PARA CADA QUESTÃO:

**Questão 1** [Disciplina: Nome da Disciplina] (Nível: Fácil/Médio/Difícil)
[Enunciado claro e objetivo da questão]

a) Primeira alternativa
b) Segunda alternativa
c) Terceira alternativa
d) Quarta alternativa
e) Quinta alternativa

**Gabarito:** Letra X
**Comentário:** Explicação detalhada.

---

**Questão 2** [Disciplina: Nome da Disciplina] (Nível: Médio)
[Continue até a Questão ${quantidade}...]

REGRAS OBRIGATÓRIAS:
- CRIE EXATAMENTE ${quantidade} questões (nem mais, nem menos)
- Numere de 1 a ${quantidade} sequencialmente
- Indique a disciplina de cada questão entre colchetes
- Cada questão DEVE ter exatamente 5 alternativas (a, b, c, d, e)
- Cada questão DEVE ter Gabarito e Comentário separados
- Use o separador --- entre questões
- Varie os níveis: Fácil (30%), Médio (50%), Difícil (20%)
- Use estilo de bancas como CESPE, FCC, FGV, VUNESP
- Inclua pegadinhas comuns de prova
- Questões devem ser realistas e baseadas em conteúdo de concursos`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 16000, // Maior para simulados
          topP: 0.95
        }
      })
    })
    
    const data: any = await response.json()
    
    if (data.error) {
      console.error('❌ Erro Gemini ao gerar simulado:', data.error)
      return c.json({ 
        error: 'Erro ao gerar simulado',
        details: data.error.message 
      }, 500)
    }
    
    const conteudo = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!conteudo || conteudo.length < 500) {
      return c.json({ error: 'Simulado gerado muito curto ou vazio' }, 500)
    }
    
    // Contar questões geradas
    const questoesGeradas = (conteudo.match(/\*{0,2}Questão\s+\d+/gi) || []).length
    
    console.log(`✅ Simulado gerado: ${conteudo.length} caracteres, ${questoesGeradas} questões`)
    
    return c.json({ 
      success: true,
      conteudo,
      questoes_geradas: questoesGeradas,
      disciplinas: disciplinasInfo.map(d => d.nome),
      caracteres: conteudo.length,
      gerado_em: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Erro ao gerar simulado:', error)
    return c.json({ 
      error: 'Erro no servidor ao gerar simulado',
      details: error instanceof Error ? error.message : 'Erro interno no servidor'
    }, 500)
  }
})

// ============== HISTÓRICO DE CONTEÚDOS GERADOS ==============

// Histórico completo de conteúdos gerados pelo usuário
app.get('/api/historico/conteudos/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))
  const { tipo, disciplina_id, limit = '50', offset = '0' } = c.req.query()
  
  try {
    // Buscar de materiais_salvos (principal fonte de conteúdos gerados)
    let query = `
      SELECT 
        m.id,
        m.tipo,
        m.titulo,
        m.conteudo,
        m.created_at,
        m.favorito,
        m.disciplina_id,
        m.topico_id,
        d.nome as disciplina_nome,
        t.nome as topico_nome,
        'materiais_salvos' as source
      FROM materiais_salvos m
      LEFT JOIN disciplinas d ON m.disciplina_id = d.id
      LEFT JOIN topicos_edital t ON m.topico_id = t.id
      WHERE m.user_id = ?
    `
    const params: any[] = [user_id]
    
    if (tipo && tipo !== 'todos') {
      query += ' AND m.tipo = ?'
      params.push(tipo)
    }
    
    if (disciplina_id) {
      query += ' AND m.disciplina_id = ?'
      params.push(parseInt(disciplina_id as string))
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit as string), parseInt(offset as string))
    
    const result = await DB.prepare(query).bind(...params).all()
    
    // Buscar estatísticas
    const statsQuery = await DB.prepare(`
      SELECT 
        tipo,
        COUNT(*) as quantidade
      FROM materiais_salvos
      WHERE user_id = ?
      GROUP BY tipo
    `).bind(user_id).all()
    
    const totalQuery = await DB.prepare(`
      SELECT COUNT(*) as total FROM materiais_salvos WHERE user_id = ?
    `).bind(user_id).first() as any
    
    // Formatar estatísticas
    const estatisticas: Record<string, number> = {
      total: totalQuery?.total || 0,
      teoria: 0,
      exercicios: 0,
      flashcards: 0,
      resumo: 0,
      resumo_personalizado: 0
    }
    
    statsQuery.results?.forEach((row: any) => {
      if (row.tipo && estatisticas.hasOwnProperty(row.tipo)) {
        estatisticas[row.tipo] = row.quantidade
      }
    })
    
    return c.json({ 
      historico: result.results || [],
      estatisticas,
      total: totalQuery?.total || 0
    })
  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error)
    return c.json({ error: 'Erro ao buscar histórico de conteúdos' }, 500)
  }
})

// ============== MATERIAIS - LISTAR, SALVAR, DELETAR ==============

// Listar materiais do usuário
app.get('/api/materiais/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))
  const { tipo, disciplina_id, topico_id, favorito, search } = c.req.query()
  
  try {
    let query = 'SELECT m.*, d.nome as disciplina_nome, t.nome as topico_nome FROM materiais_salvos m LEFT JOIN disciplinas d ON m.disciplina_id = d.id LEFT JOIN topicos_edital t ON m.topico_id = t.id WHERE m.user_id = ?'
    const params: any[] = [user_id]
    
    if (tipo) {
      query += ' AND m.tipo = ?'
      params.push(tipo)
    }
    
    if (disciplina_id) {
      query += ' AND m.disciplina_id = ?'
      params.push(parseInt(disciplina_id as string))
    }
    
    if (topico_id) {
      query += ' AND m.topico_id = ?'
      params.push(parseInt(topico_id as string))
    }
    
    if (favorito === '1') {
      query += ' AND m.favorito = 1'
    }
    
    if (search) {
      query += ' AND (m.titulo LIKE ? OR m.conteudo LIKE ? OR m.tags LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }
    
    query += ' ORDER BY m.created_at DESC'
    
    const result = await DB.prepare(query).bind(...params).all()
    
    return c.json({ materiais: result.results || [] })
  } catch (error: any) {
    console.error('Erro ao listar materiais:', error)
    return c.json({ error: 'Erro ao listar materiais' }, 500)
  }
})

// Salvar novo material
app.post('/api/materiais', async (c) => {
  const { DB } = c.env
  const { user_id, disciplina_id, topico_id, tipo, titulo, conteudo, arquivo_url, arquivo_nome, arquivo_tipo, arquivo_tamanho, tags } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO materiais_salvos (user_id, disciplina_id, topico_id, tipo, titulo, conteudo, arquivo_url, arquivo_nome, arquivo_tipo, arquivo_tamanho, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(user_id, disciplina_id || null, topico_id || null, tipo, titulo, conteudo || null, arquivo_url || null, arquivo_nome || null, arquivo_tipo || null, arquivo_tamanho || null, tags || null).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    console.error('Erro ao salvar material:', error)
    return c.json({ error: 'Erro ao salvar material' }, 500)
  }
})

// Atualizar material
app.put('/api/materiais/:id', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))
  const { titulo, conteudo, tags, favorito } = await c.req.json()
  
  try {
    await DB.prepare(`
      UPDATE materiais_salvos 
      SET titulo = ?, conteudo = ?, tags = ?, favorito = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(titulo, conteudo, tags, favorito, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar material:', error)
    return c.json({ error: 'Erro ao atualizar material' }, 500)
  }
})

// Toggle favorito
app.post('/api/materiais/:id/favorito', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))
  
  try {
    // Buscar valor atual
    const material = await DB.prepare('SELECT favorito FROM materiais_salvos WHERE id = ?').bind(id).first()
    const novoValor = material?.favorito ? 0 : 1
    
    await DB.prepare('UPDATE materiais_salvos SET favorito = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(novoValor, id).run()
    
    return c.json({ success: true, favorito: novoValor })
  } catch (error: any) {
    console.error('Erro ao toggle favorito:', error)
    return c.json({ error: 'Erro ao toggle favorito' }, 500)
  }
})

// Deletar material
app.delete('/api/materiais/:id', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))
  
  try {
    await DB.prepare('DELETE FROM materiais_salvos WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar material:', error)
    return c.json({ error: 'Erro ao deletar material' }, 500)
  }
})

// Obter material por ID
app.get('/api/materiais/item/:id', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))
  
  try {
    const material = await DB.prepare(`
      SELECT m.*, d.nome as disciplina_nome, t.nome as topico_nome 
      FROM materiais_salvos m 
      LEFT JOIN disciplinas d ON m.disciplina_id = d.id 
      LEFT JOIN topicos_edital t ON m.topico_id = t.id 
      WHERE m.id = ?
    `).bind(id).first()
    
    if (!material) {
      return c.json({ error: 'Material não encontrado' }, 404)
    }
    
    return c.json({ material })
  } catch (error: any) {
    console.error('Erro ao obter material:', error)
    return c.json({ error: 'Erro ao obter material' }, 500)
  }
})

// ============== ROTA RAIZ - REDIRECIONA PARA /home ==============
app.get('/', (c) => {
  return c.redirect('/home')
})

// ============== ROTA /login - TELA DE LOGIN ==============
app.get('/login', (c) => {
  // Retorna a página com parâmetro view=login para o frontend
  return c.redirect('/home?view=login')
})

// ============== ROTA /cadastro - TELA DE CADASTRO ==============
app.get('/cadastro', (c) => {
  return c.redirect('/home?view=cadastro')
})

// ============== ROTA /home - PÁGINA PRINCIPAL (LANDING/LOGIN/DASHBOARD) ==============
app.get('/home', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>IAprova - Preparação Inteligente para Concursos Públicos</title>
    <meta name="description" content="Sistema inteligente de preparação para concursos públicos com IA. Planos de estudo personalizados, geração de conteúdo e muito mais!">
    <meta name="keywords" content="concursos públicos, estudo, preparação, IA, inteligência artificial, plano de estudos, flashcards, questões">
    <meta name="author" content="IAprova">
    
    <!-- PWA Install Prompt - DEVE ser o primeiro script para capturar o evento -->
    <script>
      // Capturar evento de instalação PWA o mais cedo possível
      window.deferredPrompt = null;
      window.pwaInstallReady = false;
      
      window.addEventListener('beforeinstallprompt', function(e) {
        // Impedir que o Chrome mostre o mini-infobar automaticamente
        e.preventDefault();
        // Guardar o evento para usar quando o usuário clicar em "Instalar"
        window.deferredPrompt = e;
        window.pwaInstallReady = true;
        console.log('✅ PWA: Prompt de instalação capturado e pronto!');
        
        // Adicionar indicador visual se o botão existir
        var installBtn = document.getElementById('fab-install-app');
        if (installBtn) {
          installBtn.style.display = 'flex';
          // Adicionar badge de "pronto para instalar"
          var badge = installBtn.querySelector('.install-ready-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'install-ready-badge absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full';
            installBtn.querySelector('button')?.appendChild(badge);
          }
        }
      });
      
      window.addEventListener('appinstalled', function() {
        console.log('🎉 PWA: IAprova instalado com sucesso!');
        window.deferredPrompt = null;
        window.pwaInstallReady = false;
        
        // Ocultar botão de instalação
        var installBtn = document.getElementById('fab-install-app');
        if (installBtn) installBtn.style.display = 'none';
      });
      
      // Log inicial para debug
      console.log('🔧 PWA: Listener de beforeinstallprompt registrado');
    </script>
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#122D6A">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="IAprova">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="application-name" content="IAprova">
    <meta name="msapplication-TileColor" content="#122D6A">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://iaprova.app/">
    <meta property="og:title" content="IAprova - Preparação Inteligente para Concursos">
    <meta property="og:description" content="Estude de forma inteligente com IA. Planos personalizados, questões no estilo da sua banca e muito mais!">
    <meta property="og:image" content="https://iaprova.app/icons/icon-512x512.png">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://iaprova.app/">
    <meta property="twitter:title" content="IAprova - Preparação Inteligente para Concursos">
    <meta property="twitter:description" content="Estude de forma inteligente com IA. Planos personalizados, questões no estilo da sua banca e muito mais!">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">
    
    <!-- Favicons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Axios -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    
    <!-- Custom Styles -->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overscroll-behavior: none;
        }
        
        #app { min-height: 100vh; min-height: 100dvh; }
        
        /* Loading spinner */
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #122D6A;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.5s ease-in-out; }
        
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scaleIn 0.3s ease-in-out; }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(18, 45, 106, 0.3); }
            50% { box-shadow: 0 0 40px rgba(18, 45, 106, 0.6); }
        }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        
        /* Scrollbar */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        
        /* Glass effect */
        .glass {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        
        /* Toast notifications */
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease-in-out;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .toast.success { background: #10b981; }
        .toast.error { background: #ef4444; }
        .toast.info { background: #3b82f6; }
        
        /* PWA Install Banner */
        .pwa-install-banner {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #0D1F4D 0%, #1A3A7F 100%);
            color: white;
            padding: 16px;
            z-index: 9998;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }
        .pwa-install-banner.show { transform: translateY(0); }
        
        /* Standalone mode */
        @media all and (display-mode: standalone) {
            body {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
            }
        }
        
        /* iOS specific */
        @supports (-webkit-touch-callout: none) {
            body { min-height: -webkit-fill-available; }
        }
        
        /* Stripes for future weeks */
        .bg-stripes {
            background-image: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 5px,
                rgba(255, 255, 255, 0.15) 5px,
                rgba(255, 255, 255, 0.15) 10px
            );
        }
    </style>
</head>
<body class="bg-white">
    <!-- App Container -->
    <div id="app">
        <!-- Initial Loading Screen -->
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1F4D] via-[#122D6A] to-[#1A3A7F]">
            <div class="text-center">
                <div class="mb-6 animate-float">
                    <div class="w-24 h-24 mx-auto pulse-glow rounded-3xl bg-gradient-to-br from-[#1A3A7F] to-[#2A4A9F] flex items-center justify-center">
                        <svg viewBox="0 0 64 64" class="w-16 h-16">
                            <circle cx="32" cy="32" r="20" fill="rgba(16,185,129,1)"/>
                            <path d="M24 32 L30 38 L42 26" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                <h1 class="text-white text-4xl font-bold mb-2">IAprova</h1>
                <p class="text-blue-200 text-lg mb-6">Preparação Inteligente para Concursos</p>
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-blue-100 text-sm">Carregando sistema...</p>
            </div>
        </div>
    </div>
    
    <!-- PWA Install Banner (hidden by default) -->
    <div id="pwa-install-banner" class="pwa-install-banner">
        <div class="max-w-md mx-auto flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <i class="fas fa-mobile-alt text-xl"></i>
                </div>
                <div>
                    <p class="font-bold">Instale o IAprova</p>
                    <p class="text-sm text-blue-200">Acesse como um app!</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="dismissPWABanner()" class="px-3 py-2 text-sm opacity-70 hover:opacity-100">Depois</button>
                <button onclick="installPWA()" class="px-4 py-2 bg-white text-[#122D6A] rounded-lg font-bold text-sm">Instalar</button>
            </div>
        </div>
    </div>
    
    <!-- Marked.js for Markdown -->
    <script src="https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js"></script>
    
    <!-- Main App Script -->
    <script src="/static/app.js?v=${Date.now()}"></script>
    
    <!-- Service Worker Registration Only (PWA install já está configurado acima) -->
    <script>
        // Registrar Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    console.log('✅ Service Worker registrado:', registration.scope);
                } catch (error) {
                    console.log('⚠️ Service Worker não registrado:', error);
                }
            });
        }
        
        // Funções de instalação PWA usando window.deferredPrompt (definido no head)
        async function installPWA() {
            if (!window.deferredPrompt) {
                showManualInstallInstructions();
                return;
            }
            try {
                window.deferredPrompt.prompt();
                const { outcome } = await window.deferredPrompt.userChoice;
                console.log('📱 Resultado da instalação:', outcome);
                if (outcome === 'accepted') {
                    if (typeof showToast === 'function') showToast('🎉 IAprova instalado com sucesso!', 'success');
                }
                window.deferredPrompt = null;
                window.pwaInstallReady = false;
            } catch (err) {
                console.error('Erro ao instalar:', err);
                showManualInstallInstructions();
            }
        }
        
        function showManualInstallInstructions() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            let instructions = '';
            
            if (isIOS) {
                instructions = '<p class="mb-4">Para instalar no iPhone/iPad:</p><ol class="list-decimal list-inside space-y-2 text-left"><li>Toque em <strong>Compartilhar</strong> <i class="fas fa-share-square"></i></li><li>Toque em <strong>"Adicionar à Tela de Início"</strong></li><li>Toque em <strong>"Adicionar"</strong></li></ol>';
            } else if (isAndroid) {
                instructions = '<p class="mb-4">Para instalar no Android:</p><ol class="list-decimal list-inside space-y-2 text-left"><li>Toque no menu <strong>⋮</strong></li><li>Toque em <strong>"Instalar app"</strong></li><li>Confirme</li></ol>';
            } else {
                instructions = '<p class="mb-4">Para instalar:</p><ol class="list-decimal list-inside space-y-2 text-left"><li>Clique no ícone <i class="fas fa-plus-square"></i> na barra de endereços</li><li>Ou menu do navegador → <strong>"Instalar IAprova"</strong></li></ol>';
            }
            
            const modal = document.createElement('div');
            modal.id = 'install-instructions-modal';
            modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4';
            modal.innerHTML = '<div class="bg-white rounded-2xl p-6 max-w-sm w-full text-center"><div class="w-16 h-16 bg-[#122D6A] rounded-2xl flex items-center justify-center mx-auto mb-4"><i class="fas fa-mobile-alt text-white text-2xl"></i></div><h3 class="text-xl font-bold text-gray-800 mb-4">Instalar IAprova</h3><div class="text-gray-600 text-sm">' + instructions + '</div><button onclick="document.getElementById(\\'install-instructions-modal\\').remove()" class="mt-6 w-full py-3 bg-[#122D6A] text-white rounded-xl font-bold">Entendi</button></div>';
            document.body.appendChild(modal);
        }
        
        // Expor funções globalmente
        window.showPWAInstallPrompt = installPWA;
        window.showManualInstallInstructions = showManualInstallInstructions;
    </script>
</body>
</html>`)
})

// ============== SIMULADOS - HISTÓRICO E DASHBOARD ==============

// Salvar resultado de simulado
app.post('/api/simulados/salvar', async (c) => {
  const { DB } = c.env
  const { user_id, disciplinas, topicos, total_questoes, acertos, percentual_acerto, tempo_gasto, questoes_detalhes } = await c.req.json()
  
  try {
    const result = await DB.prepare(`
      INSERT INTO simulados_historico (user_id, disciplinas, topicos, total_questoes, acertos, percentual_acerto, tempo_gasto, questoes_detalhes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user_id,
      JSON.stringify(disciplinas),
      JSON.stringify(topicos),
      total_questoes,
      acertos,
      percentual_acerto,
      tempo_gasto || null,
      JSON.stringify(questoes_detalhes || [])
    ).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    console.error('Erro ao salvar simulado:', error)
    return c.json({ error: 'Erro ao salvar simulado' }, 500)
  }
})

// Buscar histórico de simulados do usuário
app.get('/api/simulados/historico/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))
  
  try {
    const { results } = await DB.prepare(`
      SELECT * FROM simulados_historico
      WHERE user_id = ?
      ORDER BY data_realizacao DESC
      LIMIT 50
    `).bind(user_id).all()
    
    return c.json({ simulados: results || [] })
  } catch (error: any) {
    console.error('Erro ao buscar histórico de simulados:', error)
    return c.json({ error: 'Erro ao buscar histórico' }, 500)
  }
})

// Buscar detalhes de um simulado específico
app.get('/api/simulados/detalhes/:id', async (c) => {
  const { DB } = c.env
  const id = parseInt(c.req.param('id'))
  
  try {
    const simulado = await DB.prepare(`
      SELECT * FROM simulados_historico WHERE id = ?
    `).bind(id).first()
    
    if (!simulado) {
      return c.json({ error: 'Simulado não encontrado' }, 404)
    }
    
    return c.json({ simulado })
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do simulado:', error)
    return c.json({ error: 'Erro ao buscar detalhes' }, 500)
  }
})

// Estatísticas de simulados
app.get('/api/simulados/estatisticas/:user_id', async (c) => {
  const { DB } = c.env
  const user_id = parseInt(c.req.param('user_id'))
  
  try {
    const stats = await DB.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(percentual_acerto) as media_geral,
        MAX(percentual_acerto) as melhor_resultado,
        MIN(percentual_acerto) as pior_resultado
      FROM simulados_historico
      WHERE user_id = ?
    `).bind(user_id).first()
    
    return c.json({ estatisticas: stats || { total: 0, media_geral: 0, melhor_resultado: 0, pior_resultado: 0 } })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500)
  }
})

// ============== GERAÇÃO DE QUESTÕES COM IA ==============
app.post('/api/simulados/gerar-questoes', async (c) => {
  const { user_id, tipo, disciplinas, dificuldade = 'medio' } = await c.req.json()
  const { DB } = c.env
  const GROQ_API_KEY = c.env.GROQ_API_KEY || process.env.GROQ_API_KEY
  
  console.log(`🎯 Gerando simulado: tipo=${tipo}, dificuldade=${dificuldade}, disciplinas=${disciplinas?.length || 'auto'}`)
  
  // Configuração por tipo de simulado
  const config: Record<string, { questoes: number, tempo: number }> = {
    'rapido': { questoes: 10, tempo: 15 },
    'padrao': { questoes: 30, tempo: 45 },
    'completo': { questoes: 50, tempo: 90 }
  }
  
  const cfg = config[tipo] || config['padrao']
  
  // Mapeamento de dificuldade
  const dificuldadeConfig: Record<string, { texto: string, instrucao: string }> = {
    'facil': { 
      texto: 'FÁCIL', 
      instrucao: 'TODAS as questões devem ser de nível FÁCIL - conceitos básicos, definições diretas, questões introdutórias. Evite pegadinhas ou questões complexas.'
    },
    'medio': { 
      texto: 'MÉDIO', 
      instrucao: 'As questões devem ter nível MÉDIO - padrão de provas de concurso, exigindo conhecimento sólido mas sem ser extremamente difícil. Mix de 20% fácil, 60% médio, 20% difícil.'
    },
    'dificil': { 
      texto: 'DIFÍCIL', 
      instrucao: 'TODAS as questões devem ser de nível DIFÍCIL - questões desafiadoras, casos complexos, jurisprudência avançada, pegadinhas comuns em provas. Exija raciocínio elaborado.'
    }
  }
  
  const difConfig = dificuldadeConfig[dificuldade] || dificuldadeConfig['medio']
  
  try {
    // Buscar disciplinas - usar as selecionadas ou buscar do usuário
    let discsParaUsar = disciplinas
    if (!discsParaUsar || discsParaUsar.length === 0) {
      // JOIN com edital_disciplinas para obter os tópicos
      const { results: userDiscs } = await DB.prepare(`
        SELECT 
          d.id, 
          d.nome,
          MAX(ed.id) as edital_disciplina_id
        FROM user_disciplinas ud
        JOIN disciplinas d ON ud.disciplina_id = d.id
        LEFT JOIN edital_disciplinas ed ON LOWER(TRIM(ed.nome)) = LOWER(TRIM(d.nome))
        WHERE ud.user_id = ?
        GROUP BY d.id, d.nome
        LIMIT 10
      `).bind(user_id).all()
      discsParaUsar = userDiscs?.map((d: any) => ({ id: d.id, nome: d.nome, edital_disciplina_id: d.edital_disciplina_id })) || []
    } else {
      // Se disciplinas foram passadas, buscar edital_disciplina_id para cada uma
      for (const disc of discsParaUsar) {
        if (!disc.edital_disciplina_id) {
          const editalDisc = await DB.prepare(`
            SELECT id FROM edital_disciplinas 
            WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
            LIMIT 1
          `).bind(disc.nome).first() as any
          disc.edital_disciplina_id = editalDisc?.id || null
        }
      }
    }
    
    if (discsParaUsar.length === 0) {
      return c.json({ error: 'Nenhuma disciplina encontrada para gerar questões' }, 400)
    }
    
    // 🆕 Buscar tópicos do edital para cada disciplina
    const disciplinasComTopicos: string[] = []
    for (const disc of discsParaUsar) {
      let topicosStr = ''
      if (disc.edital_disciplina_id) {
        const { results: topicos } = await DB.prepare(`
          SELECT nome FROM edital_topicos 
          WHERE edital_disciplina_id = ? 
          ORDER BY ordem ASC LIMIT 10
        `).bind(disc.edital_disciplina_id).all()
        if (topicos && topicos.length > 0) {
          topicosStr = ` (Tópicos: ${topicos.map((t: any) => t.nome).join(', ')})`
        }
      }
      disciplinasComTopicos.push(`${disc.nome}${topicosStr}`)
    }
    
    // Distribuir questões entre disciplinas
    const questoesPorDisciplina = Math.ceil(cfg.questoes / discsParaUsar.length)
    const disciplinasNomes = disciplinasComTopicos.join('\n- ')
    
    console.log(`📚 Disciplinas para o simulado: ${discsParaUsar.map((d: any) => d.nome).join(', ')}`)
    
    const prompt = `Gere ${cfg.questoes} questões de múltipla escolha para um simulado de concurso público.

🎯 NÍVEL DE DIFICULDADE: ${difConfig.texto}
${difConfig.instrucao}

📚 DISCIPLINAS E TÓPICOS DO EDITAL DO CANDIDATO:
- ${disciplinasNomes}

⚠️ REGRAS CRÍTICAS:
1. As questões DEVEM ser sobre os TÓPICOS ESPECÍFICOS listados para cada disciplina
2. Se a disciplina tem tópicos indicados (entre parênteses), PRIORIZE esses tópicos
3. CADA QUESTÃO deve abordar UM TÓPICO DIFERENTE - NÃO repita tópicos
4. Use informações CORRETAS e VERIFICÁVEIS - NÃO invente dados, leis ou fatos
5. RESPEITE o nível de dificuldade solicitado (${difConfig.texto})

REGRAS DE FORMATO:
1. Exatamente 5 alternativas (A, B, C, D, E)
2. Apenas UMA alternativa correta por questão
3. Estilo de bancas: CESPE, FCC, VUNESP, FGV
4. Distribua PROPORCIONALMENTE entre as disciplinas (${Math.ceil(cfg.questoes / discsParaUsar.length)} questões por disciplina)
5. Inclua explicação didática para cada resposta

Retorne APENAS um JSON válido no formato:
{
  "questoes": [
    {
      "numero": 1,
      "disciplina": "Nome EXATO da Disciplina (copie da lista acima)",
      "enunciado": "Texto completo da questão RELACIONADA À DISCIPLINA",
      "alternativas": {
        "A": "Texto da alternativa A",
        "B": "Texto da alternativa B",
        "C": "Texto da alternativa C",
        "D": "Texto da alternativa D",
        "E": "Texto da alternativa E"
      },
      "resposta_correta": "A",
      "explicacao": "Explicação detalhada de por que a alternativa X está correta e as demais incorretas",
      "dificuldade": "facil|medio|dificil"
    }
  ]
}`

    if (!GROQ_API_KEY) {
      console.log('⚠️ GROQ_API_KEY não configurada, gerando questões de exemplo')
      // Gerar questões de exemplo se não tiver API key
      const questoesExemplo = gerarQuestoesExemplo(cfg.questoes, discsParaUsar)
      return c.json({ 
        success: true, 
        questoes: questoesExemplo,
        tempo_minutos: cfg.tempo,
        tipo
      })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'system',
          content: 'Você é um especialista em elaboração de questões para concursos públicos brasileiros. REGRAS ABSOLUTAS: 1) SEMPRE retorne JSON válido. 2) CADA questão deve abordar um TÓPICO DIFERENTE - NUNCA repita tópicos ou enunciados. 3) O conteúdo deve ser PRECISO e VERIFICÁVEL - use fatos, leis e dados REAIS. 4) As questões devem ser baseadas nos TÓPICOS ESPECÍFICOS fornecidos no edital do candidato. 5) Varie a dificuldade: 30% fácil, 50% médio, 20% difícil.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      console.error('❌ Erro na API do Groq:', response.status)
      const questoesExemplo = gerarQuestoesExemplo(cfg.questoes, discsParaUsar)
      return c.json({ 
        success: true, 
        questoes: questoesExemplo,
        tempo_minutos: cfg.tempo,
        tipo,
        fallback: true
      })
    }

    const data = await response.json() as any
    let resposta = data.choices?.[0]?.message?.content || ''
    
    // Sanitizar JSON
    let jsonText = resposta.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    const resultado = JSON.parse(jsonText)
    
    return c.json({ 
      success: true, 
      questoes: resultado.questoes || [],
      tempo_minutos: cfg.tempo,
      tipo
    })
    
  } catch (error: any) {
    console.error('Erro ao gerar questões:', error)
    return c.json({ error: 'Erro ao gerar questões: ' + error.message }, 500)
  }
})

// Função auxiliar para gerar questões de exemplo (fallback)
function gerarQuestoesExemplo(quantidade: number, disciplinas: any[]): any[] {
  const questoes = []
  const dificuldades = ['facil', 'medio', 'dificil']
  
  const bancosQuestoes: Record<string, any[]> = {
    'Direito Constitucional': [
      {
        enunciado: 'De acordo com a Constituição Federal de 1988, são direitos sociais, EXCETO:',
        alternativas: { A: 'A educação', B: 'A saúde', C: 'A alimentação', D: 'O lazer', E: 'A propriedade privada' },
        resposta_correta: 'E',
        explicacao: 'A propriedade privada é um direito individual (art. 5º, XXII), não um direito social. Os direitos sociais estão previstos no art. 6º da CF/88.'
      },
      {
        enunciado: 'Qual o prazo máximo de duração do estado de defesa?',
        alternativas: { A: '15 dias', B: '30 dias', C: '60 dias', D: '90 dias', E: '120 dias' },
        resposta_correta: 'B',
        explicacao: 'Conforme art. 136, §2º da CF/88, o estado de defesa não será superior a 30 dias, podendo ser prorrogado uma vez, por igual período.'
      }
    ],
    'Direito Administrativo': [
      {
        enunciado: 'São princípios expressos da Administração Pública previstos no art. 37 da CF/88:',
        alternativas: { A: 'Legalidade, impessoalidade, moralidade, publicidade e eficiência', B: 'Legalidade, razoabilidade, moralidade, publicidade e eficiência', C: 'Legalidade, impessoalidade, proporcionalidade, publicidade e eficiência', D: 'Legalidade, impessoalidade, moralidade, transparência e eficiência', E: 'Legalidade, impessoalidade, moralidade, publicidade e economicidade' },
        resposta_correta: 'A',
        explicacao: 'O art. 37, caput, da CF/88 estabelece expressamente os princípios LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência.'
      },
      {
        enunciado: 'A modalidade de licitação para obras e serviços de engenharia acima de R$ 3.300.000,00 é:',
        alternativas: { A: 'Convite', B: 'Tomada de preços', C: 'Concorrência', D: 'Pregão', E: 'Leilão' },
        resposta_correta: 'C',
        explicacao: 'Conforme a Lei 14.133/2021 (Nova Lei de Licitações), a concorrência é obrigatória para obras e serviços de engenharia de grande vulto.'
      }
    ],
    'Português': [
      {
        enunciado: 'Assinale a alternativa em que a concordância verbal está CORRETA:',
        alternativas: { A: 'Fazem cinco anos que não o vejo', B: 'Houveram muitos problemas na reunião', C: 'Existe muitas razões para isso', D: 'Faz cinco anos que não o vejo', E: 'Haviam chegado os convidados' },
        resposta_correta: 'D',
        explicacao: 'O verbo "fazer" indicando tempo decorrido é impessoal, permanecendo na 3ª pessoa do singular. "Faz cinco anos" é a forma correta.'
      },
      {
        enunciado: 'Assinale a alternativa em que há erro de regência verbal:',
        alternativas: { A: 'Aspiro ao cargo de diretor', B: 'Prefiro cinema a teatro', C: 'Assisti ao filme ontem', D: 'Obedeço aos meus pais', E: 'Prefiro mais cinema do que teatro' },
        resposta_correta: 'E',
        explicacao: 'O verbo preferir não admite os termos intensificadores "mais" ou "do que". A construção correta é "Prefiro cinema a teatro".'
      }
    ],
    'Raciocínio Lógico': [
      {
        enunciado: 'Se todo A é B, e todo B é C, então:',
        alternativas: { A: 'Todo C é A', B: 'Todo A é C', C: 'Algum C não é A', D: 'Nenhum A é C', E: 'Todo C é B' },
        resposta_correta: 'B',
        explicacao: 'Pela propriedade transitiva dos silogismos categóricos, se A⊂B e B⊂C, então A⊂C. Portanto, todo A é C.'
      },
      {
        enunciado: 'Em uma sequência, cada termo é obtido somando-se 3 ao termo anterior. Se o primeiro termo é 5, qual é o décimo termo?',
        alternativas: { A: '29', B: '30', C: '32', D: '35', E: '38' },
        resposta_correta: 'C',
        explicacao: 'Trata-se de uma PA com a1=5 e r=3. O termo geral é an = a1 + (n-1).r = 5 + (10-1).3 = 5 + 27 = 32.'
      }
    ],
    'Informática': [
      {
        enunciado: 'No Microsoft Excel, a função utilizada para somar valores que atendem a um critério específico é:',
        alternativas: { A: 'SOMA', B: 'SOMASE', C: 'CONT.SE', D: 'MÉDIA', E: 'PROCV' },
        resposta_correta: 'B',
        explicacao: 'A função SOMASE permite somar valores em um intervalo que atendem a uma condição específica. SOMA apenas soma valores sem condição.'
      },
      {
        enunciado: 'O atalho de teclado Ctrl+Z no Windows serve para:',
        alternativas: { A: 'Copiar', B: 'Colar', C: 'Recortar', D: 'Desfazer', E: 'Refazer' },
        resposta_correta: 'D',
        explicacao: 'Ctrl+Z é o atalho universal para desfazer a última ação. Ctrl+C copia, Ctrl+V cola, Ctrl+X recorta e Ctrl+Y refaz.'
      }
    ]
  }
  
  // Questões genéricas específicas por categoria de disciplina
  const questoesGenericasPorCategoria: Record<string, any[]> = {
    'direito': [
      {
        enunciado: 'Considerando os princípios fundamentais do ordenamento jurídico brasileiro, assinale a alternativa INCORRETA:',
        alternativas: { A: 'Os princípios servem como base interpretativa', B: 'Todos os princípios têm igual hierarquia', C: 'Os princípios podem entrar em conflito', D: 'A ponderação resolve conflitos entre princípios', E: 'Os princípios orientam a aplicação das normas' },
        resposta_correta: 'B',
        explicacao: 'Nem todos os princípios têm igual hierarquia. Existem princípios constitucionais que prevalecem sobre infraconstitucionais, por exemplo.'
      },
      {
        enunciado: 'Em relação às fontes do direito, é correto afirmar:',
        alternativas: { A: 'A doutrina é fonte primária', B: 'A jurisprudência vincula sempre', C: 'A lei é fonte principal no ordenamento brasileiro', D: 'Os costumes prevalecem sobre leis', E: 'A analogia é sempre permitida' },
        resposta_correta: 'C',
        explicacao: 'No ordenamento jurídico brasileiro, a lei é a fonte principal do direito, tendo prevalência sobre outras fontes como doutrina e costumes.'
      }
    ],
    'conhecimentos_regionais': [
      {
        enunciado: 'Sobre aspectos geográficos e históricos desta região, é correto afirmar:',
        alternativas: { A: 'A formação territorial ocorreu de forma isolada', B: 'A região possui características geográficas específicas que influenciam sua economia', C: 'O desenvolvimento econômico não depende de fatores regionais', D: 'A história regional não tem relação com a história nacional', E: 'Os aspectos culturais são uniformes em todo o território' },
        resposta_correta: 'B',
        explicacao: 'Cada região possui características geográficas específicas (clima, relevo, hidrografia) que influenciam diretamente sua economia, cultura e desenvolvimento.'
      },
      {
        enunciado: 'Em relação às características socioeconômicas da região, assinale a alternativa correta:',
        alternativas: { A: 'O desenvolvimento econômico é independente da localização', B: 'As atividades econômicas são determinadas exclusivamente pelo governo', C: 'As condições geográficas influenciam as principais atividades econômicas', D: 'A população não sofre influência do clima', E: 'Os recursos naturais são irrelevantes para a economia' },
        resposta_correta: 'C',
        explicacao: 'As condições geográficas como clima, solo e recursos hídricos determinam as principais atividades econômicas de cada região.'
      }
    ],
    'matematica': [
      {
        enunciado: 'Em uma progressão aritmética, o primeiro termo é 3 e a razão é 4. Qual é o décimo termo?',
        alternativas: { A: '35', B: '37', C: '39', D: '41', E: '43' },
        resposta_correta: 'C',
        explicacao: 'PA: an = a1 + (n-1).r = 3 + (10-1).4 = 3 + 36 = 39'
      },
      {
        enunciado: 'Se 2^x = 16, qual o valor de x?',
        alternativas: { A: '2', B: '3', C: '4', D: '5', E: '6' },
        resposta_correta: 'C',
        explicacao: '2^x = 16 = 2^4, logo x = 4'
      }
    ],
    'portugues': [
      {
        enunciado: 'Assinale a alternativa em que há ERRO de concordância verbal:',
        alternativas: { A: 'Faz cinco anos que não o vejo', B: 'Houve muitos problemas na reunião', C: 'Existem muitas razões para isso', D: 'Haviam chegado os convidados', E: 'Devem haver soluções melhores' },
        resposta_correta: 'E',
        explicacao: '"Haver" no sentido de existir é impessoal, não vai para o plural. O correto seria "Deve haver soluções melhores".'
      },
      {
        enunciado: 'Em "A moça a quem me referi chegou", a função sintática de "a quem" é:',
        alternativas: { A: 'Objeto direto', B: 'Objeto indireto', C: 'Complemento nominal', D: 'Adjunto adnominal', E: 'Sujeito' },
        resposta_correta: 'B',
        explicacao: 'Quem se refere a algo/alguém. "Referi-me a quem" - o "a quem" é objeto indireto do verbo referir.'
      }
    ],
    'geral': [
      {
        enunciado: 'Considerando os fundamentos desta área de conhecimento, assinale a alternativa correta:',
        alternativas: { A: 'Os conceitos básicos são irrelevantes para a prática', B: 'A teoria e a prática devem estar sempre conectadas', C: 'Apenas a experiência prática é importante', D: 'O conhecimento teórico dispensa atualização', E: 'Os fundamentos não evoluem com o tempo' },
        resposta_correta: 'B',
        explicacao: 'Em qualquer área do conhecimento, teoria e prática devem caminhar juntas para uma compreensão completa e aplicação efetiva.'
      }
    ]
  }
  
  // Função para determinar categoria da disciplina
  const obterCategoria = (nomeDisciplina: string): string => {
    const nome = nomeDisciplina.toLowerCase()
    if (nome.includes('direito') || nome.includes('constitucional') || nome.includes('administrativo') || nome.includes('penal') || nome.includes('civil') || nome.includes('tributário') || nome.includes('trabalhista')) return 'direito'
    if (nome.includes('conhecimentos') || nome.includes('regionais') || nome.includes('locais') || nome.includes('piauí') || nome.includes('estado') || nome.includes('município') || nome.includes('geografia') || nome.includes('história')) return 'conhecimentos_regionais'
    if (nome.includes('matemática') || nome.includes('raciocínio') || nome.includes('lógico') || nome.includes('estatística')) return 'matematica'
    if (nome.includes('português') || nome.includes('redação') || nome.includes('língua')) return 'portugues'
    return 'geral'
  }
  
  for (let i = 0; i < quantidade; i++) {
    const disciplina = disciplinas[i % disciplinas.length]
    const discNome = disciplina.nome || disciplina
    const dificuldade = dificuldades[i % 3]
    
    // Tentar pegar questão específica da disciplina
    let questaoBase
    const questoesDaDisc = bancosQuestoes[discNome]
    if (questoesDaDisc && questoesDaDisc.length > 0) {
      questaoBase = questoesDaDisc[i % questoesDaDisc.length]
    } else {
      // Usar questões genéricas da CATEGORIA apropriada
      const categoria = obterCategoria(discNome)
      const questoesCategoria = questoesGenericasPorCategoria[categoria] || questoesGenericasPorCategoria['geral']
      questaoBase = questoesCategoria[i % questoesCategoria.length]
    }
    
    questoes.push({
      numero: i + 1,
      disciplina: discNome,
      enunciado: questaoBase.enunciado,
      alternativas: questaoBase.alternativas,
      resposta_correta: questaoBase.resposta_correta,
      explicacao: questaoBase.explicacao,
      dificuldade
    })
  }
  
  return questoes
}

// Rota catch-all para servir o SPA (Single Page Application)
// Deve vir APÓS todas as rotas de API
app.get('*', (c) => {
  // Retornar o HTML principal para qualquer rota não capturada
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IAprova - Preparação Inteligente para Concursos</title>
    <meta name="description" content="Sistema inteligente de preparação para concursos públicos com IA">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
    
    <!-- Axios -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    
    <!-- Custom Styles -->
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        #app {
            min-height: 100vh;
        }
        /* Loading Spinner */
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #122D6A;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <!-- App Container -->
    <div id="app">
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1F4D] via-[#122D6A] to-[#1A3A7F]">
            <div class="text-center">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-white text-lg">Carregando IAprova...</p>
            </div>
        </div>
    </div>
    
    <!-- Main App Script -->
    <script src="/static/app.js?v=${Date.now()}"></script>
</body>
</html>`)
})


// Endpoint para listar bancas disponíveis
app.get('/api/bancas', async (c) => {
  const { DB } = c.env
  
  try {
    const bancas = await DB.prepare('SELECT nome, descricao, dicas_estudo FROM bancas_caracteristicas ORDER BY nome').all()
    return c.json({ bancas: bancas.results || [] })
  } catch (error) {
    console.error('Erro ao buscar bancas:', error)
    return c.json({ bancas: [] })
  }
})

// Endpoint para informações detalhadas de uma banca
app.get('/api/bancas/:nome', async (c) => {
  const { DB } = c.env
  const nomeBanca = c.req.param('nome')
  
  try {
    const banca = await DB.prepare('SELECT * FROM bancas_caracteristicas WHERE nome = ?').bind(nomeBanca.toUpperCase()).first()
    if (banca) {
      const info = getCaracteristicasBanca(nomeBanca)
      return c.json({ 
        banca: banca,
        caracteristicas: info?.caracteristicas || {},
        exemplos: info ? gerarExemploQuestaoBanca(nomeBanca) : null
      })
    }
    return c.json({ error: 'Banca não encontrada' }, 404)
  } catch (error) {
    console.error('Erro ao buscar banca:', error)
    return c.json({ error: 'Erro ao buscar informações da banca' }, 500)
  }
})

// ============== ARQUIVOS PWA ==============
// Servir manifest.json
app.get('/manifest.json', async (c) => {
  const manifest = {
    "name": "IAprova - Preparação Inteligente para Concursos",
    "short_name": "IAprova",
    "description": "Sistema inteligente de preparação para concursos públicos com IA. Planos de estudo personalizados, simulados adaptativos e conteúdo sob medida.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#122D6A",
    "orientation": "portrait-primary",
    "scope": "/",
    "lang": "pt-BR",
    "categories": ["education", "productivity"],
    "icons": [
      { "src": "/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
      { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png", "purpose": "any" },
      { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
    ],
    "shortcuts": [
      {
        "name": "Meu Plano de Estudos",
        "short_name": "Plano",
        "description": "Acesse seu plano de estudos personalizado",
        "url": "/?action=plano",
        "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
      }
    ]
  }
  return c.json(manifest)
})

// Servir Service Worker
app.get('/sw.js', async (c) => {
  const swContent = `
const CACHE_NAME = 'iaprova-v1';
const urlsToCache = [
  '/',
  '/static/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
`;
  return new Response(swContent, {
    headers: { 'Content-Type': 'application/javascript' }
  })
})

export default app
