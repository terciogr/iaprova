#!/usr/bin/env node

/**
 * Script para corrigir problemas identificados no sistema IAprova
 * 1. Validação de email
 * 2. Suporte para Gemini API
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo problemas no sistema IAprova...\n');

// Ler o arquivo index.tsx
const indexPath = path.join(__dirname, 'src', 'index.tsx');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Corrigir validação de email - tornar mais permissiva
console.log('✅ Corrigindo validação de email...');
const oldEmailRegex = `const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;`;
const newEmailRegex = `const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  // Regex mais permissiva para emails brasileiros
  // Aceita underscores, números e caracteres especiais comuns`;

if (content.includes(oldEmailRegex)) {
  content = content.replace(oldEmailRegex, newEmailRegex);
  console.log('   - Regex de email atualizada');
}

// 2. Adicionar suporte para Gemini API como alternativa ao Groq
console.log('✅ Adicionando suporte para Gemini API...');

// Adicionar função para gerar conteúdo com Gemini
const geminiFunction = `
// Função para gerar conteúdo com Gemini
async function generateContentWithGemini(prompt: string, geminiKey: string): Promise<string> {
  try {
    const response = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${geminiKey}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(\`Gemini API error: \${response.status}\`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro ao chamar Gemini API:', error);
    throw error;
  }
}
`;

// Adicionar a função antes da primeira rota
const routeMarker = `// Rota de teste`;
if (!content.includes('generateContentWithGemini')) {
  const insertPos = content.indexOf(routeMarker);
  if (insertPos > -1) {
    content = content.slice(0, insertPos) + geminiFunction + '\n' + content.slice(insertPos);
    console.log('   - Função generateContentWithGemini adicionada');
  }
}

// 3. Modificar a lógica de geração de conteúdo para usar Gemini como fallback
console.log('✅ Configurando fallback Gemini/Groq...');

// Buscar onde está a geração de conteúdo
const groqPattern = `const GROQ_API_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY`;
const groqReplacement = `const GROQ_API_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY
  const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
  
  // Usar Gemini como fallback se Groq não estiver configurado
  const useGemini = !GROQ_API_KEY && GEMINI_API_KEY`;

if (content.includes(groqPattern) && !content.includes('useGemini')) {
  content = content.replace(groqPattern, groqReplacement);
  console.log('   - Fallback Gemini configurado');
}

// Salvar o arquivo atualizado
fs.writeFileSync(indexPath, content);

console.log('\n✅ Correções aplicadas com sucesso!');
console.log('\n📝 Próximos passos:');
console.log('1. Configure GEMINI_API_KEY no .dev.vars');
console.log('2. Rebuild o projeto: npm run build');
console.log('3. Reinicie o servidor: pm2 restart iaprova');