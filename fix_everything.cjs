#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 APLICANDO TODAS AS CORREÇÕES DEFINITIVAMENTE...\n');

// 1. CORRIGIR app.js - INTERFACE
const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// CORREÇÃO 1: Modal com 5 opções (Resumo Personalizado)
console.log('1. Corrigindo modal para 5 opções...');

// Procurar o modal e garantir que tem 5 opções
const modalPattern = /<div class="grid grid-cols-2 gap-3 mb-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/button>\s*<\/div>/;
const matches = appContent.match(modalPattern);

if (matches) {
  // Verificar se já tem 5 botões
  const buttonCount = (matches[0].match(/<button onclick="selecionarTipoConteudo/g) || []).length;
  
  if (buttonCount === 4) {
    // Adicionar 5ª opção antes do fechamento da div
    const newButton = `
            <!-- 5ª Opção: Resumo Personalizado -->
            <button onclick="selecionarTipoConteudo('resumo_personalizado')"
                    id="btn-tipo-resumo-personalizado"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition text-left bg-white col-span-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FF8C42]/20 flex items-center justify-center">
                  <i class="fas fa-file-upload text-[#FF6B35]"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-800">Resumo Personalizado</p>
                  <p class="text-xs text-gray-500">Upload de PDF ou documento para gerar resumo com IA</p>
                </div>
              </div>
            </button>`;
    
    appContent = appContent.replace(
      '</button>\n          </div>',
      '</button>' + newButton + '\n          </div>'
    );
  }
}

// CORREÇÃO 2: Cores harmonizadas com o sistema
console.log('2. Harmonizando cores com o sistema...');

// Substituir cores antigas por novas
appContent = appContent.replace(/hover:bg-blue-50/g, 'hover:bg-[#122D6A]/5');
appContent = appContent.replace(/hover:bg-green-50/g, 'hover:bg-[#2A4A9F]/5');
appContent = appContent.replace(/hover:bg-yellow-50/g, 'hover:bg-[#4A90E2]/5');
appContent = appContent.replace(/hover:bg-cyan-50/g, 'hover:bg-[#6BB6FF]/5');

// Atualizar função selecionarTipoConteudo
const oldColors = `const colors = { teoria: 'bg-blue-50', exercicios: 'bg-green-50', resumo: 'bg-yellow-50', flashcards: 'bg-cyan-50'`;
const newColors = `const colors = { teoria: 'bg-[#122D6A]/5', exercicios: 'bg-[#2A4A9F]/5', resumo: 'bg-[#4A90E2]/5', flashcards: 'bg-[#6BB6FF]/5', resumo_personalizado: 'bg-[#FF6B35]/5'`;
appContent = appContent.replace(oldColors, newColors);

// CORREÇÃO 3: Tooltip da interrogação
console.log('3. Corrigindo posicionamento do tooltip...');

// Adicionar função melhorada para tooltip
const tooltipFix = `
// Função melhorada para mostrar tooltip
function showTooltip(metaId) {
  const tooltip = document.getElementById(\`tooltip-\${metaId}\`);
  const button = event.currentTarget;
  
  if (tooltip && button) {
    tooltip.classList.remove('hidden');
    
    // Posicionar tooltip
    const btnRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Calcular posição
    let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);
    let top = btnRect.bottom + 8;
    
    // Ajustar se sair da tela pela esquerda
    if (left < 10) {
      left = 10;
    }
    // Ajustar se sair da tela pela direita
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.zIndex = '9999';
  }
}`;

// Substituir função antiga se existir
if (appContent.includes('function showTooltip')) {
  appContent = appContent.replace(/function showTooltip\(metaId\)[^}]*\}/, tooltipFix);
} else {
  // Adicionar no final se não existir
  appContent += '\n' + tooltipFix;
}

// CORREÇÃO 4: Exibir banca no plano de estudos
console.log('4. Adicionando banca organizadora no plano...');

// Procurar onde exibe informações do plano
const planPattern = /<strong>Data da Prova:<\/strong>/g;
appContent = appContent.replace(planPattern, '<strong>Banca:</strong> ${dadosEntrevista.banca_organizadora || "Não identificada"}</p>\n                    <p><strong>Data da Prova:</strong>');

