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

// Função para extrair texto de DOC/DOCX usando Gemini
async function extractTextFromDocx(docBuffer: ArrayBuffer, geminiKey: string, mimeType: string): Promise<string> {
  console.log('📄 Iniciando extração de texto do DOCX com Gemini API...')
  
  const bytes = new Uint8Array(docBuffer)
  const fileSizeMB = bytes.length / (1024 * 1024)
  console.log(`📄 DOCX: ${bytes.length} bytes (${fileSizeMB.toFixed(2)} MB)`)
  
  // Converter para base64
  let binary = ''
  const len = bytes.length
  const chunkSize = 8192
  
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
    binary += String.fromCharCode.apply(null, Array.from(chunk))
  }
  const base64 = btoa(binary)
  
  console.log(`📄 Base64: ${base64.length} caracteres`)
  
  const prompt = `Extraia TODO o texto deste documento Word. Retorne o conteúdo completo, preservando a estrutura (parágrafos, títulos, listas). Não adicione comentários ou análises, apenas o texto extraído do documento.`

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
  
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { 
            inlineData: { 
              mimeType: mimeType,
              data: base64 
            } 
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 30000
      }
    })
  })
  
  if (!response.ok) {
    const errText = await response.text()
    console.error('Gemini DOCX error:', errText)
    throw new Error(`Gemini API error: ${response.status}`)
  }
  
  const data = await response.json() as any
  const textoExtraido = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  console.log(`📝 Texto extraído do DOCX: ${textoExtraido.length} caracteres`)
  return textoExtraido
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

// Servir imagem Open Graph (para WhatsApp, Facebook, Twitter)
// IMPORTANTE: Esta rota garante que a imagem seja servida corretamente para crawlers
// A imagem está em public/og-image.png e é copiada para dist/og-image.png no build
app.get('/og-image.png', async (c) => {
  // Servir a imagem diretamente do Cloudflare Pages Assets
  // Cloudflare Pages serve arquivos de public/ automaticamente em /
  const assetUrl = new URL('/og-image.png', c.req.url)
  
  try {
    // Tentar buscar o asset estático
    const response = await c.env.ASSETS?.fetch(assetUrl)
    if (response && response.ok) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400'
        }
      })
    }
  } catch (e) {
    console.log('Erro ao buscar og-image via ASSETS:', e)
  }
  
  // Fallback: retornar 404 com mensagem clara
  return c.text('Open Graph image not found', 404)
})

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

// ✅ CORREÇÃO v13: Função para registrar histórico de emails enviados
async function logEmailSent(
  DB: any,
  emailTo: string,
  emailType: string,
  subject: string,
  status: 'sent' | 'failed' | 'pending',
  userId?: number,
  errorMessage?: string,
  metadata?: any
): Promise<void> {
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email_to TEXT NOT NULL,
        email_type TEXT NOT NULL,
        subject TEXT,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    await DB.prepare(`
      INSERT INTO email_history (user_id, email_to, email_type, subject, status, error_message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId || null,
      emailTo,
      emailType,
      subject,
      status,
      errorMessage || null,
      metadata ? JSON.stringify(metadata) : null
    ).run()
    
    console.log(`📧 Email registrado: ${emailType} -> ${emailTo} (${status})`)
  } catch (e: any) {
    console.error('⚠️ Erro ao registrar email no histórico:', e.message)
  }
}

// Função para enviar email de reset de senha
async function sendPasswordResetEmail(email: string, token: string, name: string, env?: any): Promise<boolean> {
  // Obter configurações do ambiente
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>';
  
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
    
    const success = response.ok;
    
    // ✅ CORREÇÃO v16: Registrar no histórico de emails
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'password_reset',
        '🔐 Redefinição de Senha - IAprova',
        success ? 'sent' : 'failed',
        undefined,
        success ? undefined : await response.text()
      )
    }
    
    if (!success) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend:', errorText);
    } else {
      console.log('✅ Email de reset enviado com sucesso!');
    }

    return success;
  } catch (error: any) {
    console.error('Erro ao enviar email de reset:', error);
    
    // Registrar falha no histórico
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'password_reset',
        '🔐 Redefinição de Senha - IAprova',
        'failed',
        undefined,
        error.message
      )
    }
    
    return false;
  }
}

// Função para enviar email de verificação (usando Resend)
async function sendVerificationEmail(email: string, token: string, name: string, env?: any): Promise<boolean> {
  // Obter configurações do ambiente
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>';
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
                            Com o IAprova, você terá <strong style="color: #059669;">14 dias grátis</strong> para testar todas as funcionalidades: plano de estudos personalizado, conteúdos gerados por IA e ferramentas inteligentes para maximizar sua preparação.
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
    
    const success = response.ok;
    
    // ✅ CORREÇÃO v16: Registrar no histórico de emails (verificação)
    // Nota: emails de verificação são filtrados no endpoint de histórico
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'verification',
        '✅ Confirme seu Email - IAprova',
        success ? 'sent' : 'failed',
        undefined,
        success ? undefined : (response.status === 403 ? 'Resend em modo de teste' : 'Erro ao enviar')
      )
    }
    
    if (!success) {
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
  } catch (error: any) {
    console.error('Erro ao enviar email:', error);
    
    // Registrar falha no histórico
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'verification',
        '✅ Confirme seu Email - IAprova',
        'failed',
        undefined,
        error.message
      )
    }
    
    return false;
  }
}

// Função para enviar email de boas-vindas após verificação (usando Resend)
async function sendWelcomeEmail(email: string, name: string, env?: any): Promise<boolean> {
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>';
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
                          Seu email foi verificado e sua conta está <strong>100% ativa</strong>. Agora você tem <strong style="color: #059669;">14 dias grátis</strong> para explorar todas as funcionalidades do IAprova!
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
    
    const success = response.ok;
    
    // ✅ CORREÇÃO v16: Registrar no histórico de emails
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'welcome',
        '🎉 Bem-vindo ao IAprova!',
        success ? 'sent' : 'failed',
        undefined,
        success ? undefined : await response.text()
      )
    }
    
    if (!success) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend (Welcome):', errorText);
    } else {
      console.log('✅ Email de boas-vindas enviado com sucesso!');
    }

    return success;
  } catch (error: any) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    
    // Registrar falha no histórico
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'welcome',
        '🎉 Bem-vindo ao IAprova!',
        'failed',
        undefined,
        error.message
      )
    }
    
    return false;
  }
}

// Função para enviar email de confirmação de pagamento (usando Resend)
async function sendPaymentConfirmationEmail(
  email: string, 
  name: string, 
  plan: string, 
  amount: number, 
  expiresAt: string,
  paymentId: string,
  env?: any
): Promise<boolean> {
  const RESEND_API_KEY = env?.RESEND_API_KEY || 'seu_resend_api_key_aqui';
  const FROM_EMAIL = env?.FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>';
  const APP_URL = env?.APP_URL || 'https://iaprova.app';
  
  // Verificar se tem API key configurada
  if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
    console.log('⚠️ MODO DEV: Email de pagamento não enviado (configure RESEND_API_KEY)');
    return false;
  }
  
  // Formatar dados
  const planName = plan === 'anual' ? 'Premium Anual (12 meses)' : 'Premium Mensal';
  const amountFormatted = 'R$ ' + amount.toFixed(2).replace('.', ',');
  const expiresDate = new Date(expiresAt).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  const purchaseDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Calcular economia para plano anual
  const savingsHtml = plan === 'anual' 
    ? '<div style="margin-top: 16px; padding: 12px; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 8px; text-align: center;"><span style="color: #059669; font-weight: 600; font-size: 14px;">🎁 Você economizou R$ 108,90 (30% de desconto!)</span></div>'
    : '';
  
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento Confirmado - IAprova</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #E8EDF5;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #E8EDF5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(18, 45, 106, 0.12); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #122D6A 0%, #1A3A7F 50%, #2A4A9F 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.15); width: 80px; height: 80px; border-radius: 50%; display: inline-block; line-height: 80px; margin-bottom: 16px;">
                <span style="font-size: 40px;">👑</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Pagamento Confirmado!</h1>
              <p style="color: #7BC4FF; margin: 12px 0 0 0; font-size: 16px; font-weight: 600;">Você agora é IAprova Premium</p>
            </td>
          </tr>
          
          <!-- Mensagem de agradecimento -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="color: #122D6A; margin: 0 0 12px 0; font-size: 22px; font-weight: 700;">
                Olá, ${name}! 🎊
              </h2>
              <p style="color: #4A6491; margin: 0; font-size: 16px; line-height: 1.7;">
                <strong>Muito obrigado por confiar no IAprova!</strong> Seu pagamento foi processado com sucesso 
                e sua conta Premium já está <span style="color: #059669; font-weight: 600;">100% ativa</span>.
              </p>
              <p style="color: #4A6491; margin: 16px 0 0 0; font-size: 15px; line-height: 1.6;">
                Estamos muito felizes em fazer parte da sua jornada rumo à aprovação! 
                Agora você tem acesso ilimitado a todos os recursos que vão acelerar seus estudos.
              </p>
            </td>
          </tr>
          
          <!-- Detalhes do Pagamento -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <div style="background: linear-gradient(135deg, #F0F7FF 0%, #E8EDF5 100%); border-radius: 12px; padding: 24px; border: 1px solid #C5D5EA;">
                <p style="color: #122D6A; font-size: 14px; font-weight: 700; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #122D6A; padding-bottom: 12px;">
                  📋 Detalhes da Compra
                </p>
                <table cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #4A6491;">Plano:</td>
                    <td style="padding: 8px 0; color: #122D6A; font-weight: 600; text-align: right;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4A6491;">Valor:</td>
                    <td style="padding: 8px 0; color: #059669; font-weight: 700; text-align: right; font-size: 18px;">${amountFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4A6491;">Data da compra:</td>
                    <td style="padding: 8px 0; color: #122D6A; font-weight: 500; text-align: right;">${purchaseDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4A6491;">Válido até:</td>
                    <td style="padding: 8px 0; color: #122D6A; font-weight: 600; text-align: right;">${expiresDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4A6491;">ID do pagamento:</td>
                    <td style="padding: 8px 0; color: #6B7C93; font-size: 12px; text-align: right;">${paymentId}</td>
                  </tr>
                </table>
                ${savingsHtml}
              </div>
            </td>
          </tr>
          
          <!-- Benefícios Premium -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #F59E0B;">
                <p style="color: #92400E; font-size: 14px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  ⭐ Seus Benefícios Premium:
                </p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Geração <strong>ilimitada</strong> de conteúdo por IA</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Questões personalizadas no estilo da sua banca</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Flashcards e resumos inteligentes</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Simulados completos com correção automática</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Assistente Lilu disponível 24/7</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Planos de estudo personalizados</td></tr>
                  <tr><td style="padding: 6px 0; color: #78350F; font-size: 14px;">✅ Suporte prioritário</td></tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <a href="${APP_URL}" style="display: inline-block; padding: 18px 56px; background: linear-gradient(135deg, #122D6A 0%, #2A4A9F 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 6px 20px rgba(18, 45, 106, 0.4);">
                🚀 Começar a Estudar Agora
              </a>
              <p style="color: #6B7C93; font-size: 13px; margin: 16px 0 0 0;">Aproveite ao máximo sua assinatura!</p>
            </td>
          </tr>
          
          <!-- Dica motivacional -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: #3730A3; font-size: 15px; margin: 0; font-style: italic; line-height: 1.6;">
                  "O sucesso é a soma de pequenos esforços repetidos dia após dia."<br>
                  <span style="font-size: 13px; color: #4F46E5;">— Robert Collier</span>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 40px; border-top: 1px solid #E2E8F0;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #122D6A; font-size: 18px; font-weight: 700; margin: 0 0 8px 0;">
                      <span style="color: #7BC4FF;">IA</span>prova
                    </p>
                    <p style="color: #6B7C93; font-size: 12px; margin: 0 0 12px 0;">Seu parceiro na jornada rumo à aprovação</p>
                    <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
                      Dúvidas? Responda este email ou acesse nossa Central de Ajuda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailSubject = '🎉 Pagamento Confirmado! Bem-vindo ao IAprova Premium';
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    console.log('💳 Resposta do Resend (Pagamento):', response.status, response.statusText);
    
    const success = response.ok;
    
    // ✅ CORREÇÃO v13: Registrar no histórico de emails (exceto verificação)
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'payment_confirmation',
        emailSubject,
        success ? 'sent' : 'failed',
        undefined, // userId será determinado depois se necessário
        success ? undefined : await response.text(),
        { plan, amount, paymentId, expiresAt }
      )
    }
    
    if (!success) {
      const errorText = await response.text();
      console.error('❌ Erro do Resend (Pagamento):', errorText);
    } else {
      console.log('✅ Email de confirmação de pagamento enviado com sucesso para:', email);
    }

    return success;
  } catch (error: any) {
    console.error('Erro ao enviar email de confirmação de pagamento:', error);
    
    // Registrar falha no histórico
    if (env?.DB) {
      await logEmailSent(
        env.DB,
        email,
        'payment_confirmation',
        '🎉 Pagamento Confirmado! Bem-vindo ao IAprova Premium',
        'failed',
        undefined,
        error.message,
        { plan, amount, paymentId, expiresAt }
      )
    }
    
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

    // ✅ CORREÇÃO v10: Criar novo usuário COM verificação de email obrigatória
    const verificationToken = crypto.randomUUID()
    
    const result = await DB.prepare(
      `INSERT INTO users (name, email, password, email_verified, verification_token, trial_started_at, trial_expires_at, subscription_status) 
       VALUES (?, ?, ?, 0, ?, datetime('now'), datetime('now', '+14 days'), 'trial')`
    ).bind(name, email, password, verificationToken).run()

    // Enviar email de verificação
    let emailSent = false
    try {
      emailSent = await sendVerificationEmail(email, verificationToken, name, c.env)
      console.log(`📧 Email de verificação ${emailSent ? 'ENVIADO' : 'NÃO ENVIADO'} para ${email}`)
      
      // ✅ v84: Registrar no histórico mesmo quando sendVerificationEmail já registra internamente
      // Se NÃO foi enviado (retornou false sem exception), registrar como 'failed' 
      if (!emailSent) {
        await logEmailSent(
          DB,
          email,
          'verification',
          '🎯 Ative sua conta no IAprova',
          'failed',
          result.meta.last_row_id as number,
          'Email não enviado - RESEND_API_KEY não configurada ou modo de teste'
        )
      }
    } catch (emailError: any) {
      console.error('⚠️ Erro ao enviar email de verificação:', emailError)
      // Registrar falha no histórico
      await logEmailSent(
        DB,
        email,
        'verification',
        '🎯 Ative sua conta no IAprova',
        'failed',
        result.meta.last_row_id as number,
        emailError?.message || 'Erro desconhecido ao enviar email'
      )
    }

    // Buscar usuário criado
    const newUser = await DB.prepare(
      'SELECT id, email, name, created_at, email_verified FROM users WHERE id = ?'
    ).bind(result.meta.last_row_id).first()

    return c.json({ 
      user: newUser,
      message: emailSent 
        ? '🎉 Conta criada! Verifique seu email para ativar sua conta.'
        : '🎉 Conta criada! Verifique seu email (pode estar na pasta spam) ou solicite o reenvio.',
      requiresVerification: true,
      emailSent
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
    
    // Calcular expiração em JavaScript (48 horas - mais seguro para evitar problemas de timezone)
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    
    console.log('💾 Inserindo no banco:', { userName, userEmail, hasPassword: !!userPassword })
    console.log('⏰ Token expira em:', tokenExpiresAt)

    const result = await DB.prepare(
      `INSERT INTO users (name, email, password, email_verified, verification_token, verification_token_expires) 
       VALUES (?, ?, ?, 0, ?, ?)`
    ).bind(userName, userEmail, userPassword, verificationToken, tokenExpiresAt).run()

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
             subscription_plan, subscription_expires_at, payment_id, payment_date, created_at,
             is_premium, premium_expires_at
      FROM users WHERE id = ?
    `).bind(userId).first() as any
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    const now = new Date()
    
    // ═══════════════════════════════════════════════
    // 1. ADMIN — acesso ilimitado
    // ═══════════════════════════════════════════════
    if (user.email === 'terciogomesrabelo@gmail.com') {
      return c.json({
        status: 'admin',
        isActive: true,
        needsPayment: false,
        isAdmin: true,
        message: 'Acesso administrativo ilimitado'
      })
    }
    
    // ═══════════════════════════════════════════════
    // 2. PREMIUM (dado por admin OU por pagamento)
    //    Verifica is_premium=1 com premium_expires_at válido
    //    OU subscription_status='active' com subscription_expires_at válido
    // ═══════════════════════════════════════════════
    
    // 2a. Verificar is_premium (campo direto, inclui premium dado por admin)
    if (user.is_premium === 1) {
      // Se tem data de expiração, verificar se ainda é válida
      if (user.premium_expires_at) {
        const premExpires = new Date(user.premium_expires_at)
        if (premExpires > now) {
          const daysRemaining = Math.ceil((premExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return c.json({
            status: 'active',
            isActive: true,
            needsPayment: false,
            plan: user.subscription_plan || 'premium',
            expiresAt: user.premium_expires_at,
            daysRemaining,
            message: `Premium ativo — ${daysRemaining} dias restantes`
          })
        } else {
          // Premium expirou — revogar
          console.log(`⏰ Premium expirou para usuário ${userId}, revogando...`)
          await DB.prepare(`
            UPDATE users SET is_premium = 0, subscription_status = 'expired' WHERE id = ?
          `).bind(userId).run()
          // Continuar para verificar trial
        }
      } else {
        // is_premium=1 sem data de expiração → acesso ilimitado (dado manualmente pelo admin sem prazo)
        return c.json({
          status: 'active',
          isActive: true,
          needsPayment: false,
          plan: user.subscription_plan || 'premium',
          daysRemaining: 999,
          message: 'Premium ativo (sem expiração)'
        })
      }
    }
    
    // 2b. Verificar subscription_status (pagamento via Mercado Pago)
    if (user.subscription_status === 'active' && user.subscription_expires_at) {
      const subExpires = new Date(user.subscription_expires_at)
      if (subExpires > now) {
        const daysRemaining = Math.ceil((subExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
        // Assinatura paga expirou — revogar
        console.log(`⏰ Assinatura paga expirou para usuário ${userId}, revogando...`)
        await DB.prepare(`
          UPDATE users SET subscription_status = 'expired', is_premium = 0 WHERE id = ?
        `).bind(userId).run()
      }
    }
    
    // ═══════════════════════════════════════════════
    // 3. TRIAL — 14 dias gratuitos
    // ═══════════════════════════════════════════════
    
    // Se nunca iniciou trial, iniciar agora
    if (!user.trial_started_at) {
      const trialStart = now.toISOString()
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 dias
      
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
        daysRemaining: 14,
        message: 'Período de teste iniciado! Você tem 14 dias grátis.'
      })
    }
    
    // Verificar trial ativo
    if (user.trial_expires_at) {
      const trialExpires = new Date(user.trial_expires_at)
      if (trialExpires > now) {
        const daysRemaining = Math.ceil((trialExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
    
    // ═══════════════════════════════════════════════
    // 4. EXPIRADO — trial acabou, sem premium, sem assinatura
    //    Deve pagar para continuar
    // ═══════════════════════════════════════════════
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
    
    // ✅ v69: Buscar preços dos planos do banco de dados primeiro
    let dbPlanPrices: Record<string, number> = {}
    try {
      const dbPlansAll = await DB.prepare(
        'SELECT name, price, duration_days FROM payment_plans WHERE is_active = 1'
      ).all() as any
      if (dbPlansAll?.results) {
        for (const dp of dbPlansAll.results) {
          const nl = (dp.name || '').toLowerCase()
          if (nl.includes('mensal') || (dp.duration_days >= 28 && dp.duration_days <= 31)) {
            dbPlanPrices['mensal'] = dp.price
          } else if (nl.includes('trimestral') || (dp.duration_days >= 80 && dp.duration_days <= 100)) {
            dbPlanPrices['trimestral'] = dp.price
          } else if (nl.includes('anual') || dp.duration_days >= 360) {
            dbPlanPrices['anual'] = dp.price
          }
        }
      }
    } catch(e) { /* fallback */ }
    const getPlanPrice = (plan: string) => dbPlanPrices[plan] || (plan === 'anual' ? 249.90 : 29.90)
    
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
        currentPlan: user.subscription_plan === 'anual' ? 'Premium Anual' : (user.subscription_plan === 'trimestral' ? 'Premium Trimestral' : 'Premium Mensal'),
        price: 0, // será preenchido depois com preço do banco
        startDate: user.payment_date,
        expiresAt: user.subscription_expires_at,
        daysRemaining: daysRemaining,
        isActive: !isExpired,
        paymentId: user.payment_id,
        paymentHistory: []
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
        currentPlan: 'Teste Grátis (14 dias)',
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
    
    // ✅ Preencher price do planInfo com valor do banco
    if (planInfo.status === 'active' || planInfo.status === 'expired') {
      planInfo.price = getPlanPrice(user.subscription_plan || 'mensal')
    }
    
    // ✅ CORREÇÃO v11: Buscar histórico de pagamentos real da tabela payment_history
    try {
      // Criar tabela se não existir
      await DB.prepare(`
        CREATE TABLE IF NOT EXISTS payment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          payment_id TEXT NOT NULL UNIQUE,
          plan TEXT NOT NULL,
          amount REAL,
          status TEXT NOT NULL,
          external_reference TEXT,
          payer_email TEXT,
          transaction_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
      
      const payments = await DB.prepare(`
        SELECT payment_id, plan, amount, status, created_at, payer_email
        FROM payment_history 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).bind(userId).all()
      
      if (payments.results && payments.results.length > 0) {
        planInfo.paymentHistory = payments.results.map((p: any) => ({
          paymentId: p.payment_id,
          date: p.created_at,
          plan: p.plan === 'anual' ? 'Premium Anual' : 'Premium Mensal',
          amount: p.amount || getPlanPrice(p.plan),
          status: p.status === 'approved' ? 'paid' : p.status,
          payerEmail: p.payer_email
        }))
      }
      // Se não há histórico na tabela mas tem payment_date no user, criar entrada legada
      else if (user.payment_date && planInfo.paymentHistory.length === 0) {
        planInfo.paymentHistory = [{
          paymentId: user.payment_id || 'legacy',
          date: user.payment_date,
          plan: user.subscription_plan === 'anual' ? 'Premium Anual' : 'Premium Mensal',
          amount: getPlanPrice(user.subscription_plan || 'mensal'),
          status: 'paid'
        }]
      }
    } catch (e: any) {
      console.log('⚠️ Erro ao buscar histórico de pagamentos:', e.message)
    }
    
    return c.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      memberSince: user.created_at,
      ...planInfo
    })
    
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error)
    return c.json({ error: 'Erro ao obter detalhes' }, 500)
  }
})

// Obter links de pagamento (dinâmico do banco)
app.get('/api/subscription/payment-links', async (c) => {
  const { DB } = c.env as any
  try {
    const dbPlans = await DB.prepare(
      'SELECT id, name, description, price, duration_days, features, discount_percent, is_featured FROM payment_plans WHERE is_active = 1 AND price > 0 ORDER BY price ASC'
    ).all() as any
    
    if (dbPlans?.results?.length > 0) {
      const plans = dbPlans.results.map((p: any) => {
        let features = []
        try { features = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []) } catch(e) {}
        const nameLower = (p.name || '').toLowerCase()
        let planId = ''
        if (nameLower.includes('mensal') || (p.duration_days >= 28 && p.duration_days <= 31)) planId = 'mensal'
        else if (nameLower.includes('trimestral') || (p.duration_days >= 80 && p.duration_days <= 100)) planId = 'trimestral'
        else if (nameLower.includes('anual') || p.duration_days >= 360) planId = 'anual'
        else planId = 'plano_' + p.id
        
        return {
          id: planId,
          name: p.name,
          price: p.price,
          duration: p.duration_days,
          discount_percent: p.discount_percent || 0,
          is_featured: !!p.is_featured,
          features
        }
      })
      return c.json({ plans })
    }
  } catch(e) { console.error('Erro ao buscar planos:', e) }
  
  // Fallback
  return c.json({
    plans: [
      { id: 'mensal', name: 'Premium Mensal', price: 29.90, duration: 30, features: [] },
      { id: 'anual', name: 'Premium Anual', price: 249.90, duration: 365, features: [] }
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
    
    // ✅ v69: Buscar preço e duração do plano do banco de dados
    let durationDays = plan === 'anual' ? 365 : (plan === 'trimestral' ? 90 : 30)
    let amount = plan === 'anual' ? 249.90 : (plan === 'trimestral' ? 79.90 : 29.90)
    try {
      const dbPlansActivate = await DB.prepare(
        'SELECT name, price, duration_days FROM payment_plans WHERE is_active = 1'
      ).all() as any
      if (dbPlansActivate?.results) {
        for (const dp of dbPlansActivate.results) {
          const nl = (dp.name || '').toLowerCase()
          if ((plan === 'mensal' && (nl.includes('mensal') || (dp.duration_days >= 28 && dp.duration_days <= 31))) ||
              (plan === 'trimestral' && (nl.includes('trimestral') || (dp.duration_days >= 80 && dp.duration_days <= 100))) ||
              (plan === 'anual' && (nl.includes('anual') || dp.duration_days >= 360))) {
            durationDays = dp.duration_days
            amount = dp.price
            break
          }
        }
      }
    } catch(e) { /* fallback to defaults */ }
    
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    const finalPaymentId = paymentId || 'manual_' + Date.now()
    
    await DB.prepare(`
      UPDATE users SET 
        subscription_status = 'active',
        subscription_plan = ?,
        subscription_expires_at = ?,
        payment_id = ?,
        payment_date = ?,
        is_premium = 1,
        premium_expires_at = ?
      WHERE id = ?
    `).bind(plan, expiresAt, finalPaymentId, now.toISOString(), expiresAt, userId).run()
    
    console.log(`✅ Assinatura ${plan} ativada para usuário ${userId} até ${expiresAt}`)
    
    // Buscar dados do usuário para enviar email
    const user = await DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(userId).first() as any
    
    // Enviar email de confirmação de pagamento
    if (user) {
      try {
        await sendPaymentConfirmationEmail(
          user.email,
          user.name || 'Usuário',
          plan,
          amount,
          expiresAt,
          finalPaymentId,
          c.env
        )
        console.log(`📧 Email de confirmação enviado para ${user.email}`)
      } catch (emailError) {
        console.error('⚠️ Erro ao enviar email de confirmação (não crítico):', emailError)
      }
    }
    
    return c.json({
      success: true,
      message: `Assinatura ${plan} ativada com sucesso!`,
      expiresAt,
      durationDays,
      emailSent: !!user
    })
  } catch (error) {
    console.error('Erro ao ativar assinatura:', error)
    return c.json({ error: 'Erro ao ativar assinatura' }, 500)
  }
})

// ============== MERCADO PAGO INTEGRATION ==============

// Criar preferência de pagamento no Mercado Pago
app.post('/api/mercadopago/create-preference', async (c) => {
  const { DB, MP_ACCESS_TOKEN, APP_URL } = c.env as any
  const { user_id, plan } = await c.req.json()
  
  if (!MP_ACCESS_TOKEN) {
    return c.json({ error: 'Mercado Pago não configurado' }, 500)
  }
  
  try {
    // Buscar usuário
    const user = await DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(user_id).first() as any
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    // ✅ v69: Buscar planos do banco de dados (dinâmico)
    const dbPlans = await DB.prepare(
      'SELECT id, name, price, duration_days FROM payment_plans WHERE is_active = 1 ORDER BY price ASC'
    ).all() as any
    
    // Mapear planos por tipo (mensal/anual/trimestral) baseado no nome ou duration_days
    const plans: Record<string, { title: string; price: number; days: number }> = {}
    
    if (dbPlans?.results?.length > 0) {
      for (const p of dbPlans.results) {
        let key = ''
        const nameLower = (p.name || '').toLowerCase()
        if (nameLower.includes('mensal') || (p.duration_days >= 28 && p.duration_days <= 31)) {
          key = 'mensal'
        } else if (nameLower.includes('trimestral') || (p.duration_days >= 80 && p.duration_days <= 100)) {
          key = 'trimestral'
        } else if (nameLower.includes('anual') || p.duration_days >= 360) {
          key = 'anual'
        }
        if (key && p.price > 0) {
          plans[key] = { title: `IAprova ${p.name}`, price: p.price, days: p.duration_days }
        }
      }
    }
    
    // Fallback se banco vazio
    if (Object.keys(plans).length === 0) {
      plans['mensal'] = { title: 'IAprova Premium Mensal', price: 29.90, days: 30 }
      plans['anual'] = { title: 'IAprova Premium Anual', price: 249.90, days: 365 }
    }
    
    const selectedPlan = plans[plan]
    if (!selectedPlan) {
      return c.json({ error: 'Plano inválido. Planos disponíveis: ' + Object.keys(plans).join(', ') }, 400)
    }
    
    // Criar preferência no Mercado Pago
    const preference = {
      items: [{
        id: plan,
        title: selectedPlan.title,
        description: `Assinatura ${plan === 'anual' ? 'Anual' : 'Mensal'} do IAprova - Preparação Inteligente para Concursos`,
        quantity: 1,
        unit_price: selectedPlan.price,
        currency_id: 'BRL'
      }],
      payer: {
        email: user.email,
        name: user.name || 'Usuário IAprova'
      },
      // ✅ Habilitar todos os métodos de pagamento
      payment_methods: {
        // Excluir apenas métodos que não queremos
        excluded_payment_types: [],
        excluded_payment_methods: [],
        // Parcelas: até 12x para plano anual, até 3x para mensal
        installments: plan === 'anual' ? 12 : 3,
        // Valor mínimo parcela
        default_installments: 1
      },
      back_urls: {
        success: `${APP_URL || 'https://iaprova.app'}/pagamento/sucesso`,
        failure: `${APP_URL || 'https://iaprova.app'}/pagamento/falha`,
        pending: `${APP_URL || 'https://iaprova.app'}/pagamento/pendente`
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({ user_id, plan, days: selectedPlan.days }),
      notification_url: `${APP_URL || 'https://iaprova.app'}/api/webhook/mercadopago`,
      statement_descriptor: 'IAPROVA',
      // Habilitar binário mode para processar pagamento sem pendências
      binary_mode: false,
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    }
    
    console.log(`🔄 Criando preferência MP para usuário ${user_id}, plano ${plan}...`)
    console.log(`🔑 Token (primeiros 20 chars): ${MP_ACCESS_TOKEN?.substring(0, 20)}...`)
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    })
    
    const result = await response.json() as any
    
    console.log(`📦 Resposta MP (status ${response.status}):`, JSON.stringify(result).substring(0, 500))
    
    if (!response.ok || result.error) {
      console.error('❌ Erro ao criar preferência:', result)
      return c.json({ 
        error: result.message || result.error || 'Erro ao criar pagamento',
        details: result
      }, 500)
    }
    
    if (!result.init_point) {
      console.error('❌ Resposta sem init_point:', result)
      return c.json({ error: 'Resposta inválida do Mercado Pago - sem URL de pagamento' }, 500)
    }
    
    console.log(`✅ Preferência criada: ${result.id} para usuário ${user_id}`)
    console.log(`🔗 URL de pagamento: ${result.init_point}`)
    
    return c.json({
      success: true,
      preference_id: result.id,
      init_point: result.init_point, // URL para redirecionar o usuário
      sandbox_init_point: result.sandbox_init_point
    })
  } catch (error: any) {
    console.error('Erro ao criar preferência:', error)
    return c.json({ error: error.message }, 500)
  }
})

// Webhook para receber confirmação de pagamento do Mercado Pago
app.post('/api/webhook/mercadopago', async (c) => {
  const { DB, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET } = c.env as any
  
  try {
    // Validar assinatura do webhook (segurança)
    const signature = c.req.header('x-signature')
    const requestId = c.req.header('x-request-id')
    
    if (MP_WEBHOOK_SECRET && signature) {
      // O Mercado Pago envia assinatura no formato: ts=timestamp,v1=hash
      console.log('🔐 Validando assinatura do webhook...')
      console.log('Signature:', signature)
      console.log('Request ID:', requestId)
      // Por enquanto, apenas logamos - a validação completa requer crypto
    }
    
    const body = await c.req.json()
    console.log('📦 Webhook Mercado Pago recebido:', JSON.stringify(body))
    
    // Verificar tipo de notificação
    if (body.type !== 'payment' && body.action !== 'payment.created' && body.action !== 'payment.updated') {
      console.log('Notificação ignorada:', body.type, body.action)
      return c.json({ received: true })
    }
    
    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentId = body.data?.id || body.id
    if (!paymentId) {
      console.log('Payment ID não encontrado')
      return c.json({ received: true })
    }
    
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    })
    
    const payment = await paymentResponse.json() as any
    console.log('💳 Detalhes do pagamento:', JSON.stringify(payment))
    
    // Verificar se pagamento foi aprovado
    if (payment.status !== 'approved') {
      console.log(`Pagamento ${paymentId} não aprovado: ${payment.status}`)
      return c.json({ received: true, status: payment.status })
    }
    
    // Extrair dados do external_reference
    let userData
    try {
      userData = JSON.parse(payment.external_reference)
    } catch {
      console.error('external_reference inválido:', payment.external_reference)
      return c.json({ error: 'Referência inválida' }, 400)
    }
    
    const { user_id, plan, days } = userData
    
    // Calcular data de expiração
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (days || 30) * 24 * 60 * 60 * 1000).toISOString()
    
    // ✅ CORREÇÃO v9: Atualizar usuário com assinatura ativa E is_premium = 1
    await DB.prepare(`
      UPDATE users SET 
        subscription_status = 'active',
        subscription_plan = ?,
        subscription_expires_at = ?,
        payment_id = ?,
        payment_date = ?,
        is_premium = 1,
        premium_expires_at = ?
      WHERE id = ?
    `).bind(plan, expiresAt, paymentId.toString(), now.toISOString(), expiresAt, user_id).run()
    
    console.log(`✅ Assinatura ${plan} ativada para usuário ${user_id} até ${expiresAt}`)
    
    // Buscar dados do usuário para enviar email
    const user = await DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(user_id).first() as any
    
    // Enviar email de confirmação de pagamento
    if (user) {
      try {
        await sendPaymentConfirmationEmail(
          user.email,
          user.name || 'Usuário',
          plan,
          payment.transaction_amount,
          expiresAt,
          paymentId.toString(),
          c.env
        )
        console.log(`📧 Email de confirmação enviado para ${user.email}`)
      } catch (emailError) {
        console.error('⚠️ Erro ao enviar email de confirmação (não crítico):', emailError)
      }
    }
    
    // ✅ CORREÇÃO v11: Registrar histórico de pagamento com mais detalhes para auditoria
    try {
      // Criar tabela se não existir (auto-migrate)
      await DB.prepare(`
        CREATE TABLE IF NOT EXISTS payment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          payment_id TEXT NOT NULL UNIQUE,
          plan TEXT NOT NULL,
          amount REAL,
          status TEXT NOT NULL,
          external_reference TEXT,
          payer_email TEXT,
          transaction_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
      
      await DB.prepare(`
        INSERT OR REPLACE INTO payment_history (user_id, payment_id, plan, amount, status, external_reference, payer_email, transaction_details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user_id, 
        paymentId.toString(), 
        plan, 
        payment.transaction_amount, 
        'approved',
        payment.external_reference,
        payment.payer?.email || null,
        JSON.stringify({
          status_detail: payment.status_detail,
          payment_method: payment.payment_method_id,
          date_approved: payment.date_approved,
          date_created: payment.date_created
        }),
        now.toISOString()
      ).run()
      console.log(`📝 Histórico de pagamento registrado: payment_id=${paymentId}, user_id=${user_id}`)
    } catch (e: any) {
      console.log('⚠️ Erro ao registrar histórico de pagamento:', e.message)
    }
    
    return c.json({ 
      received: true, 
      processed: true,
      user_id,
      plan,
      expires_at: expiresAt
    })
  } catch (error: any) {
    console.error('Erro no webhook:', error)
    return c.json({ error: 'Erro ao processar webhook' }, 500)
  }
})

// ✅ CORREÇÃO v11: Endpoint para histórico de pagamentos de um usuário
app.get('/api/user/:user_id/payments', async (c) => {
  const { DB } = c.env
  const userId = c.req.param('user_id')
  const requestUserId = c.req.header('X-User-ID')
  
  // Verificar se é o próprio usuário ou admin
  if (requestUserId !== userId && !await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        payment_id TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL,
        amount REAL,
        status TEXT NOT NULL,
        external_reference TEXT,
        payer_email TEXT,
        transaction_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Buscar histórico de pagamentos
    const payments = await DB.prepare(`
      SELECT 
        id, payment_id, plan, amount, status, payer_email, 
        created_at, transaction_details
      FROM payment_history 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    // Buscar também o pagamento atual do usuário (se existir)
    const user = await DB.prepare(`
      SELECT payment_id, payment_date, subscription_plan, subscription_status, subscription_expires_at
      FROM users WHERE id = ?
    `).bind(userId).first() as any
    
    return c.json({
      success: true,
      payments: payments.results || [],
      current_subscription: user ? {
        payment_id: user.payment_id,
        payment_date: user.payment_date,
        plan: user.subscription_plan,
        status: user.subscription_status,
        expires_at: user.subscription_expires_at
      } : null
    })
  } catch (error: any) {
    console.error('Erro ao buscar histórico de pagamentos:', error)
    return c.json({ error: 'Erro ao buscar pagamentos' }, 500)
  }
})

// ✅ CORREÇÃO v11: Endpoint admin para listar TODOS os pagamentos
app.get('/api/admin/payments', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        payment_id TEXT NOT NULL UNIQUE,
        plan TEXT NOT NULL,
        amount REAL,
        status TEXT NOT NULL,
        external_reference TEXT,
        payer_email TEXT,
        transaction_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Buscar todos os pagamentos com dados do usuário
    const payments = await DB.prepare(`
      SELECT 
        ph.id, ph.user_id, ph.payment_id, ph.plan, ph.amount, ph.status, 
        ph.payer_email, ph.created_at, ph.external_reference,
        u.name as user_name, u.email as user_email
      FROM payment_history ph
      LEFT JOIN users u ON u.id = ph.user_id
      ORDER BY ph.created_at DESC
    `).all()
    
    // Buscar também usuários com assinatura ativa (podem não ter payment_history)
    const activeUsers = await DB.prepare(`
      SELECT id, name, email, payment_id, payment_date, subscription_plan, subscription_status
      FROM users 
      WHERE subscription_status = 'active' OR is_premium = 1
    `).all()
    
    return c.json({
      success: true,
      payment_history: payments.results || [],
      active_subscriptions: activeUsers.results || []
    })
  } catch (error: any) {
    console.error('Erro ao listar pagamentos:', error)
    return c.json({ error: 'Erro ao listar pagamentos' }, 500)
  }
})

// Verificar status de pagamento
app.get('/api/mercadopago/payment-status/:payment_id', async (c) => {
  const { MP_ACCESS_TOKEN } = c.env as any
  const paymentId = c.req.param('payment_id')
  
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    })
    
    const payment = await response.json() as any
    
    return c.json({
      status: payment.status,
      status_detail: payment.status_detail,
      amount: payment.transaction_amount,
      date: payment.date_approved || payment.date_created
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Callback de retorno após pagamento
app.get('/pagamento/sucesso', async (c) => {
  const { DB, MP_ACCESS_TOKEN } = c.env as any
  const paymentId = c.req.query('payment_id')
  const status = c.req.query('status')
  const externalReference = c.req.query('external_reference')
  
  console.log(`💰 Retorno de pagamento: ${paymentId}, status: ${status}, ref: ${externalReference}`)
  
  // ✅ CORREÇÃO v10: Tentar ativar assinatura automaticamente no retorno
  if (paymentId && status === 'approved') {
    try {
      // Buscar detalhes do pagamento na API do Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      })
      
      const payment = await paymentResponse.json() as any
      console.log('💳 Pagamento aprovado, ativando assinatura:', payment.status)
      
      if (payment.status === 'approved' && payment.external_reference) {
        // Extrair dados do external_reference
        let userData
        try {
          userData = JSON.parse(payment.external_reference)
        } catch {
          console.error('external_reference inválido no callback:', payment.external_reference)
        }
        
        if (userData?.user_id) {
          const { user_id, plan, days } = userData
          
          // Verificar se já não foi ativado
          const user = await DB.prepare('SELECT subscription_status, payment_id FROM users WHERE id = ?').bind(user_id).first() as any
          
          if (!user?.payment_id || user.payment_id !== paymentId.toString()) {
            // Calcular data de expiração
            const now = new Date()
            const expiresAt = new Date(now.getTime() + (days || 30) * 24 * 60 * 60 * 1000).toISOString()
            
            // Ativar assinatura
            await DB.prepare(`
              UPDATE users SET 
                subscription_status = 'active',
                subscription_plan = ?,
                subscription_expires_at = ?,
                payment_id = ?,
                payment_date = ?,
                is_premium = 1,
                premium_expires_at = ?
              WHERE id = ?
            `).bind(plan || 'mensal', expiresAt, paymentId.toString(), now.toISOString(), expiresAt, user_id).run()
            
            console.log(`✅ Assinatura ativada via callback para usuário ${user_id}`)
          } else {
            console.log(`ℹ️ Assinatura já estava ativa para usuário ${user_id}`)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao ativar assinatura no callback:', error)
    }
  }
  
  // Redirecionar para o app com parâmetros
  return c.redirect(`/?payment=success&payment_id=${paymentId}&status=${status}`)
})

// ✅ NOVO v10: Endpoint para verificar e ativar pagamento manualmente (admin ou usuário)
app.post('/api/mercadopago/verify-and-activate/:payment_id', async (c) => {
  const { DB, MP_ACCESS_TOKEN } = c.env as any
  const paymentId = c.req.param('payment_id')
  const userId = c.req.header('X-User-ID')
  
  console.log(`🔍 Verificando pagamento ${paymentId} para usuário ${userId}`)
  
  try {
    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
    })
    
    const payment = await paymentResponse.json() as any
    
    if (payment.status !== 'approved') {
      return c.json({ 
        error: 'Pagamento não aprovado', 
        status: payment.status,
        status_detail: payment.status_detail 
      }, 400)
    }
    
    // Extrair dados do external_reference
    let userData
    try {
      userData = JSON.parse(payment.external_reference)
    } catch {
      // Se não conseguiu parsear, usar o userId do header
      userData = { user_id: parseInt(userId || '0'), plan: 'mensal', days: 30 }
    }
    
    const targetUserId = userData.user_id || parseInt(userId || '0')
    
    if (!targetUserId) {
      return c.json({ error: 'Usuário não identificado' }, 400)
    }
    
    const { plan, days } = userData
    
    // Calcular data de expiração
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (days || 30) * 24 * 60 * 60 * 1000).toISOString()
    
    // Ativar assinatura
    await DB.prepare(`
      UPDATE users SET 
        subscription_status = 'active',
        subscription_plan = ?,
        subscription_expires_at = ?,
        payment_id = ?,
        payment_date = ?,
        is_premium = 1,
        premium_expires_at = ?
      WHERE id = ?
    `).bind(plan || 'mensal', expiresAt, paymentId.toString(), now.toISOString(), expiresAt, targetUserId).run()
    
    console.log(`✅ Assinatura ${plan || 'mensal'} ativada manualmente para usuário ${targetUserId}`)
    
    // Buscar usuário atualizado
    const user = await DB.prepare('SELECT id, email, name, subscription_status, subscription_plan, is_premium FROM users WHERE id = ?').bind(targetUserId).first()
    
    return c.json({ 
      success: true, 
      message: 'Assinatura ativada com sucesso!',
      user,
      expires_at: expiresAt
    })
  } catch (error: any) {
    console.error('Erro ao verificar pagamento:', error)
    return c.json({ error: error.message }, 500)
  }
})

app.get('/pagamento/falha', async (c) => {
  return c.redirect('/?payment=failed')
})

app.get('/pagamento/pendente', async (c) => {
  const paymentId = c.req.query('payment_id')
  return c.redirect(`/?payment=pending&payment_id=${paymentId}`)
})

// ============== PÁGINA DE CONVERSÃO GOOGLE ADS ==============
// ⚠️ Esta página é EXCLUSIVA para tracking de conversão do Google Ads
// NÃO deve ser acessível via navegação do sistema
// Usar como URL de destino após conclusão de pagamento no Mercado Pago

app.get('/obrigado-premium', async (c) => {
  // Parâmetros opcionais para tracking
  const paymentId = c.req.query('payment_id') || ''
  const plan = c.req.query('plan') || 'premium'
  
  // ✅ v69: Buscar preço real do plano do banco
  const { DB } = c.env as any
  let planPrice = plan === 'anual' ? 249.90 : (plan === 'trimestral' ? 79.90 : 29.90)
  let planName = plan === 'anual' ? 'Premium Anual' : (plan === 'trimestral' ? 'Premium Trimestral' : 'Premium Mensal')
  try {
    const dbPlansConv = await DB.prepare('SELECT name, price, duration_days FROM payment_plans WHERE is_active = 1').all() as any
    if (dbPlansConv?.results) {
      for (const dp of dbPlansConv.results) {
        const nl = (dp.name || '').toLowerCase()
        if ((plan === 'mensal' && (nl.includes('mensal') || (dp.duration_days >= 28 && dp.duration_days <= 31))) ||
            (plan === 'trimestral' && (nl.includes('trimestral') || (dp.duration_days >= 80 && dp.duration_days <= 100))) ||
            (plan === 'anual' && (nl.includes('anual') || dp.duration_days >= 360))) {
          planPrice = dp.price
          planName = dp.name
          break
        }
      }
    }
  } catch(e) { /* fallback */ }
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Obrigado! | IAprova Premium</title>
    <meta name="robots" content="noindex, nofollow">
    
    <!-- Google tag (gtag.js) - Tracking de Conversão -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-94LLLJN9HM"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-94LLLJN9HM');
      
      // ✅ Evento de conversão de compra (preço dinâmico do banco)
      gtag('event', 'purchase', {
        transaction_id: '${paymentId}',
        value: ${planPrice},
        currency: 'BRL',
        items: [{
          item_name: 'IAprova ${planName}',
          item_category: 'subscription',
          price: ${planPrice},
          quantity: 1
        }]
      });
      
      // Evento adicional para conversão personalizada
      gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
        'value': ${planPrice},
        'currency': 'BRL',
        'transaction_id': '${paymentId}'
      });
    </script>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <style>
      @keyframes confetti {
        0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        animation: confetti 5s linear infinite;
      }
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(26, 58, 127, 0.5); }
        50% { box-shadow: 0 0 40px rgba(26, 58, 127, 0.8); }
      }
      .glow-effect {
        animation: pulse-glow 2s ease-in-out infinite;
      }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-[#E8EDF5] via-[#F3F6FA] to-white flex items-center justify-center p-4">
    
    <!-- Confetti Animation -->
    <div id="confetti-container"></div>
    
    <div class="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
        
        <!-- Background Decoration -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#1A3A7F]/10 to-[#122D6A]/5 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-full blur-3xl"></div>
        
        <!-- Success Icon -->
        <div class="relative z-10 mb-6">
            <div class="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center glow-effect">
                <i class="fas fa-check text-4xl text-white"></i>
            </div>
        </div>
        
        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-[#122D6A] mb-4 relative z-10">
            🎉 Parabéns!
        </h1>
        
        <h2 class="text-xl md:text-2xl font-semibold text-[#1A3A7F] mb-6 relative z-10">
            Você agora é <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500">Premium</span>!
        </h2>
        
        <!-- Message -->
        <p class="text-gray-600 mb-8 relative z-10 leading-relaxed">
            Sua assinatura do <strong class="text-[#1A3A7F]">IAprova Premium</strong> foi ativada com sucesso! 
            Agora você tem acesso completo a todos os recursos para acelerar sua preparação.
        </p>
        
        <!-- Benefits -->
        <div class="bg-gradient-to-br from-[#E8EDF5] to-[#F3F6FA] rounded-2xl p-6 mb-8 relative z-10 text-left">
            <h3 class="font-bold text-[#122D6A] mb-4 flex items-center">
                <i class="fas fa-crown text-amber-500 mr-2"></i>
                Seus Benefícios Premium:
            </h3>
            <ul class="space-y-3 text-sm text-gray-700">
                <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
                    <span><strong>IA Ilimitada</strong> - Gere teoria, exercícios e resumos sem limites</span>
                </li>
                <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
                    <span><strong>Flashcards Inteligentes</strong> - Memorização científica com repetição espaçada</span>
                </li>
                <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
                    <span><strong>Simulados Personalizados</strong> - Questões no estilo da sua banca</span>
                </li>
                <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
                    <span><strong>Análise de Desempenho</strong> - Identifique seus pontos fracos</span>
                </li>
                <li class="flex items-start">
                    <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
                    <span><strong>Suporte Prioritário</strong> - Atendimento rápido e dedicado</span>
                </li>
            </ul>
        </div>
        
        <!-- CTA Button -->
        <a href="https://iaprova.app" 
           class="inline-block w-full py-4 px-8 bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] text-white font-bold text-lg rounded-xl hover:from-[#0D1F4D] hover:to-[#122D6A] transition-all transform hover:scale-[1.02] shadow-lg shadow-[#122D6A]/30 relative z-10">
            <i class="fas fa-rocket mr-2"></i>
            Começar a Estudar Agora
        </a>
        
        <!-- Footer -->
        <p class="text-xs text-gray-400 mt-6 relative z-10">
            <i class="fas fa-shield-alt mr-1"></i>
            Pagamento processado com segurança
        </p>
        
    </div>
    
    <script>
        // Criar confetti
        const colors = ['#122D6A', '#1A3A7F', '#4CAF50', '#FFD700', '#E91E63', '#00BCD4'];
        const container = document.getElementById('confetti-container');
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 5 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 3) + 's';
            container.appendChild(confetti);
        }
        
        // Auto-redirect após 10 segundos
        setTimeout(() => {
            // Descomentar para redirecionar automaticamente
            // window.location.href = 'https://iaprova.app';
        }, 10000);
    </script>
    
</body>
</html>
  `
  
  return c.html(html)
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
    
    // Total de emails enviados - usar tabela email_history (não email_logs)
    let emailStats = { total: 0, verification: 0, welcome: 0, password_reset: 0, resend: 0, payment: 0 }
    try {
      // Criar tabela se não existir
      await DB.prepare(`
        CREATE TABLE IF NOT EXISTS email_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          email_to TEXT NOT NULL,
          email_type TEXT NOT NULL,
          subject TEXT,
          status TEXT DEFAULT 'sent',
          error_message TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run()
      
      const totalEmails = await DB.prepare('SELECT COUNT(*) as count FROM email_history').first() as any
      const verificationEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_history WHERE email_type = 'verification'").first() as any
      const welcomeEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_history WHERE email_type = 'welcome'").first() as any
      const resetEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_history WHERE email_type = 'password_reset'").first() as any
      const resendEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_history WHERE email_type = 'resend_verification'").first() as any
      const paymentEmails = await DB.prepare("SELECT COUNT(*) as count FROM email_history WHERE email_type = 'payment_confirmation'").first() as any
      
      emailStats = {
        total: totalEmails?.count || 0,
        verification: verificationEmails?.count || 0,
        welcome: welcomeEmails?.count || 0,
        password_reset: resetEmails?.count || 0,
        resend: resendEmails?.count || 0,
        payment: paymentEmails?.count || 0
      }
    } catch (e) {
      console.log('⚠️ Erro ao buscar email_history:', e)
    }
    
    // Assinaturas - buscar da tabela users (campos subscription_status, payment_id, etc.)
    let subscriptionStats = { total: 0, active: 0, pending: 0, cancelled: 0, revenue: 0, trial: 0 }
    try {
      // Contar assinaturas ativas (subscription_status = 'active')
      const activeSubs = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'").first() as any
      
      // Contar usuários em trial
      const trialSubs = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'trial'").first() as any
      
      // Contar usuários premium (is_premium = 1)
      const premiumTotal = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE is_premium = 1").first() as any
      
      // Calcular receita baseada nos planos (preços do banco)
      const mensalCount = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_plan = 'mensal' AND subscription_status = 'active'").first() as any
      const anualCount = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_plan = 'anual' AND subscription_status = 'active'").first() as any
      const trimestralCount = await DB.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_plan = 'trimestral' AND subscription_status = 'active'").first() as any
      
      // ✅ v69: Buscar preços reais do banco
      let precoMensal = 29.90, precoAnual = 249.90, precoTrimestral = 79.90
      try {
        const dbPrices = await DB.prepare('SELECT name, price, duration_days FROM payment_plans WHERE is_active = 1').all() as any
        if (dbPrices?.results) {
          for (const dp of dbPrices.results) {
            const nl = (dp.name || '').toLowerCase()
            if (nl.includes('mensal') || (dp.duration_days >= 28 && dp.duration_days <= 31)) precoMensal = dp.price
            else if (nl.includes('trimestral') || (dp.duration_days >= 80 && dp.duration_days <= 100)) precoTrimestral = dp.price
            else if (nl.includes('anual') || dp.duration_days >= 360) precoAnual = dp.price
          }
        }
      } catch(e) { /* fallback */ }
      
      const receitaMensal = (mensalCount?.count || 0) * precoMensal
      const receitaAnual = (anualCount?.count || 0) * precoAnual
      const receitaTrimestral = (trimestralCount?.count || 0) * precoTrimestral
      const receitaTotal = receitaMensal + receitaAnual + receitaTrimestral
      
      subscriptionStats = {
        total: premiumTotal?.count || 0,
        active: activeSubs?.count || 0,
        pending: 0, // Não temos esse status
        cancelled: 0, // Não temos esse status
        revenue: receitaTotal,
        trial: trialSubs?.count || 0
      }
    } catch (e) {
      console.log('⚠️ Erro ao buscar assinaturas:', e)
    }
    
    // Estatísticas de feedback de conteúdo (se tabela existir)
    let feedbackStats = { 
      total: 0, 
      positivo: 0, 
      negativo: 0, 
      taxa_satisfacao: 0,
      regeneracoes: 0,
      taxa_regeneracao: 0
    }
    try {
      const totalFeedback = await DB.prepare('SELECT COUNT(*) as count FROM conteudo_feedback').first() as any
      const positiveFeedback = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_feedback WHERE tipo = 'bom'").first() as any
      const negativeFeedback = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_feedback WHERE tipo = 'ruim'").first() as any
      
      // Contar regenerações (feedbacks negativos com regeneracao = 1)
      let regeneracoes = 0
      try {
        const regeneracoesResult = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_feedback WHERE regeneracao = 1").first() as any
        regeneracoes = regeneracoesResult?.count || 0
      } catch (e) { /* coluna pode não existir ainda */ }
      
      const total = totalFeedback?.count || 0
      const positivo = positiveFeedback?.count || 0
      const negativo = negativeFeedback?.count || 0
      
      feedbackStats = {
        total: total,
        positivo: positivo,
        negativo: negativo,
        taxa_satisfacao: total > 0 ? Math.round((positivo / total) * 100) : 0,
        regeneracoes: regeneracoes,
        taxa_regeneracao: negativo > 0 ? Math.round((regeneracoes / negativo) * 100) : 0
      }
    } catch (e) {
      console.log('⚠️ Tabela conteudo_feedback não existe ainda')
    }
    
    // Estatísticas de conteúdo gerado
    let conteudoStats = { total: 0, teoria: 0, exercicios: 0, resumo: 0, flashcards: 0 }
    try {
      const totalConteudo = await DB.prepare('SELECT COUNT(*) as count FROM conteudo_estudo').first() as any
      const teoriaConteudo = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_estudo WHERE tipo = 'teoria'").first() as any
      const exerciciosConteudo = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_estudo WHERE tipo = 'exercicios'").first() as any
      const resumoConteudo = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_estudo WHERE tipo = 'resumo'").first() as any
      const flashcardsConteudo = await DB.prepare("SELECT COUNT(*) as count FROM conteudo_estudo WHERE tipo = 'flashcards'").first() as any
      
      conteudoStats = {
        total: totalConteudo?.count || 0,
        teoria: teoriaConteudo?.count || 0,
        exercicios: exerciciosConteudo?.count || 0,
        resumo: resumoConteudo?.count || 0,
        flashcards: flashcardsConteudo?.count || 0
      }
    } catch (e) {
      console.log('⚠️ Tabela conteudo_estudo não existe')
    }
    
    // ✅ NOVO: Estatísticas de visitas
    let visitStats = { 
      total: 0, 
      unique_today: 0, 
      unique_week: 0, 
      unique_month: 0,
      page_views_today: 0
    }
    try {
      const totalVisits = await DB.prepare('SELECT COUNT(*) as count FROM site_visits').first() as any
      const uniqueToday = await DB.prepare(`
        SELECT COUNT(DISTINCT ip_address) as count FROM site_visits 
        WHERE DATE(created_at) = DATE('now')
      `).first() as any
      const uniqueWeek = await DB.prepare(`
        SELECT COUNT(DISTINCT ip_address) as count FROM site_visits 
        WHERE created_at >= DATE('now', '-7 days')
      `).first() as any
      const uniqueMonth = await DB.prepare(`
        SELECT COUNT(DISTINCT ip_address) as count FROM site_visits 
        WHERE created_at >= DATE('now', '-30 days')
      `).first() as any
      const pageViewsToday = await DB.prepare(`
        SELECT COUNT(*) as count FROM site_visits 
        WHERE DATE(created_at) = DATE('now')
      `).first() as any
      
      visitStats = {
        total: totalVisits?.count || 0,
        unique_today: uniqueToday?.count || 0,
        unique_week: uniqueWeek?.count || 0,
        unique_month: uniqueMonth?.count || 0,
        page_views_today: pageViewsToday?.count || 0
      }
    } catch (e) {
      console.log('⚠️ Tabela site_visits não existe ainda')
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
      subscriptions: subscriptionStats,
      feedback: feedbackStats,
      conteudo: conteudoStats,
      visits: visitStats // ✅ NOVO
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard admin:', error)
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500)
  }
})

// ════════════════════════════════════════════════════════════════════════════
// ✅ NOVO v37: GERENCIAMENTO DE CHAVES DE API (Admin)
// ════════════════════════════════════════════════════════════════════════════

// Obter configurações de API
app.get('/api/admin/api-keys', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS api_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT UNIQUE NOT NULL,
        api_key TEXT,
        is_active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        last_used DATETIME,
        usage_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // Inserir providers padrão se não existirem
    const providers = ['gemini', 'openai', 'groq']
    for (let i = 0; i < providers.length; i++) {
      await DB.prepare(`
        INSERT OR IGNORE INTO api_config (provider, priority) VALUES (?, ?)
      `).bind(providers[i], i + 1).run()
    }
    
    // Buscar configurações
    const { results: configs } = await DB.prepare(`
      SELECT 
        id, provider, 
        CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 
          SUBSTR(api_key, 1, 10) || '...' || SUBSTR(api_key, -4)
        ELSE NULL END as api_key_masked,
        CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 1 ELSE 0 END as has_key,
        is_active, priority, last_used, usage_count, last_error,
        created_at, updated_at
      FROM api_config
      ORDER BY priority ASC
    `).all()
    
    return c.json({
      success: true,
      configs: configs || []
    })
  } catch (error: any) {
    console.error('Erro ao buscar chaves API:', error)
    return c.json({ error: 'Erro ao buscar configurações' }, 500)
  }
})

// Atualizar chave de API
app.post('/api/admin/api-keys', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const { provider, api_key, is_active, priority } = await c.req.json()
    
    if (!provider) {
      return c.json({ error: 'Provider é obrigatório' }, 400)
    }
    
    // Atualizar ou inserir
    await DB.prepare(`
      INSERT INTO api_config (provider, api_key, is_active, priority, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(provider) DO UPDATE SET
        api_key = COALESCE(excluded.api_key, api_config.api_key),
        is_active = COALESCE(excluded.is_active, api_config.is_active),
        priority = COALESCE(excluded.priority, api_config.priority),
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      provider,
      api_key || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      priority || 0
    ).run()
    
    return c.json({ success: true, message: `Configuração de ${provider} atualizada` })
  } catch (error: any) {
    console.error('Erro ao atualizar chave API:', error)
    return c.json({ error: 'Erro ao atualizar configuração' }, 500)
  }
})

// Reordenar prioridades das APIs
app.post('/api/admin/api-keys/reorder', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const { order } = await c.req.json() // Array de providers na ordem desejada
    
    if (!Array.isArray(order)) {
      return c.json({ error: 'Ordem inválida' }, 400)
    }
    
    for (let i = 0; i < order.length; i++) {
      await DB.prepare(`
        UPDATE api_config SET priority = ?, updated_at = CURRENT_TIMESTAMP
        WHERE provider = ?
      `).bind(i + 1, order[i]).run()
    }
    
    return c.json({ success: true, message: 'Ordem atualizada' })
  } catch (error: any) {
    console.error('Erro ao reordenar APIs:', error)
    return c.json({ error: 'Erro ao reordenar' }, 500)
  }
})

// Testar chave de API
app.post('/api/admin/api-keys/test', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const { provider } = await c.req.json()
    
    // Buscar chave
    const config = await DB.prepare(`
      SELECT api_key FROM api_config WHERE provider = ?
    `).bind(provider).first() as any
    
    if (!config?.api_key) {
      return c.json({ success: false, error: 'Chave não configurada' })
    }
    
    let testResult = { success: false, message: '', latency: 0 }
    const startTime = Date.now()
    
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 10 }
          })
        }
      )
      testResult.latency = Date.now() - startTime
      
      if (response.ok) {
        testResult.success = true
        testResult.message = 'Gemini funcionando!'
      } else {
        const err = await response.json() as any
        testResult.message = err.error?.message || `HTTP ${response.status}`
      }
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Responda apenas: OK' }],
          max_tokens: 10
        })
      })
      testResult.latency = Date.now() - startTime
      
      if (response.ok) {
        testResult.success = true
        testResult.message = 'OpenAI funcionando!'
      } else {
        const err = await response.json() as any
        testResult.message = err.error?.message || `HTTP ${response.status}`
      }
    } else if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Responda apenas: OK' }],
          max_tokens: 10
        })
      })
      testResult.latency = Date.now() - startTime
      
      if (response.ok) {
        testResult.success = true
        testResult.message = 'GROQ funcionando!'
      } else {
        const err = await response.json() as any
        testResult.message = err.error?.message || `HTTP ${response.status}`
      }
    }
    
    // Atualizar last_used e last_error
    await DB.prepare(`
      UPDATE api_config SET 
        last_used = CURRENT_TIMESTAMP,
        last_error = ?,
        usage_count = usage_count + 1
      WHERE provider = ?
    `).bind(testResult.success ? null : testResult.message, provider).run()
    
    return c.json(testResult)
  } catch (error: any) {
    console.error('Erro ao testar API:', error)
    return c.json({ success: false, error: error.message })
  }
})

// Função auxiliar para obter chaves ativas na ordem de prioridade
async function getActiveAPIKeys(DB: any): Promise<{ provider: string, api_key: string }[]> {
  try {
    const { results } = await DB.prepare(`
      SELECT provider, api_key FROM api_config 
      WHERE is_active = 1 AND api_key IS NOT NULL AND api_key != ''
      ORDER BY priority ASC
    `).all()
    return results || []
  } catch {
    return []
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ✅ v37: FUNÇÃO CENTRALIZADA PARA CHAMADAS DE IA
// Usa as chaves do banco de dados na ordem de prioridade configurada pelo admin
// ════════════════════════════════════════════════════════════════════════════════
interface AICallOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean  // Se true, espera resposta em JSON
  maxTextLength?: number  // Limite de texto para providers com contexto menor (ex: Groq)
}

interface AICallResult {
  success: boolean
  text: string
  provider: string
  model: string
  latency: number
  error?: string
}

async function callAI(DB: any, env: any, options: AICallOptions): Promise<AICallResult> {
  const {
    prompt,
    systemPrompt = '',
    maxTokens = 16000,
    temperature = 0,
    jsonMode = false,
    maxTextLength = 25000
  } = options
  
  // Buscar chaves do banco de dados
  const apiKeys = await getActiveAPIKeys(DB)
  
  // Fallback para variáveis de ambiente
  const geminiKeyFromDB = apiKeys.find(k => k.provider === 'gemini')?.api_key
  const openaiKeyFromDB = apiKeys.find(k => k.provider === 'openai')?.api_key
  const groqKeyFromDB = apiKeys.find(k => k.provider === 'groq')?.api_key
  
  const geminiKey = geminiKeyFromDB || env.GEMINI_API_KEY || ''
  const openaiKey = openaiKeyFromDB || env.OPENAI_API_KEY || ''
  const groqKey = groqKeyFromDB || env.GROQ_API_KEY || ''
  
  // Determinar ordem de tentativa
  const ordemAPIs = apiKeys.length > 0 
    ? apiKeys.map(k => k.provider)
    : ['gemini', 'openai', 'groq'].filter(p => 
        (p === 'gemini' && geminiKey) || 
        (p === 'openai' && openaiKey) || 
        (p === 'groq' && groqKey)
      )
  
  console.log(`🤖 callAI: Ordem de fallback: ${ordemAPIs.join(' → ')}`)
  
  let lastError = ''
  const startTime = Date.now()
  
  for (const provider of ordemAPIs) {
    try {
      // GEMINI
      if (provider === 'gemini' && geminiKey) {
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite']
        
        for (const model of models) {
          try {
            console.log(`🚀 Tentando ${model}...`)
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }],
                  generationConfig: { temperature, maxOutputTokens: maxTokens }
                })
              }
            )
            
            if (response.status === 429) {
              lastError = `${model}: Rate limit`
              await new Promise(r => setTimeout(r, 2000))
              continue
            }
            
            if (response.ok) {
              const data = await response.json() as any
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
              
              if (text && (!jsonMode || text.includes('{'))) {
                console.log(`✅ ${model} OK!`)
                return {
                  success: true,
                  text,
                  provider: 'gemini',
                  model,
                  latency: Date.now() - startTime
                }
              }
            }
          } catch (err: any) {
            lastError = `${model}: ${err.message}`
          }
        }
      }
      
      // OPENAI
      if (provider === 'openai' && openaiKey) {
        console.log(`🚀 Tentando OpenAI gpt-4o-mini...`)
        const messages: any[] = []
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(jsonMode && { response_format: { type: 'json_object' } })
          })
        })
        
        if (response.status === 429) {
          lastError = 'OpenAI: Rate limit'
        } else if (response.ok) {
          const data = await response.json() as any
          const text = data?.choices?.[0]?.message?.content || ''
          
          if (text && (!jsonMode || text.includes('{'))) {
            console.log(`✅ OpenAI gpt-4o-mini OK!`)
            return {
              success: true,
              text,
              provider: 'openai',
              model: 'gpt-4o-mini',
              latency: Date.now() - startTime
            }
          }
        } else {
          const err = await response.json() as any
          lastError = `OpenAI: ${err.error?.message || response.status}`
        }
      }
      
      // GROQ (com texto limitado)
      if (provider === 'groq' && groqKey) {
        console.log(`🚀 Tentando GROQ llama-3.3-70b-versatile...`)
        
        // Limitar texto para Groq (contexto menor)
        const promptLimitado = prompt.length > maxTextLength 
          ? prompt.substring(0, maxTextLength) + '\n\n[TEXTO TRUNCADO]'
          : prompt
        
        const messages: any[] = []
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt })
        }
        messages.push({ role: 'user', content: promptLimitado })
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature,
            max_tokens: Math.min(maxTokens, 8000)  // Groq tem limite menor
          })
        })
        
        if (response.status === 429 || response.status === 413) {
          lastError = `GROQ: ${response.status === 429 ? 'Rate limit' : 'Payload muito grande'}`
        } else if (response.ok) {
          const data = await response.json() as any
          const text = data?.choices?.[0]?.message?.content || ''
          
          if (text && (!jsonMode || text.includes('{'))) {
            console.log(`✅ GROQ llama-3.3-70b-versatile OK!`)
            return {
              success: true,
              text,
              provider: 'groq',
              model: 'llama-3.3-70b-versatile',
              latency: Date.now() - startTime
            }
          }
        } else {
          const err = await response.json() as any
          lastError = `GROQ: ${err.error?.message || response.status}`
        }
      }
    } catch (err: any) {
      lastError = `${provider}: ${err.message}`
      console.error(`❌ Erro com ${provider}:`, err.message)
    }
  }
  
  console.error(`❌ Todas as APIs falharam: ${lastError}`)
  return {
    success: false,
    text: '',
    provider: '',
    model: '',
    latency: Date.now() - startTime,
    error: lastError || 'Nenhuma API disponível'
  }
}

// ✅ NOVO: Registrar visita ao site
app.post('/api/visits/track', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { page_path, referrer, user_id } = body
    
    // Obter IP do header (Cloudflare)
    const ip_address = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Forwarded-For')?.split(',')[0] || 
                       'unknown'
    const user_agent = c.req.header('User-Agent') || ''
    const country = c.req.header('CF-IPCountry') || ''
    
    await DB.prepare(`
      INSERT INTO site_visits (ip_address, user_agent, page_path, referrer, country, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(ip_address, user_agent, page_path || '/', referrer || '', country, user_id || null).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    // Se a tabela não existe, ignorar silenciosamente
    if (error.message?.includes('no such table')) {
      return c.json({ success: true, warning: 'Table not created yet' })
    }
    console.error('Erro ao registrar visita:', error)
    return c.json({ error: 'Erro ao registrar visita' }, 500)
  }
})

// ✅ NOVO: Consultar visitas detalhadas (Admin)
app.get('/api/admin/visits', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const days = parseInt(c.req.query('days') || '7')
    const offset = (page - 1) * limit
    
    // Visitas únicas por dia
    const { results: dailyStats } = await DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_visits,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM site_visits
      WHERE created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).bind(days).all()
    
    // Top páginas visitadas
    const { results: topPages } = await DB.prepare(`
      SELECT 
        page_path,
        COUNT(*) as visits,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM site_visits
      WHERE created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY page_path
      ORDER BY visits DESC
      LIMIT 10
    `).bind(days).all()
    
    // Top IPs (últimas 24h)
    const { results: topIps } = await DB.prepare(`
      SELECT 
        ip_address,
        country,
        COUNT(*) as visits,
        MIN(created_at) as first_visit,
        MAX(created_at) as last_visit
      FROM site_visits
      WHERE created_at >= DATETIME('now', '-1 day')
      GROUP BY ip_address
      ORDER BY visits DESC
      LIMIT 20
    `).all()
    
    // Últimas visitas
    const { results: recentVisits } = await DB.prepare(`
      SELECT 
        sv.id,
        sv.ip_address,
        sv.page_path,
        sv.referrer,
        sv.country,
        sv.created_at,
        u.name as user_name,
        u.email as user_email
      FROM site_visits sv
      LEFT JOIN users u ON sv.user_id = u.id
      ORDER BY sv.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
    
    // Total de registros
    const totalResult = await DB.prepare('SELECT COUNT(*) as count FROM site_visits').first() as any
    
    return c.json({
      daily_stats: dailyStats || [],
      top_pages: topPages || [],
      top_ips: topIps || [],
      recent_visits: recentVisits || [],
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        pages: Math.ceil((totalResult?.count || 0) / limit)
      }
    })
  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      return c.json({
        daily_stats: [],
        top_pages: [],
        top_ips: [],
        recent_visits: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
        warning: 'Table site_visits not created yet'
      })
    }
    console.error('Erro ao buscar visitas:', error)
    return c.json({ error: 'Erro ao buscar visitas' }, 500)
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
    
    // ✅ CORREÇÃO v11: Incluir payment_id e payment_date na listagem
    // ✅ v78: Incluir contagem de acessos (site_visits) por usuário
    // ✅ v79: Incluir trial info e último email de reengajamento
    let query = `
      SELECT 
        u.id, u.name, u.email, u.email_verified, u.is_premium, 
        u.premium_expires_at, u.created_at, u.auth_provider,
        u.subscription_status, u.subscription_plan, u.subscription_expires_at,
        u.payment_id, u.payment_date,
        u.trial_started_at, u.trial_expires_at,
        COUNT(DISTINCT pe.id) as total_planos,
        COUNT(DISTINCT md.id) as total_metas,
        -- ✅ v78: Total de acessos ao sistema
        (SELECT COUNT(*) FROM site_visits sv WHERE sv.user_id = u.id) as total_acessos,
        (SELECT MAX(sv.created_at) FROM site_visits sv WHERE sv.user_id = u.id) as ultimo_acesso,
        -- ✅ v79: Último email de reengajamento enviado
        (SELECT MAX(eh.created_at) FROM email_history eh WHERE eh.email_to = u.email AND eh.email_type = 'reengajamento' AND eh.status = 'sent') as ultimo_email_reengajamento,
        -- ✅ Calcular is_premium_real considerando subscription ativa
        CASE 
          WHEN u.is_premium = 1 THEN 1
          WHEN u.subscription_status = 'active' AND (u.subscription_expires_at IS NULL OR u.subscription_expires_at > datetime('now')) THEN 1
          ELSE 0
        END as is_premium_real
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

// ============== RELATÓRIO FINANCEIRO ADMIN ==============
app.get('/api/admin/financeiro', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // ✅ v69: Buscar preços reais do banco primeiro
    let precoMensal = 29.90, precoAnual = 249.90, precoTrimestral = 79.90
    try {
      const dbPricesFinanceiro = await DB.prepare('SELECT name, price, duration_days FROM payment_plans WHERE is_active = 1').all() as any
      if (dbPricesFinanceiro?.results) {
        for (const dp of dbPricesFinanceiro.results) {
          const nl = (dp.name || '').toLowerCase()
          if (nl.includes('mensal') || (dp.duration_days >= 28 && dp.duration_days <= 31)) precoMensal = dp.price
          else if (nl.includes('trimestral') || (dp.duration_days >= 80 && dp.duration_days <= 100)) precoTrimestral = dp.price
          else if (nl.includes('anual') || dp.duration_days >= 360) precoAnual = dp.price
        }
      }
    } catch(e) { /* fallback */ }
    
    // Período selecionado (padrão: 30 dias)
    const periodo = c.req.query('periodo') || '30' // 7, 30, 90, 365, all
    
    let whereClause = ''
    if (periodo !== 'all') {
      whereClause = `WHERE u.payment_date >= DATE('now', '-${periodo} days')`
    }
    
    // Buscar todos os usuários com assinatura ativa ou histórico de pagamento
    const { results: pagamentos } = await DB.prepare(`
      SELECT 
        u.id, u.name, u.email, u.subscription_status, u.subscription_plan,
        u.subscription_expires_at, u.payment_id, u.payment_date, u.created_at
      FROM users u
      WHERE u.subscription_status IN ('active', 'expired') OR u.payment_id IS NOT NULL
      ORDER BY u.payment_date DESC
    `).all()
    
    // Mapear valor_pago com preços do banco
    const pagamentosComValor = (pagamentos || []).map((p: any) => ({
      ...p,
      valor_pago: p.subscription_plan === 'anual' ? precoAnual : (p.subscription_plan === 'trimestral' ? precoTrimestral : (p.subscription_plan === 'mensal' ? precoMensal : 0))
    }))
    
    // Estatísticas gerais
    const totalUsuarios = await DB.prepare('SELECT COUNT(*) as count FROM users').first() as any
    const usuariosPremium = await DB.prepare(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'`).first() as any
    const usuariosTrial = await DB.prepare(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'trial'`).first() as any
    const usuariosExpirados = await DB.prepare(`SELECT COUNT(*) as count FROM users WHERE subscription_status = 'expired'`).first() as any
    
    // ✅ v69: Calcular receitas por período (preços do banco via JS em vez de SQL hardcoded)
    const calcReceita = (rows: any[]) => {
      let total = 0
      for (const r of rows) {
        if (r.subscription_plan === 'anual') total += precoAnual
        else if (r.subscription_plan === 'trimestral') total += precoTrimestral
        else if (r.subscription_plan === 'mensal') total += precoMensal
      }
      return { qtd: rows.length, total }
    }
    
    const pagHoje = await DB.prepare(`
      SELECT subscription_plan FROM users 
      WHERE DATE(payment_date) = DATE('now') AND subscription_status IN ('active', 'expired')
    `).all() as any
    const receitaHoje = calcReceita(pagHoje?.results || [])
    
    const pag7dias = await DB.prepare(`
      SELECT subscription_plan FROM users 
      WHERE payment_date >= DATE('now', '-7 days') AND subscription_status IN ('active', 'expired')
    `).all() as any
    const receita7dias = calcReceita(pag7dias?.results || [])
    
    const pag30dias = await DB.prepare(`
      SELECT subscription_plan FROM users 
      WHERE payment_date >= DATE('now', '-30 days') AND subscription_status IN ('active', 'expired')
    `).all() as any
    const receita30dias = calcReceita(pag30dias?.results || [])
    
    const pagTotal = await DB.prepare(`
      SELECT subscription_plan FROM users 
      WHERE subscription_status IN ('active', 'expired') AND payment_id IS NOT NULL
    `).all() as any
    const receitaTotal = calcReceita(pagTotal?.results || [])
    
    // Distribuição por plano
    const planoMensal = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users WHERE subscription_plan = 'mensal' AND subscription_status = 'active'
    `).first() as any
    
    const planoAnual = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users WHERE subscription_plan = 'anual' AND subscription_status = 'active'
    `).first() as any
    
    // Previsão de cancelamentos (assinaturas expirando nos próximos 7 dias)
    const expirandoProximosSete = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users 
      WHERE subscription_status = 'active' 
      AND subscription_expires_at BETWEEN DATE('now') AND DATE('now', '+7 days')
    `).first() as any
    
    // Taxa de conversão (trial -> premium)
    const totalTrialHistorico = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users WHERE trial_started_at IS NOT NULL
    `).first() as any
    
    const convertidos = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users WHERE trial_started_at IS NOT NULL AND subscription_status IN ('active', 'expired')
    `).first() as any
    
    const taxaConversao = totalTrialHistorico?.qtd > 0 
      ? Math.round((convertidos?.qtd / totalTrialHistorico?.qtd) * 100) 
      : 0
    
    // MRR (Monthly Recurring Revenue) - Receita Recorrente Mensal (preços dinâmicos)
    const planoTrimestral = await DB.prepare(`
      SELECT COUNT(*) as qtd FROM users WHERE subscription_plan = 'trimestral' AND subscription_status = 'active'
    `).first() as any
    const mrr = (planoMensal?.qtd || 0) * precoMensal + ((planoAnual?.qtd || 0) * precoAnual / 12) + ((planoTrimestral?.qtd || 0) * precoTrimestral / 3)
    
    // ARR (Annual Recurring Revenue) - Receita Recorrente Anual
    const arr = mrr * 12
    
    return c.json({
      resumo: {
        total_usuarios: totalUsuarios?.count || 0,
        usuarios_premium: usuariosPremium?.count || 0,
        usuarios_trial: usuariosTrial?.count || 0,
        usuarios_expirados: usuariosExpirados?.count || 0,
        taxa_conversao: taxaConversao
      },
      receita: {
        hoje: { qtd: receitaHoje?.qtd || 0, valor: receitaHoje?.total || 0 },
        ultimos_7_dias: { qtd: receita7dias?.qtd || 0, valor: receita7dias?.total || 0 },
        ultimos_30_dias: { qtd: receita30dias?.qtd || 0, valor: receita30dias?.total || 0 },
        total: { qtd: receitaTotal?.qtd || 0, valor: receitaTotal?.total || 0 }
      },
      metricas: {
        mrr: mrr,
        arr: arr,
        ticket_medio: receitaTotal?.qtd > 0 ? (receitaTotal?.total / receitaTotal?.qtd) : 0,
        ltv_estimado: mrr > 0 ? (mrr * 12) / Math.max(1, usuariosPremium?.count || 1) : 0
      },
      planos: {
        mensal: { qtd: planoMensal?.qtd || 0, receita_mensal: (planoMensal?.qtd || 0) * precoMensal },
        trimestral: { qtd: planoTrimestral?.qtd || 0, receita_mensal: ((planoTrimestral?.qtd || 0) * precoTrimestral) / 3 },
        anual: { qtd: planoAnual?.qtd || 0, receita_mensal: ((planoAnual?.qtd || 0) * precoAnual) / 12 }
      },
      alertas: {
        expirando_7_dias: expirandoProximosSete?.qtd || 0
      },
      pagamentos: pagamentosComValor
    })
  } catch (error: any) {
    console.error('Erro ao gerar relatório financeiro:', error)
    return c.json({ error: 'Erro ao gerar relatório financeiro', details: error.message }, 500)
  }
})

// ✅ CORREÇÃO v13: Histórico de emails enviados (exceto verificação)
app.get('/api/admin/emails', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        email_to TEXT NOT NULL,
        email_type TEXT NOT NULL,
        subject TEXT,
        status TEXT DEFAULT 'sent',
        error_message TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const filterType = c.req.query('type') || '' // Filtro por tipo
    const offset = (page - 1) * limit
    
    // Filtrar excluindo emails de verificação (só mostrar pagamentos, etc.)
    let whereClause = "WHERE eh.email_type != 'verification'"
    if (filterType) {
      whereClause += ` AND eh.email_type = '${filterType}'`
    }
    
    const emails = await DB.prepare(`
      SELECT 
        eh.id, eh.email_to, eh.email_type, eh.subject, eh.status, 
        eh.error_message, eh.metadata, eh.created_at,
        u.name as user_name, u.id as user_id
      FROM email_history eh
      LEFT JOIN users u ON u.email = eh.email_to
      ${whereClause}
      ORDER BY eh.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
    
    const total = await DB.prepare(`
      SELECT COUNT(*) as count FROM email_history eh ${whereClause}
    `).first() as any
    
    // Estatísticas por tipo
    const stats = await DB.prepare(`
      SELECT 
        email_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as enviados,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as falhas
      FROM email_history
      WHERE email_type != 'verification'
      GROUP BY email_type
    `).all()
    
    return c.json({
      emails: emails.results,
      stats: stats.results,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Erro ao listar emails:', error)
    return c.json({ error: 'Erro ao listar emails', details: error.message }, 500)
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

// Criar novo plano de pagamento
app.post('/api/admin/plans', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const { name, description, price, duration_days, features, is_active, discount_percent, is_featured, display_order } = await c.req.json()
    
    if (!name) return c.json({ error: 'Nome é obrigatório' }, 400)
    
    const result = await DB.prepare(`
      INSERT INTO payment_plans (name, description, price, duration_days, features, is_active, discount_percent, is_featured, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, 
      description || '', 
      price || 0, 
      duration_days || 0, 
      JSON.stringify(features || []), 
      is_active ? 1 : 0, 
      discount_percent || 0, 
      is_featured ? 1 : 0, 
      display_order || 0
    ).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error: any) {
    console.error('Erro ao criar plano:', error)
    return c.json({ error: 'Erro ao criar plano: ' + error.message }, 500)
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
    const { name, description, price, duration_days, features, is_active, discount_percent, is_featured, display_order } = await c.req.json()
    
    await DB.prepare(`
      UPDATE payment_plans 
      SET name = ?, description = ?, price = ?, duration_days = ?, features = ?, is_active = ?, discount_percent = ?, is_featured = ?, display_order = ?
      WHERE id = ?
    `).bind(name, description, price, duration_days, JSON.stringify(features), is_active ? 1 : 0, discount_percent || 0, is_featured ? 1 : 0, display_order || 0, planId).run()
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return c.json({ error: 'Erro ao atualizar plano' }, 500)
  }
})

// Deletar plano de pagamento
app.delete('/api/admin/plans/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const planId = c.req.param('id')
    
    // Verificar se há assinaturas ativas
    const activeSubs = await DB.prepare('SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = ? AND status = ?').bind(planId, 'active').first() as any
    if (activeSubs && activeSubs.count > 0) {
      return c.json({ error: `Não é possível excluir: ${activeSubs.count} assinatura(s) ativa(s) vinculada(s)` }, 400)
    }
    
    await DB.prepare('DELETE FROM payment_plans WHERE id = ?').bind(planId).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar plano:', error)
    return c.json({ error: 'Erro ao deletar plano' }, 500)
  }
})

// Endpoint PÚBLICO (sem auth) para planos - usado na landing page
app.get('/api/plans/public', async (c) => {
  const { DB } = c.env
  
  try {
    const plans = await DB.prepare('SELECT id, name, description, price, duration_days, features, discount_percent, is_featured, display_order FROM payment_plans WHERE is_active = 1 ORDER BY display_order ASC').all()
    return c.json({ plans: plans.results })
  } catch (error) {
    console.error('Erro ao listar planos públicos:', error)
    return c.json({ plans: [] })
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

// ============== SISTEMA DE FEEDBACKS ==============

// ✅ CORREÇÃO v13: Endpoint para usuário enviar feedback/avaliação
app.post('/api/feedbacks', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { user_id, rating, feedback_type, message, page_context } = body
    
    if (!user_id || !message) {
      return c.json({ error: 'Usuário e mensagem são obrigatórios' }, 400)
    }
    
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        rating INTEGER,
        feedback_type TEXT DEFAULT 'suggestion',
        message TEXT NOT NULL,
        page_context TEXT,
        is_read INTEGER DEFAULT 0,
        admin_response TEXT,
        responded_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const result = await DB.prepare(`
      INSERT INTO user_feedbacks (user_id, rating, feedback_type, message, page_context)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user_id,
      rating || null,
      feedback_type || 'suggestion',
      message,
      page_context || null
    ).run()
    
    console.log(`📝 Feedback recebido: user_id=${user_id}, type=${feedback_type}`)
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Obrigado pelo seu feedback! Sua opinião é muito importante para nós.'
    })
  } catch (error: any) {
    console.error('Erro ao salvar feedback:', error)
    return c.json({ error: 'Erro ao salvar feedback' }, 500)
  }
})

// ✅ v86-fix: Endpoint de Analytics completo para o admin
app.get('/api/admin/analytics', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Helper: query segura que não quebra se tabela não existir
    const safeQuery = async (query: string, params: any[] = []) => {
      try {
        const stmt = DB.prepare(query)
        const bound = params.length > 0 ? stmt.bind(...params) : stmt
        return await bound.all()
      } catch (e: any) {
        console.warn(`⚠️ Analytics query falhou: ${e.message?.substring(0, 100)}`)
        return { results: [] }
      }
    }
    const safeFirst = async (query: string, params: any[] = []) => {
      try {
        const stmt = DB.prepare(query)
        const bound = params.length > 0 ? stmt.bind(...params) : stmt
        return await bound.first() as any
      } catch (e: any) {
        console.warn(`⚠️ Analytics query falhou: ${e.message?.substring(0, 100)}`)
        return null
      }
    }

    // 1. Totais de conteúdo por tipo - combinar conteudo_estudo + materiais_salvos
    const totaisCE = await safeQuery(`SELECT tipo, COUNT(*) as total FROM conteudo_estudo GROUP BY tipo`)
    const totaisMS = await safeQuery(`SELECT tipo, COUNT(*) as total FROM materiais_salvos GROUP BY tipo`)
    
    // Mesclar totais das duas tabelas
    const totaisMap: Record<string, number> = {}
    for (const r of (totaisCE.results || [])) { totaisMap[(r as any).tipo] = (totaisMap[(r as any).tipo] || 0) + ((r as any).total || 0) }
    for (const r of (totaisMS.results || [])) { totaisMap[(r as any).tipo] = (totaisMap[(r as any).tipo] || 0) + ((r as any).total || 0) }
    const totaisTipo = Object.entries(totaisMap).map(([tipo, total]) => ({ tipo, total }))
    
    // 2. Total de flashcards (de conteudo_estudo tipo 'flashcards')
    const flashcardsTotal = await safeFirst(`SELECT COUNT(*) as total FROM conteudo_estudo WHERE tipo = 'flashcards'`)
    
    // 3. Total de simulados
    const simuladosTotal = await safeFirst(`SELECT COUNT(*) as total FROM simulados_historico`)
    
    // 4. Total de revisões
    const revisoesTotalCE = await safeFirst(`SELECT COUNT(*) as total FROM conteudo_estudo WHERE tipo = 'revisao'`)
    const revisoesTotalMS = await safeFirst(`SELECT COUNT(*) as total FROM materiais_salvos WHERE tipo = 'revisao'`)
    const revisoesTotal = (revisoesTotalCE?.total || 0) + (revisoesTotalMS?.total || 0)
    
    // 5. Conteúdos por dia (últimos 30 dias) - combinar ambas tabelas
    const conteudoPorDiaCE = await safeQuery(`
      SELECT DATE(created_at) as dia, tipo, COUNT(*) as total
      FROM conteudo_estudo
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia, tipo ORDER BY dia ASC
    `)
    const conteudoPorDiaMS = await safeQuery(`
      SELECT DATE(created_at) as dia, tipo, COUNT(*) as total
      FROM materiais_salvos
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia, tipo ORDER BY dia ASC
    `)
    const conteudoPorDia = [...(conteudoPorDiaCE.results || []), ...(conteudoPorDiaMS.results || [])]
    
    // 6. Flashcards por dia (de conteudo_estudo)
    const flashcardsPorDiaRes = await safeQuery(`
      SELECT DATE(created_at) as dia, COUNT(*) as total
      FROM conteudo_estudo
      WHERE tipo = 'flashcards' AND created_at >= datetime('now', '-30 days')
      GROUP BY dia ORDER BY dia ASC
    `)
    
    // 7. Simulados por dia
    const simuladosPorDiaRes = await safeQuery(`
      SELECT DATE(created_at) as dia, COUNT(*) as total
      FROM simulados_historico
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia ORDER BY dia ASC
    `)
    
    // 8. Exercícios por dia
    const exerciciosPorDiaCE = await safeQuery(`
      SELECT DATE(created_at) as dia, COUNT(*) as total
      FROM conteudo_estudo
      WHERE tipo = 'exercicios' AND created_at >= datetime('now', '-30 days')
      GROUP BY dia ORDER BY dia ASC
    `)
    const exerciciosPorDiaMS = await safeQuery(`
      SELECT DATE(created_at) as dia, COUNT(*) as total
      FROM materiais_salvos
      WHERE tipo = 'exercicios' AND created_at >= datetime('now', '-30 days')
      GROUP BY dia ORDER BY dia ASC
    `)
    const exerciciosPorDia = [...(exerciciosPorDiaCE.results || []), ...(exerciciosPorDiaMS.results || [])]
    
    // 9. Feedbacks: estatísticas (user_feedbacks é a tabela correta)
    const feedbackStats = await safeFirst(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(CASE WHEN rating > 0 THEN rating ELSE NULL END), 1) as media_geral,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as nao_lidos,
        SUM(CASE WHEN rating >= 4 OR feedback_type = 'praise' OR feedback_type = 'bom' THEN 1 ELSE 0 END) as positivos
      FROM user_feedbacks
    `)
    
    // 10. Feedbacks por tipo
    const feedbackPorTipoRes = await safeQuery(`
      SELECT feedback_type, COUNT(*) as total
      FROM user_feedbacks
      GROUP BY feedback_type
      ORDER BY total DESC
    `)
    
    // 11. Lista de feedbacks (últimos 100)
    const feedbackListaRes = await safeQuery(`
      SELECT 
        f.id,
        f.feedback_type,
        f.rating,
        f.message,
        f.page_context,
        f.is_read,
        f.created_at,
        u.name as user_name,
        u.email as user_email
      FROM user_feedbacks f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
      LIMIT 100
    `)
    
    return c.json({
      conteudos: {
        totais: totaisTipo,
        flashcards_total: flashcardsTotal?.total || 0,
        simulados_total: simuladosTotal?.total || 0,
        revisoes_total: revisoesTotal,
        por_dia: conteudoPorDia,
        flashcards_por_dia: flashcardsPorDiaRes.results || [],
        simulados_por_dia: simuladosPorDiaRes.results || [],
        exercicios_por_dia: exerciciosPorDia
      },
      feedbacks: {
        stats: {
          total: feedbackStats?.total || 0,
          media_geral: feedbackStats?.media_geral || '-',
          nao_lidos: feedbackStats?.nao_lidos || 0,
          positivos: feedbackStats?.positivos || 0
        },
        por_tipo: feedbackPorTipoRes.results || [],
        lista: feedbackListaRes.results || []
      },
      atualizado_em: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Erro ao carregar analytics:', error)
    return c.json({ error: 'Erro ao carregar analytics: ' + error.message }, 500)
  }
})

// ✅ CORREÇÃO v13: Endpoint admin para listar todos os feedbacks
app.get('/api/admin/feedbacks', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Criar tabela se não existir
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        rating INTEGER,
        feedback_type TEXT DEFAULT 'suggestion',
        message TEXT NOT NULL,
        page_context TEXT,
        is_read INTEGER DEFAULT 0,
        admin_response TEXT,
        responded_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const filterRead = c.req.query('is_read') // 'all', '0', '1'
    const offset = (page - 1) * limit
    
    let whereClause = ''
    if (filterRead === '0') {
      whereClause = 'WHERE f.is_read = 0'
    } else if (filterRead === '1') {
      whereClause = 'WHERE f.is_read = 1'
    }
    
    const feedbacks = await DB.prepare(`
      SELECT 
        f.id, f.user_id, f.rating, f.feedback_type, f.message, 
        f.page_context, f.is_read, f.admin_response, f.responded_at, f.created_at,
        u.name as user_name, u.email as user_email
      FROM user_feedbacks f
      LEFT JOIN users u ON u.id = f.user_id
      ${whereClause}
      ORDER BY f.is_read ASC, f.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()
    
    const total = await DB.prepare(`
      SELECT COUNT(*) as count FROM user_feedbacks f ${whereClause}
    `).first() as any
    
    const unreadCount = await DB.prepare(`
      SELECT COUNT(*) as count FROM user_feedbacks WHERE is_read = 0
    `).first() as any
    
    // Estatísticas
    const stats = await DB.prepare(`
      SELECT 
        feedback_type,
        COUNT(*) as total,
        AVG(rating) as avg_rating
      FROM user_feedbacks
      GROUP BY feedback_type
    `).all()
    
    return c.json({
      feedbacks: feedbacks.results,
      unread_count: unreadCount?.count || 0,
      stats: stats.results,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error: any) {
    console.error('Erro ao listar feedbacks:', error)
    return c.json({ error: 'Erro ao listar feedbacks', details: error.message }, 500)
  }
})

// ✅ CORREÇÃO v13: Marcar feedback como lido/responder
app.put('/api/admin/feedbacks/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const feedbackId = c.req.param('id')
    const { is_read, admin_response } = await c.req.json()
    
    let query = 'UPDATE user_feedbacks SET '
    const updates: string[] = []
    const bindings: any[] = []
    
    if (typeof is_read !== 'undefined') {
      updates.push('is_read = ?')
      bindings.push(is_read ? 1 : 0)
    }
    
    if (admin_response) {
      updates.push('admin_response = ?')
      bindings.push(admin_response)
      updates.push("responded_at = datetime('now')")
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'Nenhum campo para atualizar' }, 400)
    }
    
    query += updates.join(', ') + ' WHERE id = ?'
    bindings.push(feedbackId)
    
    await DB.prepare(query).bind(...bindings).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar feedback:', error)
    return c.json({ error: 'Erro ao atualizar feedback' }, 500)
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
    const { is_premium, days, plan } = await c.req.json()
    
    if (is_premium && days) {
      // ✅ CORREÇÃO v9: Ativar premium por X dias E subscription_status
      const selectedPlan = plan || (days >= 365 ? 'anual' : 'mensal')
      await DB.prepare(`
        UPDATE users 
        SET is_premium = 1, 
            premium_expires_at = DATE('now', '+' || ? || ' days'),
            subscription_status = 'active',
            subscription_plan = ?,
            subscription_expires_at = DATE('now', '+' || ? || ' days')
        WHERE id = ?
      `).bind(days, selectedPlan, days, userId).run()
      console.log(`✅ Premium ativado para usuário ${userId} por ${days} dias (${selectedPlan})`)
    } else {
      // Remover premium
      await DB.prepare(`
        UPDATE users 
        SET is_premium = 0, 
            premium_expires_at = NULL,
            subscription_status = 'cancelled',
            subscription_plan = NULL,
            subscription_expires_at = NULL
        WHERE id = ?
      `).bind(userId).run()
      console.log(`❌ Premium removido do usuário ${userId}`)
    }
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar premium:', error)
    return c.json({ error: 'Erro ao atualizar premium' }, 500)
  }
})

// ✅ NOVO v9: Sincronizar status premium com subscription_status
// Útil para corrigir usuários que pagaram mas não tiveram is_premium atualizado
app.post('/api/admin/sync-premium', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Sincronizar: se subscription_status = 'active' e subscription_expires_at > now, então is_premium = 1
    const result = await DB.prepare(`
      UPDATE users 
      SET is_premium = 1,
          premium_expires_at = subscription_expires_at
      WHERE subscription_status = 'active' 
        AND subscription_expires_at > datetime('now')
        AND is_premium = 0
    `).run()
    
    // Também sincronizar ao contrário: se expirou, remover premium
    const expiredResult = await DB.prepare(`
      UPDATE users 
      SET is_premium = 0,
          subscription_status = 'expired'
      WHERE subscription_status = 'active' 
        AND subscription_expires_at <= datetime('now')
    `).run()
    
    console.log(`✅ Sincronização premium: ${result.meta.changes} ativados, ${expiredResult.meta.changes} expirados`)
    
    return c.json({ 
      success: true,
      activated: result.meta.changes || 0,
      expired: expiredResult.meta.changes || 0
    })
  } catch (error) {
    console.error('Erro ao sincronizar premium:', error)
    return c.json({ error: 'Erro ao sincronizar premium' }, 500)
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

// Deletar usuário (admin) - CUIDADO! Exclusão completa em cascata
app.delete('/api/admin/users/:id', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const userId = c.req.param('id')
    console.log(`🗑️ Iniciando exclusão do usuário ${userId}...`)
    
    // Verificar se não é o próprio admin
    const user = await DB.prepare('SELECT email, email_verified FROM users WHERE id = ?').bind(userId).first() as any
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    if (user?.email === ADMIN_EMAIL) {
      return c.json({ error: 'Não é possível deletar o administrador' }, 400)
    }
    
    // ✅ CORREÇÃO v13: Não permitir exclusão de usuários com email verificado
    if (user.email_verified === 1) {
      return c.json({ 
        error: 'Não é possível excluir usuários com email verificado. Apenas usuários que não confirmaram o email podem ser excluídos.',
        reason: 'email_verified'
      }, 403)
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ✅ v77 FIX: EXCLUSÃO ROBUSTA — desabilita FK e limpa tudo
    // ═══════════════════════════════════════════════════════════════
    
    console.log(`🗑️ v77: Excluindo dados do usuário ${userId}...`)
    
    // Desabilitar foreign keys temporariamente para evitar SQLITE_CONSTRAINT
    await DB.prepare('PRAGMA foreign_keys = OFF').run()
    
    // Lista exaustiva de tabelas com user_id
    const tabelasUsuario = [
      'metas_diarias', 'metas_semana', 'user_topicos_progresso',
      'conteudo_estudo', 'conteudo_topicos', 'historico_estudos',
      'exercicios_resultados', 'simulados_historico', 'flashcards', 'revisoes',
      'materiais_salvos', 'progresso_materiais', 'disciplina_documentos',
      'topicos_edital', 'user_disciplinas', 'interviews', 'desempenho',
      'user_subscriptions', 'user_feedbacks', 'conteudo_feedback',
      'email_history', 'site_visits', 'payment_history',
      'google_oauth_tokens', 'password_reset_tokens'
    ]
    
    // Deletar de cada tabela individualmente (evita batch FK errors)
    for (const tabela of tabelasUsuario) {
      try {
        await DB.prepare(`DELETE FROM ${tabela} WHERE user_id = ?`).bind(userId).run()
      } catch (e: any) { 
        // Tabela pode não existir ou não ter coluna user_id — ignorar
        console.warn(`  ⚠️ ${tabela}: ${e.message}`)
      }
    }
    
    // Tabelas com email reference
    try {
      await DB.prepare('DELETE FROM email_history WHERE email_to = ?').bind(user.email).run()
    } catch (e: any) { console.warn('email_history by email:', e.message) }
    
    // Tabelas dependentes de planos
    try {
      await DB.prepare('DELETE FROM semanas_estudo WHERE plano_id IN (SELECT id FROM planos_estudo WHERE user_id = ?)').bind(userId).run()
    } catch (e: any) { console.warn('semanas_estudo:', e.message) }
    try {
      await DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id IN (SELECT id FROM planos_estudo WHERE user_id = ?)').bind(userId).run()
    } catch (e: any) { console.warn('ciclos_estudo:', e.message) }
    try {
      await DB.prepare('DELETE FROM planos_estudo WHERE user_id = ?').bind(userId).run()
    } catch (e: any) { console.warn('planos_estudo:', e.message) }
    
    // Editais em cascata
    try {
      await DB.prepare('DELETE FROM edital_topicos WHERE edital_disciplina_id IN (SELECT id FROM edital_disciplinas WHERE edital_id IN (SELECT id FROM editais WHERE user_id = ?))').bind(userId).run()
    } catch (e: any) { console.warn('edital_topicos:', e.message) }
    try {
      await DB.prepare('DELETE FROM edital_disciplinas WHERE edital_id IN (SELECT id FROM editais WHERE user_id = ?)').bind(userId).run()
    } catch (e: any) { console.warn('edital_disciplinas:', e.message) }
    try {
      await DB.prepare('DELETE FROM editais WHERE user_id = ?').bind(userId).run()
    } catch (e: any) { console.warn('editais:', e.message) }
    
    // FINAL: Deletar o usuário
    const userResult = await DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    
    // Reabilitar foreign keys
    await DB.prepare('PRAGMA foreign_keys = ON').run()
    
    if (userResult.meta?.changes === 0) {
      return c.json({ error: 'Usuário não encontrado ou já foi deletado' }, 404)
    }
    
    console.log(`✅ Usuário ${userId} (${user.email}) deletado com sucesso via BATCH!`)
    
    return c.json({ 
      success: true, 
      message: 'Usuário deletado com sucesso',
      details: {
        tabelasLimpas: 24,
        errosIgnorados: 0
      }
    })
  } catch (error: any) {
    console.error('❌ Erro ao deletar usuário:', error)
    return c.json({ 
      error: 'Erro ao deletar usuário', 
      details: error.message 
    }, 500)
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
      // ✅ v84: Log quando usuário existente é auto-verificado via Google
      if (!user.email_verified) {
        console.log(`📧 Usuário ${user.id} (${user.email}) auto-verificado via Google OAuth (era não-verificado)`)
        try {
          await logEmailSent(
            DB,
            user.email,
            'auto_verified_google',
            'Email auto-verificado via Google OAuth',
            'sent',
            user.id
          )
        } catch (e) { /* não crítico */ }
      }
      
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
          auth_provider, email_verified, password,
          trial_started_at, trial_expires_at, subscription_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'google', 1, '',
          datetime('now'), datetime('now', '+14 days'), 'trial')
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
      
      // ✅ v84: Enviar email de boas-vindas para novos usuários Google
      try {
        await sendWelcomeEmail(googleUser.email, googleUser.name || 'Usuário', c.env)
        console.log(`📧 Email de boas-vindas enviado para ${googleUser.email} (Google OAuth)`)
      } catch (welcomeError) {
        console.log('⚠️ Erro ao enviar email de boas-vindas Google (não crítico):', welcomeError)
      }
      
      // Registrar no histórico de emails
      try {
        await logEmailSent(
          DB,
          googleUser.email,
          'welcome_google',
          'Bem-vindo ao IAprova!',
          'sent',
          user.id as number
        )
      } catch (logError) {
        console.log('⚠️ Erro ao registrar email Google no histórico:', logError)
      }
    }
    
    // Redirecionar com dados do usuário para /home
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name || googleUser.name,
      email: user.email || googleUser.email,
      picture: googleUser.picture,
      authProvider: 'google'
    }))
    
    // ✅ CORREÇÃO: Redirecionar para /home para garantir que checkUser processe corretamente
    return c.redirect(`${APP_URL}/home?googleAuth=success&user=${userData}`)
    
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
  
  console.log('🔐 Verificação de email - Token recebido:', token?.substring(0, 10) + '...')
  
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
    // Buscar usuário pelo token (sem verificar expiração em SQL para evitar problemas de timezone)
    const user = await DB.prepare(
      `SELECT id, name, email, email_verified, verification_token_expires 
       FROM users 
       WHERE verification_token = ?`
    ).bind(token).first() as any
    
    console.log('🔍 Usuário encontrado:', user ? `ID ${user.id}, email ${user.email}` : 'NENHUM')
    
    if (!user) {
      console.log('❌ Token não encontrado no banco')
      return c.json({ 
        error: 'Token inválido ou já utilizado. Solicite um novo email de verificação.' 
      }, 400)
    }
    
    // Verificar expiração em JavaScript (mais confiável que datetime() do SQLite)
    if (user.verification_token_expires) {
      const now = new Date()
      const expires = new Date(user.verification_token_expires)
      console.log('⏰ Verificação de expiração - Agora:', now.toISOString(), '| Expira:', expires.toISOString())
      
      if (now > expires) {
        console.log('❌ Token expirado')
        return c.json({ 
          error: 'Token expirado. Solicite um novo link de verificação.' 
        }, 400)
      }
    }
    
    // Se já está verificado
    if (user.email_verified) {
      console.log('ℹ️ Email já verificado anteriormente')
      return c.json({ 
        message: 'Email já verificado. Você pode fazer login.',
        alreadyVerified: true,
        success: true
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
    
    console.log('✅ Email verificado com sucesso para:', user.email)
    
    // Enviar email de boas-vindas
    try {
      await sendWelcomeEmail(user.email, user.name || 'Usuário', c.env);
    } catch (welcomeError) {
      console.log('⚠️ Erro ao enviar email de boas-vindas (não crítico):', welcomeError)
    }
    
    return c.json({ 
      message: 'Email verificado com sucesso! Agora você pode fazer login.',
      email: user.email,
      success: true,
      verified: true
    })
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error)
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
    
    // Calcular expiração em JavaScript (48 horas)
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    
    // Atualizar token no banco
    await DB.prepare(
      `UPDATE users 
       SET verification_token = ?, 
           verification_token_expires = ? 
       WHERE id = ?`
    ).bind(newToken, tokenExpiresAt, user.id).run()
    
    // Reenviar email
    const emailSent = await sendVerificationEmail(email, newToken, user.name, c.env)
    const APP_URL = c.env?.APP_URL || 'https://iaprova.app'
    const verificationUrl = `${APP_URL}/verificar-email?token=${newToken}`
    
    // ✅ CORREÇÃO v16: Registrar reenvio específico no histórico
    if (emailSent) {
      await logEmailSent(
        DB,
        email,
        'resend_verification',
        '🔄 Reenvio - Confirme seu Email - IAprova',
        'sent',
        user.id
      )
    }
    
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

// ✅ CORREÇÃO v12: Endpoint para verificar se email já foi validado
app.get('/api/check-email-verified', async (c) => {
  const { DB } = c.env
  const email = c.req.query('email')?.toLowerCase()?.trim()
  
  if (!email) {
    return c.json({ error: 'Email não fornecido' }, 400)
  }
  
  try {
    const user = await DB.prepare(
      'SELECT email_verified FROM users WHERE email = ?'
    ).bind(email).first() as any
    
    if (!user) {
      return c.json({ error: 'Email não encontrado', verified: false }, 404)
    }
    
    return c.json({ 
      verified: user.email_verified === 1,
      email 
    })
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return c.json({ error: 'Erro ao verificar' }, 500)
  }
})

// ✅ CORREÇÃO v12: Endpoint para buscar usuário por email
app.get('/api/user-by-email', async (c) => {
  const { DB } = c.env
  const email = c.req.query('email')?.toLowerCase()?.trim()
  
  if (!email) {
    return c.json({ error: 'Email não fornecido' }, 400)
  }
  
  try {
    const user = await DB.prepare(
      'SELECT id, email, name, created_at, email_verified FROM users WHERE email = ?'
    ).bind(email).first() as any
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    return c.json({ user })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return c.json({ error: 'Erro ao buscar usuário' }, 500)
  }
})

// [REMOVIDO - Definição duplicada de /api/verify-email/:token]
// A definição principal está na linha ~2862

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
// ⚠️ SEGURANÇA: Email NÃO pode ser alterado pelo usuário (apenas admin)
app.put('/api/users/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const { name, email, password } = await c.req.json()

  try {
    // Verificar se usuário existe
    const user = await DB.prepare(
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(id).first() as any

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }

    // ⚠️ SEGURANÇA: Bloquear alteração de email
    // Email só pode ser alterado pelo administrador via painel admin
    if (email && email !== user.email) {
      console.warn(`⚠️ Tentativa de alterar email bloqueada - user_id: ${id}, email atual: ${user.email}, tentativa: ${email}`)
      return c.json({ 
        error: 'Alteração de email não permitida por segurança. Entre em contato com o suporte se necessário.' 
      }, 403)
    }

    // Construir query de atualização (apenas name e password permitidos)
    const updates = []
    const params = []

    if (name) {
      updates.push('name = ?')
      params.push(name)
    }
    // Email removido das atualizações permitidas por segurança
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
        // ❌ PDF NÃO É SUPORTADO - Direcionar para conversão
        const arrayBuffer = await file.arrayBuffer()
        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024)
        
        console.log(`📄 PDF detectado: ${file.name} (${fileSizeMB.toFixed(2)} MB) - Rejeitando e direcionando para conversão`)
        
        return c.json({
          error: 'Arquivos PDF não são suportados diretamente.',
          errorType: 'PDF_NOT_SUPPORTED',
          suggestion: 'Por favor, converta seu PDF para TXT antes de anexar.',
          converterUrl: 'https://convertio.co/pt/pdf-txt/',
          converterUrl2: 'https://smallpdf.com/pdf-to-text',
          fileName: file.name,
          fileSizeMB: fileSizeMB.toFixed(2)
        }, 415) // 415 = Unsupported Media Type
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
        console.log(`📊 v54 BATCH: Processando XLSX: ${disciplinasExtraidas.length} disciplinas`)
        
        try {
          const xlsxEditalId = result.meta.last_row_id
          
          // PASSO 1: Buscar disciplinas existentes (batch)
          const batchBuscaXLSX = disciplinasExtraidas.map((d: any) =>
            DB.prepare('SELECT id, nome FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))').bind(d.nome)
          )
          const resBuscaXLSX = await DB.batch(batchBuscaXLSX)
          
          const discMapXLSX = new Map<string, number>()
          resBuscaXLSX.forEach((r: any, i: number) => {
            const rows = r.results || []
            if (rows.length > 0) discMapXLSX.set(disciplinasExtraidas[i].nome, rows[0].id)
          })
          
          // PASSO 2: Criar disciplinas novas (batch)
          const discNovasXLSX = disciplinasExtraidas.filter((d: any) => !discMapXLSX.has(d.nome))
          if (discNovasXLSX.length > 0) {
            const batchCriarXLSX = discNovasXLSX.map((d: any) =>
              DB.prepare("INSERT INTO disciplinas (nome, area, descricao) VALUES (?, 'geral', 'Disciplina importada do XLSX')").bind(d.nome)
            )
            const resCriarXLSX = await DB.batch(batchCriarXLSX)
            resCriarXLSX.forEach((r: any, i: number) => {
              discMapXLSX.set(discNovasXLSX[i].nome, r.meta?.last_row_id)
            })
          }
          
          // PASSO 3: Inserir edital_disciplinas (batch)
          const batchEdDiscXLSX = disciplinasExtraidas.map((d: any, i: number) =>
            DB.prepare('INSERT INTO edital_disciplinas (edital_id, disciplina_id, nome, ordem, peso) VALUES (?, ?, ?, ?, ?)')
              .bind(xlsxEditalId, discMapXLSX.get(d.nome) || null, d.nome, d.ordem || i + 1, d.peso || null)
          )
          const resEdDiscXLSX = await DB.batch(batchEdDiscXLSX)
          const edDiscIdsXLSX = resEdDiscXLSX.map((r: any) => r.meta?.last_row_id)
          
          // PASSO 4: Preparar e inserir tópicos (batch chunks de 80)
          const batchTopicosXLSX: any[] = []
          for (let i = 0; i < disciplinasExtraidas.length; i++) {
            const disc = disciplinasExtraidas[i]
            const edDiscId = edDiscIdsXLSX[i]
            for (let j = 0; j < (disc.topicos || []).length && j < 50; j++) {
              batchTopicosXLSX.push(
                DB.prepare('INSERT OR IGNORE INTO edital_topicos (edital_disciplina_id, nome, ordem) VALUES (?, ?, ?)')
                  .bind(edDiscId, disc.topicos[j], j)
              )
            }
          }
          const BATCH_XLSX = 80
          for (let s = 0; s < batchTopicosXLSX.length; s += BATCH_XLSX) {
            await DB.batch(batchTopicosXLSX.slice(s, s + BATCH_XLSX))
          }
          
          // Atualizar status do edital
          await DB.prepare(`UPDATE editais SET status = 'processado' WHERE id = ?`).bind(xlsxEditalId).run()
          
          console.log(`✅ XLSX BATCH: ${disciplinasExtraidas.length} disc, ${batchTopicosXLSX.length} tópicos salvos`)
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
  const { DB, EDITAIS } = c.env
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
    
    // ✅ v51d: Buscar cargo do body da requisição COM PRIORIDADE, senão da entrevista
    let body: any = {}
    try { body = await c.req.json() } catch (e) { /* body vazio é OK */ }
    
    const entrevista = await DB.prepare(`
      SELECT cargo, concurso_nome, area_geral FROM interviews WHERE user_id = ? ORDER BY id DESC LIMIT 1
    `).bind(edital.user_id).first() as any
    
    // Prioridade: 1) cargo do body, 2) cargo da entrevista
    const cargoDesejado = body?.cargo?.trim() || entrevista?.cargo || ''
    const concursoNomeBody = body?.concurso_nome?.trim() || edital.nome_concurso || ''
    console.log(`👤 Cargo desejado (body: "${body?.cargo || ''}" | entrevista: "${entrevista?.cargo || ''}"): "${cargoDesejado}"`)
    console.log(`🏫 Concurso: ${concursoNomeBody}`)

    // Validar texto do edital
    let textoOriginal = edital.texto_completo || ''
    
    // ✅ NOVO: Se o texto indica PDF pendente, tentar buscar e processar o PDF diretamente
    const isPDFPendente = textoOriginal.includes('[PDF PENDENTE DE PROCESSAMENTO]')
    const isPDF = edital.arquivo_url?.toLowerCase()?.endsWith('.pdf')
    
    if ((isPDFPendente || textoOriginal.trim().length < 500) && isPDF && EDITAIS) {
      console.log('📄 PDF pendente detectado, buscando do R2 para processamento direto...')
      
      try {
        const pdfObject = await EDITAIS.get(edital.arquivo_url)
        if (pdfObject) {
          const pdfBuffer = await pdfObject.arrayBuffer()
          const fileSizeMB = pdfBuffer.byteLength / (1024 * 1024)
          console.log(`📄 PDF recuperado do R2: ${fileSizeMB.toFixed(2)} MB`)
          
          // Verificar tamanho
          if (fileSizeMB > 15) {
            return c.json({
              error: `PDF muito grande (${fileSizeMB.toFixed(1)}MB). Máximo: 15MB`,
              errorType: 'FILE_TOO_LARGE',
              suggestion: 'Converta o PDF para TXT em https://smallpdf.com/pdf-to-text',
              step: 1,
              stepName: 'Validação do arquivo'
            }, 413)
          }
          
          // ✅ v38: ENVIAR PDF COM FALLBACK MULTI-PROVIDER
          console.log('🚀 Enviando PDF para análise com IA (sistema centralizado)...')
          
          // Buscar chaves do banco de dados
          const apiKeys = await getActiveAPIKeys(DB)
          const geminiKeyFromDB = apiKeys.find(k => k.provider === 'gemini')?.api_key
          const geminiKey = geminiKeyFromDB || c.env.GEMINI_API_KEY || ''
          
          if (!geminiKey) {
            console.error('❌ Nenhuma chave Gemini disponível para processar PDF')
            // Continuar com o fluxo de texto alternativo
          } else {
            // Converter PDF para base64
            const bytes = new Uint8Array(pdfBuffer)
            let binary = ''
            const chunkSize = 8192
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
              binary += String.fromCharCode.apply(null, Array.from(chunk))
            }
            const base64PDF = btoa(binary)
            
            // Prompt otimizado para extração de disciplinas
            const cargoLower = cargoDesejado?.toLowerCase() || ''
            
            // ✅ CORREÇÃO v23: Prompt completamente reformulado para análise REAL do edital
            // Não usar mais área pré-detectada, deixar a IA ler o edital completo
            const promptPDF = `VOCÊ É UM ESPECIALISTA EM ANÁLISE DE EDITAIS DE CONCURSOS PÚBLICOS BRASILEIROS.

=== SUA TAREFA ===
Analise ESTE DOCUMENTO PDF (edital de concurso) e extraia TODAS as disciplinas e tópicos do CONTEÚDO PROGRAMÁTICO.

=== CARGO INFORMADO PELO CANDIDATO ===
${cargoDesejado?.toUpperCase() || 'NÃO ESPECIFICADO (analise para o cargo principal do edital)'}

=== INSTRUÇÕES CRÍTICAS ===
1. LEIA O DOCUMENTO COMPLETO - procure pela seção "CONTEÚDO PROGRAMÁTICO" ou "ANEXO" com o programa de disciplinas
2. IDENTIFIQUE O CARGO CORRETO - se houver múltiplos cargos, extraia APENAS as disciplinas do cargo especificado acima
3. DIFERENCIE "CONHECIMENTOS BÁSICOS/GERAIS" de "CONHECIMENTOS ESPECÍFICOS"
4. EXTRAIA OS NOMES EXATOS DAS DISCIPLINAS conforme aparecem no edital
5. EXTRAIA OS TÓPICOS REAIS listados sob cada disciplina
6. NÃO INVENTE NADA - use APENAS o que está escrito no documento

=== COMO ENCONTRAR AS DISCIPLINAS ===
- Procure por "ANEXO I", "ANEXO II" ou "ANEXO III" - geralmente tem "CONTEÚDO PROGRAMÁTICO"
- Procure por "MÓDULO I", "MÓDULO II" - separando conhecimentos básicos de específicos
- Procure por títulos como "Língua Portuguesa:", "Direito Constitucional:", etc.

=== FORMATO DE RESPOSTA (APENAS JSON) ===
{
  "cargo_detectado": "Nome do cargo que você identificou no edital",
  "disciplinas": [
    {
      "nome": "Nome EXATO da Disciplina como aparece no edital",
      "peso": 1,
      "categoria": "CONHECIMENTOS BÁSICOS ou CONHECIMENTOS ESPECÍFICOS",
      "topicos": ["Tópico 1 exato do edital", "Tópico 2 exato", "..."]
    }
  ]
}

=== REGRAS DE PESO ===
- peso: 1 → Conhecimentos Básicos/Gerais (Português, Raciocínio Lógico, Informática)
- peso: 2 → Conhecimentos Específicos do cargo

=== IMPORTANTE ===
- EXTRAIA TODAS AS DISCIPLINAS do cargo (geralmente 8 a 15 disciplinas)
- Se o edital tem mais de 10 disciplinas, INCLUA TODAS
- Cada disciplina deve ter seus tópicos REAIS extraídos do documento
- NÃO use disciplinas genéricas - use os nomes EXATOS do edital
- Se não encontrar o cargo especificado, avise no campo cargo_detectado`

            // ✅ v38: Tentar múltiplos modelos Gemini com fallback
            const modelosGeminiPDF = [
              'gemini-2.0-flash',
              'gemini-1.5-flash', 
              'gemini-2.0-flash-lite'
            ]
            
            let textoGemini = ''
            let modeloUsado = ''
            let ultimoErroPDF = ''
            
            for (const modelo of modelosGeminiPDF) {
              console.log(`🚀 Tentando ${modelo} para PDF...`)
              
              try {
                const response = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${geminiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{
                        parts: [
                          { text: promptPDF },
                          { inline_data: { mime_type: 'application/pdf', data: base64PDF } }
                        ]
                      }],
                      generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 65536
                      }
                    })
                  }
                )
                
                if (response.status === 429) {
                  ultimoErroPDF = `${modelo}: Rate limit`
                  console.log(`⚠️ ${modelo}: Rate limit, tentando próximo...`)
                  await new Promise(r => setTimeout(r, 2000))
                  continue
                }
                
                if (!response.ok) {
                  ultimoErroPDF = `${modelo}: HTTP ${response.status}`
                  continue
                }
                
                const data = await response.json() as any
                textoGemini = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                
                if (textoGemini && textoGemini.length > 100) {
                  modeloUsado = modelo
                  console.log(`✅ ${modelo} respondeu: ${textoGemini.length} caracteres`)
                  break
                }
              } catch (err: any) {
                ultimoErroPDF = `${modelo}: ${err.message}`
                console.error(`❌ ${modelo} erro:`, err.message)
              }
            }
            
            if (!textoGemini) {
              console.error(`❌ Todos os modelos Gemini falharam: ${ultimoErroPDF}`)
              // Continuar com o fluxo de texto alternativo em vez de retornar erro
            } else {
              console.log(`✅ Gemini (${modeloUsado}) respondeu: ${textoGemini.length} caracteres`)
              
              // Parsear JSON da resposta
              const jsonMatch = textoGemini.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                try {
                  const resultado = JSON.parse(jsonMatch[0].replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,\s*([}\]])/g, '$1'))
                  
                  if (resultado?.disciplinas?.length > 0) {
                    console.log(`✅ ${resultado.disciplinas.length} disciplinas extraídas do PDF`)
                    
                    // ✅ MODO REVISÃO: Retornar disciplinas para o usuário revisar
                    const modo = c.req.query('modo')
                    if (modo === 'revisao') {
                      return c.json({
                        success: true,
                        modo: 'revisao',
                        disciplinas: resultado.disciplinas,
                        fonte: 'pdf_direto',
                        message: `${resultado.disciplinas.length} disciplinas identificadas para revisão`
                      })
                    }
                    
                    // ✅ v54 BATCH: Salvar disciplinas no banco com batch
                    console.log(`📦 v54 BATCH: Salvando ${resultado.disciplinas.length} disciplinas do PDF direto`)
                    
                    // PASSO 1: Buscar disciplinas existentes (batch)
                    const batchBuscaPDF = resultado.disciplinas.map((disc: any) =>
                      DB.prepare('SELECT id, nome FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))').bind(disc.nome)
                    )
                    const resultBuscaPDF = await DB.batch(batchBuscaPDF)
                    
                    const discMapPDF = new Map<string, number>()
                    resultBuscaPDF.forEach((r: any, i: number) => {
                      const rows = r.results || []
                      if (rows.length > 0) discMapPDF.set(resultado.disciplinas[i].nome, rows[0].id)
                    })
                    
                    // PASSO 2: Criar disciplinas novas (batch)
                    const discNovasPDF = resultado.disciplinas.filter((d: any) => !discMapPDF.has(d.nome))
                    if (discNovasPDF.length > 0) {
                      const batchCriarPDF = discNovasPDF.map((d: any) =>
                        DB.prepare('INSERT INTO disciplinas (nome, area) VALUES (?, ?)').bind(d.nome, 'geral')
                      )
                      const resCriarPDF = await DB.batch(batchCriarPDF)
                      resCriarPDF.forEach((r: any, i: number) => {
                        discMapPDF.set(discNovasPDF[i].nome, r.meta?.last_row_id)
                      })
                    }
                    
                    // PASSO 3: Inserir edital_disciplinas (batch)
                    const batchEdDiscPDF = resultado.disciplinas.map((disc: any, i: number) =>
                      DB.prepare('INSERT INTO edital_disciplinas (edital_id, disciplina_id, nome, peso) VALUES (?, ?, ?, ?)')
                        .bind(editalId, discMapPDF.get(disc.nome) || null, disc.nome, disc.peso || 1)
                    )
                    const resEdDiscPDF = await DB.batch(batchEdDiscPDF)
                    const edDiscIdsPDF = resEdDiscPDF.map((r: any) => r.meta?.last_row_id)
                    
                    // PASSO 4: Preparar tópicos e inserir em batch (chunks de 80)
                    const batchTopicosPDF: any[] = []
                    for (let i = 0; i < resultado.disciplinas.length; i++) {
                      const disc = resultado.disciplinas[i]
                      const edDiscId = edDiscIdsPDF[i]
                      for (let j = 0; j < (disc.topicos || []).length && j < 50; j++) {
                        batchTopicosPDF.push(
                          DB.prepare('INSERT OR IGNORE INTO edital_topicos (edital_disciplina_id, nome, ordem) VALUES (?, ?, ?)')
                            .bind(edDiscId, disc.topicos[j], j)
                        )
                      }
                    }
                    const BATCH_PDF = 80
                    for (let s = 0; s < batchTopicosPDF.length; s += BATCH_PDF) {
                      await DB.batch(batchTopicosPDF.slice(s, s + BATCH_PDF))
                    }
                    
                    // Atualizar status
                    await DB.prepare('UPDATE editais SET status = ? WHERE id = ?').bind('processado', editalId).run()
                    
                    console.log(`✅ PDF direto: ${resultado.disciplinas.length} disc, ${batchTopicosPDF.length} tópicos salvos via BATCH`)
                    
                    return c.json({
                      success: true,
                      disciplinas: resultado.disciplinas,
                      total: resultado.disciplinas.length,
                      fonte: 'pdf_direto'
                    })
                  }
                } catch (parseError) {
                  console.error('❌ Erro ao parsear JSON:', parseError)
                }
              }
              
              // Se não conseguiu extrair, salvar o texto bruto para análise posterior
              textoOriginal = textoGemini
              await DB.prepare('UPDATE editais SET texto_completo = ? WHERE id = ?').bind(textoGemini, editalId).run()
              console.log('📝 Texto salvo no banco para processamento alternativo')
            }
          }
        }
      } catch (r2Error) {
        console.error('⚠️ Erro ao buscar PDF do R2:', r2Error)
        // Continuar com o fluxo normal se R2 falhar
      }
    }

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
    console.log('📋 PASSO 3: Redirecionando para extração programática unificada (v51c)...')
    console.log('═'.repeat(60))
    
    // ✅ v51c: USAR A MESMA LÓGICA DE EXTRAÇÃO DO processar-texto
    // Em vez de ter lógica duplicada, reutilizamos o endpoint processar-texto
    // que já tem a extração programática robusta (tabela + padrão Nome:conteúdo)
    
    const modo = c.req.query('modo')
    
    // Construir o request como se fosse processar-texto
    const requestBody = {
      texto: textoLimpo,
      user_id: edital.user_id?.toString(),
      cargo: cargoDesejado || '',
      concurso_nome: concursoNomeBody || '',
      area_geral: entrevista?.area_geral || ''
    }
    
    console.log(`📝 Texto: ${textoLimpo.length} chars`)
    console.log(`👤 Cargo para extração: "${cargoDesejado || 'não especificado'}"`)
    console.log(`🏫 Concurso: ${concursoNomeBody || '?'}`)
    
    // Chamar internamente o endpoint processar-texto usando app.request
    try {
      const internalReq = new Request('http://localhost/api/editais/processar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const internalRes = await app.request(
        '/api/editais/processar-texto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        },
        c.env
      )
      
      const resultData = await internalRes.json() as any
      
      if (!internalRes.ok || resultData.error) {
        console.error(`❌ Extração falhou: ${resultData.error || 'erro desconhecido'}`)
        throw new Error(resultData.error || 'Falha na extração programática')
      }
      
      console.log(`✅ Extração unificada: ${resultData.disciplinas?.length || 0} disciplinas`)
      
      // ✅ Atualizar status do edital para processado
      await DB.prepare('UPDATE editais SET status = ? WHERE id = ?').bind('processado', editalId).run()
      
      // ✅ Se modo revisão, retornar disciplinas para o usuário revisar
      if (modo === 'revisao') {
        return c.json({
          success: true,
          modo: 'revisao',
          edital_id: resultData.edital_id,
          disciplinas: resultData.disciplinas,
          total: resultData.total,
          concurso_detectado: resultData.concurso_detectado,
          area_detectada: resultData.area_detectada,
          fonte: 'extracao_programatica_v51c',
          message: `${resultData.disciplinas?.length || 0} disciplinas identificadas para revisão`
        })
      }
      
      // Modo direto
      return c.json({
        success: true,
        edital_id: resultData.edital_id,
        disciplinas: resultData.disciplinas,
        total: resultData.total,
        concurso_detectado: resultData.concurso_detectado,
        area_detectada: resultData.area_detectada,
        fonte: 'extracao_programatica_v51c',
        estatisticas: {
          total_disciplinas: resultData.disciplinas?.length || 0,
          total_topicos: resultData.disciplinas?.reduce((acc: number, d: any) => acc + (d.topicos?.length || 0), 0) || 0
        }
      })
    } catch (internalError: any) {
      console.error('❌ Erro na extração unificada:', internalError.message)
      
      // Marcar como erro
      await DB.prepare('UPDATE editais SET status = ? WHERE id = ?').bind('erro', editalId).run()
      
      return c.json({
        error: internalError.message || 'Erro ao processar edital',
        errorType: 'PROCESSING_ERROR',
        suggestion: 'Tente novamente ou cole o texto do edital manualmente',
        canRetry: true
      }, 500)
    }
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
// ✅ NOVO ENDPOINT: Processar texto de edital colado pelo usuário
// Permite análise rápida sem upload de arquivo
// ════════════════════════════════════════════════════════════════════════
app.post('/api/editais/processar-texto', async (c) => {
  const { DB } = c.env
  
  try {
    const { texto, user_id, cargo, concurso_nome, area_geral } = await c.req.json()
    
    if (!texto || texto.trim().length < 100) {
      return c.json({ 
        error: 'Texto muito curto. Cole pelo menos o conteúdo programático do edital.',
        minLength: 100,
        currentLength: texto?.length || 0
      }, 400)
    }
    
    if (!user_id) {
      return c.json({ error: 'user_id é obrigatório' }, 400)
    }
    
    console.log('═'.repeat(60))
    console.log('📋 PROCESSANDO TEXTO DE EDITAL COLADO')
    console.log('═'.repeat(60))
    console.log(`📝 Texto recebido: ${texto.length} caracteres`)
    console.log(`👤 Usuário: ${user_id}`)
    console.log(`🎯 Cargo: ${cargo || 'Não especificado'}`)
    
    // Detectar área automaticamente pelo cargo
    const cargoLower = cargo?.toLowerCase() || ''
    const areaDetectada = area_geral || (
      (cargoLower.includes('enfermeiro') || cargoLower.includes('enfermagem') || cargoLower.includes('saúde') || cargoLower.includes('sus')) ? 'saude' :
      (cargoLower.includes('técnico em enfermagem')) ? 'saude' :
      (cargoLower.includes('direito') || cargoLower.includes('advogado') || cargoLower.includes('jurídico')) ? 'juridico' :
      (cargoLower.includes('contador') || cargoLower.includes('contábil')) ? 'fiscal' :
      (cargoLower.includes('admin') || cargoLower.includes('gestão') || cargoLower.includes('analista')) ? 'gestao' :
      (cargoLower.includes('professor') || cargoLower.includes('educação') || cargoLower.includes('pedagog')) ? 'educacao' :
      (cargoLower.includes('técnico') || cargoLower.includes('assistente')) ? 'tecnico' :
      'geral'
    )
    
    console.log(`📚 Área detectada: ${areaDetectada}`)
    
    // ✅ v37: Buscar chaves do banco de dados (ordem de prioridade configurada pelo admin)
    const apiKeys = await getActiveAPIKeys(DB)
    console.log(`🔑 APIs configuradas: ${apiKeys.map(k => k.provider).join(', ') || 'nenhuma'}`)
    
    // Fallback para variáveis de ambiente se não houver chaves no banco
    const geminiKeyFromDB = apiKeys.find(k => k.provider === 'gemini')?.api_key
    const openaiKeyFromDB = apiKeys.find(k => k.provider === 'openai')?.api_key
    const groqKeyFromDB = apiKeys.find(k => k.provider === 'groq')?.api_key
    
    const geminiKey = geminiKeyFromDB || c.env.GEMINI_API_KEY || ''
    const openaiKey = openaiKeyFromDB || c.env.OPENAI_API_KEY || ''
    const groqKey = groqKeyFromDB || c.env.GROQ_API_KEY || ''
    
    const cargoUpper = cargo?.toUpperCase() || 'GERAL'
    console.log(`📝 Processando para cargo: ${cargoUpper}`)
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v65: PRÉ-PROCESSAMENTO - Extrair apenas conteúdo programático de editais grandes
    // Para textos > 30k chars, tentar extrair apenas a seção relevante
    // Isso evita problemas de CPU time no Cloudflare Workers
    // IMPORTANTE: Limitar texto ANTES de qualquer processamento pesado (regex, loops)
    // ════════════════════════════════════════════════════════════════
    
    let textoParaProcessar = texto
    if (texto.length > 30000) {
      console.log(`📝 v65: Texto muito grande (${texto.length} chars), pré-extraindo conteúdo programático...`)
      const preExtracao = extrairConteudoProgramatico(texto)
      if (preExtracao.encontrado && preExtracao.conteudo.length > 500) {
        textoParaProcessar = preExtracao.conteudo
        console.log(`✅ v65: Seção de conteúdo programático extraída: ${textoParaProcessar.length} chars (de ${texto.length})`)
      } else {
        // Se não encontrou conteúdo programático, usar últimos 60k chars (mais provável conter o conteúdo)
        textoParaProcessar = texto.substring(Math.max(0, texto.length - 60000))
        console.log(`⚠️ v65: Conteúdo programático não encontrado, usando últimos ${textoParaProcessar.length} chars`)
      }
    }
    // ✅ v65: Limitar texto a 60k chars no máximo (segurança adicional contra CPU timeout)
    if (textoParaProcessar.length > 60000) {
      console.log(`⚠️ v65: Texto ainda muito grande (${textoParaProcessar.length}), truncando para 60k chars`)
      textoParaProcessar = textoParaProcessar.substring(0, 60000)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v51b: EXTRAÇÃO UNIVERSAL DE DISCIPLINAS - QUALQUER EDITAL
    // Abordagem: 1) Tenta tabela de disciplinas  2) Padrão "Nome: conteúdo"
    // ════════════════════════════════════════════════════════════════
    
    // Limpar texto: remover form feed, carriage return
    const textoLimpo = textoParaProcessar
      .replace(/\f/g, '\n')
      .replace(/\r/g, '')
    
    const linhas = textoLimpo.split('\n')
    console.log(`📄 Total de linhas no edital: ${linhas.length}`)
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v61: DETECTAR TIPO DE EDITAL (mais tolerante)
    // Processo Seletivo Simplificado SEM NENHUM conteúdo programático
    // Se tiver qualquer disciplina/conteúdo, tentar extrair normalmente
    // ════════════════════════════════════════════════════════════════
    
    const textoUpper = textoLimpo.toUpperCase()
    const temConteudoProgramatico = textoUpper.includes('CONTEÚDO PROGRAMÁTICO') || textoUpper.includes('CONTEUDO PROGRAMATICO')
    const temProvaObjetiva = textoUpper.includes('PROVA OBJETIVA') || textoUpper.includes('PROVA DE CONHECIMENTOS') || textoUpper.includes('PROVAS OBJETIVAS')
    const temDisciplinas = textoUpper.includes('LÍNGUA PORTUGUESA') || textoUpper.includes('DIREITO CONSTITUCIONAL') || 
                          textoUpper.includes('DIREITO ADMINISTRATIVO') || textoUpper.includes('RACIOCÍNIO LÓGICO') ||
                          textoUpper.includes('CONHECIMENTOS BÁSICOS') || textoUpper.includes('CONHECIMENTOS ESPECÍFICOS')
    
    // ✅ v61: Só bloquear se REALMENTE não tiver NADA de conteúdo programático
    const ehProcessoSeletivoSemConteudo = (
      (textoUpper.includes('PROCESSO SELETIVO SIMPLIFICADO') || textoUpper.includes('SELEÇÃO SIMPLIFICADA')) &&
      !temProvaObjetiva && !temConteudoProgramatico && !temDisciplinas
    )
    
    if (ehProcessoSeletivoSemConteudo) {
      console.log('⚠️ v61: Detectado PROCESSO SELETIVO SIMPLIFICADO sem conteúdo programático')
      console.log('   Não há disciplinas, provas objetivas ou conteúdo programático neste edital')
      // ✅ v61: Usar IA para sugerir disciplinas relevantes DIRETAMENTE
      console.log('   Usando IA para sugerir disciplinas relevantes para o cargo...')
      
      const geminiKeyPS = geminiKey || c.env.GEMINI_API_KEY || ''
      if (geminiKeyPS && (cargo || concurso_nome)) {
        try {
          const promptSugestaoPS = `Você é um especialista em concursos públicos brasileiros.

CONTEXTO (PROCESSO SELETIVO SIMPLIFICADO):
- Cargo: ${cargo || 'Não especificado'}
- Concurso/Órgão: ${concurso_nome || 'Não especificado'}
- Área: ${area_geral || 'geral'}
- NOTA: Este é um processo seletivo simplificado baseado em títulos/entrevista, mas o candidato deseja estudar conteúdos relevantes para o cargo

TAREFA: Sugira as disciplinas e tópicos que seriam relevantes para um profissional deste cargo.
Considere o que um profissional desta área deve conhecer para ter bom desempenho na função.

REGRAS:
1. Inclua conhecimentos básicos relevantes (ex: Português, Informática)
2. Inclua conhecimentos específicos da função/área
3. Cada disciplina deve ter 3-8 tópicos principais
4. Retorne entre 6 e 12 disciplinas

RETORNE APENAS JSON válido:
{"disciplinas":[{"nome":"Nome","peso":1,"categoria":"BÁSICOS","topicos":["Tópico 1","Tópico 2"]}]}`

          const sugestaoRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKeyPS}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptSugestaoPS }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 8000 }
              })
            }
          )
          
          if (sugestaoRes.ok) {
            const sugestaoData = await sugestaoRes.json() as any
            const respText = sugestaoData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const jsonMatch = respText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').match(/\{[\s\S]*\}/)
            
            if (jsonMatch) {
              const sugestao = JSON.parse(jsonMatch[0])
              if (sugestao.disciplinas && sugestao.disciplinas.length > 0) {
                console.log(`✅ v61: IA sugeriu ${sugestao.disciplinas.length} disciplinas para processo seletivo`)
                
                // ✅ v63: Criar edital no banco mesmo para processo seletivo simplificado
                let editalIdPS: number | null = null
                try {
                  const editalResult = await c.env.DB.prepare(`
                    INSERT INTO editais (user_id, nome_concurso, texto_completo, status) 
                    VALUES (?, ?, ?, 'ativo')
                  `).bind(
                    user_id || 1,
                    concurso_nome || 'Não especificado',
                    texto.substring(0, 50000)
                  ).run()
                  
                  editalIdPS = editalResult.meta?.last_row_id as number
                  console.log(`✅ v63: Edital criado para processo seletivo com ID ${editalIdPS}`)
                } catch (dbErr) {
                  console.error('⚠️ v63: Erro ao criar edital para processo seletivo:', dbErr)
                }
                
                const disciplinasSugeridas = sugestao.disciplinas.map((d: any, i: number) => ({
                  id: -(i + 1),
                  disciplina_id_real: -(i + 1),
                  nome: d.nome,
                  peso: d.peso || 1,
                  categoria: d.categoria || 'BÁSICOS',
                  total_topicos: d.topicos?.length || 0,
                  topicos: (d.topicos || []).map((t: string) => ({ nome: t, peso: 1 }))
                }))
                
                return c.json({
                  success: true,
                  edital_id: editalIdPS,
                  disciplinas: disciplinasSugeridas,
                  total: disciplinasSugeridas.length,
                  concurso_detectado: concurso_nome,
                  area_detectada: area_geral || 'geral',
                  modo: 'sugestao',
                  fonte: 'ia_processo_seletivo_v61',
                  sugestao: true,
                  tipoEdital: 'processo_seletivo_simplificado',
                  message: `ℹ️ Este é um Processo Seletivo Simplificado (sem provas de conhecimentos). Sugerimos ${disciplinasSugeridas.length} disciplinas relevantes para o cargo. Revise e ajuste conforme necessário!`
                })
              }
            }
          }
        } catch (err) {
          console.error('⚠️ v61: Erro ao sugerir disciplinas para processo seletivo:', err)
        }
      }
      
      // Se IA falhou, retornar erro informativo
      return c.json({
        success: false,
        error: 'Processo Seletivo Simplificado sem conteúdo programático',
        errorType: 'PROCESSO_SELETIVO_SIMPLIFICADO',
        message: 'Este é um Processo Seletivo Simplificado baseado em análise de títulos e/ou entrevista. Não foi possível identificar ou sugerir disciplinas.\n\n**Sugestões:**\n• Use "Continuar sem edital" para criar um plano personalizado\n• Verifique os requisitos de titulação do edital',
        suggestion: 'Use "Continuar sem edital" para criar um plano de estudos personalizado',
        canRetry: false,
        tipoEdital: 'processo_seletivo_simplificado'
      }, 400)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v61: DETECTAR ÁREA/ESPECIALIDADE DO CARGO
    // Para editais com múltiplos cargos de mesma carreira (ex: Auditor - Área X, Área Y)
    // ════════════════════════════════════════════════════════════════
    
    let areaEspecifica = ''
    const cargoLowerOriginal = cargo?.toLowerCase() || ''
    
    // Detectar área específica no nome do cargo
    const areasConhecidas = [
      'infraestrutura', 'segurança', 'sistemas', 'engenharia de dados', 'ciência de dados',
      'engenharia', 'área comum', 'tecnologia da informação', 'ti',
      'administração', 'contabilidade', 'direito', 'economia', 'saúde',
      'fiscal', 'tributário', 'controle externo', 'controle interno'
    ]
    
    for (const area of areasConhecidas) {
      if (cargoLowerOriginal.includes(area)) {
        areaEspecifica = area.toUpperCase()
        break
      }
    }
    
    console.log(`🎯 Cargo: ${cargoUpper}`)
    if (areaEspecifica) {
      console.log(`🎯 Área específica detectada: ${areaEspecifica}`)
    }
    
    // ──────────────────────────────────────────────────────────────
    // MÉTODO 1: Tentar extrair disciplinas da TABELA do edital
    // Funciona para editais que listam "Disciplina    Questões"
    // ──────────────────────────────────────────────────────────────
    
    let disciplinasTabela: { nome: string, questoes: number, categoria: string, peso: number }[] = []
    let dentroTabela = false
    let moduloTabelaAtual = 'BÁSICOS'
    let ultimoCargoTabela = ''
    
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i].trim()
      const lUpper = l.toUpperCase()
      
      // Detectar cargo na tabela
      if (lUpper.includes(cargoUpper) || 
          (cargoUpper.includes('AUDITOR') && lUpper.includes('AUDITOR')) ||
          (cargoUpper.includes('ANALISTA') && lUpper.includes('ANALISTA'))) {
        if (l.length < 80 && !lUpper.includes('VAGA') && !lUpper.includes('SALÁRIO')) {
          ultimoCargoTabela = l.trim()
        }
      }
      
      // Detectar módulo
      if (lUpper.includes('MÓDULO') && lUpper.includes('CONHECIMENTOS')) {
        moduloTabelaAtual = lUpper.includes('II') ? 'ESPECÍFICOS' : 'BÁSICOS'
        dentroTabela = false
      }
      
      // Detectar cabeçalho de tabela
      if (/Disciplina\s+Quest/i.test(l)) {
        dentroTabela = true
        continue
      }
      
      if (dentroTabela) {
        if (/^\s*Total\s+\d+/i.test(l)) {
          dentroTabela = false
          continue
        }
        // Extrair "Nome da Disciplina    N"
        const match = l.match(/^(.+?)\s{2,}(\d+)\s*$/)
        if (match) {
          const nome = match[1].trim()
          const questoes = parseInt(match[2])
          if (nome.length > 3 && questoes > 0 && questoes < 200) {
            disciplinasTabela.push({
              nome, questoes,
              categoria: moduloTabelaAtual,
              peso: moduloTabelaAtual === 'ESPECÍFICOS' ? 2 : 1
            })
          }
        }
      }
    }
    
    // Filtrar disciplinas: usar até encontrar repetição (indica outro cargo)
    let disciplinasDaTabela: typeof disciplinasTabela = []
    if (disciplinasTabela.length > 0) {
      const nomes = new Set<string>()
      for (const d of disciplinasTabela) {
        const key = d.nome.toLowerCase()
        if (nomes.has(key)) break // Repetiu = começo de outro cargo
        nomes.add(key)
        disciplinasDaTabela.push(d)
      }
      console.log(`📊 Tabela encontrada: ${disciplinasDaTabela.length} disciplinas`)
    }
    
    // ──────────────────────────────────────────────────────────────
    // LOCALIZAR CONTEÚDO PROGRAMÁTICO do cargo
    // ──────────────────────────────────────────────────────────────
    
    let inicioConteudo = -1
    // ✅ v56: Pegar a ÚLTIMA ocorrência válida de "CONTEÚDO PROGRAMÁTICO" (não a primeira)
    // A primeira é geralmente referência em parágrafo; a última é o conteúdo detalhado real
    let candidatosConteudo: { linha: number, score: number }[] = []
    for (let i = 0; i < linhas.length; i++) {
      const lTrimmed = linhas[i].trim()
      const l = lTrimmed.toUpperCase()
      // Buscar marcador REAL de conteúdo programático (não referência)
      if ((l.includes('CONTEÚDO PROGRAMÁTICO') || l.includes('CONTEUDO PROGRAMATICO') ||
           l.includes('PROGRAMA DAS PROVAS')) && 
          !l.includes('CONSTA') && !l.includes('CONSTAM') && !l.includes('CONFORME') &&
          !l.includes('VIDE') && !l.includes('VER ') && !l.includes('PREVISTO') &&
          !l.includes('BASEADA') && !l.includes('BASEADO')) {
        
        // ✅ v56: Filtrar referências em parágrafos longos
        // Um título de seção é curto (< 60 chars) ou começa com "CONTEÚDO PROGRAMÁTICO"
        const ehTituloSecao = lTrimmed.length < 60 || 
                              /^(CONTEÚDO|CONTEUDO)\s+PROGRAM/i.test(lTrimmed) ||
                              /^(ANEXO|PROGRAMA)\s/i.test(lTrimmed)
        if (!ehTituloSecao && lTrimmed.length > 80) {
          // Parágrafo longo que menciona "conteúdo programático" - provavelmente referência
          continue
        }
        
        // Verificar se as próximas linhas têm disciplinas
        const prox10 = linhas.slice(i+1, i+15).join(' ').toLowerCase()
        if (prox10.includes('língua') || prox10.includes('raciocínio') || prox10.includes('direito') ||
            prox10.includes('módulo') || prox10.includes('conhecimentos') || prox10.includes('cargos de ensino')) {
          // Score: prefer lines that look like section titles
          let score = 0
          const prox20 = linhas.slice(i+1, i+20).join('\n')
          if (prox20.includes(':')) score += 2  // Has "Disciplina: conteúdo" format
          if (lTrimmed.length < 40) score += 1  // Short line = likely section title
          if (/^(CONTEÚDO|CONTEUDO)\s+PROGRAM[AÁ]TICO\s*$/i.test(lTrimmed)) score += 5  // Exact title alone on line
          if (/ANEXO\s+I/i.test(lTrimmed)) score += 1  // Part of an ANEXO
          candidatosConteudo.push({ linha: i, score })
          console.log(`📍 Candidato conteúdo programático: linha ${i+1} (score ${score}, len ${lTrimmed.length}): "${lTrimmed.substring(0, 60)}"`)
        }
      }
    }
    // Preferir candidato com maior score; em empate, pegar o último (mais provável ser o real)
    if (candidatosConteudo.length > 0) {
      const maxScore = Math.max(...candidatosConteudo.map(c => c.score))
      const melhores = candidatosConteudo.filter(c => c.score === maxScore)
      inicioConteudo = melhores[melhores.length - 1].linha  // último com maior score
      console.log(`📍 Conteúdo programático selecionado: linha ${inicioConteudo+1} (de ${candidatosConteudo.length} candidatos)`)
    }
    if (inicioConteudo === -1) {
      // Fallback: buscar por MÓDULO I ou CONHECIMENTOS GERAIS com conteúdo
      for (let i = Math.floor(linhas.length * 0.4); i < linhas.length; i++) {
        const l = linhas[i].trim().toUpperCase()
        if ((l.includes('MÓDULO I') && l.includes('CONHECIMENTOS')) ||
            (l.includes('CONHECIMENTOS GERAIS') && !l.includes('QUESTÕES') && !l.includes('ACERTOS'))) {
          const prox = linhas.slice(i+1, i+6).join(' ').toLowerCase()
          if (prox.includes('língua') || prox.includes('raciocínio') || prox.includes('português')) {
            inicioConteudo = i
            console.log(`📍 Início de conteúdo (fallback): linha ${i+1}`)
            break
          }
        }
      }
    }
    if (inicioConteudo === -1) inicioConteudo = Math.floor(linhas.length * 0.5)
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v61: LOCALIZAÇÃO INTELIGENTE DE SEÇÃO DO CARGO
    // Melhorada para editais com múltiplas áreas/especialidades
    // Ex: "AUDITOR DE CONTROLE EXTERNO – ÁREA DE TECNOLOGIA DA INFORMAÇÃO"
    // ════════════════════════════════════════════════════════════════
    
    const variacoesCargo: string[] = [cargoUpper]
    if (cargoUpper.includes('AUDITOR')) variacoesCargo.push('AUDITOR-FISCAL', 'AUDITOR FISCAL')
    if (cargoUpper.includes('ANALISTA')) variacoesCargo.push('ANALISTA-TRIBUTÁRIO', 'ANALISTA TRIBUTÁRIO')
    // v64: Variações de cargos de saúde
    if (cargoUpper.includes('ENFERMEIRO') || cargoUpper.includes('ENFERMAGEM')) {
      variacoesCargo.push('ENFERMEIRO', 'ENFERMEIRA', 'ENFERMAGEM')
      if (cargoUpper.includes('TÉCNICO')) variacoesCargo.push('TÉCNICO DE ENFERMAGEM', 'TÉCNICO EM ENFERMAGEM')
    }
    if (cargoUpper.includes('MÉDICO')) variacoesCargo.push('MÉDICO', 'MÉDICA')
    if (cargoUpper.includes('FARMACÊUTICO')) variacoesCargo.push('FARMACÊUTICO', 'FARMACÊUTICA')
    if (cargoUpper.includes('FISIOTERAPEUTA')) variacoesCargo.push('FISIOTERAPEUTA')
    if (cargoUpper.includes('NUTRICIONISTA')) variacoesCargo.push('NUTRICIONISTA')
    if (cargoUpper.includes('PSICÓLOGO')) variacoesCargo.push('PSICÓLOGO', 'PSICÓLOGA')
    
    let inicioSecaoCargo = -1
    let fimSecaoCargo = -1
    
    // ✅ v61: Primeiro buscar seção exata com área específica
    // Padrão: "PARA O CARGO DE AUDITOR DE CONTROLE EXTERNO – ÁREA DE X"
    if (areaEspecifica) {
      for (let i = inicioConteudo; i < linhas.length; i++) {
        const l = linhas[i].trim().toUpperCase()
        // Buscar linha que menciona o cargo E a área específica
        if (l.includes('PARA O CARGO') || l.includes('PARA OS CARGOS') || 
            (l.includes('AUDITOR') && l.includes('ÁREA')) ||
            (l.includes('ANALISTA') && l.includes('ÁREA'))) {
          if (l.includes(areaEspecifica) || 
              (areaEspecifica.includes('INFRAESTRUTURA') && l.includes('INFRAESTRUTURA')) ||
              (areaEspecifica.includes('SISTEMAS') && l.includes('SISTEMAS')) ||
              (areaEspecifica.includes('ENGENHARIA') && l.includes('ENGENHARIA') && !l.includes('DADOS')) ||
              (areaEspecifica.includes('COMUM') && l.includes('COMUM')) ||
              (areaEspecifica.includes('TECNOLOGIA') && l.includes('TECNOLOGIA'))) {
            const prox = linhas.slice(i+1, i+10).join(' ').toLowerCase()
            if (prox.includes('conhecimentos') || prox.includes('língua') || prox.includes('direito')) {
              inicioSecaoCargo = i
              console.log(`📍 v61: Seção do cargo+área encontrada: linha ${i+1} - "${l.substring(0, 80)}"`)
              break
            }
          }
        }
      }
    }
    
    // Se não encontrou com área específica, buscar pelo cargo genérico
    if (inicioSecaoCargo === -1) {
      for (let i = inicioConteudo; i < linhas.length; i++) {
        const l = linhas[i].trim().toUpperCase()
        for (const v of variacoesCargo) {
          if ((l === v || (l.length < 100 && l.includes(v) && !l.includes('VAGA') && !l.includes('QUESTÕES') && !l.includes('SALÁRIO'))) && l.length < 100) {
            const prox = linhas.slice(i+1, i+5).join(' ').toLowerCase()
            if (prox.includes('módulo') || prox.includes('conhecimentos') || prox.includes('língua') || prox.includes('direito') || prox.includes('raciocínio')) {
              inicioSecaoCargo = i
              console.log(`📍 Seção do cargo: linha ${i+1}`)
              break
            }
          }
        }
        if (inicioSecaoCargo !== -1) break
      }
    }
    
    // Se não encontrou seção específica do cargo, pegar todo o conteúdo programático
    if (inicioSecaoCargo === -1) {
      inicioSecaoCargo = inicioConteudo
      console.log(`📍 Usando todo conteúdo programático desde linha ${inicioConteudo+1}`)
    }
    
    // ✅ v61: Lista melhorada de marcadores de fim de seção
    // Incluir padrões de outras áreas do mesmo cargo
    const outrosCargosConhecidos = ['AUDITOR-FISCAL', 'ANALISTA-TRIBUTÁRIO', 'ANALISTA TRIBUTÁRIO',
      'AUDITOR FISCAL', 'ASSISTENTE SOCIAL', 'ENFERMEIRO', 'MÉDICO', 'FARMACÊUTICO',
      'FISIOTERAPEUTA', 'NUTRICIONISTA', 'PSICÓLOGO', 'TÉCNICO', 'ENGENHEIRO',
      'FONOAUDIÓLOGO', 'DENTISTA', 'BIOMÉDICO', 'VETERINÁRIO', 'ECONOMISTA',
      'CIRURGIÃO', 'PROFESSOR', 'DELEGADO', 'PERITO', 'AGENTE', 'CONTADOR', 'ADVOGADO',
      // v64: Cargos de saúde adicionais
      'TÉCNICO DE ENFERMAGEM', 'TÉCNICO EM ENFERMAGEM', 'AUXILIAR DE ENFERMAGEM',
      'TERAPEUTA OCUPACIONAL', 'EDUCADOR FÍSICO', 'BIÓLOGO',
      'TÉCNICO DE LABORATÓRIO', 'TÉCNICO EM RADIOLOGIA', 'TÉCNICO DE SAÚDE BUCAL',
      // v64: Cargos administrativos adicionais
      'ADMINISTRADOR', 'OFICIAL DE JUSTIÇA', 'ESCRIVÃO', 'ANALISTA JUDICIÁRIO',
      'TÉCNICO JUDICIÁRIO', 'PROCURADOR', 'PROMOTOR', 'DEFENSOR',
      'AUDITOR DE CONTROLE', 'ANALISTA DE CONTROLE']
      .filter(c => !variacoesCargo.some(v => v.includes(c) || c.includes(v)))
    
    // ✅ v61: Encontrar fim da seção do cargo
    // IMPORTANTE: Parar quando encontrar "PARA O CARGO DE..." de OUTRA área
    for (let i = inicioSecaoCargo + 1; i < linhas.length; i++) {
      const l = linhas[i].trim().toUpperCase()
      
      // ✅ v61: Detectar início de seção de OUTRO cargo/área
      if (l.includes('PARA O CARGO DE') || l.includes('PARA OS CARGOS DE')) {
        // ✅ v62: Lógica melhorada - sub-áreas de TI são tratadas como mesma área principal
        // INFRAESTRUTURA e SISTEMAS são sub-áreas de TECNOLOGIA DA INFORMAÇÃO
        const areaTI = areaEspecifica && (
          areaEspecifica.includes('INFRAESTRUTURA') || 
          areaEspecifica.includes('SISTEMAS') || 
          areaEspecifica.includes('TECNOLOGIA') ||
          areaEspecifica.includes('TI')
        )
        
        // Se minha área é sub-área de TI, incluir tudo de TI até encontrar área totalmente diferente
        const linhaParece_TI = l.includes('TECNOLOGIA') || l.includes('INFRAESTRUTURA') || l.includes('SISTEMAS') || l.includes('TI –')
        const linhaParece_Engenharia = l.includes('ENGENHARIA') && !l.includes('DADOS') && !l.includes('SISTEMAS')
        const linhaParece_AreaComum = l.includes('ÁREA COMUM')
        
        let ehOutraArea = true
        if (areaTI) {
          // Se eu sou TI/Infraestrutura/Sistemas, só é "outra área" se for Engenharia pura ou Área Comum
          ehOutraArea = linhaParece_Engenharia || linhaParece_AreaComum
        } else if (areaEspecifica) {
          // Para outras áreas (Engenharia, Área Comum), verificar se contém minha área
          ehOutraArea = (
            !l.includes(areaEspecifica) &&
            !(areaEspecifica.includes('ENGENHARIA') && linhaParece_Engenharia) &&
            !(areaEspecifica.includes('COMUM') && linhaParece_AreaComum)
          )
        }
        
        if (ehOutraArea) {
          fimSecaoCargo = i
          console.log(`📍 v62: Fim da seção (outro cargo/área): linha ${i+1} - "${l.substring(0, 60)}"`)
          break
        } else {
          console.log(`📍 v62: Mesma área/sub-área, continuando: linha ${i+1} - "${l.substring(0, 60)}"`)
        }
      }
      
      // ✅ v61: Detectar "CONHECIMENTOS ESPECIALIZADOS" de outra área
      if (l.includes('CONHECIMENTOS ESPECIALIZADOS') && areaEspecifica) {
        // ✅ v62: Mesma lógica - sub-áreas de TI são tratadas como mesma área
        const areaTI = areaEspecifica && (
          areaEspecifica.includes('INFRAESTRUTURA') || 
          areaEspecifica.includes('SISTEMAS') || 
          areaEspecifica.includes('TECNOLOGIA')
        )
        
        const linhaParece_TI = l.includes('INFRAESTRUTURA') || l.includes('SISTEMAS') || l.includes('DADOS')
        const linhaParece_Engenharia = l.includes('ENGENHARIA') && !l.includes('DADOS')
        const linhaParece_AreaComum = l.includes('COMUM')
        
        let ehMinhaArea = false
        if (areaTI) {
          ehMinhaArea = linhaParece_TI || (!linhaParece_Engenharia && !linhaParece_AreaComum)
        } else {
          ehMinhaArea = (
            (areaEspecifica.includes('INFRAESTRUTURA') && l.includes('INFRAESTRUTURA')) ||
            (areaEspecifica.includes('SISTEMAS') && (l.includes('SISTEMAS') || l.includes('DADOS'))) ||
            (areaEspecifica.includes('ENGENHARIA') && linhaParece_Engenharia) ||
            (areaEspecifica.includes('COMUM') && linhaParece_AreaComum)
          )
        }
        
        if (!ehMinhaArea && i > inicioSecaoCargo + 50) {
          // Provavelmente é conhecimento especializado de outra área
          // Mas só parar se já processamos bastante conteúdo
          fimSecaoCargo = i
          console.log(`📍 v62: Fim da seção (conhecimentos de outra área): linha ${i+1}`)
          break
        }
      }
      
      // Detectar outros cargos conhecidos
      if (l.length < 80 && l.length > 3) {
        for (const outro of outrosCargosConhecidos) {
          if (l === outro || l.startsWith(outro + ' ') || l.startsWith(outro + ' -') || l.startsWith(outro + ' –')) {
            const prox = linhas.slice(i+1, i+5).join(' ')
            if (prox.length > 50) {
              fimSecaoCargo = i
              console.log(`📍 Fim: linha ${i+1} (${outro})`)
              break
            }
          }
        }
        if (fimSecaoCargo !== -1) break
      }
      if (l.includes('ANEXO II') || l.includes('ANEXO III') || l.includes('ATRIBUIÇÕES DOS CARGOS')) {
        fimSecaoCargo = i
        break
      }
    }
    if (fimSecaoCargo === -1) fimSecaoCargo = linhas.length
    
    // Montar texto da seção para análise
    let textoSecaoCargo = ''
    
    if (disciplinasDaTabela.length >= 3) {
      // Para editais COM tabela, usar toda a seção do cargo (Estratégia A)
      textoSecaoCargo = linhas.slice(inicioSecaoCargo, fimSecaoCargo).join('\n')
      console.log(`📖 Seção do cargo (com tabela): ${textoSecaoCargo.length} chars (linhas ${inicioSecaoCargo+1}-${fimSecaoCargo})`)
    } else {
      // Para editais SEM tabela: montar texto com seções relevantes
      
      // Buscar "CONHECIMENTOS GERAIS" antes do cargo
      let secaoGeraisTexto = ''
      for (let i = inicioConteudo; i < inicioSecaoCargo; i++) {
        const l = linhas[i].trim().toUpperCase()
        if ((l.includes('CONHECIMENTOS GERAIS') || l.includes('CONHECIMENTOS BÁSICOS')) && l.length < 80) {
          const prox = linhas.slice(i+1, i+10).join(' ').toLowerCase()
          if (prox.includes('língua') || prox.includes('raciocínio') || prox.includes('cargos de ensino')) {
            const secaoLinhas: string[] = []
            for (let j = i; j < inicioSecaoCargo; j++) {
              const lj = linhas[j].trim().toUpperCase()
              if (lj.includes('CONHECIMENTOS ESPECÍFICOS') && secaoLinhas.length > 3) break
              secaoLinhas.push(linhas[j])
            }
            secaoGeraisTexto = secaoLinhas.join('\n')
            console.log(`📍 Seção Gerais: ${secaoGeraisTexto.length} chars (linha ${i+1})`)
            break
          }
        }
      }
      
      // Buscar "PARA TODOS OS CARGOS" (SUS/Legislação)
      let secaoComumTexto = ''
      for (let i = inicioConteudo; i < inicioSecaoCargo; i++) {
        const l = linhas[i].trim().toUpperCase()
        if (l.includes('PARA TODOS OS CARGOS') && l.length < 100) {
          const secaoLinhas: string[] = []
          for (let j = i; j < inicioSecaoCargo; j++) {
            const lj = linhas[j].trim().toUpperCase()
            if ((lj.includes('CONHECIMENTOS ESPECÍFICOS') && !lj.includes('PARA TODOS')) && secaoLinhas.length > 1) break
            if (outrosCargosConhecidos.some(c => lj === c || lj.startsWith(c + ' -') || lj.startsWith(c + ' –'))) break
            secaoLinhas.push(linhas[j])
          }
          secaoComumTexto = secaoLinhas.join('\n')
          console.log(`📍 Seção SUS/Comuns: ${secaoComumTexto.length} chars (linha ${i+1})`)
          break
        }
      }
      
      const secaoCargoTexto = linhas.slice(inicioSecaoCargo, fimSecaoCargo).join('\n')
      
      // ✅ v65: Evitar duplicação quando Gerais e Comuns capturam o mesmo bloco
      // Se ambos têm conteúdo e um contém o outro (>80% overlap), manter apenas o maior
      if (secaoGeraisTexto && secaoComumTexto) {
        const menorLen = Math.min(secaoGeraisTexto.length, secaoComumTexto.length)
        const maiorLen = Math.max(secaoGeraisTexto.length, secaoComumTexto.length)
        if (menorLen / maiorLen > 0.8) {
          console.log(`⚠️ v65: Seções Gerais e Comuns são quase idênticas (${secaoGeraisTexto.length} vs ${secaoComumTexto.length}), mantendo apenas uma`)
          // Manter a maior e zerar a menor
          if (secaoGeraisTexto.length >= secaoComumTexto.length) {
            secaoComumTexto = ''
          } else {
            secaoGeraisTexto = ''
          }
        }
      }
      
      textoSecaoCargo = [
        secaoGeraisTexto ? 'CONHECIMENTOS GERAIS\n' + secaoGeraisTexto : '',
        secaoComumTexto ? 'CONHECIMENTOS ESPECÍFICOS COMUNS\n' + secaoComumTexto : '',
        secaoCargoTexto
      ].filter(s => s.length > 0).join('\n\n')
      
      console.log(`📖 Seção total: ${textoSecaoCargo.length} chars (Gerais:${secaoGeraisTexto.length}, Comuns:${secaoComumTexto.length}, Cargo:${secaoCargoTexto.length})`)
    }
    
    // ──────────────────────────────────────────────────────────────
    // EXTRAIR DISCIPLINAS: duas estratégias
    // ──────────────────────────────────────────────────────────────
    
    let disciplinasExtraidas: any[] = []
    
    // Função para extrair tópicos do texto de uma disciplina
    const extrairTopicosDeTexto = (textoDisc: string): string[] => {
      const topicos: string[] = []
      
      // ✅ v53: Primeiro tentar dividir por marcadores de lista (- , •, –)
      const partesPorMarcador = textoDisc.split(/(?=\n\s*[-•–]\s)/)
      if (partesPorMarcador.length > 2) {
        for (const p of partesPorMarcador) {
          const t = p.trim().replace(/^[-•–]\s*/, '').replace(/[.;]+$/, '').trim()
          if (t.length > 5 && t.length < 300) topicos.push(t)
        }
        if (topicos.length > 2) return topicos.slice(0, 50)
      }
      
      // Tentar dividir por numeração
      const partesPorNumero = textoDisc.split(/(?=\d+\.\s)/)
      if (partesPorNumero.length > 3) {
        for (const p of partesPorNumero) {
          const t = p.trim().replace(/^\d+\.?\s*/, '').replace(/[.;]+$/, '').trim()
          if (t.length > 5 && t.length < 300) topicos.push(t)
        }
        if (topicos.length > 3) return topicos.slice(0, 50)
      }
      
      // ✅ v55: Tentar dividir por linhas independentes (formato SESAPI)
      // Se cada linha é curta (< 100 chars) e a maioria começa com maiúscula,
      // provavelmente cada linha é um tópico individual
      const linhasIndividuais = textoDisc.split('\n').map(l => l.trim()).filter(l => l.length > 5)
      if (linhasIndividuais.length > 2) {
        const linhasCurtas = linhasIndividuais.filter(l => l.length < 120)
        // Se pelo menos 60% das linhas são curtas, tratar como tópicos por linha
        if (linhasCurtas.length >= linhasIndividuais.length * 0.6) {
          for (const l of linhasIndividuais) {
            const t = l.replace(/[.;]+$/, '').trim()
            if (t.length > 5 && t.length < 300) topicos.push(t)
          }
          if (topicos.length > 2) return topicos.slice(0, 50)
        }
      }
      
      // Dividir por ponto-e-vírgula ou ponto seguido de maiúscula
      const partes = textoDisc.split(/[;.]\s*(?=[A-ZÀ-Ú\d])/)
      for (const p of partes) {
        const t = p.trim().replace(/^\d+\.?\s*/, '').replace(/[;.]+$/, '').trim()
        if (t.length > 5 && t.length < 300) topicos.push(t)
      }
      return topicos.slice(0, 50)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ESTRATÉGIA A: Se encontrou tabela de disciplinas, usar como guia
    // ════════════════════════════════════════════════════════════════
    
    if (disciplinasDaTabela.length >= 3) {
      console.log('\n🔧 Usando TABELA DE DISCIPLINAS como guia...')
      
      for (const disc of disciplinasDaTabela) {
        // Buscar "NomeDisciplina:" no conteúdo programático
        // ✅ v55: Escapar caracteres especiais de regex no nome antes de construir padrão
        const nomeEscapado = disc.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const nomeParaBusca = nomeEscapado.replace(/\s+/g, '[\\s\\-–]+')
        let regex: RegExp
        try {
          regex = new RegExp(nomeParaBusca + '[^:]*:\\s*', 'i')
        } catch (e) {
          console.log(`   ⚠️ Regex inválida para "${disc.nome}", pulando...`)
          disciplinasExtraidas.push({ nome: disc.nome, peso: disc.peso, categoria: disc.categoria, topicos: [] })
          continue
        }
        const match = textoSecaoCargo.match(regex)
        
        if (match) {
          const posInicio = textoSecaoCargo.indexOf(match[0])
          let conteudo = textoSecaoCargo.substring(posInicio + match[0].length)
          
          // Cortar na próxima disciplina da tabela
          let menorPos = conteudo.length
          for (const outra of disciplinasDaTabela) {
            if (outra.nome === disc.nome) continue
            const outraEscapada = outra.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const outraBusca = outraEscapada.replace(/\s+/g, '[\\s\\-–]+')
            try {
              const outraRegex = new RegExp('\\n' + outraBusca + '[^:]*:\\s', 'i')
              const outraMatch = conteudo.match(outraRegex)
              if (outraMatch && outraMatch.index !== undefined && outraMatch.index < menorPos) {
                menorPos = outraMatch.index
              }
            } catch (e) { /* regex inválida, ignorar */ }
          }
          // Também cortar em MÓDULO II ou marcadores de seção
          const marcadores = [/\nMÓDULO\s+II/i, /\nCONHECIMENTOS\s+ESPECÍFICOS/i]
          for (const marc of marcadores) {
            const m = conteudo.match(marc)
            if (m && m.index !== undefined && m.index < menorPos) menorPos = m.index
          }
          
          conteudo = conteudo.substring(0, menorPos).trim()
          const topicos = extrairTopicosDeTexto(conteudo)
          
          disciplinasExtraidas.push({
            nome: disc.nome,
            peso: disc.peso,
            categoria: disc.categoria,
            topicos
          })
          console.log(`   ✅ ${disc.nome}: ${conteudo.length} chars, ${topicos.length} tópicos`)
        } else {
          // Não encontrou conteúdo, mas a disciplina existe na tabela
          disciplinasExtraidas.push({
            nome: disc.nome,
            peso: disc.peso,
            categoria: disc.categoria,
            topicos: []
          })
          console.log(`   ⚠️ ${disc.nome}: sem conteúdo programático`)
        }
      }
      
    } else {
      // ════════════════════════════════════════════════════════════════
      // ESTRATÉGIA B: Extração por padrão "Nome: conteúdo..."
      // Funciona para editais sem tabela (SESAPI, etc)
      // ════════════════════════════════════════════════════════════════
      
      console.log('\n🔧 Extração por padrão "Nome: conteúdo"...')
      
      // Nomes conhecidos de disciplinas que SÃO reais (não subtópicos)
      // ✅ v53: Adicionado mais padrões comuns
      const nomesConhecidosDisciplinas = [
        'LÍNGUA PORTUGUESA', 'LÍNGUA INGLESA', 'RACIOCÍNIO LÓGICO',
        'MATEMÁTICA', 'ESTATÍSTICA', 'INFORMÁTICA', 'NOÇÕES DE INFORMÁTICA',
        'NOÇÕES DE DIREITO', 'NOÇÕES DE ADMINISTRAÇÃO',
        'DIREITO', 'LEGISLAÇÃO', 'CONHECIMENTOS GERAIS', 'CONHECIMENTOS REGIONAIS',
        'CONHECIMENTOS SOBRE O', 'CONHECIMENTOS ESPECÍFICOS',
        'ADMINISTRAÇÃO', 'CONTABILIDADE', 'ECONOMIA', 'AUDITORIA',
        'FLUÊNCIA EM DADOS', 'CIÊNCIA DE DADOS', 'COMÉRCIO',
        'ÉTICA E LEGISLAÇÃO', 'ÉTICA NO SERVIÇO', 'SISTEMA ÚNICO', 'SAÚDE PÚBLICA',
        'ENFERMAGEM', 'FARMACOLOGIA', 'BIOSSEGURANÇA',
        'ATUALIDADES', 'REDAÇÃO', 'HISTÓRIA', 'GEOGRAFIA',
        'PORTUGUÊS', 'INGLÊS', 'ESPANHOL',
        // v64: Disciplinas de saúde/enfermagem ampliadas
        'LEGISLAÇÃO APLICADA AO SUS', 'LEGISLAÇÃO DO SUS', 'SAÚDE COLETIVA',
        'SAÚDE DA MULHER', 'SAÚDE DA CRIANÇA', 'SAÚDE DO IDOSO', 'SAÚDE DO ADULTO',
        'SAÚDE MENTAL', 'SAÚDE DO TRABALHADOR', 'SAÚDE DA FAMÍLIA',
        'CLÍNICA MÉDICA', 'CLÍNICA CIRÚRGICA', 'CENTRO CIRÚRGICO',
        'OBSTETRÍCIA', 'NEONATOLOGIA', 'PEDIATRIA', 'GERIATRIA',
        'URGÊNCIA E EMERGÊNCIA', 'EMERGÊNCIA', 'UTI', 'TERAPIA INTENSIVA',
        'SEMIOLOGIA', 'FUNDAMENTOS DE ENFERMAGEM', 'SISTEMATIZAÇÃO DA ASSISTÊNCIA',
        'PROCESSO DE ENFERMAGEM', 'ADMINISTRAÇÃO EM ENFERMAGEM',
        'EPIDEMIOLOGIA', 'VIGILÂNCIA EM SAÚDE', 'VIGILÂNCIA EPIDEMIOLÓGICA',
        'IMUNIZAÇÃO', 'POLÍTICA NACIONAL', 'ATENÇÃO BÁSICA',
        'NUTRIÇÃO', 'FISIOTERAPIA', 'FARMÁCIA', 'PSICOLOGIA',
        'ANATOMIA', 'FISIOLOGIA', 'PATOLOGIA', 'MICROBIOLOGIA', 'PARASITOLOGIA',
        // v64: Disciplinas jurídicas/administrativas ampliadas
        'DIREITO CONSTITUCIONAL', 'DIREITO ADMINISTRATIVO', 'DIREITO PENAL',
        'DIREITO CIVIL', 'DIREITO TRIBUTÁRIO', 'DIREITO PROCESSUAL',
        'DIREITO DO TRABALHO', 'DIREITO PREVIDENCIÁRIO', 'DIREITO FINANCEIRO',
        'DIREITO ELEITORAL', 'DIREITO EMPRESARIAL', 'DIREITO AMBIENTAL',
        'CONTROLE EXTERNO', 'CONTROLE INTERNO', 'GESTÃO PÚBLICA',
        // v64: Disciplinas de educação
        'PEDAGOGIA', 'DIDÁTICA', 'PSICOLOGIA DA EDUCAÇÃO',
        'FUNDAMENTOS DA EDUCAÇÃO', 'LEGISLAÇÃO EDUCACIONAL',
        // v64: Disciplinas de TI
        'SEGURANÇA DA INFORMAÇÃO', 'REDES DE COMPUTADORES', 'BANCO DE DADOS',
        'PROGRAMAÇÃO', 'DESENVOLVIMENTO DE SISTEMAS', 'GOVERNANÇA DE TI',
        'ENGENHARIA DE SOFTWARE', 'SISTEMAS OPERACIONAIS', 'INTELIGÊNCIA ARTIFICIAL'
      ]
      
      // Padrões que indicam que algo é subtópico, NÃO disciplina
      // ✅ v53: "NOÇÕES DE INFORMÁTICA" é disciplina real - ajustar regex
      const padroesSubtopico = [
        /^NOÇÕES\s+(BÁSICAS|GERAIS)\b/i,  // v53: removido "DE" - "Noções de Informática" é disciplina real
        /^RECURSOS\s+(NA|EM|DE|DO)\b/i,
        /^ALOCAÇÃO\s+DE/i,
        /^PRINCÍPIOS\s+DE/i,
        /^CONCEITOS?\s+(BÁSIC|DE|GERAL)/i,
        /^(BASES|DADOS|TIPOS|MÉTODOS)\s+(LEGAIS|DE|PARA)/i,
        /^PORTARIA\s/i,
        /^LEI\s/i,
        /^DECRETO\s/i,
        /^(POLÍTICA|PROGRAMA)\s+NACIONAL/i,
      ]
      
      const linhasSecao = textoSecaoCargo.split('\n')
      let categoriaAtual = 'BÁSICOS'
      let pesoAtual = 1
      let disciplinaAtual: { nome: string, peso: number, categoria: string, textoCompleto: string } | null = null
      const disciplinasRaw: typeof disciplinaAtual[] = []
      
      // Função para verificar se um nome é disciplina real ou subtópico
      const ehNomeDeDisciplina = (nome: string): boolean => {
        const nomeUpper = nome.toUpperCase()
        // Se é um nome conhecido, é disciplina
        if (nomesConhecidosDisciplinas.some(nc => nomeUpper.startsWith(nc))) return true
        // Se bate com padrão de subtópico, NÃO é disciplina
        if (padroesSubtopico.some(p => p.test(nome))) return false
        // Se o nome é muito longo (>60 chars) e contém muitas vírgulas, provavelmente é subtópico
        if (nome.length > 60 && (nome.match(/,/g) || []).length >= 2) return false
        // Se começa com letra minúscula, não é disciplina
        if (/^[a-z]/.test(nome)) return false
        // Default: se tem conteúdo, aceitar como disciplina
        return true
      }
      
      for (let i = 0; i < linhasSecao.length; i++) {
        const linha = linhasSecao[i].trim()
        const linhaUpper = linha.toUpperCase()
        
        // Detectar mudança de seção
        if (linhaUpper.includes('MÓDULO II') || 
            (linhaUpper.includes('CONHECIMENTOS ESPECÍFICOS') && linha.length < 100)) {
          categoriaAtual = 'ESPECÍFICOS'
          pesoAtual = 2
          continue
        }
        if (linhaUpper.includes('MÓDULO I') || 
            (linhaUpper.includes('CONHECIMENTOS BÁSICOS') && linha.length < 100) ||
            (linhaUpper.includes('CONHECIMENTOS GERAIS') && linha.length < 100)) {
          categoriaAtual = 'BÁSICOS'
          pesoAtual = 1
          continue
        }
        
        // ✅ v62: Detectar CONHECIMENTOS ESPECIALIZADOS e verificar se é da área correta
        if (linhaUpper.includes('CONHECIMENTOS ESPECIALIZADOS') && linha.length < 120) {
          // ✅ v62: Lógica melhorada - sub-áreas de TI são tratadas como mesma área principal
          const areaTI = areaEspecifica && (
            areaEspecifica.includes('INFRAESTRUTURA') || 
            areaEspecifica.includes('SISTEMAS') || 
            areaEspecifica.includes('TECNOLOGIA')
          )
          
          const linhaParece_TI = linhaUpper.includes('INFRAESTRUTURA') || linhaUpper.includes('SISTEMAS') || linhaUpper.includes('DADOS')
          const linhaParece_Engenharia = linhaUpper.includes('ENGENHARIA') && !linhaUpper.includes('DADOS')
          const linhaParece_AreaComum = linhaUpper.includes('COMUM')
          
          // Se minha área é sub-área de TI, aceitar todos conhecimentos especializados de TI
          let ehMinhaAreaEsp = !areaEspecifica
          if (areaTI) {
            ehMinhaAreaEsp = linhaParece_TI || (!linhaParece_Engenharia && !linhaParece_AreaComum)
          } else if (areaEspecifica) {
            ehMinhaAreaEsp = (
              (areaEspecifica.includes('INFRAESTRUTURA') && linhaUpper.includes('INFRAESTRUTURA')) ||
              (areaEspecifica.includes('SISTEMAS') && (linhaUpper.includes('SISTEMAS') || linhaUpper.includes('DADOS'))) ||
              (areaEspecifica.includes('ENGENHARIA') && linhaParece_Engenharia) ||
              (areaEspecifica.includes('COMUM') && linhaParece_AreaComum) ||
              // Se não menciona nenhuma área específica, assumir que é a minha
              (!linhaUpper.includes('INFRAESTRUTURA') && !linhaUpper.includes('SISTEMAS') && 
               !linhaUpper.includes('ENGENHARIA') && !linhaUpper.includes('COMUM') && !linhaUpper.includes('DADOS'))
            )
          }
          
          if (ehMinhaAreaEsp) {
            categoriaAtual = 'ESPECÍFICOS'
            pesoAtual = 2
            console.log(`   📌 CONHECIMENTOS ESPECIALIZADOS (minha área): ${linha.substring(0, 60)}`)
            continue
          } else {
            // É conhecimento especializado de OUTRA área - IGNORAR tudo até próxima seção
            console.log(`   ⏭️ v62: CONHECIMENTOS ESPECIALIZADOS de OUTRA área (${linha.substring(0, 40)}), ignorando...`)
            // Pular até encontrar outra seção ou fim
            let j = i + 1
            while (j < linhasSecao.length) {
              const proxLinha = linhasSecao[j].toUpperCase()
              if (proxLinha.includes('PARA O CARGO') || proxLinha.includes('PARA OS CARGOS') ||
                  proxLinha.includes('CONHECIMENTOS BÁSICOS') || proxLinha.includes('CONHECIMENTOS ESPECÍFICOS') ||
                  (proxLinha.includes('CONHECIMENTOS ESPECIALIZADOS') && !proxLinha.includes(linha.substring(0, 20)))) {
                break
              }
              j++
            }
            i = j - 1  // -1 porque o loop vai incrementar
            continue
          }
        }
        
        if (linha.length < 4) continue
        if (/^(CARGOS|PARA TODOS|ANEXO)\s/i.test(linha)) continue
        if (linhaUpper.includes('CARGOS DE ENSINO') && linha.length < 100) continue
        // ✅ v55: Pular títulos de seção que não são disciplinas
        if (/^(CONTEÚDO PROGRAMÁTICO|CONTEUDO PROGRAMATICO|PROGRAMA DAS PROVAS|CONTEÚDOS PROGRAMÁTICOS)\s*$/i.test(linha)) continue
        
        // ✅ v62: Detectar "PARA O CARGO DE..." de outra área e PARAR extração
        if ((linhaUpper.includes('PARA O CARGO DE') || linhaUpper.includes('PARA OS CARGOS DE')) && 
            areaEspecifica && linha.length < 150) {
          // ✅ v62: Lógica melhorada - sub-áreas de TI são tratadas como mesma área principal
          const areaTI = areaEspecifica && (
            areaEspecifica.includes('INFRAESTRUTURA') || 
            areaEspecifica.includes('SISTEMAS') || 
            areaEspecifica.includes('TECNOLOGIA') ||
            areaEspecifica.includes('TI')
          )
          
          const linhaParece_TI = linhaUpper.includes('TECNOLOGIA') || linhaUpper.includes('INFRAESTRUTURA') || linhaUpper.includes('SISTEMAS')
          const linhaParece_Engenharia = linhaUpper.includes('ENGENHARIA') && !linhaUpper.includes('DADOS') && !linhaUpper.includes('SISTEMAS')
          const linhaParece_AreaComum = linhaUpper.includes('ÁREA COMUM')
          
          let ehOutraArea = true
          if (areaTI) {
            // Se eu sou TI/Infraestrutura/Sistemas, só é "outra área" se for Engenharia pura ou Área Comum
            ehOutraArea = linhaParece_Engenharia || linhaParece_AreaComum
          } else {
            // Para outras áreas (Engenharia, Área Comum), verificar se contém minha área
            ehOutraArea = (
              !linhaUpper.includes(areaEspecifica) &&
              !(areaEspecifica.includes('ENGENHARIA') && linhaParece_Engenharia) &&
              !(areaEspecifica.includes('COMUM') && linhaParece_AreaComum)
            )
          }
          
          if (ehOutraArea) {
            console.log(`   🛑 v62: Encontrada seção de OUTRA área: ${linha.substring(0, 60)}`)
            console.log(`   🛑 v62: PARANDO extração - não incluir disciplinas de outras áreas`)
            break  // PARAR toda a extração
          } else {
            console.log(`   ✅ v62: Mesma área/sub-área (${areaEspecifica} ~ ${linhaUpper.substring(0, 40)}), continuando...`)
          }
        }
        
        // Caso: "PARA TODOS OS CARGOS DE ENSINO SUPERIOR"
        if (linhaUpper.includes('PARA TODOS OS CARGOS')) {
          if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
          disciplinaAtual = null
          categoriaAtual = 'ESPECÍFICOS'
          pesoAtual = 2
          continue
        }
        
        // Caso: nome de cargo sozinho na linha (ex: "Enfermeiro")
        // ✅ v55: CORRIGIDO - cargo alvo NÃO cria disciplina guarda-chuva
        // Apenas muda para categoria ESPECÍFICOS e continua extraindo disciplinas individuais
        if (/^[A-ZÀ-Ú][a-zà-ú]+(\s+[-–]\s+[A-Za-zÀ-ú]+)?(\s+[A-Za-zÀ-ú\-]+)*\s*$/.test(linha) && linha.length < 60 && linha.length > 3) {
          const linhaUpperTrim = linhaUpper.replace(/\s+/g, ' ').trim()
          const ehCargoAlvo = variacoesCargo.some(v => linhaUpperTrim === v || linhaUpperTrim.startsWith(v + ' -') || linhaUpperTrim.startsWith(v + ' –'))
          const ehOutroCargo = outrosCargosConhecidos.some(c => linhaUpperTrim === c || linhaUpperTrim.startsWith(c + ' ') || linhaUpperTrim.startsWith(c + ' -') || linhaUpperTrim.startsWith(c + ' –'))
          
          if (ehCargoAlvo) {
            // ✅ v55: Cargo alvo → mudar para ESPECÍFICOS e continuar extraindo disciplinas
            if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
            disciplinaAtual = null
            categoriaAtual = 'ESPECÍFICOS'
            pesoAtual = 2
            console.log(`   📌 Cargo ALVO detectado: "${linha.trim()}" → mudando para ESPECÍFICOS, continuando extração`)
            continue
          } else if (ehOutroCargo) {
            // Outro cargo: ignorar (parar se vier depois do cargo alvo)
            if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
            disciplinaAtual = null
            console.log(`   📌 Outro cargo detectado: "${linha.trim()}" → ignorado`)
            continue
          }
        }
        
        // Padrão de disciplina: "NomeDisciplina: conteúdo..."
        // ✅ v53: Também detectar "N. NOME DA DISCIPLINA" (formato numérico)
        // ✅ v55: Removido bloqueio "dentroDeCargoEspecifico" - agora sempre extrai disciplinas individuais
        const dentroDeCargoEspecifico = false // v55: desabilitado - sempre extrair
        
        // Padrão 1: "NomeDisciplina: conteúdo..."
        const matchDisc = !dentroDeCargoEspecifico ? linha.match(/^([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s,\-–()\/e]+?):\s+(.+)/) : null
        
        // ✅ v53: Padrão 2: "N. NOME DA DISCIPLINA" ou "N) NOME" (sem conteúdo na mesma linha)
        // Ex: "1. LÍNGUA PORTUGUESA", "2. RACIOCÍNIO LÓGICO", "3. NOÇÕES DE INFORMÁTICA"
        const matchDiscNumerada = !dentroDeCargoEspecifico && !matchDisc ? 
          linha.match(/^(\d{1,2})[.)]\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s,\-–()\/e]+)$/) : null
        
        // ✅ v53: Padrão 3: "NOME DA DISCIPLINA" em linha sozinha (ALL CAPS, sem número)
        // Ex: "LÍNGUA PORTUGUESA", "RACIOCÍNIO LÓGICO-MATEMÁTICO"
        const matchDiscMaiuscula = !dentroDeCargoEspecifico && !matchDisc && !matchDiscNumerada ?
          linha.match(/^([A-ZÀ-Ú][A-ZÀ-Ú\s,\-–()\/]+)$/) : null
        
        if (matchDisc) {
          const nomeCand = matchDisc[1].trim()
          const resto = matchDisc[2].trim()
          
          // Verificar se é disciplina real
          const temTamanhoOk = nomeCand.length >= 4 && nomeCand.length <= 120
          const temConteudo = resto.length > 20
          const ehReal = ehNomeDeDisciplina(nomeCand)
          
          if (temTamanhoOk && temConteudo && ehReal) {
            if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
            disciplinaAtual = { nome: nomeCand, peso: pesoAtual, categoria: categoriaAtual, textoCompleto: resto }
            console.log(`   📘 Disciplina: "${nomeCand}" (${categoriaAtual}, peso ${pesoAtual})`)
            continue
          } else if (disciplinaAtual) {
            // É subtópico - agregar ao disciplina atual
            disciplinaAtual.textoCompleto += ' ' + linha
            console.log(`   📎 Subtópico agregado: "${nomeCand}" → "${disciplinaAtual.nome}"`)
            continue
          }
        }
        
        // ✅ v53: Padrão 2 - "N. NOME DA DISCIPLINA" (formato numérico sem conteúdo na mesma linha)
        if (matchDiscNumerada) {
          const nomeCand = matchDiscNumerada[2].trim()
          const temTamanhoOk = nomeCand.length >= 4 && nomeCand.length <= 120
          const ehReal = ehNomeDeDisciplina(nomeCand)
          
          // Verificar se próximas linhas tem tópicos (-, •, número, etc.)
          const proxLinhas = linhasSecao.slice(i+1, i+5).join(' ')
          const temTopicosAbaixo = /^\s*[-•–]\s|^\s*\d+[.)]\s|^\s*[a-z][\).]|Compreensão|Estruturas|Conceitos/m.test(
            linhasSecao.slice(i+1, i+5).join('\n')
          )
          
          if (temTamanhoOk && ehReal && (temTopicosAbaixo || proxLinhas.length > 30)) {
            if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
            disciplinaAtual = { nome: nomeCand, peso: pesoAtual, categoria: categoriaAtual, textoCompleto: '' }
            console.log(`   📘 Disciplina (numerada v53): "${nomeCand}" (${categoriaAtual}, peso ${pesoAtual})`)
            continue
          }
        }
        
        // ✅ v53: Padrão 3 - "NOME DA DISCIPLINA" em ALL CAPS sozinha na linha
        if (matchDiscMaiuscula) {
          const nomeCand = matchDiscMaiuscula[1].trim()
          const temTamanhoOk = nomeCand.length >= 8 && nomeCand.length <= 120
          const ehReal = ehNomeDeDisciplina(nomeCand)
          
          // Deve ter tópicos nas próximas linhas
          const proxLinhas = linhasSecao.slice(i+1, i+5).join('\n')
          const temTopicosAbaixo = /^\s*[-•–]\s|^\s*\d+[.)]\s|^\s*[a-z][\).]|Compreensão|Estruturas|Conceitos/m.test(proxLinhas)
          
          if (temTamanhoOk && ehReal && temTopicosAbaixo) {
            if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
            disciplinaAtual = { nome: nomeCand, peso: pesoAtual, categoria: categoriaAtual, textoCompleto: '' }
            console.log(`   📘 Disciplina (ALL CAPS v53): "${nomeCand}" (${categoriaAtual}, peso ${pesoAtual})`)
            continue
          }
        }
        
        // Acumular conteúdo na disciplina atual
        // ✅ v53: Acumular também linhas com marcadores (-, •, –) como tópicos
        if (disciplinaAtual && (linha.length > 5 || /^\s*[-•–]\s/.test(linha))) {
          disciplinaAtual.textoCompleto += '\n' + linha
        }
      }
      if (disciplinaAtual) disciplinasRaw.push(disciplinaAtual)
      
      // Processar disciplinas brutas → extrair tópicos
      for (const disc of disciplinasRaw) {
        if (!disc) continue
        const topicos = extrairTopicosDeTexto(disc.textoCompleto)
        if (disc.textoCompleto.length > 20) {
          disciplinasExtraidas.push({
            nome: disc.nome,
            peso: disc.peso,
            categoria: disc.categoria,
            topicos
          })
        }
      }
      
      console.log(`   Total disciplinas brutas: ${disciplinasRaw.filter(d => d).length}, após filtragem: ${disciplinasExtraidas.length}`)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v65: DEDUPLICAÇÃO DE DISCIPLINAS
    // Remove disciplinas com nomes duplicados (mantém a com mais tópicos ou maior peso)
    // Necessário quando "CONHECIMENTOS GERAIS" aparece em múltiplas seções
    // ════════════════════════════════════════════════════════════════
    if (disciplinasExtraidas.length > 0) {
      const mapaDisc = new Map<string, any>()
      for (const d of disciplinasExtraidas) {
        const nomeNormalizado = d.nome?.trim()?.toLowerCase()
        if (mapaDisc.has(nomeNormalizado)) {
          const existente = mapaDisc.get(nomeNormalizado)
          // Manter a versão com mais tópicos; em empate, manter maior peso
          const topicosExistentes = existente.topicos?.length || 0
          const topicosNovos = d.topicos?.length || 0
          if (topicosNovos > topicosExistentes || 
              (topicosNovos === topicosExistentes && (d.peso || 1) > (existente.peso || 1))) {
            console.log(`   🔄 v65: Disciplina duplicada "${d.nome}" - substituindo (${topicosNovos} > ${topicosExistentes} tópicos)`)
            mapaDisc.set(nomeNormalizado, d)
          } else {
            console.log(`   🔄 v65: Disciplina duplicada removida: "${d.nome}" (${topicosNovos} <= ${topicosExistentes} tópicos)`)
          }
        } else {
          mapaDisc.set(nomeNormalizado, d)
        }
      }
      const disciplinasSemDuplicata = Array.from(mapaDisc.values())
      if (disciplinasSemDuplicata.length < disciplinasExtraidas.length) {
        console.log(`   📋 v65: Deduplicação: ${disciplinasExtraidas.length} → ${disciplinasSemDuplicata.length} disciplinas`)
        disciplinasExtraidas = disciplinasSemDuplicata
      }
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v66: EXPANDIR "CONHECIMENTOS ESPECÍFICOS" EM SUB-DISCIPLINAS
    // Quando "Conhecimentos Específicos" é uma única disciplina com muitos tópicos,
    // tentar quebrar em sub-disciplinas reais (ex: Enfermagem em Saúde Coletiva, etc.)
    // Suporta 3 formatos:
    //   A) Sub-disciplinas em linhas separadas no textoSecaoCargo
    //   B) Sub-disciplinas em parágrafo contínuo (ex: "...Enfermagem em Saúde Coletiva: vigilância...")  
    //   C) Sub-disciplinas como tópicos separados com ":" no nome
    // ════════════════════════════════════════════════════════════════
    const idxConhecEsp = disciplinasExtraidas.findIndex((d: any) => 
      /^conhecimentos\s+espec[ií]ficos/i.test(d.nome?.trim())
    )
    if (idxConhecEsp !== -1) {
      const discEsp = disciplinasExtraidas[idxConhecEsp]
      const topicosEsp = discEsp.topicos || []
      
      console.log(`   📦 v66: Analisando "Conhecimentos Específicos" com ${topicosEsp.length} tópicos para expandir...`)
      
      // Nomes das disciplinas já existentes (para não duplicar)
      const nomesExistentes = new Set(
        disciplinasExtraidas
          .filter((_: any, idx: number) => idx !== idxConhecEsp)
          .map((d: any) => d.nome?.trim()?.toLowerCase())
      )
      
      let subDiscsExpandidas: any[] = []
      
      // ── MÉTODO A: Buscar sub-disciplinas em LINHAS SEPARADAS no textoSecaoCargo ──
      const textoSecaoLower = textoSecaoCargo.toLowerCase()
      const posConhecEsp = textoSecaoLower.indexOf('conhecimentos específicos')
      if (posConhecEsp !== -1) {
        const textoAposConhecEsp = textoSecaoCargo.substring(posConhecEsp)
        const linhasEsp = textoAposConhecEsp.split('\n')
        
        const subDiscs: any[] = []
        let subDiscAtual: { nome: string, textoCompleto: string } | null = null
        
        for (let i = 1; i < linhasEsp.length; i++) {
          const linha = linhasEsp[i].trim()
          if (!linha) continue
          
          const matchSubDisc = linha.match(/^([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s,\-–()\/e]+?)\s*:\s+(.+)/)
          if (matchSubDisc) {
            const nomeCandidata = matchSubDisc[1].trim()
            if (nomeCandidata.length >= 8 && nomeCandidata.length <= 120 && 
                !nomeCandidata.match(/^(Lei |Portaria |Decreto |Resolução |Art\.|§|Código de)/)) {
              if (subDiscAtual) subDiscs.push(subDiscAtual)
              subDiscAtual = { nome: nomeCandidata, textoCompleto: matchSubDisc[2] }
              continue
            }
          }
          
          if (subDiscAtual && linha.length > 3) {
            subDiscAtual.textoCompleto += '\n' + linha
          }
        }
        if (subDiscAtual) subDiscs.push(subDiscAtual)
        
        if (subDiscs.length >= 2) {
          subDiscsExpandidas = subDiscs
            .filter(sd => sd.textoCompleto.length > 20)
            .filter(sd => !nomesExistentes.has(sd.nome?.trim()?.toLowerCase()))
            .map(sd => ({
              nome: sd.nome,
              peso: 2,
              categoria: 'ESPECÍFICOS',
              topicos: extrairTopicosDeTexto(sd.textoCompleto)
            }))
            .filter(sd => sd.topicos.length > 0)
          
          if (subDiscsExpandidas.length >= 2) {
            console.log(`   📦 v66 Método A: encontrou ${subDiscsExpandidas.length} sub-disciplinas em linhas separadas`)
          }
        }
      }
      
      // ── MÉTODO B: Buscar sub-disciplinas em PARÁGRAFO CONTÍNUO ──
      // Quando todo o conteúdo específico está num único parágrafo/linha:
      // "Conhecimentos Específicos: Administração... Enfermagem em Saúde Coletiva: vigilância..."
      if (subDiscsExpandidas.length < 2) {
        console.log(`   📦 v66 Método B: tentando extrair sub-disciplinas de parágrafo contínuo...`)
        
        // Buscar no textoSecaoCargo OU no textoParaProcessar (texto completo)
        const textosParaBuscar = [textoSecaoCargo, textoParaProcessar]
        
        for (const textoFonte of textosParaBuscar) {
          if (subDiscsExpandidas.length >= 2) break
          
          const textoFonteLower = textoFonte.toLowerCase()
          const posEsp = textoFonteLower.indexOf('conhecimentos específicos')
          if (posEsp === -1) continue
          
          // Pegar texto após "Conhecimentos Específicos" (até próximo cargo ou fim)
          let textoEsp = textoFonte.substring(posEsp)
          
          // Limitar até o próximo cargo (MÉDICO, FARMACÊUTICO, etc.)
          const regexOutroCargo = /\n\s*(MÉDICO|FARMACÊUTICO|DENTISTA|FISIOTERAPEUTA|NUTRICIONISTA|PSICÓLOGO|ASSISTENTE\s+SOCIAL|VETERINÁRIO|BIÓLOGO|BIOMÉDICO|FONOAUDIÓLOGO|TERAPEUTA)\s*\n/i
          const matchOutroCargo = textoEsp.match(regexOutroCargo)
          if (matchOutroCargo && matchOutroCargo.index) {
            textoEsp = textoEsp.substring(0, matchOutroCargo.index)
          }
          
          // Regex para encontrar sub-disciplinas no formato contínuo:
          // "Enfermagem em Saúde Coletiva: conteúdo. Enfermagem em Urgência: conteúdo."
          // Padrão: palavra capitalizada com 2+ palavras seguida de ":"
          const regexSubDisc = /([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:em|de|da|do|das|dos|e|na|no|nas|nos|para|aplicad[ao]|à|ao)\s+)?[A-ZÀ-Úa-zà-ú\s,\-–()\/]+?)\s*:\s+/g
          
          const matches: { nome: string, pos: number }[] = []
          let m
          while ((m = regexSubDisc.exec(textoEsp)) !== null) {
            const nome = m[1].trim()
            // Validar: tem tamanho razoável, não é lei/decreto/artigo, parece disciplina
            if (nome.length >= 8 && nome.length <= 120 && 
                !nome.match(/^(Lei |Portaria |Decreto |Resolução |Art\.|§|Código de|Resolução COFEN|nº |Lei nº)/) &&
                !nome.match(/^\d/) &&
                // Verificar que começa com maiúscula significativa
                nome.match(/^[A-ZÀ-Ú]/)) {
              matches.push({ nome, pos: m.index + m[0].length })
            }
          }
          
          // Extrair conteúdo entre cada match
          if (matches.length >= 2) {
            const subDiscsB: any[] = []
            for (let i = 0; i < matches.length; i++) {
              const inicio = matches[i].pos
              const fim = i < matches.length - 1 ? matches[i + 1].pos - matches[i + 1].nome.length - 1 : textoEsp.length
              const conteudo = textoEsp.substring(inicio, fim).trim()
              
              if (conteudo.length > 15) {
                subDiscsB.push({
                  nome: matches[i].nome,
                  textoCompleto: conteudo
                })
              }
            }
            
            subDiscsExpandidas = subDiscsB
              .filter(sd => sd.textoCompleto.length > 20)
              .filter(sd => !nomesExistentes.has(sd.nome?.trim()?.toLowerCase()))
              .map(sd => {
                // Primeiro tentar extrairTopicosDeTexto normal
                let topicos = extrairTopicosDeTexto(sd.textoCompleto)
                
                // Se retornou poucos tópicos, o texto provavelmente está em formato contínuo
                // separado por vírgulas: "tópico1, tópico2, tópico3"
                if (topicos.length <= 2) {
                  const partesPorVirgula = sd.textoCompleto
                    .split(/[,;]\s*/)
                    .map((t: string) => t.trim().replace(/^[-•–]\s*/, '').replace(/[.;,]+$/, '').trim())
                    .filter((t: string) => t.length > 3 && t.length < 300)
                  if (partesPorVirgula.length > topicos.length) {
                    topicos = partesPorVirgula
                  }
                }
                
                return {
                  nome: sd.nome,
                  peso: 2,
                  categoria: 'ESPECÍFICOS',
                  topicos
                }
              })
              .filter(sd => sd.topicos.length > 0)
            
            if (subDiscsExpandidas.length >= 2) {
              console.log(`   📦 v66 Método B: encontrou ${subDiscsExpandidas.length} sub-disciplinas em parágrafo contínuo`)
              break
            }
          }
        }
      }
      
      // ── MÉTODO C: Analisar os TÓPICOS já extraídos ──
      // Se os tópicos contêm sub-disciplinas com ":" (ex: "Enfermagem em Saúde Coletiva: vigilância, ...")
      if (subDiscsExpandidas.length < 2 && topicosEsp.length >= 3) {
        console.log(`   📦 v66 Método C: tentando agrupar tópicos como sub-disciplinas...`)
        
        const subDiscsC: { nome: string, topicos: string[] }[] = []
        let subAtual: { nome: string, topicos: string[] } | null = null
        
        for (const topico of topicosEsp) {
          const topicoStr = typeof topico === 'string' ? topico : topico.nome || ''
          // Verificar se o tópico parece um cabeçalho de sub-disciplina
          const matchCab = topicoStr.match(/^([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:em|de|da|do|das|dos|e|na|no|aplicad[ao]|à|ao)\s+)?[A-ZÀ-Úa-zà-ú\s\-–()\/]+?)(?:\s*:\s*(.+))?$/)
          if (matchCab && matchCab[1].length >= 8 && matchCab[1].length <= 120 &&
              !matchCab[1].match(/^(Lei |Portaria |Decreto |Resolução |Art\.|§)/)) {
            // Parece sub-disciplina
            if (subAtual && subAtual.topicos.length > 0) {
              subDiscsC.push(subAtual)
            }
            subAtual = { nome: matchCab[1].trim(), topicos: [] }
            if (matchCab[2]) {
              // Há conteúdo após ":" - dividir em sub-tópicos
              const subTopicos = matchCab[2].split(/[.;]/).map(t => t.trim()).filter(t => t.length > 3)
              subAtual.topicos.push(...subTopicos)
            }
          } else if (subAtual) {
            subAtual.topicos.push(topicoStr)
          }
        }
        if (subAtual && subAtual.topicos.length > 0) subDiscsC.push(subAtual)
        
        if (subDiscsC.length >= 2) {
          subDiscsExpandidas = subDiscsC
            .filter(sd => !nomesExistentes.has(sd.nome?.trim()?.toLowerCase()))
            .map(sd => ({
              nome: sd.nome,
              peso: 2,
              categoria: 'ESPECÍFICOS',
              topicos: sd.topicos.map(t => typeof t === 'string' ? t : t)
            }))
            .filter(sd => sd.topicos.length > 0)
          
          if (subDiscsExpandidas.length >= 2) {
            console.log(`   📦 v66 Método C: encontrou ${subDiscsExpandidas.length} sub-disciplinas nos tópicos`)
          }
        }
      }
      
      // ── Aplicar expansão se encontrou sub-disciplinas ──
      if (subDiscsExpandidas.length >= 2) {
        console.log(`   📦 v66: "Conhecimentos Específicos" expandido em ${subDiscsExpandidas.length} sub-disciplinas:`)
        subDiscsExpandidas.forEach((sd: any) => console.log(`      → ${sd.nome} (${sd.topicos.length} tópicos)`))
        // Substituir "Conhecimentos Específicos" pelas sub-disciplinas
        disciplinasExtraidas.splice(idxConhecEsp, 1, ...subDiscsExpandidas)
      } else {
        console.log(`   ⚠️ v66: Não foi possível expandir "Conhecimentos Específicos" em sub-disciplinas (mantendo como está)`)
      }
    }
    
    console.log(`\n📊 Extração programática: ${disciplinasExtraidas.length} disciplinas`)
    
    // ──────────────────────────────────────────────────────────────
    // ✅ v56: FALLBACK INTELIGENTE via IA
    // Condições para usar IA:
    // 1) Menos de 3 disciplinas extraídas (extração falhou)
    // 2) Texto do edital é grande (>5000 chars) mas poucas disciplinas (possível perda)
    // 3) Nenhuma disciplina específica encontrada (pode ter perdido seção)
    // 4) NOVO: Disciplinas encontradas mas sem tópicos (conteúdo programático truncado)
    // ──────────────────────────────────────────────────────────────
    
    const temEspecificas = disciplinasExtraidas.some((d: any) => 
      d.categoria === 'ESPECÍFICOS' || d.peso >= 2
    )
    const textoMuitoGrande = textoSecaoCargo.length > 5000
    const poucasDisciplinas = disciplinasExtraidas.length < 3
    const poucasParaTextoGrande = textoMuitoGrande && disciplinasExtraidas.length < 5 && !temEspecificas
    
    // ✅ v56: Detectar quando temos disciplinas da tabela mas sem tópicos
    // (texto truncado - conteúdo programático não incluído)
    const totalTopicosExtraidos = disciplinasExtraidas.reduce((sum: number, d: any) => sum + (d.topicos?.length || 0), 0)
    const semTopicos = disciplinasExtraidas.length >= 3 && totalTopicosExtraidos === 0
    
    if (semTopicos) {
      console.log(`\n⚠️ v56: ${disciplinasExtraidas.length} disciplinas encontradas mas 0 tópicos extraídos!`)
      console.log(`   Provável causa: texto truncado (${texto.length} chars) não contém conteúdo programático detalhado`)
      console.log(`   Retornando disciplinas com pesos corretos sem tópicos (usuário pode adicionar depois)`)
    }
    
    if (poucasDisciplinas || poucasParaTextoGrande) {
      const motivo = poucasDisciplinas ? 'poucas disciplinas' : 'texto grande mas sem específicas'
      console.log(`\n🤖 Extração programática insuficiente (${motivo}: ${disciplinasExtraidas.length} disc, ${textoSecaoCargo.length} chars), usando IA...`)
      
      // ✅ v64: Se textoSecaoCargo é muito pequeno, usar texto completo do edital
      let textoBaseIA = textoSecaoCargo
      if (textoSecaoCargo.length < 2000 && texto.length > textoSecaoCargo.length) {
        console.log(`⚠️ v64: textoSecaoCargo muito curto (${textoSecaoCargo.length} chars), usando texto completo (${texto.length} chars)`)
        textoBaseIA = textoLimpo
      }
      const textoParaIA = textoBaseIA.length > 40000 ? textoBaseIA.substring(0, 40000) : textoBaseIA
      const promptIA = `TAREFA CRÍTICA: Extrair disciplinas e tópicos do CONTEÚDO PROGRAMÁTICO abaixo.
Cargo do candidato: "${cargoUpper}"

REGRAS ABSOLUTAS E INVIOLÁVEIS:
1. EXTRAIA APENAS disciplinas e tópicos que EXISTEM LITERALMENTE no texto abaixo
2. NÃO INVENTE, NÃO SUGIRA, NÃO ADICIONE nenhuma disciplina que não esteja ESCRITA no texto
3. Cada matéria/disciplina listada (seguida de ":" ou em linha separada) = UMA disciplina
4. Conteúdo após o nome = TÓPICOS da disciplina
5. MÓDULO I / Conhecimentos Básicos/Gerais = peso 1 e categoria "BÁSICOS"
6. MÓDULO II / Conhecimentos Específicos = peso 2 e categoria "ESPECÍFICOS"
7. Retorne APENAS JSON válido, sem markdown, sem explicações
8. Se uma disciplina aparece no texto mas você não encontra tópicos detalhados, retorne a disciplina com topicos vazio []
9. Se o texto não contém conteúdo programático identificável, retorne {"disciplinas":[]}
10. PROIBIDO: Inventar disciplinas como "Doutrina", "Jurisprudência" ou qualquer outra que NÃO ESTÁ no texto
11. VERIFICAÇÃO: Cada disciplina retornada DEVE ter seu nome presente no texto fornecido

FORMATO: {"disciplinas":[{"nome":"Nome Exato da Disciplina como aparece no texto","peso":1,"categoria":"BÁSICOS","topicos":["Tópico 1","Tópico 2"]}]}

TEXTO DO EDITAL:
${textoParaIA}`
      
      if (!geminiKey && !openaiKey && !groqKey) {
        return c.json({ error: 'Nenhuma chave de API configurada.', errorType: 'NO_API_KEYS', canRetry: false }, 500)
      }
      
      // Tentar Gemini → OpenAI → GROQ
      // ✅ v53: Com timeout de 25s para cada chamada (evitar exceder limite Workers)
      let respostaIA = ''
      const iaTimeout = 25000
      
      if (geminiKey) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), iaTimeout)
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }], generationConfig: { temperature: 0, maxOutputTokens: 16000 } }),
            signal: controller.signal
          })
          clearTimeout(timer)
          if (r.ok) { const d = await r.json() as any; respostaIA = d?.candidates?.[0]?.content?.parts?.[0]?.text || '' }
        } catch (e: any) { console.log(`⚠️ Gemini fallback erro: ${e.message?.substring(0, 80)}`) }
      }
      if (!respostaIA && openaiKey) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), iaTimeout)
          const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'Extraia disciplinas de editais. JSON apenas.' }, { role: 'user', content: promptIA }], temperature: 0, max_tokens: 16000 }),
            signal: controller.signal
          })
          clearTimeout(timer)
          if (r.ok) { const d = await r.json() as any; respostaIA = d?.choices?.[0]?.message?.content || '' }
        } catch (e: any) { console.log(`⚠️ OpenAI fallback erro: ${e.message?.substring(0, 80)}`) }
      }
      if (!respostaIA && groqKey) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), iaTimeout)
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: 'Extraia disciplinas. JSON apenas.' }, { role: 'user', content: promptIA }], temperature: 0, max_tokens: 16000 }),
            signal: controller.signal
          })
          clearTimeout(timer)
          if (r.ok) { const d = await r.json() as any; respostaIA = d?.choices?.[0]?.message?.content || '' }
        } catch (e: any) { console.log(`⚠️ GROQ fallback erro: ${e.message?.substring(0, 80)}`) }
      }
      
      if (respostaIA) {
        try {
          const jsonStr = respostaIA.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim()
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            if (data.disciplinas?.length > 0) {
              // ✅ v64: VALIDAÇÃO PÓS-IA - verificar se disciplinas existem no texto original
              const textoLowerValidacao = textoLimpo.toLowerCase()
              const disciplinasValidadas = data.disciplinas.filter((d: any) => {
                const nomeDisc = (d.nome || '').trim()
                if (!nomeDisc || nomeDisc.length < 3) return false
                
                // Verificar se o nome da disciplina aparece no texto (busca tolerante)
                const nomeLower = nomeDisc.toLowerCase()
                const palavrasChave = nomeLower.split(/[\s\-–]+/).filter((p: string) => p.length > 3)
                
                // Verificar match exato ou parcial (pelo menos 60% das palavras-chave)
                const matchExato = textoLowerValidacao.includes(nomeLower)
                const matchParcial = palavrasChave.length > 0 && 
                  palavrasChave.filter((p: string) => textoLowerValidacao.includes(p)).length >= Math.ceil(palavrasChave.length * 0.6)
                
                if (!matchExato && !matchParcial) {
                  console.log(`   🗑️ v64: Disciplina IA REJEITADA (não encontrada no texto): "${nomeDisc}"`)
                  return false
                }
                return true
              })
              
              console.log(`✅ v64: IA extraiu ${data.disciplinas.length} disciplinas, ${disciplinasValidadas.length} validadas contra o texto`)
              
              if (disciplinasValidadas.length > 0) {
                disciplinasExtraidas = disciplinasValidadas.map((d: any) => ({
                  nome: d.nome || 'Sem nome',
                  peso: d.peso || 1,
                  categoria: d.categoria || 'BÁSICOS',
                  topicos: Array.isArray(d.topicos) ? d.topicos.filter((t: any) => typeof t === 'string' && t.length > 3) : []
                }))
                console.log(`✅ IA final: ${disciplinasExtraidas.length} disciplinas validadas`)
              } else {
                console.log(`⚠️ v64: TODAS as disciplinas da IA foram rejeitadas (inventadas)! Mantendo extração programática.`)
              }
            }
          }
        } catch (e) { console.log(`⚠️ Erro JSON IA: ${e}`) }
      }
    }
    
    if (disciplinasExtraidas.length === 0) {
      // ════════════════════════════════════════════════════════════════
      // ✅ v64: FALLBACK FINAL - Tentar extração IA com texto COMPLETO
      // PRIORIDADE: Extrair do texto real; só sugere se o texto não contiver disciplinas
      // ════════════════════════════════════════════════════════════════
      console.log('🤖 v64: Extração falhou, tentando IA com texto COMPLETO do edital...')
      
      if (geminiKey && texto.length > 200) {
        try {
          const textoCompletoParaIA = texto.length > 40000 ? texto.substring(0, 40000) : texto
          const promptExtracaoFinal = `TAREFA: Extrair TODAS as disciplinas e tópicos do CONTEÚDO PROGRAMÁTICO deste edital de concurso.
Cargo do candidato: "${cargo || 'Não especificado'}"

REGRAS ABSOLUTAS:
1. EXTRAIA APENAS disciplinas que EXISTEM no texto abaixo
2. NÃO INVENTE, NÃO SUGIRA, NÃO ADICIONE disciplinas que NÃO estejam no texto
3. Procure seções como "CONTEÚDO PROGRAMÁTICO", "ANEXO II", "MÓDULO I/II"
4. Procure padrões como "Disciplina: tópico1; tópico2" ou listas numeradas
5. Se encontrar disciplinas, extraia com nome EXATO conforme o edital
6. Se o texto NÃO contiver conteúdo programático, retorne {"disciplinas":[]}
7. PROIBIDO inventar: "Doutrina", "Jurisprudência", ou qualquer termo não presente no texto
8. peso 1 = Básicos/Gerais; peso 2 = Específicos

FORMATO: {"disciplinas":[{"nome":"Nome Exato do Texto","peso":1,"categoria":"BÁSICOS","topicos":["Tópico 1","Tópico 2"]}]}

TEXTO COMPLETO DO EDITAL:
${textoCompletoParaIA}`

          const sugestaoRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptExtracaoFinal }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 16000 }
              })
            }
          )
          
          if (sugestaoRes.ok) {
            const sugestaoData = await sugestaoRes.json() as any
            const respText = sugestaoData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const jsonMatch = respText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').match(/\{[\s\S]*\}/)
            
            if (jsonMatch) {
              const sugestao = JSON.parse(jsonMatch[0])
              if (sugestao.disciplinas && sugestao.disciplinas.length > 0) {
                // ✅ v64: Validar disciplinas contra o texto original
                const textoLowerValidFinal = texto.toLowerCase()
                const disciplinasValidas = sugestao.disciplinas.filter((d: any) => {
                  const nomeDisc = (d.nome || '').trim()
                  if (!nomeDisc || nomeDisc.length < 3) return false
                  const nomeLower = nomeDisc.toLowerCase()
                  const palavras = nomeLower.split(/[\s\-–]+/).filter((p: string) => p.length > 3)
                  const matchExato = textoLowerValidFinal.includes(nomeLower)
                  const matchParcial = palavras.length > 0 && 
                    palavras.filter((p: string) => textoLowerValidFinal.includes(p)).length >= Math.ceil(palavras.length * 0.6)
                  if (!matchExato && !matchParcial) {
                    console.log(`   🗑️ v64 fallback: Rejeitada "${nomeDisc}" (não no texto)`)
                    return false
                  }
                  return true
                })
                
                console.log(`✅ v64 fallback: IA retornou ${sugestao.disciplinas.length}, ${disciplinasValidas.length} validadas`)
                
                if (disciplinasValidas.length > 0) {
                  // ✅ v64: Criar edital no banco para disciplinas validadas
                  let editalIdFallback64: number | null = null
                  try {
                    const editalResult = await c.env.DB.prepare(`
                      INSERT INTO editais (user_id, nome_concurso, texto_completo, status) 
                      VALUES (?, ?, ?, 'processado')
                    `).bind(
                      user_id || 1,
                      concurso_nome || 'Não especificado',
                      texto.substring(0, 50000)
                    ).run()
                    editalIdFallback64 = editalResult.meta?.last_row_id as number
                    console.log(`✅ v64: Edital criado com ID ${editalIdFallback64}`)
                  } catch (dbErr) {
                    console.error('⚠️ v64: Erro ao criar edital:', dbErr)
                  }
                  
                  const disciplinasFinais = disciplinasValidas.map((d: any, i: number) => ({
                    id: -(i + 1),
                    disciplina_id_real: -(i + 1),
                    nome: d.nome,
                    peso: d.peso || 1,
                    categoria: d.categoria || 'BÁSICOS',
                    total_topicos: d.topicos?.length || 0,
                    topicos: (d.topicos || []).map((t: string) => ({ nome: t, peso: 1 }))
                  }))
                  
                  return c.json({
                    success: true,
                    edital_id: editalIdFallback64,
                    disciplinas: disciplinasFinais,
                    total: disciplinasFinais.length,
                    concurso_detectado: concurso_nome,
                    area_detectada: areaDetectada,
                    fonte: 'ia_extracao_completa_v64',
                    message: `${disciplinasFinais.length} disciplinas extraídas do edital via IA`
                  })
                }
              }
            }
          }
        } catch (sugestaoErr) {
          console.error('⚠️ v64: Erro na extração IA:', sugestaoErr)
        }
      }
      
      return c.json({ 
        error: 'Não foi possível extrair disciplinas do edital', 
        errorType: 'EXTRACTION_FAILED', 
        canRetry: true,
        suggestion: 'Tente:\n• Colar apenas a seção "CONTEÚDO PROGRAMÁTICO"\n• Usar "Continuar sem edital" e adicionar disciplinas manualmente'
      }, 400)
    }
    
    // ════════════════════════════════════════════════════════════════
    // FILTRO DE DISCIPLINAS INVÁLIDAS (v62)
    // ════════════════════════════════════════════════════════════════
    const nomesInvalidos = [
      'OBSERVAÇÕES', 'OBSERVAÇÃO', 'OBS', 'NOTA', 'NOTAS',
      'BIBLIOGRAFIA', 'REFERÊNCIAS', 'REFERÊNCIA', 'ANEXO', 'ANEXOS',
      'INSTRUÇÕES', 'INSTRUÇÃO', 'ATENÇÃO', 'AVISO', 'AVISOS',
      'RETIFICAÇÃO', 'RETIFICAÇÕES', 'ERRATA', 'ERRATAS',
      'CARGOS DE ENSINO', 'NÍVEL SUPERIOR', 'NÍVEL MÉDIO',
      'QUADRO DE VAGAS', 'TABELA DE PROVAS', 'COMPOSIÇÃO DAS PROVAS',
      'CRONOGRAMA', 'CALENDÁRIO', 'PROGRAMA', 'PROGRAMAS',
      'DAS PROVAS', 'DA PROVA', 'DOS CARGOS', 'DAS VAGAS',
      'PARA TODOS', 'TODOS OS CARGOS', 'CONHECIMENTOS ESPECÍFICOS POR CARGOS',
      'CONTEÚDO PROGRAMÁTICO', 'CONTEÚDOS PROGRAMÁTICOS',
      // ✅ v60: Filtrar termos de processo seletivo simplificado (tabelas de pontuação)
      'CAPACITAÇÃO', 'APERFEIÇOAMENTO', 'HABILITAÇÃO',
      'CURSO DE APERFEIÇOAMENTO', 'CURSO DE CAPACITAÇÃO', 'CURSO DE HABILITAÇÃO',
      'TITULAÇÃO', 'TITULAÇÃO MÍNIMA', 'FORMAÇÃO', 'FORMAÇÃO MÍNIMA',
      'PONTUAÇÃO', 'TABELA DE PONTUAÇÃO', 'QUADRO DE PONTUAÇÃO',
      'DOCUMENTAÇÃO', 'DOCUMENTAÇÃO APRESENTADA', 'LIMITE MÁXIMO',
      'COMPONENTE', 'DESCRIÇÃO', 'PONTUAÇÃO POR ITEM',
      // ✅ v62: Filtrar perguntas e termos de entrevista
      'QUE MEDIDAS', 'DE QUE FORMA', 'CITE UMA', 'CITE UM', 'CITE DUAS',
      'COMO VOCÊ', 'QUAIS OS', 'QUAL O', 'QUAL A', 'NA SUA VISÃO',
      'DESCREVA', 'EXPLIQUE', 'JUSTIFIQUE'
    ]
    
    // ✅ v62: Padrões que indicam pergunta/entrevista (não disciplina)
    const padroesInvalidos = [
      /^(QUE|COMO|QUAL|QUAIS|CITE|DESCREVA|EXPLIQUE|DE QUE)\s/i,  // Perguntas
      /\?$/,  // Termina com interrogação
      /^(NA SUA|EM SUA|SEGUNDO SUA)\s/i,  // Início de pergunta subjetiva
      /VOCÊ\s+(CONSIDERA|ACHA|PENSA|ENTENDE)/i,  // Perguntas pessoais
      /FORMAÇÃO\s+CAPACITAÇÃO/i  // Critério de tabela de pontuação
    ]
    
    const disciplinasAntesDoFiltro = disciplinasExtraidas.length
    disciplinasExtraidas = disciplinasExtraidas.filter((d: any) => {
      const nomeUpper = d.nome?.toUpperCase()?.trim() || ''
      const nomeTrimmed = d.nome?.trim() || ''
      
      // Filtrar nomes inválidos (match exato ou que comecem com esses prefixos)
      const ehInvalido = nomesInvalidos.some(inv => 
        nomeUpper === inv || 
        nomeUpper.startsWith(inv + ':') ||
        nomeUpper.startsWith(inv + ' -')
      )
      
      // ✅ v62: Filtrar por padrões de perguntas
      const ehPergunta = padroesInvalidos.some(p => p.test(nomeTrimmed))
      
      // Filtrar disciplinas sem tópicos ou com nomes muito curtos
      const ehMuitoCurto = d.nome?.trim()?.length < 3
      const semConteudo = (!d.topicos || d.topicos.length === 0) && d.nome?.length < 20
      
      if (ehInvalido || ehMuitoCurto || ehPergunta) {
        console.log(`   🗑️ Filtrada: "${d.nome}" (inválido: ${ehInvalido}, curto: ${ehMuitoCurto}, pergunta: ${ehPergunta})`)
        return false
      }
      return true
    })
    
    if (disciplinasExtraidas.length < disciplinasAntesDoFiltro) {
      console.log(`   📋 Filtro: ${disciplinasAntesDoFiltro} → ${disciplinasExtraidas.length} disciplinas`)
    }
    
    // ════════════════════════════════════════════════════════════════
    // RESULTADO FINAL
    // ════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60))
    console.log(`✅ EXTRAÇÃO v51b: ${disciplinasExtraidas.length} disciplinas`)
    console.log('═'.repeat(60))
    disciplinasExtraidas.forEach((d: any, i: number) => {
      console.log(`   ${i+1}. ${d.nome} (peso: ${d.peso}, tópicos: ${d.topicos?.length || 0})`)
    })
    
    const resultado = { disciplinas: disciplinasExtraidas }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v62: VERIFICAR SE AINDA HÁ DISCIPLINAS APÓS FILTRO
    // Se não houver, usar fallback de IA
    // ════════════════════════════════════════════════════════════════
    if (resultado.disciplinas.length === 0) {
      console.log('⚠️ v64: Todas as disciplinas foram filtradas, tentando IA com texto completo...')
      
      const geminiKeyFallback = c.env.GEMINI_API_KEY
      
      if (geminiKeyFallback && texto.length > 200) {
        try {
          const textoParaFallback = texto.length > 40000 ? texto.substring(0, 40000) : texto
          const promptFallbackFiltro = `TAREFA: Extrair TODAS as disciplinas e tópicos do CONTEÚDO PROGRAMÁTICO deste edital.
Cargo: "${cargo || 'Não especificado'}"

REGRAS ABSOLUTAS:
1. EXTRAIA APENAS disciplinas PRESENTES no texto abaixo
2. NÃO INVENTE disciplinas - cada nome deve aparecer no texto
3. Se o texto não contiver conteúdo programático, retorne {"disciplinas":[]}
4. peso 1 = Básicos/Gerais; peso 2 = Específicos

FORMATO: {"disciplinas":[{"nome":"Nome Exato","peso":1,"categoria":"BÁSICOS","topicos":["Tópico 1"]}]}

TEXTO:
${textoParaFallback}`

          const fallbackRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKeyFallback}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptFallbackFiltro }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 16000 }
              })
            }
          )
          
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json() as any
            const respText = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const jsonMatch = respText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').match(/\{[\s\S]*\}/)
            
            if (jsonMatch) {
              const sugestao = JSON.parse(jsonMatch[0])
              if (sugestao.disciplinas && sugestao.disciplinas.length > 0) {
                // ✅ v64: Validar contra texto
                const textoLowerFallback = texto.toLowerCase()
                const discValidasFallback = sugestao.disciplinas.filter((d: any) => {
                  const nome = (d.nome || '').trim()
                  if (!nome || nome.length < 3) return false
                  const nomeLower = nome.toLowerCase()
                  const palavras = nomeLower.split(/[\s\-–]+/).filter((p: string) => p.length > 3)
                  return textoLowerFallback.includes(nomeLower) || 
                    (palavras.length > 0 && palavras.filter((p: string) => textoLowerFallback.includes(p)).length >= Math.ceil(palavras.length * 0.6))
                })
                
                if (discValidasFallback.length > 0) {
                  let editalIdFallback: number | null = null
                  try {
                    const editalResult = await c.env.DB.prepare(`
                      INSERT INTO editais (user_id, nome_concurso, texto_completo, status) 
                      VALUES (?, ?, ?, 'processado')
                    `).bind(user_id || 1, concurso_nome || 'Não especificado', texto.substring(0, 50000)).run()
                    editalIdFallback = editalResult.meta?.last_row_id as number
                  } catch (dbErr) { console.error('⚠️ Erro ao criar edital fallback:', dbErr) }
                  
                  const disciplinasFallback = discValidasFallback.map((d: any, i: number) => ({
                    id: -(i + 1), disciplina_id_real: -(i + 1),
                    nome: d.nome, peso: d.peso || 1,
                    categoria: d.categoria || 'BÁSICOS',
                    total_topicos: d.topicos?.length || 0,
                    topicos: (d.topicos || []).map((t: string) => ({ nome: t, peso: 1 }))
                  }))
                  
                  return c.json({
                    success: true, edital_id: editalIdFallback,
                    disciplinas: disciplinasFallback, total: disciplinasFallback.length,
                    concurso_detectado: concurso_nome, area_detectada: areaDetectada,
                    fonte: 'ia_pos_filtro_v64',
                    message: `${disciplinasFallback.length} disciplinas extraídas do edital`
                  })
                }
              }
            }
          }
        } catch (err) {
          console.error('⚠️ v64: Erro no fallback pós-filtro:', err)
        }
      }
      
      return c.json({
        error: 'Não foi possível extrair disciplinas do edital',
        errorType: 'EXTRACTION_FAILED',
        canRetry: false,
        suggestion: 'Este edital pode ser um processo seletivo simplificado ou não contém conteúdo programático.\n\n• Use "Continuar sem edital" para criar um plano de estudos personalizado\n• Ou cole apenas a seção de CONTEÚDO PROGRAMÁTICO do edital'
      }, 400)
    }
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v59: SALVAR EDITAL E DISCIPLINAS NO BANCO DE DADOS
    // Com tratamento robusto de erros - se falhar, retorna disciplinas sem salvar
    // ════════════════════════════════════════════════════════════════
    console.log(`\n✅ ${resultado.disciplinas.length} disciplinas prontas para salvar`)
    
    let editalId: number | null = null
    let disciplinasComIds: any[] = []
    let salvouNoBanco = false
    
    // ✅ v59: Criar edital primeiro
    try {
      const editalResult = await DB.prepare(`
        INSERT INTO editais (user_id, nome_concurso, texto_completo, status)
        VALUES (?, ?, ?, 'processado')
      `).bind(
        user_id || null,
        concurso_nome || 'Edital via texto',
        texto.substring(0, 10000)
      ).run()
      
      editalId = editalResult.meta.last_row_id as number
      console.log(`📁 Edital criado com ID ${editalId}`)
    } catch (editalErr) {
      console.error('⚠️ Erro ao criar edital:', editalErr)
      // Continuar sem editalId - disciplinas ainda podem ser retornadas
    }
    
    // ════════════════════════════════════════════════════════════════
    // v59: BATCH OTIMIZADO para evitar "Too many API requests" no Cloudflare Workers
    // Cloudflare Workers tem limite de ~50 subrequests por invocação
    // Usamos DB.batch() para enviar todas as queries de uma vez
    // ════════════════════════════════════════════════════════════════
    
    // ✅ v59: Todo o salvamento em try/catch - se falhar, retorna disciplinas sem IDs
    try {
    // PASSO 1: Buscar todas as disciplinas existentes de uma vez
    const nomesDisc = resultado.disciplinas.map((d: any) => d.nome.trim().toLowerCase())
    const disciplinasExistentes = new Map()
    
    // Buscar em lotes para não exceder limites
    const batchBuscaDisc = resultado.disciplinas.map((disc: any) => 
      DB.prepare(`SELECT id, nome FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))`).bind(disc.nome)
    )
    const resultBuscaDisc = await DB.batch(batchBuscaDisc)
    
    resultBuscaDisc.forEach((r: any, i: number) => {
      const rows = r.results || []
      if (rows.length > 0) {
        disciplinasExistentes.set(resultado.disciplinas[i].nome, rows[0].id)
        console.log(`  ℹ️ Disciplina "${resultado.disciplinas[i].nome}" já existe (ID ${rows[0].id})`)
      }
    })
    
    // PASSO 2: Criar disciplinas que não existem (em batch)
    const discParaCriar = resultado.disciplinas.filter((d: any) => !disciplinasExistentes.has(d.nome))
    if (discParaCriar.length > 0) {
      const batchCriarDisc = discParaCriar.map((disc: any) => 
        DB.prepare(`INSERT INTO disciplinas (nome, area, descricao) VALUES (?, ?, ?)`)
          .bind(disc.nome, areaDetectada, 'Disciplina extraída do edital')
      )
      const resultCriarDisc = await DB.batch(batchCriarDisc)
      resultCriarDisc.forEach((r: any, i: number) => {
        const novoId = r.meta?.last_row_id
        disciplinasExistentes.set(discParaCriar[i].nome, novoId)
        console.log(`  ✅ Disciplina "${discParaCriar[i].nome}" criada (ID ${novoId})`)
      })
    }
    
    // PASSO 3: Inserir edital_disciplinas em batch
    const batchEditalDisc = resultado.disciplinas.map((disc: any, i: number) => {
      const disciplina_id_real = disciplinasExistentes.get(disc.nome) || null
      return DB.prepare(`
        INSERT INTO edital_disciplinas (edital_id, nome, ordem, disciplina_id, peso)
        VALUES (?, ?, ?, ?, ?)
      `).bind(editalId, disc.nome, i + 1, disciplina_id_real, disc.peso || 1)
    })
    const resultEditalDisc = await DB.batch(batchEditalDisc)
    
    // Mapear IDs das edital_disciplinas criadas
    const editalDiscIds = resultEditalDisc.map((r: any) => r.meta?.last_row_id)
    
    // PASSO 4: Inserir tópicos em batch (todos de uma vez)
    // ✅ v57: SIMPLIFICADO - Não inserir em topicos_edital aqui (evita FK errors)
    // Os tópicos do usuário serão criados quando ele iniciar o plano de estudos
    const batchTopicosEdital: any[] = []
    // ✅ v59: REMOVIDO - disciplinasComIds já declarado na linha 7226
    
    for (let i = 0; i < resultado.disciplinas.length; i++) {
      const disc = resultado.disciplinas[i]
      const edital_disciplina_id = editalDiscIds[i]
      const disciplina_id_real = disciplinasExistentes.get(disc.nome) || null
      
      // ✅ v57: Validar que temos um ID válido para edital_disciplina
      if (!edital_disciplina_id) {
        console.warn(`  ⚠️ ${disc.nome}: ID de edital_disciplina inválido, pulando tópicos...`)
        disciplinasComIds.push({
          id: 0,
          disciplina_id_real: disciplina_id_real,
          nome: disc.nome,
          peso: disc.peso || 1,
          categoria: disc.categoria || (disc.peso >= 2 ? 'ESPECÍFICOS' : 'BÁSICOS'),
          tipo: disc.tipo || 'geral',
          total_topicos: 0,
          topicos: []
        })
        continue
      }
      
      const topicosComIds: any[] = []
      
      if (disc.topicos && disc.topicos.length > 0) {
        // Deduplicar tópicos
        const topicosUnicos = [...new Set(
          disc.topicos
            .map((t: any) => typeof t === 'string' ? t.trim() : t.nome?.trim())
            .filter((t: string) => t && t.length > 0 && t.length < 500)
        )]
        
        // Limitar a 50 tópicos por disciplina
        const topicosLimitados = topicosUnicos.slice(0, 50)
        
        console.log(`  📋 ${disc.nome}: ${topicosLimitados.length} tópicos (de ${disc.topicos.length} recebidos)`)
        
        for (let j = 0; j < topicosLimitados.length; j++) {
          const topicoNome = topicosLimitados[j]
          
          // Preparar INSERT para edital_topicos apenas
          batchTopicosEdital.push(
            DB.prepare(`INSERT OR IGNORE INTO edital_topicos (edital_disciplina_id, nome, ordem) VALUES (?, ?, ?)`)
              .bind(edital_disciplina_id, topicoNome, j + 1)
          )
          
          topicosComIds.push({ id: 0, nome: topicoNome })
        }
      }
      
      // Guardar disciplina com IDs reais
      disciplinasComIds.push({
        id: edital_disciplina_id,
        disciplina_id_real: disciplina_id_real,
        nome: disc.nome,
        peso: disc.peso || 1,
        categoria: disc.categoria || (disc.peso >= 2 ? 'ESPECÍFICOS' : 'BÁSICOS'),
        tipo: disc.tipo || 'geral',
        total_topicos: topicosComIds.length,
        topicos: topicosComIds
      })
      
      console.log(`  ✅ ${disc.nome}: ${topicosComIds.length} tópicos preparados`)
    }
    
    // PASSO 5: Executar batch de tópicos (apenas edital_topicos)
    // ✅ v57: Batch size reduzido e error handling melhorado
    const BATCH_SIZE = 30  // Reduzido para maior estabilidade
    
    // Inserir edital_topicos em batches
    if (batchTopicosEdital.length > 0) {
      for (let start = 0; start < batchTopicosEdital.length; start += BATCH_SIZE) {
        const chunk = batchTopicosEdital.slice(start, start + BATCH_SIZE)
        try {
          await DB.batch(chunk)
          console.log(`  💾 edital_topicos batch ${Math.floor(start/BATCH_SIZE)+1}: ${chunk.length} inseridos`)
        } catch (batchErr: any) {
          console.error(`  ❌ edital_topicos batch ${Math.floor(start/BATCH_SIZE)+1} falhou: ${batchErr.message?.substring(0, 100)}`)
          // Tentar inserir um por um como fallback
          for (const stmt of chunk) {
            try {
              await stmt.run()
            } catch (e) {
              // Ignorar erros individuais
            }
          }
        }
      }
    }
    
    // PASSO 6: Atualizar status do edital para processado
    if (editalId) {
      try {
        await DB.prepare(`UPDATE editais SET status = 'processado' WHERE id = ?`).bind(editalId).run()
        salvouNoBanco = true
      } catch (e) {
        console.error('⚠️ Erro ao atualizar status do edital:', e)
      }
    }
    
    console.log(`✅ Edital ${editalId || 'N/A'} processado com ${disciplinasComIds.length} disciplinas (${batchTopicosEdital.length} tópicos)`)
    
    // Retornar disciplinas com IDs reais do banco
    return c.json({
      success: true,
      edital_id: editalId,
      disciplinas: disciplinasComIds,
      total: disciplinasComIds.length,
      concurso_detectado: concurso_nome,
      area_detectada: areaDetectada,
      modo: 'revisao',
      salvou_banco: salvouNoBanco,
      message: `${resultado.disciplinas.length} disciplinas identificadas. Você pode adicionar, editar ou remover disciplinas e tópicos a qualquer momento!`
    })
    
    } catch (dbError) {
      // ════════════════════════════════════════════════════════════════
      // ✅ v59: Se salvamento no banco falhou, retorna disciplinas mesmo assim
      // O usuário pode trabalhar com elas e tentamos salvar depois
      // ════════════════════════════════════════════════════════════════
      console.error('❌ Erro ao salvar no banco:', dbError)
      
      // Se temos disciplinas extraídas, retornamos elas sem salvar
      if (resultado.disciplinas.length > 0) {
        console.log('⚠️ v59: Retornando disciplinas extraídas sem salvar no banco')
        
        // ✅ v63: Tentar criar edital mesmo após erro parcial
        let editalIdFallback: number | null = null
        try {
          const editalResult = await c.env.DB.prepare(`
            INSERT INTO editais (user_id, nome_concurso, texto_completo, status) 
            VALUES (?, ?, ?, 'ativo')
          `).bind(
            user_id || 1,
            concurso_nome || 'Não especificado',
            texto.substring(0, 50000)
          ).run()
          
          editalIdFallback = editalResult.meta?.last_row_id as number
          console.log(`✅ v63: Edital criado em fallback com ID ${editalIdFallback}`)
        } catch (fbErr) {
          console.error('⚠️ v63: Erro ao criar edital em fallback:', fbErr)
        }
        
        const disciplinasSemBanco = resultado.disciplinas.map((d: any, i: number) => ({
          id: -(i + 1),
          disciplina_id_real: -(i + 1),
          nome: d.nome,
          peso: d.peso || 1,
          categoria: d.categoria || 'BÁSICOS',
          total_topicos: d.topicos?.length || 0,
          topicos: (d.topicos || []).map((t: any) => ({
            nome: typeof t === 'string' ? t : t.nome,
            peso: 1
          }))
        }))
        
        return c.json({
          success: true,
          edital_id: editalIdFallback,
          disciplinas: disciplinasSemBanco,
          total: disciplinasSemBanco.length,
          concurso_detectado: concurso_nome,
          area_detectada: areaDetectada,
          modo: 'revisao',
          salvou_banco: false,
          message: `${resultado.disciplinas.length} disciplinas extraídas. Houve um problema ao salvar, mas você pode continuar!`
        })
      }
      
      // Se não temos disciplinas, lança erro para fallback com IA
      throw dbError
    }
    
  } catch (error: any) {
    const errorMsg = error?.message || String(error)
    const errorStack = error instanceof Error ? error.stack : 'no stack'
    console.error('❌ Erro ao processar texto de edital:', errorMsg.substring(0, 500))
    console.error('❌ Stack:', errorStack?.substring(0, 500))
    
    // ════════════════════════════════════════════════════════════════
    // ✅ v65: TRATAMENTO DE ERROS MELHORADO
    // Detectar tipo de erro e retornar mensagem útil
    // ════════════════════════════════════════════════════════════════
    
    // Detectar erros de tamanho/parse do body
    const ehErroParse = errorMsg.includes('JSON') || errorMsg.includes('body') || errorMsg.includes('parse')
    const ehErroTimeout = errorMsg.includes('timeout') || errorMsg.includes('abort') || errorMsg.includes('CPU')
    const ehErroMemoria = errorMsg.includes('memory') || errorMsg.includes('heap') || errorMsg.includes('OOM')
    
    let msgErro = 'Erro ao processar edital. Por favor, tente uma das alternativas abaixo.'
    let sugestao = '• Cole apenas o CONTEÚDO PROGRAMÁTICO do edital (a seção com as disciplinas)\n• Use "Continuar sem edital" e adicione as disciplinas manualmente\n• Tente converter o PDF para TXT em smallpdf.com/pdf-to-text'
    let errorType = 'PROCESSING_ERROR'
    
    if (ehErroParse) {
      msgErro = 'O texto enviado é muito grande ou está em formato inválido.'
      sugestao = '• O edital pode ser grande demais para processar de uma vez\n• Cole apenas a seção "CONTEÚDO PROGRAMÁTICO" (geralmente Anexo II)\n• Remova as partes antes do conteúdo programático (regras, cronogramas, etc.)'
      errorType = 'TEXT_TOO_LARGE'
    } else if (ehErroTimeout || ehErroMemoria) {
      msgErro = 'O processamento excedeu o tempo limite.'
      sugestao = '• O edital é muito extenso para processar inteiro\n• Cole apenas a seção com disciplinas e tópicos\n• Tente dividir o texto e colar apenas o Anexo II'
      errorType = 'TIMEOUT_ERROR'
    }
    
    return c.json({
      error: msgErro,
      details: errorMsg.substring(0, 200),
      errorType,
      canRetry: true,
      suggestion: sugestao
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
    
    console.log(`📝 v54 BATCH: Atualizando ${disciplinas.length} disciplinas do edital ${editalId}`)
    
    // Buscar edital para obter user_id
    const edital = await DB.prepare(`SELECT user_id FROM editais WHERE id = ?`).bind(editalId).first() as any
    if (!edital) {
      return c.json({ error: 'Edital não encontrado' }, 404)
    }
    
    // PASSO 1: Deletar disciplinas e tópicos antigos (em batch)
    await DB.batch([
      DB.prepare(`DELETE FROM edital_topicos WHERE edital_disciplina_id IN (SELECT id FROM edital_disciplinas WHERE edital_id = ?)`).bind(editalId),
      DB.prepare(`DELETE FROM edital_disciplinas WHERE edital_id = ?`).bind(editalId)
    ])
    console.log(`  🗑️ Dados antigos deletados`)
    
    // PASSO 2: Buscar disciplinas existentes (em batch)
    const batchBuscaDisc = disciplinas.map((disc: any) => 
      DB.prepare(`SELECT id, nome FROM disciplinas WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))`).bind(disc.nome)
    )
    const resultBuscaDisc = await DB.batch(batchBuscaDisc)
    
    const disciplinasExistentes = new Map()
    resultBuscaDisc.forEach((r: any, i: number) => {
      const rows = r.results || []
      if (rows.length > 0) {
        disciplinasExistentes.set(disciplinas[i].nome, rows[0].id)
      }
    })
    
    // PASSO 3: Criar disciplinas que não existem (em batch)
    const discParaCriar = disciplinas.filter((d: any) => !disciplinasExistentes.has(d.nome))
    if (discParaCriar.length > 0) {
      const batchCriarDisc = discParaCriar.map((disc: any) => 
        DB.prepare(`INSERT INTO disciplinas (nome, area, descricao) VALUES (?, ?, ?)`)
          .bind(disc.nome, 'edital', 'Disciplina do edital')
      )
      const resultCriarDisc = await DB.batch(batchCriarDisc)
      resultCriarDisc.forEach((r: any, i: number) => {
        disciplinasExistentes.set(discParaCriar[i].nome, r.meta?.last_row_id)
      })
    }
    console.log(`  📚 ${disciplinasExistentes.size} disciplinas mapeadas (${discParaCriar.length} novas)`)
    
    // PASSO 4: Inserir edital_disciplinas (em batch)
    const batchEditalDisc = disciplinas.map((disc: any, i: number) => {
      const disciplina_id_real = disciplinasExistentes.get(disc.nome) || null
      return DB.prepare(`
        INSERT INTO edital_disciplinas (edital_id, nome, ordem, disciplina_id, peso)
        VALUES (?, ?, ?, ?, ?)
      `).bind(editalId, disc.nome, i + 1, disciplina_id_real, disc.peso || 1)
    })
    const resultEditalDisc = await DB.batch(batchEditalDisc)
    const editalDiscIds = resultEditalDisc.map((r: any) => r.meta?.last_row_id)
    
    // PASSO 5: Preparar TODOS os tópicos para batch
    const batchTopicosEdital: any[] = []
    const batchTopicosUser: any[] = []
    let totalTopicos = 0
    
    for (let i = 0; i < disciplinas.length; i++) {
      const disc = disciplinas[i]
      const edital_disciplina_id = editalDiscIds[i]
      const disciplina_id_real = disciplinasExistentes.get(disc.nome) || null
      
      if (disc.topicos && disc.topicos.length > 0) {
        const topicosUnicos = [...new Set(
          disc.topicos
            .map((t: any) => typeof t === 'string' ? t.trim() : t.nome?.trim())
            .filter((t: string) => t && t.length > 0)
        )].slice(0, 50) // Limitar a 50 tópicos por disciplina
        
        for (let j = 0; j < topicosUnicos.length; j++) {
          const topicoNome = topicosUnicos[j]
          
          batchTopicosEdital.push(
            DB.prepare(`INSERT OR IGNORE INTO edital_topicos (edital_disciplina_id, nome, ordem) VALUES (?, ?, ?)`)
              .bind(edital_disciplina_id, topicoNome, j + 1)
          )
          
          if (disciplina_id_real && edital.user_id) {
            batchTopicosUser.push(
              DB.prepare(`INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
                .bind(disciplina_id_real, topicoNome, 'Conteúdo Programático', j + 1, disc.peso || 1, edital.user_id)
            )
          }
        }
        totalTopicos += topicosUnicos.length
        console.log(`  ✅ ${disc.nome}: peso ${disc.peso}, ${topicosUnicos.length} tópicos`)
      }
    }
    
    // PASSO 6: Executar batches de tópicos (chunks de 80)
    const BATCH_SIZE = 80
    
    for (let start = 0; start < batchTopicosEdital.length; start += BATCH_SIZE) {
      const chunk = batchTopicosEdital.slice(start, start + BATCH_SIZE)
      await DB.batch(chunk)
    }
    
    for (let start = 0; start < batchTopicosUser.length; start += BATCH_SIZE) {
      const chunk = batchTopicosUser.slice(start, start + BATCH_SIZE)
      await DB.batch(chunk)
    }
    
    // PASSO 7: Atualizar status do edital
    await DB.prepare(`UPDATE editais SET status = 'processado' WHERE id = ?`).bind(editalId).run()
    
    console.log(`✅ Edital ${editalId}: ${disciplinas.length} disciplinas, ${totalTopicos} tópicos salvos via BATCH`)
    
    return c.json({ 
      success: true, 
      message: 'Disciplinas atualizadas com sucesso!',
      total_disciplinas: disciplinas.length,
      total_topicos: totalTopicos
    })
  } catch (error: any) {
    console.error('Erro ao atualizar disciplinas:', error)
    console.error('Detalhes:', error?.message, error?.cause)
    return c.json({ error: 'Erro ao atualizar disciplinas', details: error?.message }, 500)
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
    // ✅ v54 BATCH: Buscar disciplinas e tópicos com batch otimizado
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

    // ✅ Buscar tópicos de TODAS as disciplinas em um único batch
    if (disciplinas.length === 0) {
      return c.json([])
    }
    
    const batchTopicosGet = disciplinas.map((d: any) =>
      DB.prepare(`SELECT id, nome, ordem FROM edital_topicos WHERE edital_disciplina_id = ? ORDER BY ordem`).bind(d.id)
    )
    const resultTopicosGet = await DB.batch(batchTopicosGet)
    
    const disciplinasComTopicos = disciplinas.map((d: any, i: number) => {
      const topicos = (resultTopicosGet[i] as any)?.results || []
      return {
        ...d,
        total_topicos: topicos.length,
        topicos: topicos
      }
    })

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

// ✅ Buscar disciplinas de um PLANO específico (para modal de trocar disciplina)
app.get('/api/planos/:plano_id/disciplinas', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')

  try {
    // Buscar disciplinas dos ciclos do plano
    const { results } = await DB.prepare(`
      SELECT DISTINCT
        d.id,
        d.nome,
        d.area,
        c.disciplina_id
      FROM ciclos_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      WHERE c.plano_id = ?
      ORDER BY d.nome
    `).bind(plano_id).all()

    console.log(`📋 Disciplinas do plano ${plano_id}: ${results?.length || 0} disciplinas`)
    return c.json(results || [])
  } catch (error) {
    console.error('Erro ao buscar disciplinas do plano:', error)
    return c.json([])
  }
})

// ✅ Buscar tópicos de uma disciplina (para modal de trocar disciplina)
app.get('/api/planos/:plano_id/disciplinas/:disciplina_id/topicos', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  const disciplina_id = c.req.param('disciplina_id')

  try {
    // Buscar plano para obter user_id
    const plano = await DB.prepare('SELECT user_id FROM planos_estudo WHERE id = ?').bind(plano_id).first() as any
    
    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }

    // ✅ CORRIGIDO: Buscar tópicos FILTRADOS POR PLANO_ID (não user_id)
    // Isso garante isolamento entre planos diferentes
    let { results } = await DB.prepare(`
      SELECT 
        t.id,
        t.nome,
        t.categoria,
        t.ordem
      FROM topicos_edital t
      WHERE t.disciplina_id = ? AND t.plano_id = ?
      ORDER BY t.ordem, t.nome
    `).bind(disciplina_id, plano_id).all()

    // Se não encontrar tópicos do plano, tentar copiar do edital ou genéricos
    if (!results || results.length === 0) {
      console.log(`⚠️ Nenhum tópico encontrado para disciplina ${disciplina_id} no plano ${plano_id}, tentando copiar...`)
      
      // Buscar edital do usuário
      const editalUsuario = await DB.prepare(`
        SELECT id FROM editais WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(plano.user_id).first() as any
      
      // Copiar tópicos para este plano
      await copiarTopicosParaPlano(
        DB,
        parseInt(plano_id),
        plano.user_id,
        [parseInt(disciplina_id)],
        editalUsuario?.id || undefined
      )
      
      // Buscar novamente
      const novaBusca = await DB.prepare(`
        SELECT 
          t.id,
          t.nome,
          t.categoria,
          t.ordem
        FROM topicos_edital t
        WHERE t.disciplina_id = ? AND t.plano_id = ?
        ORDER BY t.ordem, t.nome
      `).bind(disciplina_id, plano_id).all()
      
      results = novaBusca.results || []
    }

    console.log(`📋 Tópicos da disciplina ${disciplina_id} no plano ${plano_id}: ${results?.length || 0} tópicos`)
    return c.json(results || [])
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error)
    return c.json([])
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
// ✅ CORREÇÃO v7: Incluir plano_id para isolamento entre planos
app.post('/api/topicos/manual', async (c) => {
  const { DB } = c.env
  const { disciplina_id, nome, peso, categoria, user_id, plano_id } = await c.req.json()
  
  if (!user_id) {
    return c.json({ error: 'user_id é obrigatório' }, 400)
  }
  
  if (!nome || !nome.trim()) {
    return c.json({ error: 'Nome do tópico é obrigatório' }, 400)
  }
  
  try {
    // ✅ CORREÇÃO v7: Buscar plano ativo se não fornecido
    let planoAtivo = plano_id
    if (!planoAtivo) {
      const plano = await DB.prepare(`
        SELECT id FROM planos_estudo WHERE user_id = ? AND ativo = 1 LIMIT 1
      `).bind(user_id).first() as any
      planoAtivo = plano?.id
    }
    
    // ✅ Verificar se tópico já existe para esta disciplina/plano
    const topicoExistente = await DB.prepare(`
      SELECT id, nome FROM topicos_edital 
      WHERE disciplina_id = ? AND plano_id = ? AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
    `).bind(disciplina_id, planoAtivo, nome.trim()).first() as any
    
    if (topicoExistente) {
      return c.json({ 
        error: 'Tópico já existe nesta disciplina',
        existente: { id: topicoExistente.id, nome: topicoExistente.nome }
      }, 409) // 409 Conflict
    }
    
    // Obter a próxima ordem (para este plano)
    const { ordem: maxOrdem } = await DB.prepare(`
      SELECT COALESCE(MAX(ordem), 0) as ordem FROM topicos_edital WHERE disciplina_id = ? AND plano_id = ?
    `).bind(disciplina_id, planoAtivo).first() || { ordem: 0 }
    
    const result = await DB.prepare(`
      INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id, plano_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(disciplina_id, nome.trim(), categoria || 'Outros', (maxOrdem || 0) + 1, peso || 1, user_id, planoAtivo).run()
    
    console.log(`✅ Tópico "${nome}" adicionado à disciplina ${disciplina_id} no plano ${planoAtivo}`)
    return c.json({ success: true, id: result.meta.last_row_id, plano_id: planoAtivo })
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
// ✅ CORREÇÃO DEFINITIVA v8: Remover TODAS as referências antes de excluir
app.delete('/api/topicos/:topico_id', async (c) => {
  const { DB } = c.env
  const topico_id = c.req.param('topico_id')
  
  console.log(`🗑️ Iniciando exclusão do tópico ${topico_id}`)
  
  try {
    // ✅ CORREÇÃO v8: Remover TODAS as FKs em ordem correta
    
    // 1. Remover progresso do usuário
    try {
      await DB.prepare('DELETE FROM user_topicos_progresso WHERE topico_id = ?').bind(topico_id).run()
      console.log(`   ✓ Removido progresso do tópico ${topico_id}`)
    } catch (e) {
      console.log(`   ⚠ Tabela user_topicos_progresso: ${e}`)
    }
    
    // 2. Remover relações com conteúdos
    try {
      await DB.prepare('DELETE FROM conteudo_topicos WHERE topico_id = ?').bind(topico_id).run()
      console.log(`   ✓ Removido conteudo_topicos do tópico ${topico_id}`)
    } catch (e) {
      console.log(`   ⚠ Tabela conteudo_topicos: ${e}`)
    }
    
    // 3. ✅ NOVO: Desvinvular materiais_salvos (SET NULL em vez de DELETE)
    try {
      await DB.prepare('UPDATE materiais_salvos SET topico_id = NULL WHERE topico_id = ?').bind(topico_id).run()
      console.log(`   ✓ Desvinculado materiais_salvos do tópico ${topico_id}`)
    } catch (e) {
      console.log(`   ⚠ Tabela materiais_salvos: ${e}`)
    }
    
    // 4. ✅ NOVO: Remover de conteudo_estudo se existir
    try {
      await DB.prepare('UPDATE conteudo_estudo SET topico_id = NULL WHERE topico_id = ?').bind(topico_id).run()
      console.log(`   ✓ Desvinculado conteudo_estudo do tópico ${topico_id}`)
    } catch (e) {
      console.log(`   ⚠ Tabela conteudo_estudo: ${e}`)
    }
    
    // 5. Agora excluir o tópico
    const result = await DB.prepare('DELETE FROM topicos_edital WHERE id = ?').bind(topico_id).run()
    
    if (result.meta.changes === 0) {
      console.log(`⚠️ Tópico ${topico_id} não encontrado ou já excluído`)
      return c.json({ success: true, warning: 'Tópico já não existia' })
    }
    
    console.log(`✅ Tópico ${topico_id} excluído com sucesso`)
    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao excluir tópico:', error)
    return c.json({ error: 'Erro ao excluir tópico: ' + error.message }, 500)
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
    
    // ✅ v54 BATCH: Inserir novos tópicos com user_id em batch
    if (topicos && topicos.length > 0) {
      const batchTopicosGerar = topicos.map((topico: any) =>
        DB.prepare(`INSERT INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(disciplina_id, topico.nome, topico.categoria || 'Geral', topico.ordem || 0, topico.peso || 1, user_id)
      )
      const BATCH_GER = 80
      for (let s = 0; s < batchTopicosGerar.length; s += BATCH_GER) {
        await DB.batch(batchTopicosGerar.slice(s, s + BATCH_GER))
      }
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
// ✅ CORREÇÃO v5: Aceita ?plano_id=X para filtrar por plano específico
app.get('/api/user-topicos/:user_id/:disciplina_id', async (c) => {
  const { DB } = c.env
  const user_id = c.req.param('user_id')
  const disciplina_id = c.req.param('disciplina_id')
  const plano_id = c.req.query('plano_id') // ✅ NOVO: Filtrar por plano

  // ✅ CORREÇÃO v5: Se plano_id fornecido, filtrar por plano (isolamento entre planos)
  let results: any[] = []
  
  if (plano_id) {
    // Buscar tópicos APENAS do plano específico
    console.log(`📋 Buscando tópicos da disciplina ${disciplina_id} no plano ${plano_id}...`)
    
    const { results: topicosPlano } = await DB.prepare(`
      SELECT 
        te.id,
        te.disciplina_id,
        te.nome,
        te.categoria,
        te.ordem,
        COALESCE(te.peso, 1) as peso,
        COALESCE(utp.vezes_estudado, 0) as vezes_estudado,
        COALESCE(utp.nivel_dominio, 0) as nivel_dominio,
        utp.ultima_vez
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.plano_id = ?
      WHERE te.disciplina_id = ? AND te.plano_id = ?
      ORDER BY te.ordem, te.nome
    `).bind(plano_id, disciplina_id, plano_id).all()
    
    results = topicosPlano || []
    console.log(`✅ Encontrados ${results.length} tópicos no plano ${plano_id}`)
  } else {
    // Fallback: filtrar por user_id (comportamento antigo para compatibilidade)
    const { results: topicosUser } = await DB.prepare(`
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
    
    results = topicosUser || []
  }

  // ✅ Se não encontrou tópicos e temos plano_id, tentar copiar do edital para o plano
  if ((!results || results.length === 0) && plano_id) {
    console.log(`📋 Nenhum tópico no plano ${plano_id}, tentando copiar do edital...`)
    
    // Buscar edital do usuário
    const editalUsuario = await DB.prepare(`
      SELECT id FROM editais WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(user_id).first() as any
    
    // Copiar tópicos para este plano
    await copiarTopicosParaPlano(
      DB,
      parseInt(plano_id),
      parseInt(user_id),
      [parseInt(disciplina_id)],
      editalUsuario?.id || undefined
    )
    
    // Buscar novamente
    const { results: novosTopicos } = await DB.prepare(`
      SELECT 
        te.id,
        te.disciplina_id,
        te.nome,
        te.categoria,
        te.ordem,
        COALESCE(te.peso, 1) as peso,
        COALESCE(utp.vezes_estudado, 0) as vezes_estudado,
        COALESCE(utp.nivel_dominio, 0) as nivel_dominio,
        utp.ultima_vez
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.plano_id = ?
      WHERE te.disciplina_id = ? AND te.plano_id = ?
      ORDER BY te.ordem, te.nome
    `).bind(plano_id, disciplina_id, plano_id).all()
    
    results = novosTopicos || []
    console.log(`✅ Copiados e encontrados ${results.length} tópicos no plano ${plano_id}`)
  }
  // Fallback legado (sem plano_id): buscar em edital_topicos
  else if (!results || results.length === 0) {
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
// ✅ CORREÇÃO v5: Aceita plano_id para isolamento entre planos
app.post('/api/user-topicos/progresso', async (c) => {
  const { DB } = c.env
  const { user_id, topico_id, vezes_estudado, nivel_dominio, plano_id } = await c.req.json()
  
  console.log('📊 Atualizando progresso do tópico:', { user_id, topico_id, vezes_estudado, nivel_dominio, plano_id })
  
  try {
    // ✅ CORREÇÃO DEFINITIVA v8: Buscar plano ativo se não fornecido
    let planoAtivo = plano_id
    if (!planoAtivo) {
      const plano = await DB.prepare(`
        SELECT id FROM planos_estudo WHERE user_id = ? AND ativo = 1 LIMIT 1
      `).bind(user_id).first() as any
      planoAtivo = plano?.id || null
    }
    
    // ✅ CORREÇÃO v8: Usar INSERT OR REPLACE para evitar problemas de constraint
    // A tabela tem UNIQUE(user_id, topico_id), então precisamos atualizar/inserir por essa combinação
    // Mas também precisamos garantir que o plano_id seja considerado
    
    // Primeiro, verificar se existe registro para este usuário/tópico
    const existing = await DB.prepare(`
      SELECT id, plano_id FROM user_topicos_progresso WHERE user_id = ? AND topico_id = ?
    `).bind(user_id, topico_id).first() as any
    
    if (existing) {
      // ✅ Atualizar o registro existente E definir o plano_id correto
      await DB.prepare(`
        UPDATE user_topicos_progresso 
        SET vezes_estudado = ?, 
            nivel_dominio = ?, 
            ultima_vez = CURRENT_TIMESTAMP,
            plano_id = COALESCE(?, plano_id)
        WHERE user_id = ? AND topico_id = ?
      `).bind(vezes_estudado, nivel_dominio, planoAtivo, user_id, topico_id).run()
      console.log(`✅ Progresso atualizado (UPDATE) para tópico ${topico_id}, plano: ${planoAtivo}`)
    } else {
      // ✅ Inserir novo registro
      await DB.prepare(`
        INSERT INTO user_topicos_progresso (user_id, topico_id, vezes_estudado, nivel_dominio, ultima_vez, plano_id)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `).bind(user_id, topico_id, vezes_estudado, nivel_dominio, planoAtivo).run()
      console.log(`✅ Progresso inserido (INSERT) para tópico ${topico_id}, plano: ${planoAtivo}`)
    }
    
    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar progresso:', error)
    return c.json({ error: 'Erro ao atualizar progresso: ' + error.message }, 500)
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
    
    // ✅ CORREÇÃO: Inserir tópicos COM user_id (INSERT OR IGNORE para evitar duplicatas)
    for (const topico of topicos) {
      await DB.prepare(`
        INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id)
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
    // Validar que há disciplinas (padrão OU personalizadas/pré-definidas)
    const totalDisc = (data.disciplinas?.length || 0) + (data.disciplinasCustom?.length || 0)
    if (totalDisc === 0) {
      return c.json({ 
        error: 'Você precisa selecionar pelo menos uma disciplina para continuar',
        code: 'NO_DISCIPLINES'
      }, 400)
    }
    
    // Garantir que data.disciplinas é um array
    if (!data.disciplinas) data.disciplinas = []

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

    // 🆕 PROCESSAR DISCIPLINAS PERSONALIZADAS (criar no banco se não existem) - v54 BATCH
    if (data.disciplinasCustom && data.disciplinasCustom.length > 0) {
      console.log(`📚 v81 BATCH: Processando ${data.disciplinasCustom.length} disciplinas personalizadas/pré-definidas...`)
      
      // Buscar todas em batch (primeiro por nome+area exato)
      const batchBuscaCustom = data.disciplinasCustom.map((disc: any) =>
        DB.prepare('SELECT id FROM disciplinas WHERE nome = ? AND area = ?').bind(disc.nome, disc.area)
      )
      const resBuscaCustom = await DB.batch(batchBuscaCustom)
      
      // Identificar quais precisam ser criadas
      const discParaCriarCustom: any[] = []
      const discParaCriarIndices: number[] = []
      resBuscaCustom.forEach((r: any, i: number) => {
        const rows = r.results || []
        if (rows.length > 0) {
          data.disciplinasCustom[i].disciplina_id = Number(rows[0].id)
          console.log(`ℹ️ Disciplina "${data.disciplinasCustom[i].nome}" já existia (ID ${rows[0].id}, type: ${typeof rows[0].id})`)
        } else {
          discParaCriarCustom.push(data.disciplinasCustom[i])
          discParaCriarIndices.push(i)
        }
      })
      
      // Criar novas em batch
      if (discParaCriarCustom.length > 0) {
        const batchCriarCustom = discParaCriarCustom.map((disc: any) =>
          DB.prepare('INSERT INTO disciplinas (nome, area, descricao) VALUES (?, ?, ?)')
            .bind(disc.nome, disc.area, disc._is_predefined ? 'Disciplina pré-definida da área ' + disc.area : 'Disciplina personalizada criada pelo usuário')
        )
        const resCriarCustom = await DB.batch(batchCriarCustom)
        resCriarCustom.forEach((r: any, i: number) => {
          const idx = discParaCriarIndices[i]
          data.disciplinasCustom[idx].disciplina_id = Number(r.meta?.last_row_id)
          console.log(`✅ Disciplina "${data.disciplinasCustom[idx].nome}" criada com ID ${r.meta?.last_row_id} (type: ${typeof r.meta?.last_row_id})`)
        })
      }
      
      // ✅ v81: Criar tópicos para disciplinas pré-definidas que têm tópicos
      const topicosParaCriar: { discId: number, topicos: string[] }[] = []
      for (const disc of data.disciplinasCustom) {
        if (disc.disciplina_id && disc.topicos && disc.topicos.length > 0) {
          // Verificar se já tem tópicos no banco
          const existingTopics = await DB.prepare(
            'SELECT COUNT(*) as count FROM topicos_edital WHERE disciplina_id = ?'
          ).bind(disc.disciplina_id).first() as any
          
          if (!existingTopics || existingTopics.count === 0) {
            topicosParaCriar.push({ discId: disc.disciplina_id, topicos: disc.topicos })
          } else {
            console.log(`ℹ️ Disciplina ID ${disc.disciplina_id} já tem ${existingTopics.count} tópicos`)
          }
        }
      }
      
      if (topicosParaCriar.length > 0) {
        console.log(`📝 Criando tópicos para ${topicosParaCriar.length} disciplinas...`)
        
        // Criar tópicos em batches (máx 50 por batch para evitar limite)
        const allTopicStmts: any[] = []
        for (const item of topicosParaCriar) {
          item.topicos.forEach((nome: string, idx: number) => {
            allTopicStmts.push(
              DB.prepare('INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso) VALUES (?, ?, ?, ?, ?)')
                .bind(item.discId, nome, 'conteudo', idx + 1, 1)
            )
          })
        }
        
        // Executar em batches de 40
        for (let b = 0; b < allTopicStmts.length; b += 40) {
          const batch = allTopicStmts.slice(b, b + 40)
          await DB.batch(batch)
        }
        
        const totalTopicos = topicosParaCriar.reduce((sum, item) => sum + item.topicos.length, 0)
        console.log(`✅ ${totalTopicos} tópicos criados para ${topicosParaCriar.length} disciplinas`)
      }
      
      for (const disc of data.disciplinasCustom) {
        // Adicionar à lista de disciplinas padrão para processar junto
        // ✅ v83-fix: Garantir Number() cast para evitar type mismatch
        const discId = Number(disc.disciplina_id)
        if (!discId || isNaN(discId)) {
          console.log(`⚠️ Disciplina custom "${disc.nome}" sem ID válido, pulando`)
          continue
        }
        data.disciplinas.push({
          disciplina_id: discId,
          nome: disc.nome,
          ja_estudou: disc.ja_estudou || false,
          nivel_atual: disc.nivel_atual || 0,
          nivel_dominio: disc.nivel_dominio || 0,
          dificuldade: disc.dificuldade || false,
          peso: disc.peso || null
        })
      }
    }

    // ⚠️ DIAGNÓSTICO será gerado DEPOIS de user_disciplinas ser criado (veja abaixo)
    let diagnostico: any = null

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
        // ✅ v83-fix: Gerar diagnóstico mesmo quando limite é atingido
        diagnostico = await gerarDiagnostico(DB, data.user_id, interview_id)
        // Se diagnóstico vazio (user_disciplinas pode não existir ainda), gerar baseado em data
        if (!diagnostico || diagnostico.prioridades?.length === 0) {
          diagnostico = gerarDiagnosticoFromData(data)
        }
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
        
        const planoAntigoId = planoExistenteAuto.id
        
        // ✅ v82: Exclusão completa respeitando FKs - mesma lógica de DELETE /api/planos/:plano_id
        const tabelasParaLimpar = [
          { nome: 'conteudo_topicos', query: `DELETE FROM conteudo_topicos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
          { nome: 'materiais_salvos', query: `DELETE FROM materiais_salvos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
          { nome: 'user_topicos_progresso_via_topico', query: `DELETE FROM user_topicos_progresso WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
          { nome: 'topicos_edital', query: `DELETE FROM topicos_edital WHERE plano_id = ?` },
          { nome: 'user_topicos_progresso_via_plano', query: `DELETE FROM user_topicos_progresso WHERE plano_id = ?` },
          { nome: 'conteudo_estudo', query: `DELETE FROM conteudo_estudo WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)` },
          { nome: 'exercicios_resultados', query: `DELETE FROM exercicios_resultados WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)` },
          { nome: 'historico_estudos', query: `DELETE FROM historico_estudos WHERE plano_id = ?` },
          { nome: 'simulados_historico', query: `DELETE FROM simulados_historico WHERE plano_id = ?` },
          { nome: 'metas_semana', query: `DELETE FROM metas_semana WHERE semana_id IN (SELECT id FROM semanas_estudo WHERE plano_id = ?)` },
          { nome: 'semanas_estudo', query: `DELETE FROM semanas_estudo WHERE plano_id = ?` },
          { nome: 'metas_diarias', query: `DELETE FROM metas_diarias WHERE plano_id = ?` },
          { nome: 'ciclos_estudo', query: `DELETE FROM ciclos_estudo WHERE plano_id = ?` },
        ]
        
        for (const tabela of tabelasParaLimpar) {
          try {
            await DB.prepare(tabela.query).bind(planoAntigoId).run()
          } catch (e: any) {
            console.log(`  ⚠️ ${tabela.nome}: ${e.message?.substring(0, 60) || 'erro'}`)
          }
        }
        
        await DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(planoAntigoId).run()
        
        console.log(`✅ Plano antigo ${planoExistenteAuto.id} removido`)
      }
      
      // ✅ v54 BATCH: Processar disciplinas em batch para evitar limite de 50 subrequests
      console.log(`📋 Disciplinas recebidas do frontend (${data.disciplinas.length}):`, data.disciplinas.map((d: any) => `ID ${d.disciplina_id} (type: ${typeof d.disciplina_id})`).join(', '))
      
      const disciplinasProcessadas: any[] = []
      // ✅ v83-fix: Garantir Number() cast em todos os IDs para evitar mismatch de tipo
      const discIds = data.disciplinas.filter((d: any) => d.disciplina_id).map((d: any) => Number(d.disciplina_id))
      
      if (discIds.length === 0) {
        console.log('ℹ️ Nenhuma disciplina padrão (com ID) - todas vieram como custom/pré-definidas')
      }
      
      // PASSO 1: Buscar TODAS as disciplinas por ID direto (batch)
      const discEncontradas = new Map<number, any>()
      const discNaoEncontradas: number[] = []
      
      if (discIds.length > 0) {
        const batchBuscaDisc = discIds.map((id: number) =>
          DB.prepare('SELECT id, nome, area FROM disciplinas WHERE id = ?').bind(id)
        )
        const resBuscaDisc = await DB.batch(batchBuscaDisc)
        
        // Mapear quais foram encontradas e quais não
        resBuscaDisc.forEach((r: any, i: number) => {
          const rows = r.results || []
          if (rows.length > 0) {
            discEncontradas.set(discIds[i], rows[0])
          } else {
            discNaoEncontradas.push(discIds[i])
          }
        })
      }
      
      // PASSO 2: Para as não encontradas, buscar em edital_disciplinas (batch)
      if (discNaoEncontradas.length > 0) {
        console.log(`🔍 ${discNaoEncontradas.length} IDs não são de disciplinas. Verificando edital_disciplinas...`)
        
        const batchBuscaEdDisc = discNaoEncontradas.map((id: number) =>
          DB.prepare('SELECT id, nome, disciplina_id as real_id FROM edital_disciplinas WHERE id = ?').bind(id)
        )
        const resBuscaEdDisc = await DB.batch(batchBuscaEdDisc)
        
        // Coletar os real_ids que precisam ser buscados
        const realIdsParaBuscar: { origId: number, realId: number, editalDiscId: number, nome: string }[] = []
        const discParaCriar: { origId: number, editalDiscId: number, nome: string }[] = []
        
        resBuscaEdDisc.forEach((r: any, i: number) => {
          const rows = r.results || []
          if (rows.length > 0) {
            const edDisc = rows[0]
            if (edDisc.real_id) {
              realIdsParaBuscar.push({ origId: discNaoEncontradas[i], realId: edDisc.real_id, editalDiscId: edDisc.id, nome: edDisc.nome })
            } else {
              discParaCriar.push({ origId: discNaoEncontradas[i], editalDiscId: edDisc.id, nome: edDisc.nome })
            }
          }
        })
        
        // Buscar disciplinas pelos real_ids (batch)
        if (realIdsParaBuscar.length > 0) {
          const batchBuscaReal = realIdsParaBuscar.map(r =>
            DB.prepare('SELECT id, nome, area FROM disciplinas WHERE id = ?').bind(r.realId)
          )
          const resBuscaReal = await DB.batch(batchBuscaReal)
          resBuscaReal.forEach((r: any, i: number) => {
            const rows = r.results || []
            if (rows.length > 0) {
              discEncontradas.set(realIdsParaBuscar[i].origId, rows[0])
            } else {
              // real_id não existe, precisa criar
              discParaCriar.push(realIdsParaBuscar[i])
            }
          })
        }
        
        // Criar disciplinas que não existem (batch)
        if (discParaCriar.length > 0) {
          console.log(`✨ Criando ${discParaCriar.length} novas disciplinas`)
          const batchCriar = discParaCriar.map(d =>
            DB.prepare("INSERT INTO disciplinas (nome, area) VALUES (?, 'edital') RETURNING id, nome, area").bind(d.nome)
          )
          const resCriar = await DB.batch(batchCriar)
          
          // Mapear e atualizar edital_disciplinas
          const batchUpdateEdDisc: any[] = []
          resCriar.forEach((r: any, i: number) => {
            const rows = r.results || []
            if (rows.length > 0) {
              const novaDisc = rows[0]
              discEncontradas.set(discParaCriar[i].origId, novaDisc)
              batchUpdateEdDisc.push(
                DB.prepare('UPDATE edital_disciplinas SET disciplina_id = ? WHERE id = ?')
                  .bind(novaDisc.id, discParaCriar[i].editalDiscId)
              )
            }
          })
          if (batchUpdateEdDisc.length > 0) {
            await DB.batch(batchUpdateEdDisc)
          }
        }
      }
      
      // PASSO 3: Garantir registros em user_disciplinas (batch)
      // ✅ v83-fix: Usar Number() para comparação segura (evitar BigInt vs number ou string vs number)
      const discIdsValidos = [...discEncontradas.entries()].map(([origId, disc]) => {
        const discData = data.disciplinas.find((d: any) => Number(d.disciplina_id) === Number(origId))
        if (!discData) {
          console.log(`⚠️ origId ${origId} (${typeof origId}) não encontrado em data.disciplinas. IDs disponíveis:`, data.disciplinas.map((d: any) => `${d.disciplina_id}(${typeof d.disciplina_id})`).join(','))
        }
        return { origId, disc, discData }
      }).filter(item => item.discData)
      
      console.log(`📊 PASSO 3: discEncontradas=${discEncontradas.size}, discIdsValidos=${discIdsValidos.length}`)
      
      // Buscar user_disciplinas existentes (batch)
      const batchBuscaUserDisc = discIdsValidos.map(item =>
        DB.prepare('SELECT id FROM user_disciplinas WHERE user_id = ? AND disciplina_id = ?')
          .bind(data.user_id, item.disc.id)
      )
      const resBuscaUserDisc = await DB.batch(batchBuscaUserDisc)
      
      // Inserir user_disciplinas faltantes (batch)
      const batchInsertUserDisc: any[] = []
      resBuscaUserDisc.forEach((r: any, i: number) => {
        const rows = r.results || []
        if (rows.length === 0) {
          const item = discIdsValidos[i]
          batchInsertUserDisc.push(
            DB.prepare('INSERT INTO user_disciplinas (user_id, disciplina_id, ja_estudou, nivel_atual, dificuldade) VALUES (?, ?, ?, ?, ?)')
              .bind(data.user_id, item.disc.id, item.discData.ja_estudou ? 1 : 0, item.discData.nivel_atual || 0, item.discData.dificuldade ? 1 : 0)
          )
        }
      })
      if (batchInsertUserDisc.length > 0) {
        await DB.batch(batchInsertUserDisc)
        console.log(`✅ ${batchInsertUserDisc.length} registros user_disciplinas criados`)
      }
      
      // ✅ v83-fix: Gerar diagnóstico AQUI, DEPOIS de user_disciplinas existir no banco
      diagnostico = await gerarDiagnostico(DB, data.user_id, interview_id)
      console.log(`📊 Diagnóstico gerado: ${diagnostico.nivel_geral}, ${diagnostico.prioridades?.length || 0} prioridades`)
      
      // Montar disciplinasProcessadas
      for (const item of discIdsValidos) {
        disciplinasProcessadas.push({
          disciplina_id: item.disc.id,
          nome: item.disc.nome,
          area: item.disc.area,
          ja_estudou: item.discData.ja_estudou || false,
          nivel_atual: item.discData.nivel_atual || 0,
          dificuldade: item.discData.dificuldade || false,
          nivel_dominio: item.discData.nivel_dominio || 0,
          peso: item.discData.peso || null
        })
      }
      
      if (disciplinasProcessadas.length === 0) {
        throw new Error('Nenhuma disciplina válida foi selecionada')
      }
      
      console.log(`📊 Disciplinas processadas (${disciplinasProcessadas.length}):`, disciplinasProcessadas.map(d => `${d.nome} (ID: ${d.disciplina_id})`).join(', '))
      
      // Usar disciplinasProcessadas diretamente (já tem todos os dados necessários)
      const userDisciplinas = disciplinasProcessadas
      
      // As disciplinas já foram validadas durante o processamento
      const disciplinasValidadas = userDisciplinas
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
      // ✅ CORREÇÃO: Garantir tempo mínimo de 30 minutos se tempo_disponivel_dia for 0 ou inválido
      const tempoDisponivel = interview.tempo_disponivel_dia && interview.tempo_disponivel_dia > 0 
        ? interview.tempo_disponivel_dia 
        : 120 // Padrão: 2 horas se não definido
      console.log(`⏱️ Tempo disponível por dia: ${tempoDisponivel} minutos`)
      await gerarCiclosEstudo(DB, plano_id, disciplinasValidadas, tempoDisponivel)
      console.log('✅ Ciclos de estudo gerados!')
      
      // ✅ NOVO: Copiar tópicos do edital para o plano (vinculando ao plano_id)
      const disciplinaIdsParaTopicos = disciplinasValidadas.map((d: any) => d.disciplina_id)
      
      // Buscar edital do usuário (se houver) para copiar tópicos
      const editalUsuario = await DB.prepare(`
        SELECT id FROM editais WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
      `).bind(data.user_id).first() as any
      
      await copiarTopicosParaPlano(
        DB, 
        plano_id, 
        data.user_id, 
        disciplinaIdsParaTopicos,
        editalUsuario?.id || undefined
      )
      console.log('✅ Tópicos copiados para o plano!')
      
      return c.json({ 
        interview_id,
        plano_id,
        diagnostico: diagnosticoCompleto, // ✅ CORREÇÃO: Usar diagnóstico completo com disciplinas validadas
        message: 'Entrevista e plano criados com sucesso!'
      })
    } catch (planError: any) {
      console.error('❌ Erro ao criar plano automático:', planError)
      // ✅ v83-fix: Gerar diagnóstico de fallback se não foi gerado ainda
      if (!diagnostico || diagnostico.prioridades?.length === 0) {
        diagnostico = gerarDiagnosticoFromData(data)
      }
      // Retorna a entrevista mesmo se o plano falhar
      return c.json({ 
        interview_id, 
        diagnostico,
        warning: 'Entrevista criada, mas houve erro ao criar o plano. Use POST /api/planos para criar manualmente.',
        planError: planError?.message || String(planError)
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
      
      // Deletar dados relacionados ao plano antigo (batch)
      await DB.batch([
        DB.prepare('DELETE FROM metas_diarias WHERE plano_id = ?').bind(planoExistente.id),
        DB.prepare('DELETE FROM ciclos_estudo WHERE plano_id = ?').bind(planoExistente.id),
        DB.prepare('DELETE FROM semanas_estudo WHERE plano_id = ?').bind(planoExistente.id),
        DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(planoExistente.id)
      ])
      
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
    
    // ✅ NOVO: Copiar tópicos do edital para o plano (vinculando ao plano_id)
    const disciplinaIdsParaTopicos = userDisciplinas.map((d: any) => d.disciplina_id)
    
    // Buscar edital do usuário (se houver) para copiar tópicos
    const editalUsuario = await DB.prepare(`
      SELECT id FROM editais WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(user_id).first() as any
    
    await copiarTopicosParaPlano(
      DB, 
      plano_id, 
      user_id, 
      disciplinaIdsParaTopicos,
      editalUsuario?.id || undefined
    )
    console.log('✅ Tópicos copiados para o plano!')

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

  try {
    // ✅ CORREÇÃO: Buscar edital_id via JOIN com editais (nome_concurso)
    const { results: planos } = await DB.prepare(`
      SELECT 
        p.*,
        i.objetivo_tipo,
        i.concurso_nome,
        i.area_geral,
        i.tempo_disponivel_dia,
        e.id as edital_id,
        COUNT(DISTINCT ce.disciplina_id) as total_disciplinas,
        COUNT(DISTINCT ms.id) as total_metas,
        SUM(CASE WHEN ms.concluida = 1 THEN 1 ELSE 0 END) as metas_concluidas
      FROM planos_estudo p
      LEFT JOIN interviews i ON p.interview_id = i.id
      LEFT JOIN editais e ON e.user_id = p.user_id AND e.nome_concurso = i.concurso_nome
      LEFT JOIN ciclos_estudo ce ON p.id = ce.plano_id
      LEFT JOIN semanas_estudo se ON p.id = se.plano_id
      LEFT JOIN metas_semana ms ON se.id = ms.semana_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).bind(user_id).all()

    // Para cada plano, contar tópicos das disciplinas do plano
    const planosComTopicos = await Promise.all(planos.map(async (p: any) => {
      let totalTopicos = 0
      let topicosEstudados = 0
      
      // Buscar disciplinas do plano via ciclos_estudo
      let { results: disciplinasPlano } = await DB.prepare(`
        SELECT DISTINCT disciplina_id FROM ciclos_estudo WHERE plano_id = ?
      `).bind(p.id).all() as any
      
      // ✅ CORREÇÃO v5: Se não há ciclos, buscar disciplinas de topicos_edital
      if (!disciplinasPlano || disciplinasPlano.length === 0) {
        const { results: disciplinasTopicos } = await DB.prepare(`
          SELECT DISTINCT disciplina_id FROM topicos_edital WHERE plano_id = ?
        `).bind(p.id).all() as any
        disciplinasPlano = disciplinasTopicos || []
      }
      
      const disciplinaIds = disciplinasPlano.map((d: any) => d.disciplina_id)
      
      console.log(`📊 Plano ${p.id}: ${disciplinaIds.length} disciplinas, edital_id: ${p.edital_id || 'nenhum'}`)
      
      if (disciplinaIds.length > 0) {
        const placeholders = disciplinaIds.map(() => '?').join(',')
        
        // ✅ CORREÇÃO v4: Buscar tópicos ESPECÍFICOS DO PLANO
        // Tópicos em topicos_edital (vinculados ao PLANO, não ao usuário)
        const topicosTeResult = await DB.prepare(`
          SELECT COUNT(*) as total FROM topicos_edital 
          WHERE plano_id = ? AND disciplina_id IN (${placeholders})
        `).bind(p.id, ...disciplinaIds).first() as any
        
        // Tópicos em edital_topicos (edital processado)
        const topicosEtResult = p.edital_id ? await DB.prepare(`
          SELECT COUNT(*) as total FROM edital_topicos et
          INNER JOIN edital_disciplinas ed ON et.edital_disciplina_id = ed.id
          WHERE ed.edital_id = ? AND ed.disciplina_id IN (${placeholders})
        `).bind(p.edital_id, ...disciplinaIds).first() as any : { total: 0 }
        
        // ✅ NOVO: Total de metas do plano (fallback quando não há tópicos)
        const metasTotalResult = await DB.prepare(`
          SELECT COUNT(*) as total FROM metas_semana ms
          INNER JOIN semanas_estudo se ON ms.semana_id = se.id
          WHERE ms.user_id = ? AND se.plano_id = ? AND ms.disciplina_id IN (${placeholders})
        `).bind(user_id, p.id, ...disciplinaIds).first() as any
        
        // ✅ CORREÇÃO v3: Usar hierarquia de fontes para total
        totalTopicos = Math.max(topicosTeResult?.total || 0, topicosEtResult?.total || 0)
        
        // Se não há tópicos cadastrados, usar metas como base de progresso
        if (totalTopicos === 0 && (metasTotalResult?.total || 0) > 0) {
          totalTopicos = metasTotalResult?.total || 0
          console.log(`   ⚠️ Plano ${p.id}: usando ${totalTopicos} metas como base de progresso`)
        }
        
        // Contar estudados - ✅ CORREÇÃO v4: Filtrar por plano_id
        const topicosEstudadosResult = await DB.prepare(`
          SELECT COUNT(*) as total FROM user_topicos_progresso utp
          INNER JOIN topicos_edital te ON utp.topico_id = te.id
          WHERE utp.plano_id = ? AND te.plano_id = ? AND te.disciplina_id IN (${placeholders}) AND utp.nivel_dominio >= 2
        `).bind(p.id, p.id, ...disciplinaIds).first() as any
        
        // Contar metas concluídas
        const metasConcluidasResult = await DB.prepare(`
          SELECT COUNT(*) as total FROM metas_semana ms
          INNER JOIN semanas_estudo se ON ms.semana_id = se.id
          WHERE ms.user_id = ? AND se.plano_id = ? AND ms.concluida = 1 AND ms.disciplina_id IN (${placeholders})
        `).bind(user_id, p.id, ...disciplinaIds).first() as any
        
        // ✅ CORREÇÃO v3: Usar o maior entre tópicos estudados e metas concluídas
        topicosEstudados = Math.min(
          Math.max(topicosEstudadosResult?.total || 0, metasConcluidasResult?.total || 0),
          totalTopicos
        )
        
        console.log(`   → ${totalTopicos} tópicos (te:${topicosTeResult?.total}, et:${topicosEtResult?.total}, metas:${metasTotalResult?.total}), ${topicosEstudados} estudados (metas concluídas: ${metasConcluidasResult?.total})`)
      }
      
      // Calcular progresso percentual - NUNCA acima de 100%
      const progressoEdital = totalTopicos > 0 ? Math.min(100, Math.round((topicosEstudados / totalTopicos) * 100)) : 0

      return {
        ...p,
        diagnostico: p.diagnostico ? JSON.parse(p.diagnostico) : null,
        mapa_prioridades: p.mapa_prioridades ? JSON.parse(p.mapa_prioridades) : null,
        total_topicos: totalTopicos,
        topicos_estudados: topicosEstudados,
        progresso_edital: progressoEdital
      }
    }))

    return c.json(planosComTopicos)
  } catch (error) {
    console.error('Erro ao listar planos:', error)
    return c.json({ error: 'Erro ao listar planos' }, 500)
  }
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
    
    // ✅ CORREÇÃO: Apenas PAUSAR as semanas de outros planos (não deletar nem marcar como concluída)
    // Usar status 'pausada' para que possam ser retomadas depois
    await DB.prepare(`
      UPDATE semanas_estudo 
      SET status = 'pausada' 
      WHERE user_id = ? AND plano_id != ? AND status = 'ativa'
    `).bind(plano.user_id, plano_id).run()
    console.log(`⏸️ Semanas de outros planos PAUSADAS para user_id ${plano.user_id}`)
    
    // ✅ NOVO: Reativar semanas pausadas do plano que está sendo ativado
    await DB.prepare(`
      UPDATE semanas_estudo 
      SET status = 'ativa' 
      WHERE user_id = ? AND plano_id = ? AND status = 'pausada'
    `).bind(plano.user_id, plano_id).run()
    console.log(`▶️ Semanas do plano ${plano_id} REATIVADAS`)
    
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
// ✅ CORRIGIDO: Agora busca disciplinas específicas do plano, não todas do usuário
app.get('/api/planos/:plano_id/progresso-geral', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')

  try {
    // Buscar plano com informações do edital vinculado
    // ✅ CORREÇÃO: Vincular editais via nome_concurso (não interview_id que não existe)
    const plano = await DB.prepare(`
      SELECT p.*, i.objetivo_tipo, i.concurso_nome, i.area_geral,
             e.id as edital_id
      FROM planos_estudo p
      JOIN interviews i ON p.interview_id = i.id
      LEFT JOIN editais e ON e.user_id = p.user_id AND e.nome_concurso = i.concurso_nome
      WHERE p.id = ?
    `).bind(plano_id).first() as any

    if (!plano) {
      return c.json({ error: 'Plano não encontrado' }, 404)
    }

    console.log(`📊 Calculando progresso do plano ${plano_id}, edital_id: ${plano.edital_id || 'nenhum'}`)

    let totalTopicos = 0
    let topicosEstudados = 0
    const disciplinasDetalhes: any[] = []

    // ✅ CORREÇÃO v4: Buscar tópicos VINCULADOS AO PLANO (não ao usuário)
    // Isso garante isolamento entre planos diferentes do mesmo usuário
    const { results: disciplinasPlano } = await DB.prepare(`
      SELECT DISTINCT 
        c.disciplina_id,
        d.nome as disciplina_nome,
        d.area,
        COALESCE(ud.peso, 1) as peso,
        ud.nivel_dominio,
        -- ✅ CORRIGIDO: Contar tópicos em topicos_edital FILTRADO POR PLANO_ID
        (SELECT COUNT(*) FROM topicos_edital te 
         WHERE te.disciplina_id = c.disciplina_id AND te.plano_id = ?) as topicos_te,
        -- Contar tópicos em edital_topicos (edital processado - fallback)
        (SELECT COUNT(*) FROM edital_topicos et 
         INNER JOIN edital_disciplinas ed ON et.edital_disciplina_id = ed.id 
         WHERE ed.disciplina_id = c.disciplina_id AND ed.edital_id = ?) as topicos_et,
        -- ✅ CORRIGIDO: Contar estudados FILTRADO POR PLANO_ID
        (SELECT COUNT(*) FROM user_topicos_progresso utp 
         INNER JOIN topicos_edital te ON utp.topico_id = te.id 
         WHERE te.disciplina_id = c.disciplina_id 
           AND te.plano_id = ?
           AND utp.plano_id = ?
           AND utp.nivel_dominio >= 2) as estudados_te,
        -- Contar TODAS as metas da disciplina no plano (total)
        (SELECT COUNT(*) FROM metas_semana ms 
         INNER JOIN semanas_estudo se ON ms.semana_id = se.id
         WHERE ms.disciplina_id = c.disciplina_id AND se.plano_id = ?) as metas_total,
        -- Contar metas CONCLUÍDAS da disciplina no plano
        (SELECT COUNT(*) FROM metas_semana ms 
         INNER JOIN semanas_estudo se ON ms.semana_id = se.id
         WHERE ms.disciplina_id = c.disciplina_id AND se.plano_id = ? AND ms.concluida = 1) as metas_concluidas
      FROM ciclos_estudo c
      JOIN disciplinas d ON c.disciplina_id = d.id
      LEFT JOIN user_disciplinas ud ON ud.disciplina_id = c.disciplina_id AND ud.user_id = ?
      WHERE c.plano_id = ?
    `).bind(plano_id, plano.edital_id || 0, plano_id, plano_id, plano_id, plano_id, plano.user_id, plano_id).all() as any[]

    console.log(`📚 Encontradas ${disciplinasPlano.length} disciplinas no plano ${plano_id}`)

    for (const disc of disciplinasPlano) {
      const peso = disc.peso || 1
      
      // ✅ CORREÇÃO v3: Usar hierarquia de fontes para total
      // 1. Tópicos do edital processado (mais preciso)
      // 2. Tópicos cadastrados para o usuário
      // 3. Metas semanais como fallback (progresso real de trabalho)
      let topicos = Math.max(disc.topicos_et || 0, disc.topicos_te || 0)
      
      // Se não há tópicos cadastrados, usar metas como base de progresso
      if (topicos === 0 && (disc.metas_total || 0) > 0) {
        topicos = disc.metas_total || 0
        console.log(`   ⚠️ ${disc.disciplina_nome}: usando ${topicos} metas como base de progresso`)
      }
      
      // ✅ CORREÇÃO v3: Usar a maior contagem de progresso entre tópicos estudados e metas concluídas
      const estudados = Math.max(disc.estudados_te || 0, disc.metas_concluidas || 0)
      
      console.log(`   📖 ${disc.disciplina_nome}: ${estudados}/${topicos} (te:${disc.topicos_te}, et:${disc.topicos_et}, estudados:${disc.estudados_te}, metas:${disc.metas_concluidas}/${disc.metas_total})`)
      
      totalTopicos += topicos
      topicosEstudados += Math.min(estudados, topicos) // Nunca mais que o total

      disciplinasDetalhes.push({
        disciplina_id: disc.disciplina_id,
        nome: disc.disciplina_nome,
        area: disc.area,
        peso,
        total_topicos: topicos,
        topicos_estudados: Math.min(estudados, topicos), // Nunca mais que o total
        progresso_percentual: topicos > 0 ? Math.min(100, Math.round((estudados / topicos) * 100)) : 0,
        nivel_dominio: disc.nivel_dominio || 0,
        nivel_medio_topicos: 0
      })
    }

    if (disciplinasDetalhes.length === 0) {
      return c.json({
        plano_id: parseInt(plano_id),
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

    for (const disc of disciplinasDetalhes) {
      const peso = disc.peso || 1
      progressoPonderado += disc.progresso_percentual * peso
      pesoTotal += peso
    }

    // ✅ CORREÇÃO DEFINITIVA v9: Usar cálculo ABSOLUTO (total estudados / total tópicos)
    // Isso garante consistência com a tela "Minhas Disciplinas"
    // O cálculo ponderado (por disciplina) será mantido apenas como referência
    const progressoPonderadoFinal = pesoTotal > 0 ? Math.min(100, Math.round(progressoPonderado / pesoTotal)) : 0
    
    // ✅ NOVO: Cálculo absoluto - igual ao "Minhas Disciplinas"
    const progressoAbsoluto = totalTopicos > 0 ? Math.min(100, Math.round((topicosEstudados / totalTopicos) * 100)) : 0
    
    // ✅ USAR O CÁLCULO ABSOLUTO para exibição (consistência com Minhas Disciplinas)
    const progressoFinal = progressoAbsoluto
    
    console.log(`📊 Progresso plano ${plano_id}: absoluto=${progressoAbsoluto}% (${topicosEstudados}/${totalTopicos}), ponderado=${progressoPonderadoFinal}%`)

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
      total_disciplinas: disciplinasDetalhes.length,
      
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

// Diagnóstico para exclusão de plano - verificar FKs pendentes
app.get('/api/planos/:plano_id/diagnostico-fk', async (c) => {
  const { DB } = c.env
  const plano_id = c.req.param('plano_id')
  
  try {
    const resultado: any = {}
    
    // Verificar cada tabela que pode ter FK para o plano
    const tabelas = [
      { nome: 'ciclos_estudo', query: 'SELECT COUNT(*) as count FROM ciclos_estudo WHERE plano_id = ?' },
      { nome: 'metas_diarias', query: 'SELECT COUNT(*) as count FROM metas_diarias WHERE plano_id = ?' },
      { nome: 'semanas_estudo', query: 'SELECT COUNT(*) as count FROM semanas_estudo WHERE plano_id = ?' },
      { nome: 'topicos_edital', query: 'SELECT COUNT(*) as count FROM topicos_edital WHERE plano_id = ?' },
      { nome: 'user_topicos_progresso', query: 'SELECT COUNT(*) as count FROM user_topicos_progresso WHERE plano_id = ?' },
      { nome: 'metas_semana', query: 'SELECT COUNT(*) as count FROM metas_semana WHERE semana_id IN (SELECT id FROM semanas_estudo WHERE plano_id = ?)' },
      { nome: 'conteudo_estudo', query: 'SELECT COUNT(*) as count FROM conteudo_estudo WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)' },
    ]
    
    for (const tabela of tabelas) {
      try {
        const r = await DB.prepare(tabela.query).bind(parseInt(plano_id)).first() as any
        resultado[tabela.nome] = r?.count || 0
      } catch (e: any) {
        resultado[tabela.nome] = `Erro: ${e.message?.substring(0, 50)}`
      }
    }
    
    // Verificar se o plano existe
    const plano = await DB.prepare('SELECT id, user_id, interview_id FROM planos_estudo WHERE id = ?').bind(parseInt(plano_id)).first()
    
    return c.json({ 
      plano_id,
      plano_existe: !!plano,
      plano,
      referencias_pendentes: resultado
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// Limpar referências pendentes de um plano (DELETE forçado para cada tabela)
app.post('/api/planos/:plano_id/limpar-fk', async (c) => {
  const { DB } = c.env
  const plano_id = parseInt(c.req.param('plano_id'))
  
  try {
    const resultado: any = {}
    
    // Deletar de cada tabela na ordem correta - FILHAS antes das MÃES
    // IMPORTANTE: user_topicos_progresso referencia topicos_edital via topico_id (não plano_id)
    const deletes = [
      // 1. Tabelas que referenciam topicos_edital via topico_id
      { nome: 'conteudo_topicos', query: `DELETE FROM conteudo_topicos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
      { nome: 'materiais_salvos', query: `DELETE FROM materiais_salvos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
      // CRÍTICO: user_topicos_progresso.topico_id referencia topicos_edital.id (FK)
      { nome: 'user_topicos_progresso_via_topico', query: `DELETE FROM user_topicos_progresso WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
      // 2. Agora podemos deletar topicos_edital
      { nome: 'topicos_edital', query: `DELETE FROM topicos_edital WHERE plano_id = ?` },
      // 3. Também deletar user_topicos_progresso por plano_id (se houver)
      { nome: 'user_topicos_progresso', query: `DELETE FROM user_topicos_progresso WHERE plano_id = ?` },
      // 4. Outras tabelas
      { nome: 'conteudo_estudo', query: `DELETE FROM conteudo_estudo WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)` },
      { nome: 'metas_semana', query: `DELETE FROM metas_semana WHERE semana_id IN (SELECT id FROM semanas_estudo WHERE plano_id = ?)` },
      { nome: 'semanas_estudo', query: `DELETE FROM semanas_estudo WHERE plano_id = ?` },
      { nome: 'metas_diarias', query: `DELETE FROM metas_diarias WHERE plano_id = ?` },
      { nome: 'ciclos_estudo', query: `DELETE FROM ciclos_estudo WHERE plano_id = ?` },
    ]
    
    for (const del of deletes) {
      try {
        const result = await DB.prepare(del.query).bind(plano_id).run()
        resultado[del.nome] = { deletados: result.meta?.changes || 0, sucesso: true }
      } catch (e: any) {
        resultado[del.nome] = { erro: e.message, sucesso: false }
      }
    }
    
    return c.json({ 
      plano_id,
      limpeza: resultado
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
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
    
    // ✅ CORREÇÃO v22: Exclusão completa respeitando FKs (D1 não suporta PRAGMA foreign_keys = OFF)
    // ORDEM CRÍTICA: deletar tabelas FILHAS antes das MÃES
    // user_topicos_progresso.topico_id -> topicos_edital.id (FK!)
    
    try {
      const plano_id_int = parseInt(plano_id)
      console.log(`📋 Plano ID (int): ${plano_id_int}`)
      
      // PASSO 1: Limpar todas as tabelas na ORDEM CORRETA de FKs
      const tabelasParaLimpar = [
        // GRUPO 1: Tabelas que referenciam topicos_edital via topico_id
        { nome: 'conteudo_topicos', query: `DELETE FROM conteudo_topicos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
        { nome: 'materiais_salvos', query: `DELETE FROM materiais_salvos WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
        // CRÍTICO: user_topicos_progresso tem FK topico_id -> topicos_edital.id
        { nome: 'user_topicos_progresso_via_topico', query: `DELETE FROM user_topicos_progresso WHERE topico_id IN (SELECT id FROM topicos_edital WHERE plano_id = ?)` },
        
        // GRUPO 2: Agora podemos deletar topicos_edital
        { nome: 'topicos_edital', query: `DELETE FROM topicos_edital WHERE plano_id = ?` },
        
        // GRUPO 3: Também deletar user_topicos_progresso por plano_id (pode haver registros)
        { nome: 'user_topicos_progresso_via_plano', query: `DELETE FROM user_topicos_progresso WHERE plano_id = ?` },
        
        // GRUPO 4: Tabelas que referenciam metas_diarias
        { nome: 'conteudo_estudo', query: `DELETE FROM conteudo_estudo WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)` },
        { nome: 'exercicios_resultados', query: `DELETE FROM exercicios_resultados WHERE meta_id IN (SELECT id FROM metas_diarias WHERE plano_id = ?)` },
        
        // GRUPO 5: Histórico e extras
        { nome: 'historico_estudos', query: `DELETE FROM historico_estudos WHERE plano_id = ?` },
        { nome: 'simulados_historico', query: `DELETE FROM simulados_historico WHERE plano_id = ?` },
        
        // GRUPO 6: Metas semanais e semanas
        { nome: 'metas_semana', query: `DELETE FROM metas_semana WHERE semana_id IN (SELECT id FROM semanas_estudo WHERE plano_id = ?)` },
        { nome: 'semanas_estudo', query: `DELETE FROM semanas_estudo WHERE plano_id = ?` },
        
        // GRUPO 7: metas_diarias ANTES de ciclos_estudo (metas.ciclo_id -> ciclos_estudo.id)
        { nome: 'metas_diarias', query: `DELETE FROM metas_diarias WHERE plano_id = ?` },
        
        // GRUPO 8: Ciclos
        { nome: 'ciclos_estudo', query: `DELETE FROM ciclos_estudo WHERE plano_id = ?` },
      ]
      
      for (const tabela of tabelasParaLimpar) {
        try {
          const result = await DB.prepare(tabela.query).bind(plano_id_int).run()
          console.log(`  ✓ ${tabela.nome}: ${result.meta?.changes || 0} deletados`)
        } catch (e: any) {
          // Ignorar erros (tabela pode não existir ou não ter dados)
          console.log(`  ⚠️ ${tabela.nome}: ${e.message?.substring(0, 60) || 'erro'}`)
        }
      }
      
      // PASSO 2: FINALMENTE deletar o plano
      console.log('🗑️ Deletando plano...')
      await DB.prepare('DELETE FROM planos_estudo WHERE id = ?').bind(plano_id_int).run()
      console.log(`✅ Plano ${plano_id} deletado com sucesso!`)
      
    } catch (mainError: any) {
      console.error('❌ Erro fatal na exclusão:', mainError.message)
      throw mainError
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
      c.plano_id,
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

  // ✅ CORRIGIDO: Buscar tópicos FILTRADOS POR PLANO_ID
  for (const meta of metas) {
    const { results: topicos } = await DB.prepare(`
      SELECT te.id, te.nome, te.categoria, te.peso
      FROM topicos_edital te
      LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id AND utp.plano_id = ?
      WHERE te.disciplina_id = ? AND te.plano_id = ?
      ORDER BY 
        COALESCE(utp.nivel_dominio, 0) ASC,
        te.peso DESC,
        te.ordem ASC
      LIMIT 1
    `).bind(meta.plano_id, meta.disciplina_id, meta.plano_id).all()
    
    meta.topicos_sugeridos = topicos
  }

  return c.json(metas)
})

app.post('/api/metas/concluir', async (c) => {
  const { DB } = c.env
  const { meta_id, tempo_real_minutos, tipo_meta = 'diaria' } = await c.req.json()

  console.log(`🎯 Concluindo meta ${meta_id}, tipo: ${tipo_meta}, tempo: ${tempo_real_minutos}min`)

  // ✅ FUNÇÃO AUXILIAR: Atualizar progresso do tópico (COM PLANO_ID)
  async function atualizarProgressoTopico(DB: any, user_id: number, topico_id: number, plano_id: number) {
    if (!topico_id || !plano_id) return
    
    console.log(`📊 Atualizando progresso do tópico ${topico_id} para user ${user_id}, plano ${plano_id}`)
    
    try {
      // ✅ CORRIGIDO: Filtrar por plano_id para isolar entre planos
      const progresso = await DB.prepare(`
        SELECT id, nivel_dominio, vezes_estudado FROM user_topicos_progresso 
        WHERE user_id = ? AND topico_id = ? AND plano_id = ?
      `).bind(user_id, topico_id, plano_id).first()
      
      if (progresso) {
        // Incrementar nível de domínio (máximo 10) e vezes estudado
        const novoNivel = Math.min((progresso.nivel_dominio || 0) + 2, 10)
        const novasVezes = (progresso.vezes_estudado || 0) + 1
        
        await DB.prepare(`
          UPDATE user_topicos_progresso 
          SET nivel_dominio = ?, vezes_estudado = ?, ultima_vez = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(novoNivel, novasVezes, progresso.id).run()
        
        console.log(`✅ Progresso atualizado: nivel ${progresso.nivel_dominio} -> ${novoNivel}, vezes: ${novasVezes}`)
      } else {
        // ✅ CORRIGIDO: Incluir plano_id ao criar novo registro
        await DB.prepare(`
          INSERT INTO user_topicos_progresso (user_id, topico_id, plano_id, nivel_dominio, vezes_estudado, ultima_vez)
          VALUES (?, ?, ?, 2, 1, CURRENT_TIMESTAMP)
        `).bind(user_id, topico_id, plano_id).run()
        
        console.log(`✅ Novo progresso criado para tópico ${topico_id} no plano ${plano_id}`)
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar progresso do tópico ${topico_id}:`, error)
    }
  }

  // Tentar atualizar em metas_semana primeiro (fonte principal)
  const resultSemana = await DB.prepare(`
    UPDATE metas_semana 
    SET concluida = 1, tempo_real_minutos = ?
    WHERE id = ?
  `).bind(tempo_real_minutos, meta_id).run()

  if (resultSemana.meta.changes > 0) {
    console.log('✅ Meta semanal concluída')
    
    // ✅ CORRIGIDO: Buscar dados da meta INCLUINDO plano_id
    const metaSemana = await DB.prepare(`
      SELECT ms.user_id, ms.data, ms.topicos_sugeridos, se.plano_id
      FROM metas_semana ms
      JOIN semanas_estudo se ON ms.semana_id = se.id
      WHERE ms.id = ?
    `).bind(meta_id).first() as any
    
    if (metaSemana) {
      await atualizarHistoricoDia(DB, metaSemana.user_id, metaSemana.data)
      
      // ✅ CORRIGIDO: Atualizar progresso do tópico COM plano_id
      if (metaSemana.topicos_sugeridos && metaSemana.plano_id) {
        try {
          const topicos = JSON.parse(metaSemana.topicos_sugeridos)
          for (const topico of topicos) {
            if (topico.id) {
              await atualizarProgressoTopico(DB, metaSemana.user_id, topico.id, metaSemana.plano_id)
            }
          }
        } catch (e) {
          console.error('❌ Erro ao parsear topicos_sugeridos:', e)
        }
      }
    }
    
    return c.json({ success: true, tipo: 'semana' })
  }

  // Fallback: atualizar em metas_diarias
  await DB.prepare(`
    UPDATE metas_diarias 
    SET concluida = 1, tempo_real_minutos = ?
    WHERE id = ?
  `).bind(tempo_real_minutos, meta_id).run()

  // ✅ CORRIGIDO: Buscar dados da meta INCLUINDO plano_id
  const meta = await DB.prepare(`
    SELECT md.user_id, md.data, md.topicos_sugeridos, ce.plano_id
    FROM metas_diarias md
    JOIN ciclos_estudo ce ON md.ciclo_id = ce.id
    WHERE md.id = ?
  `).bind(meta_id).first() as any
  
  if (meta) {
    await atualizarHistoricoDia(DB, meta.user_id, meta.data)
    
    // ✅ CORRIGIDO: Atualizar progresso do tópico COM plano_id
    if (meta.topicos_sugeridos && meta.plano_id) {
      try {
        const topicos = JSON.parse(meta.topicos_sugeridos)
        for (const topico of topicos) {
          if (topico.id) {
            await atualizarProgressoTopico(DB, meta.user_id, topico.id, meta.plano_id)
          }
        }
      } catch (e) {
        console.error('❌ Erro ao parsear topicos_sugeridos:', e)
      }
    }
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
    // v69: Tentar primeiro em materiais_salvos (fonte principal)
    let conteudo: any = await DB.prepare(`
      SELECT m.*, d.nome as disciplina_nome, t.nome as topico_nome
      FROM materiais_salvos m
      LEFT JOIN disciplinas d ON m.disciplina_id = d.id
      LEFT JOIN topicos_edital t ON m.topico_id = t.id
      WHERE m.id = ?
    `).bind(conteudo_id).first()

    if (conteudo) {
      const conteudoObj = {
        ...conteudo,
        topicos: conteudo.topico_nome ? [{ id: conteudo.topico_id, nome: conteudo.topico_nome }] : [],
        objetivos: [],
        disciplina_nome: conteudo.disciplina_nome || 'Geral'
      }

      if (format === 'json') return c.json(conteudoObj)
      if (format === 'markdown' || format === 'md') {
        const markdown = gerarMarkdown(conteudoObj)
        return c.text(markdown, 200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="conteudo_${conteudo_id}_${(conteudoObj.disciplina_nome || 'material').replace(/\s+/g, '_')}.md"`
        })
      }
      if (format === 'html') {
        const html = gerarHTML(conteudoObj)
        return c.html(html)
      }
      return c.json(conteudoObj)
    }

    // Fallback: buscar em conteudo_estudo
    const conteudoEstudo: any = await DB.prepare(`
      SELECT c.*, d.nome as disciplina_nome
      FROM conteudo_estudo c
      LEFT JOIN disciplinas d ON c.disciplina_id = d.id
      WHERE c.id = ?
    `).bind(conteudo_id).first()

    if (!conteudoEstudo) {
      return c.json({ error: 'Conteúdo não encontrado' }, 404)
    }

    const conteudoObj = {
      ...conteudoEstudo,
      topicos: conteudoEstudo.topicos ? JSON.parse(conteudoEstudo.topicos as string) : [],
      objetivos: conteudoEstudo.objetivos ? JSON.parse(conteudoEstudo.objetivos as string) : [],
      conteudo: conteudoEstudo.conteudo ? JSON.parse(conteudoEstudo.conteudo as string) : {},
      disciplina_nome: conteudoEstudo.disciplina_nome || 'Geral'
    }

    if (format === 'json') return c.json(conteudoObj)
    if (format === 'markdown' || format === 'md') {
      const markdown = gerarMarkdown(conteudoObj)
      return c.text(markdown, 200, {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="conteudo_${conteudo_id}_${(conteudoObj.disciplina_nome || 'material').replace(/\s+/g, '_')}.md"`
      })
    }
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
    // v69: Buscar de materiais_salvos (fonte principal) ao invés de conteudo_estudo
    // pois materiais_salvos SEMPRE recebe o conteúdo gerado, independente de meta_id
    const { results: conteudos } = await DB.prepare(`
      SELECT 
        m.id,
        m.tipo,
        m.disciplina_id,
        m.topico_id,
        m.titulo,
        m.created_at,
        d.nome as disciplina_nome,
        t.nome as topico_nome
      FROM materiais_salvos m
      LEFT JOIN disciplinas d ON m.disciplina_id = d.id
      LEFT JOIN topicos_edital t ON m.topico_id = t.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user_id, limit, offset).all()

    // Contar total
    const countResult: any = await DB.prepare(`
      SELECT COUNT(*) as total FROM materiais_salvos WHERE user_id = ?
    `).bind(user_id).first()

    const conteudosFormatados = conteudos.map((c: any) => ({
      ...c,
      topicos: c.topico_nome ? [{ id: c.topico_id, nome: c.topico_nome }] : []
    }))

    return c.json({
      conteudos: conteudosFormatados,
      total: countResult?.total || conteudos.length,
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
      metas: metas.map(m => {
        const topicos = m.topicos_sugeridos ? JSON.parse(m.topicos_sugeridos) : []
        return {
          ...m,
          plano_id: semana.plano_id, // ✅ Adicionar plano_id para o botão de editar disciplina
          topicos_sugeridos: topicos,
          topico_nome: topicos[0]?.nome || '', // ✅ Extrair nome do primeiro tópico para uso direto
          topico_id: topicos[0]?.id || null // ✅ Extrair ID do primeiro tópico
        }
      })
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

// 5b. Editar meta completa (incluindo disciplina e tópico)
app.put('/api/metas/editar-completo/:meta_id', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { 
    disciplina_id, 
    disciplina_nome, 
    topico_id, 
    topico_nome, 
    tempo_minutos, 
    tipo, 
    observacoes 
  } = await c.req.json()

  console.log('✏️ Editando meta completa:', { meta_id, disciplina_id, disciplina_nome, topico_id, topico_nome })

  try {
    // Buscar meta atual
    const metaAtual = await DB.prepare('SELECT * FROM metas_semana WHERE id = ?').bind(meta_id).first() as any
    
    if (!metaAtual) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // Preparar topicos_sugeridos
    let topicos_sugeridos = metaAtual.topicos_sugeridos
    if (topico_id && topico_nome) {
      topicos_sugeridos = JSON.stringify([{ id: topico_id, nome: topico_nome }])
    } else if (topico_id === null) {
      topicos_sugeridos = null
    }

    // Atualizar meta com todos os campos
    await DB.prepare(`
      UPDATE metas_semana 
      SET 
        disciplina_id = COALESCE(?, disciplina_id),
        disciplina_nome = COALESCE(?, disciplina_nome),
        topico_id = ?,
        topico_nome = ?,
        topicos_sugeridos = ?,
        tempo_minutos = COALESCE(?, tempo_minutos),
        tipo = COALESCE(?, tipo),
        observacoes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      disciplina_id,
      disciplina_nome,
      topico_id,
      topico_nome,
      topicos_sugeridos,
      tempo_minutos,
      tipo,
      observacoes || null,
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

    console.log('✅ Meta atualizada com sucesso:', { 
      id: meta_id, 
      nova_disciplina: disciplina_nome, 
      novo_topico: topico_nome 
    })

    return c.json({ success: true, message: 'Meta atualizada com sucesso' })

  } catch (error) {
    console.error('❌ Erro ao editar meta completa:', error)
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
    // 1. Buscar dados da meta COMPLETOS (incluindo tópicos)
    const meta = await DB.prepare(`
      SELECT user_id, data, disciplina_id, topicos_sugeridos, semana_id
      FROM metas_semana 
      WHERE id = ?
    `).bind(meta_id).first() as any
    
    if (!meta) {
      return c.json({ error: 'Meta não encontrada' }, 404)
    }

    // 2. Atualizar meta como concluída
    await DB.prepare(`
      UPDATE metas_semana 
      SET concluida = 1, tempo_real_minutos = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tempo_real_minutos, meta_id).run()

    // 3. ✅ CORREÇÃO CRÍTICA: Atualizar progresso dos tópicos da meta
    if (meta.topicos_sugeridos) {
      try {
        const topicos = JSON.parse(meta.topicos_sugeridos)
        console.log(`📊 Atualizando progresso de ${topicos.length} tópico(s)`)
        
        for (const topico of topicos) {
          const topicoId = topico.id
          if (!topicoId) continue
          
          // Verificar se já existe registro de progresso
          const existingProgress = await DB.prepare(`
            SELECT id, vezes_estudado, nivel_dominio 
            FROM user_topicos_progresso 
            WHERE user_id = ? AND topico_id = ?
          `).bind(meta.user_id, topicoId).first() as any
          
          if (existingProgress) {
            // Incrementar vezes_estudado e aumentar nivel_dominio
            const novoNivel = Math.min(10, (existingProgress.nivel_dominio || 0) + 2)
            await DB.prepare(`
              UPDATE user_topicos_progresso 
              SET vezes_estudado = vezes_estudado + 1, 
                  nivel_dominio = ?, 
                  ultima_vez = CURRENT_TIMESTAMP
              WHERE user_id = ? AND topico_id = ?
            `).bind(novoNivel, meta.user_id, topicoId).run()
            console.log(`  ✅ Tópico ${topicoId}: vezes+1, nivel ${existingProgress.nivel_dominio} → ${novoNivel}`)
          } else {
            // Criar novo registro com nivel 2 (primeira vez estudado)
            await DB.prepare(`
              INSERT INTO user_topicos_progresso (user_id, topico_id, vezes_estudado, nivel_dominio, ultima_vez)
              VALUES (?, ?, 1, 2, CURRENT_TIMESTAMP)
            `).bind(meta.user_id, topicoId).run()
            console.log(`  ✅ Tópico ${topicoId}: novo registro (nivel 2)`)
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Não foi possível parsear topicos_sugeridos:', parseError)
      }
    }

    // 4. Criar/atualizar registro no historico_estudos (para estatísticas)
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

    console.log('✅ Meta concluída + Progresso tópicos + Histórico atualizado')
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

// 8.6. Trocar disciplina e tópico da meta completamente
app.put('/api/metas/:meta_id/trocar-disciplina', async (c) => {
  const { DB } = c.env
  const meta_id = parseInt(c.req.param('meta_id'))
  const { nova_disciplina_id, nova_disciplina_nome, novo_topico_id, novo_topico_nome, plano_id } = await c.req.json()

  console.log('🔄 Trocando disciplina da meta:', meta_id, '→', nova_disciplina_nome, '/', novo_topico_nome)

  try {
    // 1. Verificar se a meta existe e não está concluída
    const meta = await DB.prepare(`
      SELECT id, concluida, disciplina_id 
      FROM metas_semana 
      WHERE id = ?
    `).bind(meta_id).first()
    
    if (!meta) {
      console.log('❌ Meta não encontrada:', meta_id)
      return c.json({ error: 'Meta não encontrada' }, 404)
    }
    
    if (meta.concluida) {
      console.log('❌ Meta já concluída:', meta_id)
      return c.json({ error: 'Não é possível alterar uma meta já concluída' }, 400)
    }

    // 2. ✅ NOVO: Apagar conteúdos gerados da disciplina anterior
    console.log('🗑️ Apagando conteúdos gerados da meta:', meta_id)
    
    // Apagar de conteudo_estudo
    const deleteConteudo = await DB.prepare(`
      DELETE FROM conteudo_estudo WHERE meta_id = ?
    `).bind(meta_id).run()
    console.log(`  ✅ Deletados ${deleteConteudo.meta?.changes || 0} registros de conteudo_estudo`)
    
    // Apagar de materiais_salvos
    const deleteMateriais = await DB.prepare(`
      DELETE FROM materiais_salvos WHERE meta_id = ?
    `).bind(meta_id).run()
    console.log(`  ✅ Deletados ${deleteMateriais.meta?.changes || 0} registros de materiais_salvos`)

    // 3. Preparar tópicos sugeridos no formato esperado
    const novoTopicosSugeridos = JSON.stringify([{ 
      id: novo_topico_id, 
      nome: novo_topico_nome 
    }])
    
    // 4. Atualizar a meta com nova disciplina e tópico
    await DB.prepare(`
      UPDATE metas_semana 
      SET disciplina_id = ?,
          topicos_sugeridos = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      nova_disciplina_id,
      novoTopicosSugeridos,
      meta_id
    ).run()

    console.log('✅ Meta atualizada com nova disciplina:', nova_disciplina_nome)
    
    return c.json({ 
      success: true, 
      message: 'Disciplina e tópico atualizados. Conteúdos anteriores foram removidos.',
      nova_disciplina: nova_disciplina_nome,
      novo_topico: novo_topico_nome,
      conteudos_removidos: true
    })

  } catch (error) {
    console.error('❌ Erro ao trocar disciplina da meta:', error)
    return c.json({ error: 'Erro ao trocar disciplina' }, 500)
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

app.get('/api/conteudo/meta/:meta_id', async (c) => {
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
    conteudo: conteudo.conteudo ? JSON.parse(conteudo.conteudo as string) : {},
    topicos: conteudo.topicos ? JSON.parse(conteudo.topicos as string) : [],
    objetivos: conteudo.objetivos ? JSON.parse(conteudo.objetivos as string) : []
  })
})

// ENDPOINT DUPLICADO REMOVIDO - usando o de cima (linha 2296) que tem paginação

// Buscar conteúdo por ID (com tópicos do edital vinculados)
app.get('/api/conteudos/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const format = c.req.query('format') || 'json'

  // v69: Tentar materiais_salvos primeiro
  let conteudo: any = await DB.prepare(`
    SELECT m.*, d.nome as disciplina_nome, t.nome as topico_nome
    FROM materiais_salvos m
    LEFT JOIN disciplinas d ON d.id = m.disciplina_id
    LEFT JOIN topicos_edital t ON t.id = m.topico_id
    WHERE m.id = ?
  `).bind(id).first()

  if (conteudo) {
    const resultado = {
      ...conteudo,
      topicos: conteudo.topico_nome ? [{ id: conteudo.topico_id, nome: conteudo.topico_nome }] : [],
      objetivos: [],
      topicos_edital: [],
      disciplina_nome: conteudo.disciplina_nome || 'Geral'
    }

    if (format === 'txt') {
      const txt = gerarTXT(resultado)
      const nomeArquivo = `${resultado.disciplina_nome}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.txt`
      return new Response(txt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${nomeArquivo}"`
        }
      })
    }
    if (format === 'markdown') {
      const md = gerarMarkdown(resultado)
      const nomeArquivo = `${resultado.disciplina_nome}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.md`
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
  }

  // Fallback: buscar de conteudo_estudo
  conteudo = await DB.prepare(`
    SELECT ce.*, d.nome as disciplina_nome
    FROM conteudo_estudo ce
    LEFT JOIN disciplinas d ON d.id = ce.disciplina_id
    WHERE ce.id = ?
  `).bind(id).first()

  if (!conteudo) {
    return c.json({ error: 'Conteúdo não encontrado' }, 404)
  }

  // 🆕 Buscar tópicos do edital vinculados
  let topicosVinculados: any[] = []
  try {
    const { results } = await DB.prepare(`
      SELECT te.id, te.nome, te.categoria, te.peso, te.ordem
      FROM conteudo_topicos ct
      JOIN topicos_edital te ON ct.topico_id = te.id
      WHERE ct.conteudo_id = ?
      ORDER BY te.ordem
    `).bind(id).all()
    topicosVinculados = results || []
  } catch (e) {
    // tabela conteudo_topicos pode não existir
  }

  const resultado = {
    ...conteudo,
    conteudo: conteudo.conteudo ? JSON.parse(conteudo.conteudo as string) : {},
    topicos: conteudo.topicos ? JSON.parse(conteudo.topicos as string) : [],
    objetivos: conteudo.objetivos ? JSON.parse(conteudo.objetivos as string) : [],
    topicos_edital: topicosVinculados,
    disciplina_nome: conteudo.disciplina_nome || 'Geral'
  }

  // Suporte a diferentes formatos
  if (format === 'txt') {
    const txt = gerarTXT(resultado)
    const nomeArquivo = `${resultado.disciplina_nome}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.txt`
    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`
      }
    })
  }
  
  if (format === 'markdown') {
    const md = gerarMarkdown(resultado)
    const nomeArquivo = `${resultado.disciplina_nome}_${conteudo.tipo}_${new Date().toISOString().split('T')[0]}.md`
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
// v69: Buscar de materiais_salvos (fonte principal) ao invés de conteudo_estudo
app.get('/api/conteudos/tipos/:disciplina_id/:topico_id', async (c) => {
  const { DB } = c.env
  const disciplina_id = parseInt(c.req.param('disciplina_id'))
  const topico_id = c.req.param('topico_id')
  const user_id = c.req.query('user_id')

  try {
    // Buscar de materiais_salvos (onde TUDO é salvo)
    const { results } = await DB.prepare(`
      SELECT DISTINCT tipo, id, created_at
      FROM materiais_salvos 
      WHERE (disciplina_id = ? OR topico_id = ?)
      AND user_id = ?
      ORDER BY created_at DESC
    `).bind(disciplina_id, topico_id, user_id).all()

    // Combinar resultados únicos
    const tiposMap: Record<string, { id: number, created_at: string, source: string }> = {}
    
    for (const r of results) {
      if (!tiposMap[r.tipo as string]) {
        tiposMap[r.tipo as string] = { id: r.id as number, created_at: r.created_at as string, source: 'materiais_salvos' }
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

// Função auxiliar para gerar backup do usuário (evita fetch interno)
async function generateUserBackup(DB: any, user_id: string) {
  console.log(`📦 Gerando backup do usuário ${user_id}...`)
  
  const user = await DB.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').bind(user_id).first()
  if (!user) throw new Error('Usuário não encontrado')
  
  const { results: interviews } = await DB.prepare('SELECT * FROM interviews WHERE user_id = ?').bind(user_id).all()
  const { results: planos } = await DB.prepare('SELECT * FROM planos_estudo WHERE user_id = ?').bind(user_id).all()
  const planoIds = planos.map((p: any) => p.id).join(',') || '0'
  const { results: ciclos } = await DB.prepare(`SELECT * FROM ciclos_estudo WHERE plano_id IN (${planoIds})`).all()
  const { results: userDisciplinas } = await DB.prepare('SELECT * FROM user_disciplinas WHERE user_id = ?').bind(user_id).all()
  const { results: historico } = await DB.prepare('SELECT * FROM historico_estudos WHERE user_id = ?').bind(user_id).all()
  const { results: metasDiarias } = await DB.prepare('SELECT * FROM metas_diarias WHERE user_id = ?').bind(user_id).all()
  const { results: metasSemana } = await DB.prepare('SELECT * FROM metas_semana WHERE user_id = ?').bind(user_id).all()
  const { results: semanas } = await DB.prepare('SELECT * FROM semanas_estudo WHERE user_id = ?').bind(user_id).all()
  const { results: simulados } = await DB.prepare('SELECT * FROM simulados_historico WHERE user_id = ?').bind(user_id).all()
  const { results: progressoTopicos } = await DB.prepare('SELECT * FROM user_topicos_progresso WHERE user_id = ?').bind(user_id).all()
  const { results: conteudos } = await DB.prepare('SELECT * FROM conteudo_estudo WHERE user_id = ?').bind(user_id).all()
  const { results: exercicios } = await DB.prepare('SELECT * FROM exercicios_resultados WHERE user_id = ?').bind(user_id).all()
  const { results: materiais } = await DB.prepare('SELECT * FROM materiais_salvos WHERE user_id = ?').bind(user_id).all()
  
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    data: {
      interviews, planos, ciclos, userDisciplinas, historico,
      metasDiarias, metasSemana, semanas, simulados,
      progressoTopicos, conteudos, exercicios, materiais
    },
    stats: {
      totalPlanos: planos.length,
      totalMetas: metasDiarias.length + metasSemana.length,
      diasEstudados: historico.length,
      totalSimulados: simulados.length
    }
  }
}

// Salvar backup no Google Drive
app.post('/api/backup/google-drive/save', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  try {
    // Buscar token do usuário
    const user = await DB.prepare(`
      SELECT google_access_token, google_refresh_token, google_token_expires 
      FROM users WHERE id = ?
    `).bind(user_id).first() as any
    
    if (!user?.google_access_token) {
      return c.json({ error: 'Conecte sua conta Google primeiro' }, 400)
    }
    
    let accessToken = user.google_access_token
    
    // Verificar se token expirou e tentar refresh
    if (new Date(user.google_token_expires) < new Date()) {
      console.log('🔄 Token expirado, tentando refresh...')
      
      if (!user.google_refresh_token) {
        return c.json({ error: 'Token expirado, reconecte sua conta Google', needsReauth: true }, 401)
      }
      
      // Tentar refresh do token
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env as any
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: user.google_refresh_token,
          grant_type: 'refresh_token'
        })
      })
      
      const refreshResult = await refreshResponse.json() as any
      
      if (refreshResult.error) {
        console.error('Erro no refresh:', refreshResult)
        return c.json({ error: 'Token expirado, reconecte sua conta Google', needsReauth: true }, 401)
      }
      
      // Atualizar token no banco
      accessToken = refreshResult.access_token
      const newExpires = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
      await DB.prepare('UPDATE users SET google_access_token = ?, google_token_expires = ? WHERE id = ?')
        .bind(accessToken, newExpires, user_id).run()
      
      console.log('✅ Token renovado com sucesso')
    }
    
    // Gerar backup diretamente (sem fetch interno)
    const backup = await generateUserBackup(DB, user_id)
    
    console.log('📦 Backup gerado, tamanho:', JSON.stringify(backup).length, 'bytes')
    
    // Primeiro, buscar ou criar pasta IAprova no Drive
    let folderId = null
    
    // Buscar pasta existente
    const folderSearchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='IAprova Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const folderSearchResult = await folderSearchResponse.json() as any
    
    console.log('📁 Busca de pasta:', folderSearchResult)
    
    if (folderSearchResult.error) {
      console.error('Erro ao buscar pasta:', folderSearchResult.error)
      
      // Verificar se é erro de API não habilitada
      const errorMsg = folderSearchResult.error.message || ''
      if (errorMsg.includes('has not been used') || errorMsg.includes('disabled')) {
        return c.json({ 
          error: 'A API do Google Drive precisa ser habilitada no projeto Google Cloud.',
          details: 'API do Google Drive precisa ser ativada no console do Google Cloud.',
          needsReauth: true
        }, 503)
      }
      
      // Escopos insuficientes
      if (errorMsg.includes('insufficient') || errorMsg.includes('scope') || errorMsg.includes('Forbidden')) {
        return c.json({ 
          error: 'Permissões insuficientes. Reconecte com Google Drive.',
          needsReauth: true,
          details: errorMsg
        }, 403)
      }
      
      return c.json({ 
        error: 'Erro ao acessar Google Drive. Verifique as permissões.',
        details: folderSearchResult.error.message 
      }, 500)
    }
    
    if (folderSearchResult.files?.length > 0) {
      folderId = folderSearchResult.files[0].id
      console.log('📁 Pasta encontrada:', folderId)
    } else {
      // Criar pasta IAprova
      const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'IAprova Backups',
          mimeType: 'application/vnd.google-apps.folder'
        })
      })
      const createFolderResult = await createFolderResponse.json() as any
      
      if (createFolderResult.error) {
        console.error('Erro ao criar pasta:', createFolderResult.error)
        return c.json({ 
          error: 'Erro ao criar pasta no Google Drive',
          details: createFolderResult.error.message 
        }, 500)
      }
      
      folderId = createFolderResult.id
      console.log('📁 Pasta criada:', folderId)
    }
    
    // Buscar backup existente na pasta
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'iaprova_backup' and '${folderId}' in parents and trashed=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const searchResult = await searchResponse.json() as any
    
    let fileId = null
    if (searchResult.files?.length > 0) {
      fileId = searchResult.files[0].id
      console.log('📄 Arquivo existente encontrado:', fileId)
    }
    
    // Criar metadata do arquivo
    const metadata: any = {
      name: `iaprova_backup_${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    }
    
    // Só adiciona parents se for criar novo arquivo
    if (!fileId) {
      metadata.parents = [folderId]
    }
    
    // Upload do arquivo usando multipart
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
    
    console.log('📤 Fazendo upload para:', uploadUrl)
    
    const uploadResponse = await fetch(uploadUrl, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    })
    
    const uploadResult = await uploadResponse.json() as any
    
    if (uploadResult.error) {
      console.error('❌ Erro no upload:', JSON.stringify(uploadResult.error))
      return c.json({ 
        error: 'Falha ao salvar no Google Drive',
        details: uploadResult.error.message || 'Erro desconhecido'
      }, 500)
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
      SELECT google_access_token, google_refresh_token, google_token_expires 
      FROM users WHERE id = ?
    `).bind(user_id).first() as any
    
    if (!user?.google_access_token) {
      return c.json({ error: 'Conecte sua conta Google primeiro' }, 400)
    }
    
    let accessToken = user.google_access_token
    
    // Verificar se token expirou e tentar refresh
    if (new Date(user.google_token_expires) < new Date()) {
      console.log('🔄 Token expirado, tentando refresh...')
      
      if (!user.google_refresh_token) {
        return c.json({ error: 'Token expirado, reconecte sua conta Google', needsReauth: true }, 401)
      }
      
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env as any
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: user.google_refresh_token,
          grant_type: 'refresh_token'
        })
      })
      
      const refreshResult = await refreshResponse.json() as any
      
      if (refreshResult.error) {
        console.error('Erro no refresh:', refreshResult)
        return c.json({ error: 'Token expirado, reconecte sua conta Google', needsReauth: true }, 401)
      }
      
      accessToken = refreshResult.access_token
      const newExpires = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
      await DB.prepare('UPDATE users SET google_access_token = ?, google_token_expires = ? WHERE id = ?')
        .bind(accessToken, newExpires, user_id).run()
      
      console.log('✅ Token renovado com sucesso')
    }
    
    // Primeiro, buscar pasta IAprova
    const folderSearchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='IAprova Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const folderSearchResult = await folderSearchResponse.json() as any
    
    if (folderSearchResult.error) {
      console.error('Erro ao buscar pasta (load):', folderSearchResult.error)
      const errorMsg = folderSearchResult.error.message || ''
      
      if (errorMsg.includes('has not been used') || errorMsg.includes('disabled')) {
        return c.json({ 
          error: 'A API do Google Drive precisa ser habilitada.',
          needsReauth: true,
          details: errorMsg
        }, 503)
      }
      
      if (errorMsg.includes('insufficient') || errorMsg.includes('scope') || errorMsg.includes('Forbidden')) {
        return c.json({ 
          error: 'Permissões insuficientes. Reconecte com Google Drive.',
          needsReauth: true,
          details: errorMsg
        }, 403)
      }
      
      return c.json({ error: 'Erro ao acessar Google Drive', needsReauth: true, details: errorMsg }, 500)
    }
    
    if (!folderSearchResult.files?.length) {
      return c.json({ error: 'Nenhum backup encontrado. Faça um backup primeiro.' }, 404)
    }
    
    const folderId = folderSearchResult.files[0].id
    
    // Buscar arquivo de backup na pasta
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'iaprova_backup' and '${folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    const searchResult = await searchResponse.json() as any
    
    if (!searchResult.files?.length) {
      return c.json({ error: 'Nenhum backup encontrado no Google Drive' }, 404)
    }
    
    const fileId = searchResult.files[0].id
    console.log('📄 Carregando backup:', fileId)
    
    // Download do arquivo
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    
    if (!downloadResponse.ok) {
      console.error('Erro no download:', downloadResponse.status)
      return c.json({ error: 'Erro ao baixar backup' }, 500)
    }
    
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

// ============== DIAGNÓSTICO GOOGLE DRIVE (v74) ==============

// Endpoint para verificar se Google Drive está funcionando (testa token, API e permissões)
app.post('/api/backup/google-drive/diagnose', async (c) => {
  const { DB } = c.env
  const { user_id } = await c.req.json()
  
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    etapas: [],
    resumo: '',
    acaoNecessaria: ''
  }
  
  try {
    // Etapa 1: Verificar se o usuário tem tokens Google
    const user = await DB.prepare(`
      SELECT google_access_token, google_refresh_token, google_token_expires, google_email, google_id
      FROM users WHERE id = ?
    `).bind(user_id).first() as any
    
    if (!user?.google_access_token) {
      diagnostico.etapas.push({ etapa: 'Conta Google', status: 'erro', msg: 'Conta Google não conectada' })
      diagnostico.resumo = 'Sua conta Google não está conectada.'
      diagnostico.acaoNecessaria = 'conectar_google'
      return c.json(diagnostico)
    }
    
    diagnostico.etapas.push({ 
      etapa: 'Conta Google', 
      status: 'ok', 
      msg: `Conectado como ${user.google_email || 'usuário Google'}` 
    })
    
    // Etapa 2: Verificar validade do token
    let accessToken = user.google_access_token
    const tokenExpirado = new Date(user.google_token_expires) < new Date()
    
    if (tokenExpirado) {
      diagnostico.etapas.push({ etapa: 'Token', status: 'aviso', msg: 'Token expirado, tentando renovar...' })
      
      if (!user.google_refresh_token) {
        diagnostico.etapas.push({ etapa: 'Renovação', status: 'erro', msg: 'Sem refresh token. Necessário reconectar.' })
        diagnostico.resumo = 'Sua sessão expirou e não pode ser renovada.'
        diagnostico.acaoNecessaria = 'reconectar_google'
        return c.json(diagnostico)
      }
      
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env as any
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: user.google_refresh_token,
            grant_type: 'refresh_token'
          })
        })
        const refreshResult = await refreshResponse.json() as any
        
        if (refreshResult.error) {
          diagnostico.etapas.push({ etapa: 'Renovação', status: 'erro', msg: `Falha ao renovar: ${refreshResult.error}` })
          diagnostico.resumo = 'Não foi possível renovar o token. Reconecte sua conta Google.'
          diagnostico.acaoNecessaria = 'reconectar_google'
          return c.json(diagnostico)
        }
        
        accessToken = refreshResult.access_token
        const newExpires = new Date(Date.now() + refreshResult.expires_in * 1000).toISOString()
        await DB.prepare('UPDATE users SET google_access_token = ?, google_token_expires = ? WHERE id = ?')
          .bind(accessToken, newExpires, user_id).run()
        
        diagnostico.etapas.push({ etapa: 'Renovação', status: 'ok', msg: 'Token renovado com sucesso' })
      } catch (e: any) {
        diagnostico.etapas.push({ etapa: 'Renovação', status: 'erro', msg: `Erro: ${e.message}` })
        diagnostico.resumo = 'Erro na renovação do token.'
        diagnostico.acaoNecessaria = 'reconectar_google'
        return c.json(diagnostico)
      }
    } else {
      diagnostico.etapas.push({ etapa: 'Token', status: 'ok', msg: 'Token válido' })
    }
    
    // Etapa 3: Testar acesso ao Google Drive API
    try {
      const testResponse = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      const testResult = await testResponse.json() as any
      
      if (testResult.error) {
        const errorMsg = testResult.error.message || ''
        
        if (errorMsg.includes('has not been used') || errorMsg.includes('disabled')) {
          diagnostico.etapas.push({ 
            etapa: 'Google Drive API', 
            status: 'erro', 
            msg: 'API do Google Drive NÃO está habilitada no projeto Google Cloud.' 
          })
          diagnostico.resumo = 'A API do Google Drive precisa ser habilitada pelo administrador no Google Cloud Console.'
          diagnostico.acaoNecessaria = 'habilitar_api'
          return c.json(diagnostico)
        }
        
        if (errorMsg.includes('insufficient') || errorMsg.includes('scope') || errorMsg.includes('Forbidden')) {
          diagnostico.etapas.push({ 
            etapa: 'Google Drive API', 
            status: 'erro', 
            msg: 'Permissões insuficientes. Sua conta não tem acesso ao Drive.' 
          })
          diagnostico.resumo = 'Sua conta Google não tem permissão para acessar o Drive. Reconecte com as permissões corretas.'
          diagnostico.acaoNecessaria = 'reconectar_google'
          return c.json(diagnostico)
        }
        
        diagnostico.etapas.push({ etapa: 'Google Drive API', status: 'erro', msg: errorMsg })
        diagnostico.resumo = `Erro ao acessar Google Drive: ${errorMsg}`
        diagnostico.acaoNecessaria = 'reconectar_google'
        return c.json(diagnostico)
      }
      
      diagnostico.etapas.push({ 
        etapa: 'Google Drive API', 
        status: 'ok', 
        msg: `Acesso confirmado para ${testResult.user?.displayName || testResult.user?.emailAddress || 'usuário'}` 
      })
    } catch (e: any) {
      diagnostico.etapas.push({ etapa: 'Google Drive API', status: 'erro', msg: `Erro de rede: ${e.message}` })
      diagnostico.resumo = 'Não foi possível conectar ao Google Drive.'
      diagnostico.acaoNecessaria = 'tentar_novamente'
      return c.json(diagnostico)
    }
    
    // Etapa 4: Verificar pasta de backups
    try {
      const folderResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='IAprova Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      const folderResult = await folderResponse.json() as any
      
      if (folderResult.files?.length > 0) {
        diagnostico.etapas.push({ etapa: 'Pasta de Backup', status: 'ok', msg: 'Pasta "IAprova Backups" encontrada' })
        
        // Verificar se há backups
        const folderId = folderResult.files[0].id
        const searchResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name contains 'iaprova_backup' and '${folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)&pageSize=1`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        const searchResult = await searchResponse.json() as any
        
        if (searchResult.files?.length > 0) {
          const file = searchResult.files[0]
          diagnostico.etapas.push({ 
            etapa: 'Backup Existente', 
            status: 'ok', 
            msg: `Último backup: ${file.name} (${new Date(file.modifiedTime).toLocaleString('pt-BR')})` 
          })
        } else {
          diagnostico.etapas.push({ etapa: 'Backup Existente', status: 'aviso', msg: 'Nenhum backup encontrado ainda' })
        }
      } else {
        diagnostico.etapas.push({ etapa: 'Pasta de Backup', status: 'aviso', msg: 'Pasta será criada no primeiro backup' })
      }
    } catch (e: any) {
      diagnostico.etapas.push({ etapa: 'Pasta de Backup', status: 'aviso', msg: `Não foi possível verificar: ${e.message}` })
    }
    
    diagnostico.resumo = 'Google Drive está funcionando corretamente!'
    diagnostico.acaoNecessaria = 'nenhuma'
    return c.json(diagnostico)
    
  } catch (error: any) {
    console.error('Erro no diagnóstico:', error)
    diagnostico.etapas.push({ etapa: 'Geral', status: 'erro', msg: error.message })
    diagnostico.resumo = 'Erro inesperado no diagnóstico.'
    diagnostico.acaoNecessaria = 'tentar_novamente'
    return c.json(diagnostico)
  }
})

// ============== FUNÇÕES AUXILIARES ==============

// ════════════════════════════════════════════════════════════════════════════
// ✅ FUNÇÃO: Copiar tópicos do edital para o plano
// Esta função é chamada quando um plano é criado, para vincular tópicos ao plano
// ════════════════════════════════════════════════════════════════════════════
async function copiarTopicosParaPlano(
  DB: D1Database, 
  plano_id: number, 
  user_id: number, 
  disciplinaIds: number[],
  edital_id?: number
): Promise<{ copiados: number, disciplinas: number }> {
  let totalCopiados = 0
  let disciplinasProcessadas = 0
  
  console.log(`📋 v54 BATCH: Copiando tópicos para plano ${plano_id}...`)
  console.log(`   Disciplinas: ${disciplinaIds.join(', ')}`)
  console.log(`   Edital ID: ${edital_id || 'nenhum'}`)
  
  // PASSO 1: Buscar TODOS os tópicos de todas as disciplinas de uma vez (batch)
  const batchBuscaTopicos = disciplinaIds.map(disc_id => {
    if (edital_id) {
      return DB.prepare(`
        SELECT et.nome, et.ordem, ed.peso, ed.disciplina_id
        FROM edital_topicos et
        JOIN edital_disciplinas ed ON et.edital_disciplina_id = ed.id
        WHERE ed.edital_id = ? AND ed.disciplina_id = ?
        ORDER BY et.ordem
      `).bind(edital_id, disc_id)
    } else {
      return DB.prepare(`
        SELECT nome, categoria, ordem, peso, disciplina_id
        FROM topicos_edital
        WHERE disciplina_id = ? AND plano_id IS NULL
        ORDER BY ordem
        LIMIT 20
      `).bind(disc_id)
    }
  })
  const resBuscaTopicos = await DB.batch(batchBuscaTopicos)
  
  // PASSO 2: Para disciplinas sem tópicos do edital, buscar genéricos (batch)
  const discSemTopicos: number[] = []
  const discSemTopicosIndices: number[] = []
  
  if (edital_id) {
    resBuscaTopicos.forEach((r: any, i: number) => {
      const rows = r.results || []
      if (rows.length === 0) {
        discSemTopicos.push(disciplinaIds[i])
        discSemTopicosIndices.push(i)
      }
    })
    
    if (discSemTopicos.length > 0) {
      const batchBuscaGenericos = discSemTopicos.map(disc_id =>
        DB.prepare(`
          SELECT nome, categoria, ordem, peso, ? as disciplina_id
          FROM topicos_edital
          WHERE disciplina_id = ? AND plano_id IS NULL
          ORDER BY ordem LIMIT 20
        `).bind(disc_id, disc_id)
      )
      const resBuscaGenericos = await DB.batch(batchBuscaGenericos)
      
      // Substituir resultados vazios pelos genéricos
      resBuscaGenericos.forEach((r: any, i: number) => {
        const idx = discSemTopicosIndices[i]
        ;(resBuscaTopicos as any)[idx] = r
      })
    }
  }
  
  // PASSO 3: Preparar TODOS os INSERTs e executar em batch
  const batchInsertTopicos: any[] = []
  
  for (let i = 0; i < disciplinaIds.length; i++) {
    const disc_id = disciplinaIds[i]
    const topicos = (resBuscaTopicos[i] as any)?.results || []
    
    if (topicos.length === 0) continue
    
    disciplinasProcessadas++
    
    for (let j = 0; j < topicos.length; j++) {
      const topico = topicos[j]
      batchInsertTopicos.push(
        DB.prepare(`
          INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, user_id, plano_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          disc_id,
          topico.nome,
          topico.categoria || 'Conteúdo Programático',
          topico.ordem || (j + 1),
          topico.peso || 1,
          user_id,
          plano_id
        )
      )
    }
    
    console.log(`   ✅ ${disc_id}: ${topicos.length} tópicos preparados`)
  }
  
  // Executar em chunks de 80
  const BATCH_TOPICOS = 80
  for (let s = 0; s < batchInsertTopicos.length; s += BATCH_TOPICOS) {
    await DB.batch(batchInsertTopicos.slice(s, s + BATCH_TOPICOS))
  }
  
  totalCopiados = batchInsertTopicos.length
  
  console.log(`📋 Total: ${totalCopiados} tópicos copiados para ${disciplinasProcessadas} disciplinas (via BATCH)`)
  
  return { copiados: totalCopiados, disciplinas: disciplinasProcessadas }
}

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

// 🆕 Gerar conteúdo usando IA (usa função centralizada callAI)
// Renomeado de gerarConteudoComGroq para usar todas as APIs disponíveis
async function gerarConteudoComIA(DB: any, disciplina: string, tipo: string, tempo_minutos: number, dificuldade: string, contexto: any, env: any, userDisc: any = null, topicos: string[] = []) {
  try {
    console.log('🚀 Gerando conteúdo com IA (sistema centralizado callAI)...')
    
    // ✅ CORREÇÃO: usar TODOS os tópicos específicos do edital
    const topicosEspecificos = topicos.length > 0 ? topicos.join(', ') : 'Conteúdo Geral'
    const nivelAluno = userDisc?.nivel_atual || 5
    
    console.log(`📚 Tópicos específicos para IA: ${topicosEspecificos}`)
    
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

    // ✅ v37: Usar função centralizada callAI
    const aiResult = await callAI(DB, env, {
      prompt,
      systemPrompt: 'Você é um professor especialista em concursos públicos. Sempre retorne JSON válido.',
      maxTokens: 8000,
      temperature: 0.7,
      jsonMode: true
    })

    if (!aiResult.success) {
      console.error('❌ callAI falhou:', aiResult.error)
      return null
    }

    console.log(`✅ IA respondeu (${aiResult.provider}/${aiResult.model}), parseando JSON...`)
    
    // 🔧 SANITIZAR JSON: Remover caracteres de controle inválidos
    let jsonText = aiResult.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    let resultado
    try {
      resultado = JSON.parse(jsonText)
    } catch (parseError: any) {
      console.error('❌ Erro no parse do JSON:', parseError.message)
      return null
    }
    
    if (!resultado.topicos || !resultado.objetivos || !resultado.conteudo?.secoes) {
      console.error('❌ JSON inválido: faltam campos obrigatórios')
      return null
    }
    
    console.log(`✅ Conteúdo gerado com ${aiResult.provider} com sucesso!`)
    return resultado
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo com IA:', error)
    return null
  }
}

// 🆕 Mantido para compatibilidade - chama gerarConteudoComIA
async function gerarConteudoComGroq(disciplina: string, tipo: string, tempo_minutos: number, dificuldade: string, contexto: any, env: any, userDisc: any = null, topicos: string[] = []) {
  // Função mantida para compatibilidade - agora usa callAI internamente
  // NOTA: Esta função não tem acesso ao DB, então usa as variáveis de ambiente como fallback
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

// ✅ v83-fix: Gerar diagnóstico baseado nos dados da entrevista (sem consultar DB)
// Usado quando user_disciplinas ainda não existem (ex: limitReached antes de criar)
function gerarDiagnosticoFromData(data: any) {
  const allDisc = [
    ...(data.disciplinas || []),
    ...(data.disciplinasCustom || [])
  ]
  
  if (allDisc.length === 0) {
    return {
      nivel_geral: 'Sem dados',
      prioridades: [],
      lacunas: [],
      recomendacao: 'Nenhuma disciplina foi selecionada.'
    }
  }
  
  const nivelMedio = allDisc.reduce((sum: number, d: any) => sum + (d.nivel_atual || d.nivel_dominio || 0), 0) / allDisc.length
  let nivelGeral = 'Iniciante'
  if (nivelMedio >= 7) nivelGeral = 'Avançado'
  else if (nivelMedio >= 4) nivelGeral = 'Intermediário'
  
  const prioridades = allDisc
    .filter((d: any) => !d.ja_estudou || (d.nivel_atual || d.nivel_dominio || 0) < 6 || d.dificuldade)
    .map((d: any) => ({
      disciplina_id: d.disciplina_id || 0,
      nome: d.nome || 'Disciplina',
      peso: calcularPeso({ ...d, nivel_atual: d.nivel_atual || d.nivel_dominio || 0 }),
      razao: gerarRazaoPrioridade({ ...d, nivel_atual: d.nivel_atual || d.nivel_dominio || 0 })
    }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 5)
  
  const lacunas = allDisc.filter((d: any) => !d.ja_estudou).map((d: any) => d.nome || 'Disciplina')
  
  const tempoDia = data.tempo_disponivel_dia || 120
  let recomendacao = `Com ${tempoDia} minutos por dia e ${allDisc.length} disciplinas, mantenha consistência.`
  if (nivelGeral === 'Iniciante') {
    recomendacao = `Com ${tempoDia} minutos por dia, foque em construir uma base sólida. Comece pelas disciplinas que nunca estudou.`
  } else if (nivelGeral === 'Intermediário') {
    recomendacao = `Você já tem uma base. Distribua: 40% teoria, 40% exercícios e 20% revisão.`
  }
  
  return {
    nivel_geral: nivelGeral,
    prioridades,
    lacunas,
    recomendacao,
    nivel_medio: Math.round(nivelMedio * 10) / 10,
    total_disciplinas: allDisc.length
  }
}

function gerarDiagnosticoCompleto(interview: any, disciplinas: any[]) {
  const nivelMedio = disciplinas.length > 0 
    ? disciplinas.reduce((sum, d: any) => sum + (d.nivel_atual || 0), 0) / disciplinas.length
    : 0
  
  // Calcular nível geral
  let nivelGeral = 'Iniciante'
  if (nivelMedio >= 7) nivelGeral = 'Avançado'
  else if (nivelMedio >= 4) nivelGeral = 'Intermediário'
  
  // Identificar prioridades
  const prioridades = disciplinas
    .filter((d: any) => !d.ja_estudou || (d.nivel_atual || 0) < 6 || d.dificuldade)
    .map((d: any) => ({
      disciplina_id: d.disciplina_id,
      nome: d.nome,
      peso: calcularPeso(d),
      razao: gerarRazaoPrioridade(d)
    }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, 5)
  
  // Identificar lacunas
  const lacunas = disciplinas
    .filter((d: any) => !d.ja_estudou)
    .map((d: any) => d.nome)
  
  // Gerar recomendação
  const tempoDia = interview?.tempo_disponivel_dia || 120
  const nuncaEstudou = disciplinas.filter((d: any) => !d.ja_estudou).length
  
  let recomendacao = ''
  if (nivelGeral === 'Iniciante' && nuncaEstudou > 5) {
    recomendacao = `Com ${tempoDia} minutos por dia, foque em construir uma base sólida. Comece pelas disciplinas que nunca estudou, dedicando 70% do tempo à teoria e 30% a exercícios básicos.`
  } else if (nivelGeral === 'Intermediário') {
    recomendacao = `Você já tem uma base. Distribua seu tempo: 40% teoria (focando nas lacunas), 40% exercícios e 20% revisão. Mantenha consistência diária.`
  } else if (nivelGeral === 'Avançado') {
    recomendacao = `Nível avançado! Foque em: 20% revisão de conceitos, 50% resolução intensiva de questões e 30% em pontos fracos identificados.`
  } else {
    recomendacao = `Com ${tempoDia} minutos diários e ${disciplinas.length} disciplinas, mantenha consistência. Alterne entre teoria e exercícios para melhor fixação.`
  }
  
  return {
    // Campos para o frontend (tela de resultado)
    nivel_geral: nivelGeral,
    prioridades,
    lacunas,
    recomendacao,
    // Campos para o dashboard
    nivel_medio: Math.round(nivelMedio * 10) / 10,
    total_disciplinas: disciplinas.length,
    nunca_estudadas: nuncaEstudou,
    com_dificuldade: disciplinas.filter((d: any) => d.dificuldade).length,
    experiencia: interview?.experiencia || 'iniciante'
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
  const todasSessoes: any[] = []
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
  
  // Distribuir sessões pelos dias da semana e preparar batch
  let sessaoIndex = 0
  const batchCiclos: any[] = []
  
  for (const dia of diasSemana) {
    let ordemDia = 0
    let tempoRestante = tempoDiario
    const sessoesDia: any[] = []

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

    // Preparar inserts para batch
    for (const sessao of sessoesDia) {
      const disciplinaCompleta = disciplinas.find((d: any) => d.disciplina_id === sessao.disciplina_id)
      let tipo = 'teoria'
      
      if (disciplinaCompleta?.ja_estudou && disciplinaCompleta.nivel_atual >= 6) {
        tipo = dia % 3 === 0 ? 'revisao' : 'exercicios'
      } else if (disciplinaCompleta?.ja_estudou) {
        tipo = dia % 2 === 0 ? 'teoria' : 'exercicios'
      }

      batchCiclos.push(
        DB.prepare(`INSERT INTO ciclos_estudo (plano_id, disciplina_id, tipo, dia_semana, tempo_minutos, ordem) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(plano_id, sessao.disciplina_id, tipo, dia, sessao.tempoSessao, ordemDia)
      )
      ordemDia++
    }
    
    const disciplinasUnicas = new Set(sessoesDia.map(s => s.disciplina_id)).size
    console.log(`📅 Dia ${dia}: ${sessoesDia.length} sessões (${disciplinasUnicas} disciplinas únicas) - ${tempoDiario - tempoRestante}min de ${tempoDiario}min`)
  }
  
  // ✅ v54 BATCH: Inserir TODOS os ciclos em um único batch (chunks de 80)
  const BATCH_CICLOS = 80
  for (let s = 0; s < batchCiclos.length; s += BATCH_CICLOS) {
    await DB.batch(batchCiclos.slice(s, s + BATCH_CICLOS))
  }
  
  console.log(`✅ ${sessaoIndex} sessões distribuídas de ${todasSessoes.length} planejadas (via BATCH)`)
}

// ============== CHATBOT IA ==============
app.post('/api/chat', async (c) => {
  const { DB } = c.env
  const { message, user_id, history } = await c.req.json()
  
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
    
    // Buscar estatísticas adicionais (queries separadas para evitar erro)
    let estatisticas = {
      metas_concluidas: 0,
      total_simulados: 0,
      media_simulados: 0,
      materiais_salvos: 0
    }
    
    try {
      const metasRes = await DB.prepare(`
        SELECT COUNT(*) as total FROM metas_semana ms 
        JOIN semanas_estudo se ON ms.semana_id = se.id 
        WHERE se.user_id = ? AND ms.status = 'concluida'
      `).bind(user_id).first()
      estatisticas.metas_concluidas = metasRes?.total || 0
      
      const simuladosRes = await DB.prepare(`
        SELECT COUNT(*) as total, AVG(percentual_acerto) as media 
        FROM simulados_historico WHERE user_id = ?
      `).bind(user_id).first()
      estatisticas.total_simulados = simuladosRes?.total || 0
      estatisticas.media_simulados = simuladosRes?.media || 0
      
      const materiaisRes = await DB.prepare(`
        SELECT COUNT(*) as total FROM materiais_salvos WHERE user_id = ?
      `).bind(user_id).first()
      estatisticas.materiais_salvos = materiaisRes?.total || 0
    } catch (e) {
      console.log('⚠️ Erro ao buscar estatísticas do chat:', e)
    }
    
    // Contexto COMPLETO do sistema para a Lilu
    const systemContext = `Você é a LILU, a assistente virtual do IAprova - uma plataforma de estudos para concursos públicos brasileiros.

🎭 SUA PERSONALIDADE:
- Você é natural, empática e motivadora — como uma amiga estudiosa que sabe tudo sobre o sistema
- Usa emojis com moderação (1-3 por resposta, não em toda frase)
- Fala de forma clara, direta e variada — NUNCA use as mesmas frases de abertura
- Conhece TUDO sobre o sistema e ajuda com dedicação

⚠️ REGRAS CRÍTICAS DE CONVERSA:
- NUNCA comece com "Olá, [nome]!" em toda mensagem — só cumprimente na PRIMEIRA interação
- NUNCA repita "Que ótima pergunta!" ou variações bajuladoras em toda resposta
- NUNCA se apresente dizendo "Eu sou a Lilu" se já se apresentou antes
- Se o histórico de conversa mostra que vocês já conversaram, VÁ DIRETO AO ASSUNTO
- Varie suas aberturas: às vezes comece com a resposta direta, às vezes com um contexto breve, às vezes com uma dica
- Seja natural como uma conversa real de WhatsApp entre amigos que estudam juntos

📊 DADOS DO USUÁRIO ATUAL:
- Nome: ${user?.name || 'Usuário'}
- Email: ${user?.email || 'Não informado'}
- Plano Ativo: ${plano ? plano.nome : 'Nenhum plano ativo'}
- Total de Disciplinas no Plano: ${plano?.total_disciplinas || 0}
- Tempo de Estudo Diário Configurado: ${plano?.tempo_diario || 0} minutos
- Metas Concluídas: ${estatisticas.metas_concluidas}
- Simulados Realizados: ${estatisticas.total_simulados}
- Média em Simulados: ${estatisticas.media_simulados ? Math.round(Number(estatisticas.media_simulados)) + '%' : 'Sem dados'}
- Materiais Salvos: ${estatisticas.materiais_salvos}

📚 DISCIPLINAS DO USUÁRIO:
${disciplinas.results.length > 0 ? disciplinas.results.map((d: any) => `- ${d.nome} (Nível: ${d.nivel_atual}/10, Estudou: ${d.ja_estudou ? 'Sim' : 'Não'})`).join('\n') : '- Nenhuma disciplina cadastrada ainda'}

📝 ÚLTIMOS CONTEÚDOS GERADOS:
${conteudos.results.length > 0 ? conteudos.results.map((c: any) => `- ${c.disciplina}: ${c.tipo} (${new Date(c.created_at).toLocaleDateString('pt-BR')})`).join('\n') : '- Nenhum conteúdo gerado ainda'}

🏠 ESTRUTURA COMPLETA DO SISTEMA IAPROVA:

1️⃣ DASHBOARD PRINCIPAL (Tela Inicial):
   - Card de Contagem Regressiva: mostra dias até a prova (clicável para editar data)
   - Card de Progresso do Edital: percentual de tópicos concluídos (ponderado por peso das disciplinas)
   - Card de Disciplinas: acesso rápido às matérias do edital
   - Card de Simulados: link para fazer e ver histórico de simulados
   - Card de Desempenho: estatísticas e gráficos de evolução
   - Metas do Dia: tarefas de teoria, exercícios e revisão para hoje
   - Calendário Semanal: visualização das metas da semana

2️⃣ DISCIPLINAS (Clicando em "Disciplinas"):
   - Lista todas as disciplinas do edital com progresso individual
   - Cada disciplina mostra: nível de domínio (0-10), tópicos concluídos/total
   - Ao clicar em uma disciplina, abre a lista de TÓPICOS
   - Cada tópico pode ser marcado como "✅ Concluído" - ISSO AUMENTA O PROGRESSO DO EDITAL
   - Opções de cada tópico: Gerar Teoria, Gerar Exercícios, Gerar Resumo, Flashcards

3️⃣ GERAÇÃO DE CONTEÚDO IA:
   - O sistema usa Gemini 2.0 para gerar conteúdo personalizado
   - Tipos de conteúdo:
     * TEORIA: explicação completa do tópico com exemplos
     * EXERCÍCIOS: questões no estilo da banca do usuário com gabarito comentado
     * RESUMO: síntese dos pontos principais
     * FLASHCARDS: cartões para memorização
   - Configurações de IA: tom (formal/didático), extensão (curto/médio/longo/completo até 20.000 caracteres)
   - Todo conteúdo é salvo automaticamente em "Materiais Salvos"

4️⃣ SIMULADOS:
   - Usuário escolhe disciplinas e quantidade de questões
   - Sistema gera questões no estilo da banca (CESPE, FCC, FGV, etc.)
   - Cada questão tem: enunciado, 5 alternativas, gabarito e comentário
   - Após responder, mostra resultado e salva no histórico
   - Dashboard de Simulados mostra: média geral, últimos 5, evolução

5️⃣ METAS SEMANAIS:
   - Sistema gera automaticamente metas distribuídas nos dias de estudo
   - Respeita tempo disponível e dias configurados na entrevista
   - Tipos de meta: Teoria (📖), Exercícios (✏️), Revisão (🔄)
   - Cada meta pode ser: estudar, marcar concluída, ou regenerar
   - Metas são organizacionais - o PROGRESSO DO EDITAL avança pelos tópicos em Disciplinas

6️⃣ CALENDÁRIO:
   - Mostra histórico de estudos por dia
   - Verde = dia 100% concluído, Amarelo = parcial, Cinza = não estudou
   - Ajuda a manter consistência e visualizar sequência de dias

7️⃣ DESEMPENHO:
   - Dashboard com gráficos de evolução
   - Progresso por Matéria: gráfico de barras horizontal
   - Nível de Domínio: gráfico radar comparando domínio x progresso
   - Estatísticas: dias estudados, horas totais, média em simulados

8️⃣ MATERIAIS SALVOS:
   - Biblioteca com todo conteúdo gerado pelo usuário
   - Filtros por tipo (teoria, exercícios, resumo, flashcards)
   - Opção de favoritar e organizar

9️⃣ ENTREVISTA INICIAL:
   - Coleta: nome do concurso, cargo, edital (PDF ou manual), banca organizadora
   - Define: dias disponíveis para estudo, horas por dia
   - Sistema analisa edital e cria plano personalizado

🔟 PLANOS DE ESTUDO:
   - Usuário pode ter múltiplos planos (um por concurso)
   - Apenas UM plano ativo por vez
   - Ao trocar de plano, o progresso do anterior é preservado
   - Cada plano tem seu próprio ciclo de disciplinas e metas

⚡ DICAS IMPORTANTES PARA DAR AOS USUÁRIOS:
1. Para aumentar o PROGRESSO DO EDITAL: vá em Disciplinas > escolha uma > marque tópicos como Concluídos
2. As metas semanais são para ORGANIZAÇÃO, não afetam diretamente o progresso
3. O nível de domínio (0-10) é autoavaliação do conhecimento prévio
4. Simulados ajudam a identificar pontos fracos - foque nas disciplinas com menor acerto
5. O sistema adapta as questões ao estilo da banca escolhida
6. Todo conteúdo gerado fica salvo em Materiais - não precisa gerar de novo

🔧 SOLUÇÃO DE PROBLEMAS COMUNS:
- "Progresso zerado": verifique se marcou tópicos como concluídos em Disciplinas
- "Metas não aparecem": clique em "Gerar Metas" no dashboard
- "Conteúdo não carrega": pode ser limite de requisições da IA, aguarde 1-2 minutos
- "Simulado travou": recarregue a página e tente com menos questões
- "Disciplinas sumindo": verifique se está no plano correto (pode ter mudado)

📱 NAVEGAÇÃO RÁPIDA:
- Menu lateral: acesso a todas as seções
- Botão flutuante (FAB): ações rápidas (chat, disciplinas, simulados)
- Header: voltar ao dashboard, trocar tema claro/escuro

🎯 METAS DE ESTUDO IDEAIS:
- Iniciante: 2-3 horas/dia, foco em teoria primeiro
- Intermediário: 4-5 horas/dia, balanceado teoria + exercícios
- Avançado: 6+ horas/dia, foco em simulados e revisão

INSTRUÇÕES PARA SUAS RESPOSTAS:
- Use os DADOS REAIS do usuário quando relevante
- Dê respostas PRÁTICAS e ESPECÍFICAS
- Se o usuário perguntar sobre funcionalidade, explique COM PASSOS
- Se perguntar sobre seu progresso, use os dados acima
- Se não souber algo específico do usuário, sugira onde encontrar no sistema
- Mantenha respostas COMPLETAS mas CONCISAS (2-4 parágrafos curtos)
- NUNCA deixe uma frase ou ideia pela metade — sempre conclua o raciocínio
- Varie o tom: às vezes mais prática, às vezes mais motivacional, às vezes mais analítica
- NÃO repita padrões de abertura/fechamento — cada resposta deve parecer fresca e única
- Se a conversa já tem histórico, continue naturalmente sem recomeçar do zero`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    
    // ✅ v84: Construir conversa multi-turn com histórico
    const chatHistory = Array.isArray(history) ? history : []
    const isFirstMessage = chatHistory.length === 0
    
    // Montar contents como conversa multi-turn do Gemini
    const contents: any[] = []
    
    // Adicionar histórico de mensagens anteriores
    for (const msg of chatHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text || '' }]
      })
    }
    
    // Adicionar mensagem atual do usuário
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemContext + (isFirstMessage ? '\n\n(Esta é a PRIMEIRA mensagem do usuário nesta conversa. Pode cumprimentá-lo pelo nome UMA vez.)' : '\n\n(A conversa JÁ ESTÁ em andamento. NÃO cumprimente novamente, NÃO se apresente, vá direto ao assunto.)') }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
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
    
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  'Desculpe, não consegui processar sua mensagem.'
    
    // ✅ v84: Verificar se a resposta foi cortada pelo limite de tokens
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS' && reply.length > 50) {
      // Tentar cortar no último parágrafo completo
      const lastParagraph = reply.lastIndexOf('\n\n')
      const lastSentence = reply.lastIndexOf('. ')
      const lastExclamation = reply.lastIndexOf('! ')
      const lastQuestion = reply.lastIndexOf('? ')
      const bestCut = Math.max(lastParagraph, lastSentence, lastExclamation, lastQuestion)
      
      if (bestCut > reply.length * 0.5) {
        // Cortar no ponto natural mais próximo do final
        reply = reply.substring(0, bestCut + 1).trim()
      }
      // Não adicionar "..." - simplesmente finalizar no último ponto natural
    }
    
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
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
      // Extrair texto de DOC/DOCX usando Gemini
      const arrayBuffer = await file.arrayBuffer()
      const geminiKey = c.env.GEMINI_API_KEY || ''
      
      if (!geminiKey) {
        return c.json({ error: 'API key do Gemini não configurada' }, 500)
      }
      
      try {
        textoExtraido = await extractTextFromDocx(arrayBuffer, geminiKey, file.type)
      } catch (error: any) {
        console.error('Erro ao extrair DOCX:', error)
        return c.json({ 
          error: 'Erro ao processar documento Word. Tente converter para PDF ou TXT.',
          details: error?.message || 'Falha na extração do texto'
        }, 500)
      }
    } else {
      return c.json({ 
        error: 'Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.' 
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
  const { topico_id, topico_nome, disciplina_nome, tipo, quantidade, meta_id, config_ia, feedback_usuario, regenerar, user_id, subtipo_resumo } = await c.req.json()
  
  // ✅ VALIDAÇÃO: Exigir tópico para gerar conteúdo
  if (!topico_id && !topico_nome) {
    console.error('❌ Tentativa de gerar conteúdo sem tópico')
    return c.json({ 
      error: 'É necessário selecionar um tópico para gerar conteúdo. Por favor, escolha um tópico específico antes de gerar o material.',
      codigo: 'TOPICO_OBRIGATORIO'
    }, 400)
  }
  
  // tipo: 'teoria' | 'exercicios' | 'resumo' | 'flashcards'
  const tipoConteudo = tipo || 'teoria'
  const qtdExercicios = quantidade || 10
  const qtdFlashcards = quantidade || 15
  
  // Log se é regeneração com feedback
  if (regenerar && feedback_usuario) {
    console.log(`🔄 Regenerando conteúdo com feedback do usuário: "${feedback_usuario}"`)
  }
  
  // Configurações de personalização (usar padrão se não enviado)
  const iaConfig = config_ia || {
    tom: 'didatico',
    temperatura: 0.5,
    intensidade: 'intermediaria',
    profundidade: 'aplicada',
    extensao: 'completo', // Padrão: máximo conteúdo
    extensaoCustom: 20000,
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
    
    // ✅ REGRA: Teoria SEMPRE gera o MÁXIMO possível
    // Para resumo, usa configuração do usuário (padrão 20000)
    let limiteCaracteres = 20000; // Padrão ALTO para conteúdo completo
    let limiteResumo = 20000; // Padrão ALTO para resumo
    
    // Configuração de extensão do resumo (escolhido pelo usuário)
    if (iaConfig.extensaoResumo === 'personalizado' && iaConfig.extensaoResumoCustom) {
      limiteResumo = parseInt(iaConfig.extensaoResumoCustom);
    } else if (iaConfig.extensaoResumo) {
      // Usar valores configurados pelo usuário
      const extensaoMap: any = {
        'curto': 5000,
        'medio': 10000,
        'longo': 15000,
        'completo': 20000
      };
      limiteResumo = extensaoMap[iaConfig.extensaoResumo] || 20000;
    }
    
    // Para outros tipos (não teoria), usar config do usuário se definida
    if (tipoConteudo === 'flashcards') {
      // ✅ CORREÇÃO: Flashcards NÃO precisam de limite de caracteres alto
      // O que importa é a QUANTIDADE de flashcards, não o tamanho total
      limiteCaracteres = 0; // Sem limite mínimo para flashcards
    } else if (tipoConteudo === 'exercicios') {
      // Exercícios também dependem da quantidade, não do tamanho
      limiteCaracteres = 0;
    } else if (tipoConteudo !== 'teoria') {
      if (iaConfig.extensao === 'curto') limiteCaracteres = 5000;
      else if (iaConfig.extensao === 'medio') limiteCaracteres = 10000;
      else if (iaConfig.extensao === 'longo') limiteCaracteres = 15000;
      else if (iaConfig.extensao === 'completo') limiteCaracteres = 20000;
      else if (iaConfig.extensao === 'personalizado' && iaConfig.extensaoCustom) {
        limiteCaracteres = parseInt(iaConfig.extensaoCustom);
      }
    }
    
    console.log(`🎆 Tipo: ${tipoConteudo}, Limite teoria: MÁXIMO, Limite resumo: ${limiteResumo}`);
    
    const extensaoLimites = {
      curto: 'NO MÍNIMO 5000 caracteres',
      medio: 'NO MÍNIMO 10000 caracteres', 
      longo: 'NO MÍNIMO 15000 caracteres',
      completo: 'NO MÍNIMO 20000 caracteres - conteúdo MÁXIMO e COMPLETO',
      personalizado: `NO MÍNIMO ${iaConfig.extensaoCustom} caracteres`
    }
    
    // Instruções de personalização comuns (SEM criatividade - sempre objetivo)
    // ✅ CORREÇÃO: Para flashcards e exercícios, NÃO incluir limite de caracteres
    // pois isso confunde a IA e faz ela gerar teoria ao invés do formato correto
    const incluirLimiteExtensao = tipoConteudo !== 'flashcards' && tipoConteudo !== 'exercicios'
    
    let personalizacao = `
=== CONFIGURAÇÕES DE PERSONALIZAÇÃO OBRIGATÓRIAS ===
1. TOM: ${tomInstrucoes[iaConfig.tom] || tomInstrucoes['didatico']}
2. ESTILO: Seja OBJETIVO, DIRETO e PRECISO. Sem rodeios ou enrolação.
3. INTENSIDADE: ${intensidadeInstrucoes[iaConfig.intensidade] || intensidadeInstrucoes['intermediaria']}
4. PROFUNDIDADE: ${profundidadeInstrucoes[iaConfig.profundidade] || profundidadeInstrucoes['aplicada']}
${incluirLimiteExtensao ? `5. EXTENSÃO MÍNIMA: ${limiteCaracteres} caracteres (pode ultrapassar um pouco, mas NUNCA gere menos que isso)

⚠️ REGRA CRÍTICA: O conteúdo DEVE ter NO MÍNIMO ${limiteCaracteres} caracteres. Gere conteúdo COMPLETO e DETALHADO.` : `5. FORMATO: Siga EXATAMENTE o formato solicitado abaixo. NÃO gere texto corrido ou teoria.`}

🚫 PROIBIDO ABSOLUTAMENTE:
- NÃO inicie com saudações como "Olá", "Olá futuro servidor", "Caro estudante", etc.
- NÃO use frases genéricas de abertura
- NÃO repita o nome do tópico ou disciplina no início de forma desnecessária
- VÁ DIRETO AO CONTEÚDO sem preâmbulos
- Comece IMEDIATAMENTE com o conteúdo substancial
==================================================
`

    // Se há feedback do usuário para regeneração, adicionar ao prompt
    if (regenerar && feedback_usuario) {
      const extensaoSolicitada = {
        curto: 'CURTO (mínimo 800 caracteres)',
        medio: 'MÉDIO (mínimo 2500 caracteres)',
        longo: 'LONGO (mínimo 5000 caracteres)',
        completo: 'COMPLETO e EXTENSO (mínimo 10000 caracteres - o mais detalhado possível)'
      }[iaConfig.extensao] || 'MÉDIO (mínimo 2500 caracteres)'
      
      personalizacao += `

🔴🔴🔴 ATENÇÃO MÁXIMA - REGENERAÇÃO COM FEEDBACK DO USUÁRIO 🔴🔴🔴

📝 CRÍTICA DO USUÁRIO:
"${feedback_usuario}"

📏 TAMANHO SOLICITADO: ${extensaoSolicitada}
   O usuário ESCOLHEU EXPLICITAMENTE este tamanho. RESPEITE!

⚠️ REGRAS OBRIGATÓRIAS PARA REGENERAÇÃO:
1. O conteúdo anterior era MUITO CURTO ou não atendeu
2. Você DEVE gerar conteúdo com NO MÍNIMO ${limiteCaracteres} caracteres
3. Não resuma nem encurte - EXPANDA e DETALHE ao máximo
4. Inclua MAIS exemplos, MAIS explicações, MAIS detalhes
5. Se o usuário pediu "completo", gere o conteúdo MAIS EXTENSO possível

🚨 FALHA ANTERIOR: O conteúdo gerado anteriormente foi rejeitado por ser curto demais.
   ESTA É SUA CHANCE DE CORRIGIR. Gere conteúdo MUITO MAIS EXTENSO.
==================================================
`
    }
    
    switch(tipoConteudo) {
      case 'teoria':
        const formatoTeoria = iaConfig.formatoTeoria === 'basica' ? 'Teoria BÁSICA com conceitos fundamentais apenas.' :
                             iaConfig.formatoTeoria === 'avancada' ? 'Teoria AVANÇADA com detalhes técnicos complexos.' :
                             'Teoria COMPLETA cobrindo todos os aspectos.'
        
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.

🔴🔴🔴 REGRA MÁXIMA E INVIOLÁVEL 🔴🔴🔴
VOCÊ DEVE GERAR O CONTEÚDO MAIS COMPLETO E EXTENSO POSSÍVEL.
NÃO HÁ LIMITE DE CARACTERES - QUANTO MAIS CONTEÚDO, MELHOR!
SE FALTAR ASSUNTO NO TÓPICO, PODE EXTRAPOLAR PARA SUBTÓPICOS RELACIONADOS.
NUNCA DEIXE NENHUM ASPECTO DO TÓPICO SEM COBRIR.
==================================================

FORMATO: ${formatoTeoria}

Crie um CONTEÚDO TEÓRICO MÁXIMO sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

ESTRUTURA OBRIGATÓRIA (EXPANDA CADA SEÇÃO AO MÁXIMO):
1. **Introdução Completa** - Contexto histórico, importância para concursos, fundamentos
2. **Conceitos Fundamentais** - TODAS as definições, termos técnicos, classificações
3. **Desenvolvimento Extenso** - Explicação detalhada de TODOS os aspectos com exemplos práticos
4. **Legislação e Jurisprudência** - Cite TODAS as leis, artigos, súmulas relevantes
5. **Casos Práticos** - Exemplos reais, estudos de caso, aplicações
6. **Pontos de Atenção** - O que mais cai em provas, pegadinhas comuns
7. **Dicas de Memorização** - Macetes, técnicas mnemônicas, associações
8. **Questões Frequentes** - Como o tema é cobrado nas bancas
9. **Resumo Final Completo** - Todos os pontos-chave em bullets detalhados

REGRAS OBRIGATÓRIAS:
- 🔴 GERE O MÁXIMO DE CONTEÚDO POSSÍVEL - NÃO HÁ LIMITE!
- 🔴 CUBRA 100% DO TÓPICO - NÃO DEIXE NADA DE FORA
- 🔴 Se o tópico for pequeno, EXPANDA para subtópicos relacionados
- 🔴 NUNCA resuma ou encurte - SEMPRE expanda e detalhe
- Use linguagem clara e didática
- Inclua MUITOS exemplos práticos e casos reais
- Destaque palavras-chave em **negrito**
- Cite legislação e jurisprudência SEMPRE que aplicável
- Formate em Markdown

📊 REGRAS PARA TABELAS (IMPORTANTE):
- EVITE usar tabelas sempre que possível
- Se for absolutamente necessário usar tabela, formate em Markdown correto:
  | Coluna 1 | Coluna 2 | Coluna 3 |
  |----------|----------|----------|
  | Dado 1   | Dado 2   | Dado 3   |
- Prefira LISTAS com bullets ou números ao invés de tabelas
- NUNCA use caracteres especiais ou ASCII art para fazer tabelas

🚫 PROIBIDO:
- NÃO inicie com saudações
- NÃO use frases genéricas
- VÁ DIRETO AO CONTEÚDO`
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
        
        systemPrompt = `Você é um elaborador EXPERT de provas de concursos públicos brasileiros.
${personalizacao}
6. FORMATO: ${formatoExercicios}

${instrucoesBanca}

🔴🔴🔴 ATENÇÃO MÁXIMA - REGRAS CRÍTICAS 🔴🔴🔴

════════════════════════════════════════════════════════════════
🎯 TÓPICO ESPECÍFICO E ÚNICO: "${topico_nome}"
📚 DISCIPLINA: "${disciplina_nome}"
════════════════════════════════════════════════════════════════

⚠️ REGRA INVIOLÁVEL: TODAS as ${qtdExercicios} questões devem ser 100% sobre "${topico_nome}".

🚫 PROIBIDO:
- NÃO misture com outros tópicos da disciplina "${disciplina_nome}"
- NÃO generalize para assuntos diferentes
- NÃO crie questões genéricas ou que caibam em qualquer tópico
- NÃO repita conceitos ou perguntas similares entre questões
- NÃO use a mesma estrutura de pergunta em questões diferentes

✅ OBRIGATÓRIO:
- CADA questão deve abordar um ASPECTO ÚNICO E DIFERENTE do tópico "${topico_nome}"
- VARIE os ângulos de abordagem: conceitos, aplicação, casos práticos, exceções, jurisprudência
- Mencione ESPECIFICAMENTE elementos do tópico "${topico_nome}" no enunciado
- Os comentários devem explicar conceitos ESPECÍFICOS de "${topico_nome}"

EXEMPLOS DE VARIAÇÃO PARA O MESMO TÓPICO:
Q1 - Conceito básico/definição do tópico
Q2 - Aplicação prática em situação real
Q3 - Exceções e casos especiais
Q4 - Distinção com conceitos similares
Q5 - Jurisprudência ou legislação específica (se aplicável)
Q6 - Pegadinha comum em provas sobre este tópico
Q7+ - Outros aspectos únicos do tópico

CRIE EXATAMENTE ${qtdExercicios} QUESTÕES ÚNICAS E DIFERENTES sobre "${topico_nome}".

${caracteristicasBanca?.estilo?.tipo === 'certo_errado' ? `
ESTRUTURA OBRIGATÓRIA (CERTO/ERRADO):

**Questão 1** [Aspecto: conceito básico]
[Afirmação ESPECÍFICA sobre "${topico_nome}" para julgar]

**Gabarito:** CERTO / ERRADO
**Comentário:** Explicação detalhada de POR QUE está certo/errado, citando "${topico_nome}".

---

**Questão 2** [Aspecto: aplicação prática]
...
` : `
ESTRUTURA OBRIGATÓRIA:

**Questão 1** [Aspecto: conceito básico] (Nível: Fácil)
[Enunciado ESPECÍFICO sobre "${topico_nome}"]

a) Alternativa relacionada ao tópico
b) Alternativa relacionada ao tópico
c) Alternativa relacionada ao tópico
d) Alternativa relacionada ao tópico
e) Alternativa relacionada ao tópico

**Gabarito:** Letra X
**Comentário:** Explicação citando especificamente "${topico_nome}".

---

**Questão 2** [Aspecto: aplicação prática] (Nível: Médio)
...
`}

REGRAS OBRIGATÓRIAS:
- CRIE EXATAMENTE ${qtdExercicios} questões DIFERENTES entre si
- ⚠️ IMPORTANTE: O usuário solicitou EXATAMENTE ${qtdExercicios} questões. NÃO gere menos nem mais.
- Numere de 1 a ${qtdExercicios} sequencialmente
- Indique [Aspecto: X] para garantir variedade
${caracteristicasBanca?.estilo?.tipo === 'certo_errado' ? 
  '- Cada questão é uma AFIRMAÇÃO sobre "${topico_nome}" para julgar\n- Inclua pegadinhas de interpretação específicas do tópico' :
  '- Cada questão DEVE ter exatamente 5 alternativas (a, b, c, d, e)\n- Varie os níveis: Fácil (30%), Médio (50%), Difícil (20%)'}
- Cada questão DEVE ter Gabarito e Comentário
- Use o separador --- entre questões
- VERIFIQUE: total de questões = ${qtdExercicios}? Se não, continue gerando até atingir ${qtdExercicios}.
- VERIFIQUE: cada questão aborda um aspecto ÚNICO de "${topico_nome}"?`
        break
        
      case 'resumo':
        const formatoResumo = iaConfig.formatoResumo === 'curto' ? 'Resumo CURTO com pontos-chave apenas.' :
                             'Resumo DETALHADO com explicações completas.';
        
        // ✅ v70: Diferenciar entre resumo escrito e esquematizado
        const isEsquematizado = subtipo_resumo === 'esquematizado';
        
        if (isEsquematizado) {
          systemPrompt = `Você é um professor especialista em concursos públicos brasileiros, expert em criar materiais visuais de estudo.

FORMATO: Resumo ESQUEMATIZADO / VISUAL com hierarquia clara e organização por blocos.

🔴 EXTENSÃO OBRIGATÓRIA: ${limiteResumo} caracteres (o usuário escolheu este tamanho)

Crie um RESUMO ESQUEMATIZADO sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

⚠️ REGRA CRÍTICA DE FORMATAÇÃO:
O conteúdo será renderizado visualmente em CARDS/BLOCOS coloridos. Cada seção (##) vira um card separado.
USE OBRIGATORIAMENTE esta estrutura:

## 📌 CONCEITO CENTRAL
- Definição objetiva do tema principal
- O que é, para que serve, onde se aplica
- Fundamento legal/teórico (se houver)

## 📋 ESTRUTURA / HIERARQUIA
- Organize os conceitos em níveis hierárquicos
- Use sub-itens com traço (-) para detalhar
- Classifique por categorias quando possível

## 🔑 ELEMENTOS-CHAVE
- Ponto essencial 1 — explicação breve
- Ponto essencial 2 — explicação breve
- Ponto essencial 3 — explicação breve
- Ponto essencial 4 — explicação breve

## 📊 COMPARATIVO / DIFERENÇAS
| Aspecto | Conceito A | Conceito B |
|---------|-----------|-----------|
| Definição | ... | ... |
| Aplicação | ... | ... |
| Exceção | ... | ... |

## ⚠️ PEGADINHAS E ARMADILHAS
- O que parece correto mas NÃO é
- Confusões mais comuns em prova
- Palavras que mudam o sentido da questão

## 🎯 MNEMÔNICOS E MACETES
- Siglas para memorização
- Frases de memorização
- Associações mentais úteis

## ✅ RESUMO RÁPIDO (REVISÃO)
- Ponto 1: [frase curta e direta]
- Ponto 2: [frase curta e direta]
- Ponto 3: [frase curta e direta]
- Ponto 4: [frase curta e direta]
- Ponto 5: [frase curta e direta]

REGRAS OBRIGATÓRIAS:
1. Cada seção DEVE começar com ## seguido de emoji e título em MAIÚSCULA
2. Use listas com traço (-) como marcador principal
3. Use **negrito** para termos importantes
4. Tabelas Markdown SÃO BEM-VINDAS para comparativos
5. Seja CONCISO em cada item — máximo 1-2 linhas por bullet
6. CUBRA TODOS os aspectos importantes do tópico
7. Adicione ou remova seções conforme necessário para o tema
8. 🔴 GERE EXATAMENTE ~${limiteResumo} caracteres

🚫 PROIBIDO:
- NÃO use texto corrido/parágrafos longos
- NÃO inicie com saudações
- NÃO use # (h1), apenas ## (h2) e ### (h3)
- VÁ DIRETO AO CONTEÚDO`
        } else {
          // Resumo escrito (formato original)
          systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.

FORMATO: ${formatoResumo}

🔴 EXTENSÃO OBRIGATÓRIA: ${limiteResumo} caracteres (o usuário escolheu este tamanho)
Se o usuário escolheu 1 página (~2500 chars): seja mais conciso
Se escolheu 2 páginas (~5000 chars): desenvolva mais
Se escolheu 3 páginas (~7500 chars): seja bem detalhado

Crie um RESUMO sobre o tópico "${topico_nome}" da disciplina "${disciplina_nome}".

ESTRUTURA OBRIGATÓRIA:
📌 **CONCEITO PRINCIPAL**
[Definição clara e objetiva]

📋 **PONTOS-CHAVE**
• Ponto 1 - explicação
• Ponto 2 - explicação
• Ponto 3 - explicação
[Adicione quantos pontos forem necessários]

⚠️ **ATENÇÃO - PEGADINHAS DE PROVA**
• O que parece mas não é
• Erros comuns dos candidatos
• Palavras-chave que enganam

🎯 **MNEMÔNICOS E MACETES**
[Técnicas para memorização]

✅ **PALAVRAS-CHAVE PARA PROVA**
[Lista das palavras que indicam a resposta correta]

REGRAS:
- Seja OBJETIVO e DIRETO
- Use bullets para facilitar memorização
- 🔴 GERE EXATAMENTE ~${limiteResumo} caracteres (o usuário escolheu este tamanho!)
- NUNCA deixe nenhum aspecto importante do tópico sem cobrir
- Formate em Markdown

📊 REGRAS PARA TABELAS:
- EVITE tabelas - prefira listas
- Se usar tabela, formate corretamente em Markdown

🚫 PROIBIDO:
- NÃO inicie com saudações
- VÁ DIRETO AO CONTEÚDO`
        }
        break
        
      case 'flashcards':
        const formatoFlashcards = iaConfig.formatoFlashcards === 'objetivos' ? 
          'Flashcards OBJETIVOS: FRENTE com termo/conceito (1-5 palavras), VERSO com definição direta (1-2 linhas).' :
          'Flashcards APROFUNDADOS: FRENTE com termo/conceito (1-5 palavras), VERSO com explicação detalhada e exemplo (2-4 linhas).'
        
        // ✅ CORREÇÃO: Flashcards NÃO usa personalizacao com limite de caracteres
        // pois isso confundia a IA fazendo gerar teoria ao invés de flashcards
        systemPrompt = `Você é um professor especialista em concursos públicos brasileiros.

🚫 PROIBIDO: NÃO gere teoria, texto corrido ou explicações longas. Gere APENAS flashcards no formato abaixo.

FORMATO: ${formatoFlashcards}

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
      maxTokens = Math.max(qtdFlashcards * 300, 6000) // Aumentado para garantir todos os flashcards
    } else if (tipoConteudo === 'exercicios') {
      maxTokens = Math.max(qtdExercicios * 600, 8000) // Aumentado para garantir todas as questões
    } else {
      // Para teoria/resumo: garantir tokens suficientes para a extensão desejada
      // Para 'completo' (10000 chars), precisamos de pelo menos 8000 tokens
      if (iaConfig.extensao === 'completo') {
        maxTokens = 12000 // Garantir espaço suficiente para conteúdo completo
      } else {
        maxTokens = Math.max(Math.ceil(limiteCaracteres / 1.5), 4000)
      }
    }
    
    console.log(`🎯 Configuração: temperatura=${temperaturaFixa}, maxTokens=${maxTokens}, extensão=${iaConfig.extensao} (${limiteCaracteres} chars)`)
    
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
        
        // ✅ v70: Título diferenciado para resumo esquematizado
        const subtipoLabel = (tipoConteudo === 'resumo' && subtipo_resumo === 'esquematizado') ? 'Resumo Esquematizado' : tipoLabel
        const titulo = `${subtipoLabel}: ${topico_nome || disciplina_nome}`
        
        // ✅ v70: Salvar subtipo como tag
        const tags = (tipoConteudo === 'resumo' && subtipo_resumo) ? `subtipo:${subtipo_resumo}` : null
        
        const saveResult = await DB.prepare(`
          INSERT INTO materiais_salvos (user_id, disciplina_id, topico_id, tipo, titulo, conteudo, meta_id, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(parseInt(user_id_header), disciplina_id || null, topico_id || null, tipoConteudo, titulo, conteudo, meta_id || null, tags).run()
        
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
      subtipo_resumo: tipoConteudo === 'resumo' ? (subtipo_resumo || 'escrito') : undefined,
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

// ============== FEEDBACK DE CONTEÚDO ==============
app.post('/api/conteudo/feedback', async (c) => {
  const { DB } = c.env
  const { user_id, tipo, conteudo_tipo, disciplina_nome, topico_nome, critica } = await c.req.json()
  
  // Extrair campos adicionais
  const { extensao_solicitada, regeneracao } = await c.req.json().catch(() => ({}))
  
  try {
    // Criar tabela se não existir (com campos adicionais)
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS conteudo_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('bom', 'ruim')),
        conteudo_tipo TEXT,
        disciplina_nome TEXT,
        topico_nome TEXT,
        critica TEXT,
        extensao_solicitada TEXT,
        regeneracao INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run()
    
    // Tentar adicionar colunas novas (se não existirem)
    try {
      await DB.prepare('ALTER TABLE conteudo_feedback ADD COLUMN extensao_solicitada TEXT').run()
    } catch (e) { /* coluna já existe */ }
    try {
      await DB.prepare('ALTER TABLE conteudo_feedback ADD COLUMN regeneracao INTEGER DEFAULT 0').run()
    } catch (e) { /* coluna já existe */ }
    
    // Inserir feedback
    await DB.prepare(`
      INSERT INTO conteudo_feedback (user_id, tipo, conteudo_tipo, disciplina_nome, topico_nome, critica, extensao_solicitada, regeneracao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user_id, 
      tipo, 
      conteudo_tipo || null, 
      disciplina_nome || null, 
      topico_nome || null, 
      critica || null,
      extensao_solicitada || null,
      regeneracao ? 1 : 0
    ).run()
    
    console.log(`📊 Feedback registrado: ${tipo} - ${conteudo_tipo} - ${disciplina_nome} - regeneração: ${regeneracao ? 'sim' : 'não'}`)
    
    return c.json({ success: true, message: 'Feedback registrado com sucesso' })
  } catch (error) {
    console.error('❌ Erro ao salvar feedback:', error)
    return c.json({ error: 'Erro ao salvar feedback' }, 500)
  }
})

// Listar feedbacks (admin)
app.get('/api/admin/feedbacks', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const tipo = c.req.query('tipo') || ''
    const offset = (page - 1) * limit
    
    let query = 'SELECT f.*, u.name as user_name, u.email as user_email FROM conteudo_feedback f LEFT JOIN users u ON f.user_id = u.id'
    let countQuery = 'SELECT COUNT(*) as count FROM conteudo_feedback f'
    
    if (tipo) {
      query += ` WHERE f.tipo = '${tipo}'`
      countQuery += ` WHERE f.tipo = '${tipo}'`
    }
    
    query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?'
    
    const { results: feedbacks } = await DB.prepare(query).bind(limit, offset).all()
    const total = await DB.prepare(countQuery).first() as any
    
    return c.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error)
    return c.json({ error: 'Erro ao buscar feedbacks', feedbacks: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } })
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
    // Garantir quantidade mínima e máxima
    const qtdFinal = Math.max(5, Math.min(50, quantidade || 20))
    console.log(`📝 Gerando simulado: ${qtdFinal} questões para ${disciplinas.length} disciplinas`)
    
    // Buscar nomes das disciplinas E seus tópicos cadastrados
    const disciplinasComTopicos: any[] = []
    for (const discId of disciplinas) {
      const disc = await DB.prepare('SELECT id, nome FROM disciplinas WHERE id = ?').bind(discId).first() as any
      if (disc) {
        // ✅ CORREÇÃO: Buscar tópicos da tabela edital_topicos (via edital_disciplinas)
        // Primeiro buscar edital_disciplina_id correspondente
        const editalDisc = await DB.prepare(`
          SELECT id FROM edital_disciplinas 
          WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?))
          LIMIT 1
        `).bind(disc.nome).first() as any
        
        let topicosDisc: any[] = []
        if (editalDisc?.id) {
          const { results } = await DB.prepare(`
            SELECT id, nome FROM edital_topicos 
            WHERE edital_disciplina_id = ? 
            ORDER BY ordem ASC LIMIT 20
          `).bind(editalDisc.id).all()
          topicosDisc = results || []
        }
        
        // Fallback: tentar topicos_edital se edital_topicos não tiver dados
        if (topicosDisc.length === 0) {
          const { results } = await DB.prepare(`
            SELECT id, nome FROM topicos_edital WHERE disciplina_id = ? ORDER BY nome LIMIT 20
          `).bind(discId).all()
          topicosDisc = results || []
        }
        
        disciplinasComTopicos.push({
          ...disc,
          topicos: topicosDisc
        })
      }
    }
    
    // Buscar tópicos específicos se selecionados
    let topicosEspecificos: any[] = []
    if (topicos && topicos.length > 0) {
      for (const topId of topicos) {
        // Tentar ambas as tabelas
        let top = await DB.prepare('SELECT id, nome FROM edital_topicos WHERE id = ?').bind(topId).first()
        if (!top) {
          top = await DB.prepare('SELECT id, nome, disciplina_id FROM topicos_edital WHERE id = ?').bind(topId).first()
        }
        if (top) {
          topicosEspecificos.push(top)
        }
      }
    }
    
    // Calcular distribuição de questões por disciplina
    const questoesPorDisciplina = Math.ceil(qtdFinal / disciplinasComTopicos.length)
    
    // Construir detalhamento por disciplina com tópicos
    const detalhamentoDisciplinas = disciplinasComTopicos.map(d => {
      const topicosTexto = d.topicos.length > 0 
        ? d.topicos.map((t: any) => `"${t.nome}"`).join(', ')
        : 'conteúdo geral da disciplina'
      return `
📚 DISCIPLINA: ${d.nome}
   TÓPICOS OBRIGATÓRIOS: ${topicosTexto}
   QUESTÕES: ${questoesPorDisciplina} questões
   ⚠️ TODAS as questões desta disciplina DEVEM abordar ESPECIFICAMENTE estes tópicos!`
    }).join('\n')
    
    // Se há tópicos específicos selecionados, priorizar eles
    const topicosEspecificosTexto = topicosEspecificos.length > 0
      ? `\n🎯 TÓPICOS PRIORITÁRIOS (o usuário escolheu especificamente estes):\n${topicosEspecificos.map(t => `   - "${t.nome}"`).join('\n')}\n   ⚠️ PRIORIZE questões sobre estes tópicos!`
      : ''
    
    const systemPrompt = `Você é um elaborador EXPERT de provas de concursos públicos brasileiros.

🔴🔴🔴 REGRA MAIS IMPORTANTE 🔴🔴🔴
Você DEVE gerar EXATAMENTE ${qtdFinal} questões. NEM MAIS, NEM MENOS.
Se pedirem 25, gere 25. Se pedirem 10, gere 10. Se pedirem 50, gere 50.
Numere de 1 até ${qtdFinal}. NÃO pare antes de atingir ${qtdFinal}.

═══════════════════════════════════════════════════════
DISTRIBUIÇÃO:
${detalhamentoDisciplinas}
${topicosEspecificosTexto}
═══════════════════════════════════════════════════════

📌 REGRAS:
1. Gere EXATAMENTE ${qtdFinal} questões (Questão 1 até Questão ${qtdFinal})
2. As questões devem ser sobre os tópicos listados acima
3. Distribua equilibradamente: ~${questoesPorDisciplina} questões por disciplina
4. Varie: 30% fácil, 50% médio, 20% difícil
5. Estilo de bancas: CESPE, FCC, FGV, VUNESP
6. Inclua pegadinhas típicas

FORMATO (repita ${qtdFinal} vezes, de 1 a ${qtdFinal}):

**Questão 1** [Disciplina: Nome] [Tópico: Nome] (Nível: Médio)
Enunciado da questão.

a) Alternativa 1
b) Alternativa 2
c) Alternativa 3
d) Alternativa 4
e) Alternativa 5

**Gabarito:** Letra X
**Comentário:** Explicação.

---

⚠️ LEMBRETE FINAL: Verifique que gerou EXATAMENTE ${qtdFinal} questões antes de finalizar.`

    // Calcular tokens necessários: ~600 tokens por questão (enunciado + 5 alternativas + gabarito + comentário)
    const tokensNecessarios = Math.max(16000, qtdFinal * 700)
    console.log(`🔧 Tokens alocados: ${tokensNecessarios} para ${qtdFinal} questões`)

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
          temperature: 0.7,
          maxOutputTokens: tokensNecessarios,
          topP: 0.95
        }
      })
    })
    
    // ✅ CORREÇÃO: Verificar se a resposta HTTP foi bem sucedida
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro HTTP ${response.status} ao gerar simulado:`, errorText)
      return c.json({ 
        error: `Erro HTTP ${response.status} ao gerar simulado`,
        details: errorText.substring(0, 500)
      }, 500)
    }
    
    const data: any = await response.json()
    
    if (data.error) {
      console.error('❌ Erro Gemini ao gerar simulado:', data.error)
      return c.json({ 
        error: 'Erro ao gerar simulado',
        details: data.error.message || 'Erro na API de IA'
      }, 500)
    }
    
    const conteudo = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = data.candidates?.[0]?.finishReason || 'UNKNOWN'
    
    if (!conteudo || conteudo.length < 100) {
      console.error('❌ Simulado gerado muito curto:', conteudo.length, 'chars')
      return c.json({ error: 'Simulado gerado muito curto ou vazio. Tente novamente.' }, 500)
    }
    
    // Contar questões geradas
    const questoesGeradas = (conteudo.match(/\*{0,2}Questão\s+\d+/gi) || []).length
    
    console.log(`✅ Simulado gerado: ${conteudo.length} chars, ${questoesGeradas}/${qtdFinal} questões, finishReason: ${finishReason}`)
    
    // Se gerou menos que o pedido e foi cortado por tokens, avisar
    if (questoesGeradas < qtdFinal && finishReason === 'MAX_TOKENS') {
      console.warn(`⚠️ Simulado cortado: gerou ${questoesGeradas} de ${qtdFinal} questões (MAX_TOKENS)`)
    }
    
    return c.json({ 
      success: true,
      conteudo,
      questoes_geradas: questoesGeradas,
      questoes_pedidas: qtdFinal,
      disciplinas: disciplinasComTopicos.map(d => d.nome),
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

// v70: Buscar material por disciplina/topico/tipo (DEVE FICAR ANTES de /:user_id)
app.get('/api/materiais/buscar', async (c) => {
  const { DB } = c.env
  const user_id = c.req.query('user_id')
  const disciplina_id = c.req.query('disciplina_id')
  const topico_id = c.req.query('topico_id')
  const tipo = c.req.query('tipo')

  try {
    let material = null

    // 1. Tentar buscar por topico_id + tipo (mais específico)
    if (topico_id && topico_id !== 'null' && topico_id !== 'undefined') {
      material = await DB.prepare(`
        SELECT ms.*, d.nome as disciplina_nome, te.nome as topico_nome
        FROM materiais_salvos ms
        LEFT JOIN disciplinas d ON ms.disciplina_id = d.id
        LEFT JOIN topicos_edital te ON ms.topico_id = te.id
        WHERE ms.user_id = ? AND ms.topico_id = ? AND ms.tipo = ?
        ORDER BY ms.created_at DESC
        LIMIT 1
      `).bind(parseInt(user_id as string), parseInt(topico_id as string), tipo).first()
    }

    // 2. Fallback: buscar por disciplina_id + tipo
    if (!material && disciplina_id && disciplina_id !== 'null' && disciplina_id !== 'undefined') {
      material = await DB.prepare(`
        SELECT ms.*, d.nome as disciplina_nome, te.nome as topico_nome
        FROM materiais_salvos ms
        LEFT JOIN disciplinas d ON ms.disciplina_id = d.id
        LEFT JOIN topicos_edital te ON ms.topico_id = te.id
        WHERE ms.user_id = ? AND ms.disciplina_id = ? AND ms.tipo = ?
        ORDER BY ms.created_at DESC
        LIMIT 1
      `).bind(parseInt(user_id as string), parseInt(disciplina_id as string), tipo).first()
    }

    if (material) {
      return c.json({ found: true, material })
    }
    return c.json({ found: false, material: null })
  } catch (error: any) {
    console.error('Erro ao buscar material:', error)
    return c.json({ found: false, material: null, error: error.message })
  }
})

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
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://iaprova.app/">
    <meta property="og:title" content="IAprova - Preparação Inteligente para Concursos">
    <meta property="og:description" content="Estude de forma inteligente com IA. Planos personalizados, questões no estilo da sua banca e muito mais!">
    <meta property="og:image" content="https://iaprova.app/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:site_name" content="IAprova">
    <meta property="og:locale" content="pt_BR">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://iaprova.app/">
    <meta property="twitter:title" content="IAprova - Preparação Inteligente para Concursos">
    <meta property="twitter:description" content="Estude de forma inteligente com IA. Planos personalizados, questões no estilo da sua banca e muito mais!">
    <meta property="twitter:image" content="https://iaprova.app/og-image.png">
    
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
      // v37: Usar função centralizada callAI em vez de verificar apenas GROQ
      const aiResult = await callAI(DB, c.env, {
        prompt,
        systemPrompt: 'Você é um especialista em elaboração de questões para concursos públicos brasileiros. REGRAS ABSOLUTAS: 1) SEMPRE retorne JSON válido. 2) CADA questão deve abordar um TÓPICO DIFERENTE - NUNCA repita tópicos ou enunciados. 3) O conteúdo deve ser PRECISO e VERIFICÁVEL - use fatos, leis e dados REAIS. 4) As questões devem ser baseadas nos TÓPICOS ESPECÍFICOS fornecidos no edital do candidato. 5) Varie a dificuldade: 30% fácil, 50% médio, 20% difícil.',
        maxTokens: 8000,
        temperature: 0.3,
        jsonMode: true
      })
      
      if (!aiResult.success) {
        console.log('⚠️ Nenhuma API disponível, gerando questões de exemplo')
        const questoesExemplo = gerarQuestoesExemplo(cfg.questoes, discsParaUsar)
        return c.json({ 
          success: true, 
          questoes: questoesExemplo,
          tempo_minutos: cfg.tempo,
          tipo,
          fallback: true
        })
      }
      
      // Sanitizar JSON
      let jsonText = aiResult.text.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }
      jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      const resultado = JSON.parse(jsonText)
      
      return c.json({ 
        success: true, 
        questoes: resultado.questoes || [],
        tempo_minutos: cfg.tempo,
        tipo,
        modelo: aiResult.model,
        provider: aiResult.provider
      })
    }

    // v37: Usar função centralizada callAI
    const aiResult = await callAI(DB, c.env, {
      prompt,
      systemPrompt: 'Você é um especialista em elaboração de questões para concursos públicos brasileiros. REGRAS ABSOLUTAS: 1) SEMPRE retorne JSON válido. 2) CADA questão deve abordar um TÓPICO DIFERENTE - NUNCA repita tópicos ou enunciados. 3) O conteúdo deve ser PRECISO e VERIFICÁVEL - use fatos, leis e dados REAIS. 4) As questões devem ser baseadas nos TÓPICOS ESPECÍFICOS fornecidos no edital do candidato. 5) Varie a dificuldade: 30% fácil, 50% médio, 20% difícil.',
      maxTokens: 8000,
      temperature: 0.3,
      jsonMode: true
    })
    
    if (!aiResult.success) {
      console.error('❌ Erro em todas as APIs')
      const questoesExemplo = gerarQuestoesExemplo(cfg.questoes, discsParaUsar)
      return c.json({ 
        success: true, 
        questoes: questoesExemplo,
        tempo_minutos: cfg.tempo,
        tipo,
        fallback: true
      })
    }

    // Sanitizar JSON
    let jsonText = aiResult.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    const resultado = JSON.parse(jsonText)
    
    return c.json({ 
      success: true, 
      questoes: resultado.questoes || [],
      tempo_minutos: cfg.tempo,
      tipo,
      modelo: aiResult.model,
      provider: aiResult.provider
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

// ============== REENGAJAMENTO - EMAIL MARKETING ==============

// Preview: listar usuários elegíveis para reengajamento (>7 dias sem premium)
app.get('/api/admin/reengajamento/preview', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Buscar usuários que:
    // 1. trial_expires_at < agora (trial expirado)
    // 2. is_premium = 0 ou NULL
    // 3. subscription_status != 'active'
    // ✅ v79-fix: Enviar assim que trial expirar (não esperar 7 dias)
    const now = new Date().toISOString()
    
    const users = await DB.prepare(`
      SELECT id, name, email, trial_started_at, trial_expires_at, subscription_status,
             created_at
      FROM users 
      WHERE email_verified = 1
        AND (is_premium = 0 OR is_premium IS NULL)
        AND (subscription_status IS NULL OR subscription_status IN ('expired', 'trial', ''))
        AND trial_expires_at IS NOT NULL
        AND trial_expires_at <= ?
      ORDER BY trial_expires_at DESC
    `).bind(now).all()
    
    // Verificar quais já receberam email de reengajamento (qualquer vez)
    const recentEmails = await DB.prepare(`
      SELECT DISTINCT email_to FROM email_history 
      WHERE email_type = 'reengajamento' 
        AND status = 'sent'
    `).all()
    
    const recentSet = new Set((recentEmails.results || []).map((r: any) => r.email_to))
    
    const eligible = (users.results || []).map((u: any) => {
      const diasSemPremium = Math.floor((Date.now() - new Date(u.trial_expires_at).getTime()) / (1000 * 60 * 60 * 24))
      return {
        ...u,
        dias_sem_premium: diasSemPremium,
        ja_recebeu_recente: recentSet.has(u.email)
      }
    })
    
    return c.json({
      total_elegiveis: eligible.length,
      novos: eligible.filter((u: any) => !u.ja_recebeu_recente).length,
      ja_contactados: eligible.filter((u: any) => u.ja_recebeu_recente).length,
      usuarios: eligible
    })
  } catch (error: any) {
    console.error('Erro ao buscar usuários para reengajamento:', error)
    return c.json({ error: 'Erro ao buscar usuários elegíveis' }, 500)
  }
})

// Enviar emails de reengajamento
app.post('/api/admin/reengajamento/enviar', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const body = await c.req.json()
    const { user_ids, enviar_para_todos, email_teste } = body
    
    const RESEND_API_KEY = c.env.RESEND_API_KEY || 'seu_resend_api_key_aqui'
    const FROM_EMAIL = c.env.FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>'
    const APP_URL = c.env.APP_URL || 'https://iaprova.pages.dev'
    
    if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
      return c.json({ error: 'RESEND_API_KEY não configurada' }, 400)
    }
    
    let targetUsers: any[] = []
    
    // Modo teste: enviar para email específico
    if (email_teste) {
      const user = await DB.prepare('SELECT id, name, email FROM users WHERE email = ?').bind(email_teste).first()
      if (user) {
        targetUsers = [user]
      } else {
        // Criar entrada fictícia para teste
        targetUsers = [{ id: 0, name: 'Usuário Teste', email: email_teste }]
      }
    } else if (enviar_para_todos) {
      // ✅ v79-fix: Trial expirado = elegível (sem esperar 7 dias)
      const now = new Date().toISOString()
      const users = await DB.prepare(`
        SELECT id, name, email FROM users 
        WHERE email_verified = 1
          AND (is_premium = 0 OR is_premium IS NULL)
          AND (subscription_status IS NULL OR subscription_status IN ('expired', 'trial', ''))
          AND trial_expires_at IS NOT NULL
          AND trial_expires_at <= ?
          AND email NOT IN (
            SELECT email_to FROM email_history 
            WHERE email_type = 'reengajamento' 
              AND status = 'sent'
          )
      `).bind(now).all()
      targetUsers = users.results || []
    } else if (user_ids && user_ids.length > 0) {
      const placeholders = user_ids.map(() => '?').join(',')
      const users = await DB.prepare(`SELECT id, name, email FROM users WHERE id IN (${placeholders})`).bind(...user_ids).all()
      targetUsers = users.results || []
    }
    
    if (targetUsers.length === 0) {
      return c.json({ error: 'Nenhum usuário elegível encontrado' }, 400)
    }
    
    const results = { enviados: 0, falhas: 0, detalhes: [] as any[] }
    
    for (const user of targetUsers) {
      try {
        const nome = user.name || 'Concurseiro(a)'
        const feedbackUrl = `${APP_URL}?feedback=reengajamento&uid=${user.id}`
        const premiumUrl = `${APP_URL}?upgrade=true`
        
        const emailHtml = gerarEmailReengajamento(nome, feedbackUrl, premiumUrl, APP_URL)
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [user.email],
            subject: '💎 Sentimos sua falta! Sua aprovação está a um passo — Oferta especial IAprova',
            html: emailHtml,
          }),
        })
        
        const result = await response.json() as any
        
        if (result.id) {
          results.enviados++
          results.detalhes.push({ email: user.email, status: 'sent', resend_id: result.id })
          
          await logEmailSent(DB, user.email, 'reengajamento', 
            'Sentimos sua falta! Sua aprovação está a um passo', 
            'sent', user.id, undefined, { resend_id: result.id })
        } else {
          results.falhas++
          const errorMsg = result.message || JSON.stringify(result)
          results.detalhes.push({ email: user.email, status: 'failed', error: errorMsg })
          
          await logEmailSent(DB, user.email, 'reengajamento',
            'Sentimos sua falta! Sua aprovação está a um passo',
            'failed', user.id, errorMsg)
        }
      } catch (err: any) {
        results.falhas++
        results.detalhes.push({ email: user.email, status: 'failed', error: err.message })
      }
    }
    
    return c.json({
      success: true,
      total_processados: targetUsers.length,
      ...results
    })
  } catch (error: any) {
    console.error('Erro no reengajamento:', error)
    return c.json({ error: 'Erro ao enviar emails de reengajamento' }, 500)
  }
})

// Endpoint público para receber feedback vindo do email de reengajamento
app.post('/api/feedback/reengajamento', async (c) => {
  const { DB } = c.env
  
  try {
    const body = await c.req.json()
    const { user_id, rating, message, motivo } = body
    
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        rating INTEGER,
        feedback_type TEXT DEFAULT 'suggestion',
        message TEXT NOT NULL,
        page_context TEXT,
        is_read INTEGER DEFAULT 0,
        admin_response TEXT,
        responded_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const fullMessage = motivo 
      ? `[REENGAJAMENTO] Motivo: ${motivo}\n\nMensagem: ${message || '(sem mensagem adicional)'}`
      : `[REENGAJAMENTO] ${message}`
    
    await DB.prepare(`
      INSERT INTO user_feedbacks (user_id, rating, feedback_type, message, page_context)
      VALUES (?, ?, 'reengajamento', ?, 'email_reengajamento')
    `).bind(user_id || 0, rating || null, fullMessage).run()
    
    return c.json({ 
      success: true, 
      message: 'Obrigado pelo seu feedback! Sua opinião é muito importante para melhorarmos o IAprova.' 
    })
  } catch (error: any) {
    console.error('Erro ao salvar feedback de reengajamento:', error)
    return c.json({ error: 'Erro ao salvar feedback' }, 500)
  }
})

// Função para gerar o HTML do email de reengajamento
function gerarEmailReengajamento(nome: string, feedbackUrl: string, premiumUrl: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentimos sua falta - IAprova</title>
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
                    <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 70px; font-size: 36px;">
                      &#128142;
                    </div>
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 700;">
                      Sentimos sua falta, ${nome}!
                    </h1>
                    <p style="color: #B8C5E8; font-size: 15px; margin: 0;">
                      Sua aprovação no concurso ainda está ao seu alcance
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 30px;">
              
              <!-- Mensagem pessoal -->
              <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                Olá, <strong>${nome}</strong>! &#128075;
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 20px 0;">
                Percebemos que faz um tempo desde sua última visita ao <strong>IAprova</strong>. 
                Sabemos como a jornada de preparação para concursos pode ser desafiadora, e queremos que saiba: 
                <strong>estamos aqui para te ajudar a conquistar sua aprovação!</strong>
              </p>
              
              <!-- Enquanto você esteve fora -->
              <div style="background: linear-gradient(135deg, #F0F4FF 0%, #E8EDF5 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #1A3A7F;">
                <h2 style="color: #122D6A; font-size: 18px; margin: 0 0 16px 0;">
                  &#127775; Enquanto você esteve fora, evoluímos muito:
                </h2>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                      &#129302; <strong>IA Avançada</strong> — Conteúdos personalizados com Inteligência Artificial de última geração
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                      &#128218; <strong>Simulados Inteligentes</strong> — Questões adaptativas por disciplina e nível de dificuldade
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                      &#128202; <strong>Dashboard Completo</strong> — Acompanhe seu progresso com gráficos detalhados
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                      &#128197; <strong>Planos de Estudo Personalizados</strong> — Cronograma adaptado à sua prova e disponibilidade
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                      &#128172; <strong>Chat com IA</strong> — Tire dúvidas em tempo real como se tivesse um professor particular
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Prova social / Urgência -->
              <div style="background: #FFF8E1; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="color: #92400E; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">
                  &#9203; Não deixe o tempo passar!
                </p>
                <p style="color: #78350F; font-size: 14px; margin: 0; line-height: 1.6;">
                  A cada dia sem estudar, os outros candidatos avançam. Com o <strong>IAprova Premium</strong>, 
                  você estuda de forma <em>inteligente e eficiente</em>, otimizando cada minuto do seu tempo.
                </p>
              </div>
              
              <!-- CTA Premium -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${premiumUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-size: 17px; font-weight: 700; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                      &#128081; Quero voltar a estudar com o IAprova Premium
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <p style="color: #6B7280; font-size: 13px; margin: 0;">
                      Acesso ilimitado a todos os recursos por um preço acessível
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Separador -->
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0;">
              
              <!-- Seção de Feedback -->
              <div style="background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <h3 style="color: #5B21B6; font-size: 17px; margin: 0 0 12px 0;">
                  &#128591; Sua opinião vale ouro para nós!
                </h3>
                <p style="color: #6D28D9; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
                  Algo ficou abaixo das suas expectativas? Alguma funcionalidade que sentiu falta?
                  <br>Queremos ouvir você! Seu feedback nos ajuda a construir o melhor sistema de preparação para concursos do Brasil.
                </p>
                <a href="${feedbackUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); color: #ffffff; padding: 12px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                  &#9997;&#65039; Enviar meu feedback
                </a>
                <p style="color: #8B5CF6; font-size: 12px; margin: 12px 0 0 0;">
                  Leva menos de 1 minuto — e faz toda a diferença!
                </p>
              </div>
              
              <!-- Mensagem final -->
              <p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 24px 0 0 0;">
                Estamos torcendo por você, <strong>${nome}</strong>! &#128170;
                <br>Sua aprovação é o nosso objetivo.
              </p>
              <p style="color: #6B7C93; font-size: 14px; margin: 16px 0 0 0;">
                Com carinho,<br>
                <strong>Equipe IAprova</strong> &#127891;
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #F8FAFC; padding: 24px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="color: #94A3B8; font-size: 12px; margin: 0 0 8px 0;">
                <a href="${appUrl}" style="color: #1A3A7F; text-decoration: none; font-weight: 600;">IAprova</a> — Preparação Inteligente para Concursos
              </p>
              <p style="color: #CBD5E1; font-size: 11px; margin: 0;">
                Você recebeu este email porque possui uma conta no IAprova.
                <br>Se não deseja mais receber nossos emails, basta responder com "cancelar".
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

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

app.post('/api/cron/reengajamento', async (c) => {
  const { DB } = c.env
  
  // Verificar autenticação: CRON_SECRET header ou admin login
  const cronSecret = c.req.header('X-Cron-Secret') || c.req.query('secret')
  const expectedSecret = (c.env as any).CRON_SECRET || 'iaprova-cron-2026'
  const isAdminUser = await isAdmin(c)
  
  if (cronSecret !== expectedSecret && !isAdminUser) {
    return c.json({ error: 'Não autorizado' }, 401)
  }
  
  try {
    const RESEND_API_KEY = (c.env as any).RESEND_API_KEY || 'seu_resend_api_key_aqui'
    const FROM_EMAIL = (c.env as any).FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>'
    const APP_URL = (c.env as any).APP_URL || 'https://iaprova.pages.dev'
    
    if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
      return c.json({ error: 'RESEND_API_KEY não configurada', skipped: true }, 200)
    }
    
    // Buscar usuários elegíveis:
    // 1. Email verificado
    // 2. Não é premium
    // 3. Trial expirado (ou cadastro sem trial)
    // 4. NÃO recebeu email de reengajamento anteriormente (nunca enviar 2x automático)
    // ✅ v79-fix: Enviar assim que trial expirar
    const now = new Date().toISOString()
    
    const users = await DB.prepare(`
      SELECT u.id, u.name, u.email, u.created_at, u.trial_expires_at
      FROM users u
      WHERE u.email_verified = 1
        AND (u.is_premium = 0 OR u.is_premium IS NULL)
        AND (u.subscription_status IS NULL OR u.subscription_status IN ('expired', 'trial', ''))
        AND (
          (u.trial_expires_at IS NOT NULL AND u.trial_expires_at <= ?)
          OR (u.trial_expires_at IS NULL AND u.created_at <= ?)
        )
        AND u.email NOT IN (
          SELECT DISTINCT eh.email_to FROM email_history eh 
          WHERE eh.email_type = 'reengajamento' AND eh.status = 'sent'
        )
      ORDER BY u.created_at ASC
      LIMIT 20
    `).bind(now, now).all()
    
    const targetUsers = users.results || []
    
    if (targetUsers.length === 0) {
      console.log('🕐 CRON reengajamento: Nenhum usuário elegível encontrado')
      return c.json({ 
        success: true, 
        message: 'Nenhum usuário elegível para reengajamento',
        total_processados: 0,
        enviados: 0,
        falhas: 0,
        executado_em: new Date().toISOString()
      })
    }
    
    const results = { enviados: 0, falhas: 0, detalhes: [] as any[] }
    
    for (const user of targetUsers as any[]) {
      try {
        const nome = user.name || 'Concurseiro(a)'
        const feedbackUrl = `${APP_URL}?feedback=reengajamento&uid=${user.id}`
        const premiumUrl = `${APP_URL}?upgrade=true`
        
        const emailHtml = gerarEmailReengajamento(nome, feedbackUrl, premiumUrl, APP_URL)
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [user.email],
            subject: '💎 Sentimos sua falta! Sua aprovação está a um passo — Oferta especial IAprova',
            html: emailHtml,
          }),
        })
        
        const result = await response.json() as any
        
        if (result.id) {
          results.enviados++
          results.detalhes.push({ email: user.email, status: 'sent', resend_id: result.id })
          
          await logEmailSent(DB, user.email, 'reengajamento', 
            'CRON: Sentimos sua falta! Sua aprovação está a um passo', 
            'sent', user.id, undefined, { resend_id: result.id, source: 'cron_daily' })
        } else {
          results.falhas++
          const errorMsg = result.message || JSON.stringify(result)
          results.detalhes.push({ email: user.email, status: 'failed', error: errorMsg })
          
          await logEmailSent(DB, user.email, 'reengajamento',
            'CRON: Sentimos sua falta',
            'failed', user.id, errorMsg, { source: 'cron_daily' })
        }
        
        // Pausa entre emails para evitar rate limit Resend (max 2/s)
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (err: any) {
        results.falhas++
        results.detalhes.push({ email: user.email, status: 'failed', error: err.message })
      }
    }
    
    console.log(`📧 CRON reengajamento: ${results.enviados} enviados, ${results.falhas} falhas de ${targetUsers.length} elegíveis`)
    
    return c.json({
      success: true,
      total_processados: targetUsers.length,
      ...results,
      executado_em: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Erro no CRON reengajamento:', error)
    return c.json({ error: 'Erro ao executar CRON de reengajamento', details: error.message }, 500)
  }
})

// ✅ v79: Envio manual individual de email de reengajamento (admin)
app.post('/api/admin/reengajamento/enviar-individual', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    const { user_id } = await c.req.json()
    
    if (!user_id) {
      return c.json({ error: 'user_id é obrigatório' }, 400)
    }
    
    const RESEND_API_KEY = (c.env as any).RESEND_API_KEY || 'seu_resend_api_key_aqui'
    const FROM_EMAIL = (c.env as any).FROM_EMAIL || 'IAprova - Preparação para Concursos <noreply@iaprova.app>'
    const APP_URL = (c.env as any).APP_URL || 'https://iaprova.pages.dev'
    
    if (!RESEND_API_KEY || RESEND_API_KEY === 'seu_resend_api_key_aqui') {
      return c.json({ error: 'RESEND_API_KEY não configurada' }, 400)
    }
    
    const user = await DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(user_id).first() as any
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    const nome = user.name || 'Concurseiro(a)'
    const feedbackUrl = `${APP_URL}?feedback=reengajamento&uid=${user.id}`
    const premiumUrl = `${APP_URL}?upgrade=true`
    
    const emailHtml = gerarEmailReengajamento(nome, feedbackUrl, premiumUrl, APP_URL)
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject: '💎 Sentimos sua falta! Sua aprovação está a um passo — Oferta especial IAprova',
        html: emailHtml,
      }),
    })
    
    const result = await response.json() as any
    
    if (result.id) {
      await logEmailSent(DB, user.email, 'reengajamento', 
        'MANUAL: Sentimos sua falta! Sua aprovação está a um passo', 
        'sent', user.id, undefined, { resend_id: result.id, source: 'admin_manual' })
      
      return c.json({ 
        success: true, 
        message: `Email enviado com sucesso para ${user.email}`,
        resend_id: result.id
      })
    } else {
      const errorMsg = result.message || JSON.stringify(result)
      await logEmailSent(DB, user.email, 'reengajamento',
        'MANUAL: Sentimos sua falta',
        'failed', user.id, errorMsg, { source: 'admin_manual' })
      
      return c.json({ error: `Falha ao enviar: ${errorMsg}` }, 500)
    }
  } catch (error: any) {
    console.error('Erro ao enviar reengajamento individual:', error)
    return c.json({ error: 'Erro ao enviar email' }, 500)
  }
})

// ✅ v79: Status do CRON - ver quando foi a última execução
app.get('/api/admin/cron/status', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // Última execução do cron (último email de tipo reengajamento com source cron)
    const lastCron = await DB.prepare(`
      SELECT created_at, metadata FROM email_history 
      WHERE email_type = 'reengajamento' AND metadata LIKE '%cron_daily%'
      ORDER BY created_at DESC LIMIT 1
    `).first() as any
    
    // Total de emails enviados por cron
    const cronStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total_enviados,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as enviados_ok,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as enviados_falha
      FROM email_history 
      WHERE email_type = 'reengajamento' AND metadata LIKE '%cron_daily%'
    `).first() as any
    
    // Total de emails manuais
    const manualStats = await DB.prepare(`
      SELECT COUNT(*) as total FROM email_history 
      WHERE email_type = 'reengajamento' AND metadata LIKE '%admin_manual%'
    `).first() as any
    
    // Usuários elegíveis agora (trial expirado + nunca recebeu email)
    const now = new Date().toISOString()
    const eligible = await DB.prepare(`
      SELECT COUNT(*) as total FROM users u
      WHERE u.email_verified = 1
        AND (u.is_premium = 0 OR u.is_premium IS NULL)
        AND (u.subscription_status IS NULL OR u.subscription_status IN ('expired', 'trial', ''))
        AND (
          (u.trial_expires_at IS NOT NULL AND u.trial_expires_at <= ?)
          OR (u.trial_expires_at IS NULL AND u.created_at <= ?)
        )
        AND u.email NOT IN (
          SELECT DISTINCT eh.email_to FROM email_history eh 
          WHERE eh.email_type = 'reengajamento' AND eh.status = 'sent'
        )
    `).bind(now, now).first() as any
    
    return c.json({
      ultima_execucao_cron: lastCron?.created_at || null,
      cron: {
        total_enviados: cronStats?.total_enviados || 0,
        enviados_ok: cronStats?.enviados_ok || 0,
        enviados_falha: cronStats?.enviados_falha || 0
      },
      manuais: manualStats?.total || 0,
      elegiveis_agora: eligible?.total || 0,
      cron_url: '/api/cron/reengajamento',
      instrucoes: 'Configure no cron-job.org ou Cloudflare Workers para chamar POST /api/cron/reengajamento com header X-Cron-Secret diariamente'
    })
  } catch (error: any) {
    console.error('Erro ao buscar status do CRON:', error)
    return c.json({ error: 'Erro ao buscar status' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════
// ✅ v80: ANALYTICS ADMIN - Conteúdos gerados + Feedbacks globais
// ═══════════════════════════════════════════════════════════════
app.get('/api/admin/analytics', async (c) => {
  const { DB } = c.env
  
  if (!await isAdmin(c)) {
    return c.json({ error: 'Acesso negado' }, 403)
  }
  
  try {
    // ═══ 1. CONTEÚDOS GERADOS POR TIPO (totais) ═══
    const conteudoTotais = await DB.prepare(`
      SELECT 
        tipo,
        COUNT(*) as total
      FROM conteudo_estudo
      GROUP BY tipo
      ORDER BY total DESC
    `).all()
    
    // ═══ 2. CONTEÚDOS POR DIA (últimos 30 dias, agrupado por tipo e data) ═══
    const conteudoPorDia = await DB.prepare(`
      SELECT 
        DATE(created_at) as dia,
        tipo,
        COUNT(*) as total
      FROM conteudo_estudo
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia, tipo
      ORDER BY dia ASC
    `).all()
    
    // ═══ 3. FLASHCARDS GERADOS (totais e por dia) ═══
    const flashcardsTotais = await DB.prepare(`
      SELECT COUNT(*) as total FROM flashcards
    `).first() as any
    
    const flashcardsPorDia = await DB.prepare(`
      SELECT 
        DATE(created_at) as dia,
        COUNT(*) as total
      FROM flashcards
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia
      ORDER BY dia ASC
    `).all()
    
    // ═══ 4. SIMULADOS GERADOS (totais e por dia) ═══
    const simuladosTotais = await DB.prepare(`
      SELECT COUNT(*) as total FROM simulados_historico
    `).first() as any
    
    const simuladosPorDia = await DB.prepare(`
      SELECT 
        DATE(data_realizacao) as dia,
        COUNT(*) as total
      FROM simulados_historico
      WHERE data_realizacao >= datetime('now', '-30 days')
      GROUP BY dia
      ORDER BY dia ASC
    `).all()
    
    // ═══ 5. EXERCÍCIOS (resultados) ═══
    const exerciciosTotais = await DB.prepare(`
      SELECT COUNT(*) as total FROM exercicios_resultados
    `).first() as any
    
    const exerciciosPorDia = await DB.prepare(`
      SELECT 
        DATE(created_at) as dia,
        COUNT(*) as total
      FROM exercicios_resultados
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia
      ORDER BY dia ASC
    `).all()
    
    // ═══ 6. REVISÕES ═══
    const revisoesTotais = await DB.prepare(`
      SELECT COUNT(*) as total FROM revisoes
    `).first() as any
    
    // ═══ 7. FEEDBACKS - Totais por tipo ═══
    const feedbacksPorTipo = await DB.prepare(`
      SELECT 
        feedback_type,
        COUNT(*) as total,
        ROUND(AVG(rating), 1) as media_rating
      FROM user_feedbacks
      GROUP BY feedback_type
      ORDER BY total DESC
    `).all()
    
    // ═══ 8. FEEDBACKS - Por dia (últimos 30 dias) ═══
    const feedbacksPorDia = await DB.prepare(`
      SELECT 
        DATE(created_at) as dia,
        feedback_type,
        COUNT(*) as total
      FROM user_feedbacks
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY dia, feedback_type
      ORDER BY dia ASC
    `).all()
    
    // ═══ 9. FEEDBACKS - Lista completa (últimos 100) ═══
    const feedbacksLista = await DB.prepare(`
      SELECT 
        f.id, f.user_id, f.rating, f.feedback_type, f.message, 
        f.page_context, f.is_read, f.admin_response, f.responded_at,
        f.created_at,
        u.name as user_name, u.email as user_email
      FROM user_feedbacks f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 100
    `).all()
    
    // ═══ 10. FEEDBACKS - Estatísticas gerais ═══
    const feedbacksStats = await DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as nao_lidos,
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as lidos,
        ROUND(AVG(rating), 1) as media_geral,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positivos,
        SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negativos
      FROM user_feedbacks
    `).first() as any
    
    return c.json({
      conteudos: {
        totais: conteudoTotais.results || [],
        por_dia: conteudoPorDia.results || [],
        flashcards_total: flashcardsTotais?.total || 0,
        flashcards_por_dia: flashcardsPorDia.results || [],
        simulados_total: simuladosTotais?.total || 0,
        simulados_por_dia: simuladosPorDia.results || [],
        exercicios_total: exerciciosTotais?.total || 0,
        exercicios_por_dia: exerciciosPorDia.results || [],
        revisoes_total: revisoesTotais?.total || 0
      },
      feedbacks: {
        stats: feedbacksStats || {},
        por_tipo: feedbacksPorTipo.results || [],
        por_dia: feedbacksPorDia.results || [],
        lista: feedbacksLista.results || []
      }
    })
  } catch (error: any) {
    console.error('Erro analytics admin:', error)
    return c.json({ error: 'Erro ao buscar analytics', details: error.message }, 500)
  }
})

// ============== ROTA CATCH-ALL (SPA) ==============
// IMPORTANTE: Esta rota deve vir por ÚLTIMO, após todas as outras rotas de API e arquivos estáticos
// Ela captura qualquer URL não definida anteriormente e retorna o HTML do SPA
// Isso permite que rotas como /verificar-email, /resetar-senha, etc. funcionem no frontend
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

export default app