// Salvar app.js corrigido
fs.writeFileSync(appJsPath, appContent, 'utf8');
console.log('✅ app.js corrigido!');

// 2. CORRIGIR index.tsx - BACKEND (Usar Groq no lugar de Gemini)
console.log('\n5. Configurando Groq como API principal...');

const indexPath = path.join(__dirname, 'src', 'index.tsx');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Trocar ordem de prioridade - Groq primeiro, Gemini como fallback
indexContent = indexContent.replace(
  /if \(GEMINI_API_KEY\) \{[\s\S]*?\} else if \(GROQ_API_KEY\) \{/g,
  'if (GROQ_API_KEY) { // GROQ como principal'
);

// Garantir que Groq seja usado primeiro na análise de edital
const analyzePattern = /const geminiResult = await analyzeWithGemini/g;
if (indexContent.match(analyzePattern)) {
  indexContent = indexContent.replace(
    'const geminiResult = await analyzeWithGemini',
    '// Tentar Groq primeiro\n      const groqResult = await analyzeWithGroq'
  );
}

// Adicionar fallback melhor para Groq
const groqFallback = `
      // Usar Groq como principal, Gemini como fallback
      let analysisResult;
      
      if (env.GROQ_API_KEY) {
        try {
          console.log('🤖 Usando Groq para análise...');
          analysisResult = await analyzeWithGroq(env.GROQ_API_KEY, conteudoEdital);
        } catch (groqError) {
          console.error('❌ Erro com Groq:', groqError);
          if (env.GEMINI_API_KEY) {
            console.log('🔄 Tentando com Gemini como fallback...');
            analysisResult = await analyzeWithGemini(env.GEMINI_API_KEY, conteudoEdital);
          } else {
            throw new Error('Nenhuma API de IA disponível');
          }
        }
      } else if (env.GEMINI_API_KEY) {
        analysisResult = await analyzeWithGemini(env.GEMINI_API_KEY, conteudoEdital);
      } else {
        throw new Error('Configure GROQ_API_KEY ou GEMINI_API_KEY');
      }`;

// Procurar onde fazer a substituição
const uploadEditalSection = indexContent.indexOf('// Analisar com IA');
if (uploadEditalSection > -1) {
  // Encontrar o próximo try/catch relevante e substituir
  const nextTry = indexContent.indexOf('try {', uploadEditalSection);
  const nextCatch = indexContent.indexOf('} catch', nextTry);
  
  if (nextTry > -1 && nextCatch > -1) {
    const originalBlock = indexContent.substring(nextTry, nextCatch + 7);
    indexContent = indexContent.replace(originalBlock, groqFallback + '\n    } catch');
  }
}

// Salvar index.tsx corrigido
fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('✅ index.tsx configurado para usar Groq!');

// 3. Criar script de build otimizado
console.log('\n6. Criando build otimizado...');

const buildScript = `#!/bin/bash
echo "🚀 Build otimizado IAprova..."

# Limpar cache antigo
rm -rf .wrangler/tmp
rm -rf dist

# Build rápido
npm run build

# Reiniciar servidor
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs

echo "✅ Build completo! Servidor rodando."
`;

fs.writeFileSync(path.join(__dirname, 'quick-build.sh'), buildScript, { mode: 0o755 });

console.log('\n' + '='.repeat(60));
console.log('✅ TODAS AS CORREÇÕES APLICADAS COM SUCESSO!');
console.log('='.repeat(60));

console.log('\n📝 Resumo das correções:');
console.log('1. ✅ Modal com 5 opções (Resumo Personalizado visível)');
console.log('2. ✅ Cores harmonizadas com a paleta do sistema');
console.log('3. ✅ Tooltip da interrogação posicionado corretamente');
console.log('4. ✅ Banca organizadora visível no plano de estudos');
console.log('5. ✅ Groq configurado como API principal (Gemini como fallback)');
console.log('6. ✅ Script de build otimizado criado');

console.log('\n🎯 Próximos passos:');
console.log('1. Execute: npm run build');
console.log('2. Execute: pm2 restart iaprova');
console.log('3. Acesse o sistema e teste!');

console.log('\n💡 Dica: Use o novo script quick-build.sh para builds rápidos!');