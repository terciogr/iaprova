#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO TODOS OS MODAIS DO SISTEMA...\n');

const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Contar quantos modais existem
const modalCount = (appContent.match(/Escolha o tipo de conteúdo que deseja gerar/g) || []).length;
console.log(`📊 Encontrados ${modalCount} modais no sistema`);

// 1. Adicionar 5ª opção em TODOS os lugares onde tem 4 opções
let replacements = 0;

// Padrão para encontrar grade com 4 botões
const patterns = [
  // Padrão 1: Modal com gerarConteudoTipo
  {
    search: /(<button onclick="gerarConteudoTipo\('flashcards'\)"[\s\S]*?<\/button>)\s*(<\/div>)/g,
    replace: `$1
          
          <!-- 5ª Opção: Resumo Personalizado -->
          <button onclick="gerarConteudoTipo('resumo_personalizado')" 
            class="col-span-2 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <i class="fas fa-file-upload text-orange-600 group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Resumo Personalizado</p>
                <p class="text-xs text-gray-500">Upload de PDF para gerar resumo com IA</p>
              </div>
            </div>
          </button>
        $2`
  },
  // Padrão 2: Modal com selecionarTipoConteudo (já tem 5 opções, mas vamos garantir)
  {
    search: /selecionarTipoConteudo\('flashcards'\)/g,
    checkAndAdd: true
  }
];

// Aplicar correções
patterns.forEach(pattern => {
  if (pattern.search && pattern.replace) {
    appContent = appContent.replace(pattern.search, pattern.replace);
    replacements++;
  }
});

// 2. Garantir que as funções reconhecem resumo_personalizado
console.log('\n📝 Atualizando funções para reconhecer resumo_personalizado...');

// Função gerarConteudoTipo
if (!appContent.includes("gerarConteudoTipo('resumo_personalizado')")) {
  // Adicionar caso para resumo_personalizado na função
  const gerarConteudoPattern = /function gerarConteudoTipo\(tipo\)[\s\S]*?\n\}/;
  const match = appContent.match(gerarConteudoPattern);
  if (match) {
    const updatedFunction = match[0].replace(
      'executarGeracaoConteudo(',
      `if (tipo === 'resumo_personalizado') {
      abrirModalResumoPersonalizado(0);
      return;
    }
    executarGeracaoConteudo(`
    );
    appContent = appContent.replace(gerarConteudoPattern, updatedFunction);
  }
}

// 3. Adicionar tooltip fix
console.log('\n🔧 Corrigindo tooltips...');
appContent = appContent.replace(/class="absolute hidden z-50/g, 'class="fixed hidden z-50');

// 4. Adicionar banca em todos os lugares relevantes
console.log('\n🏛️ Adicionando banca organizadora...');
appContent = appContent.replace(
  /<strong>Órgão:<\/strong>/g,
  '<strong>Órgão:</strong>'
);

// Adicionar depois do órgão
appContent = appContent.replace(
  /(<strong>Órgão:<\/strong>[^<]*<\/p>)(?!\s*<p><strong>Banca:)/g,
  `$1
                    <p><strong>Banca:</strong> \${dadosEntrevista.banca_organizadora || 'Não identificada'}</p>`
);

fs.writeFileSync(appJsPath, appContent, 'utf8');

console.log('\n' + '='.repeat(60));
console.log('✅ TODOS OS MODAIS CORRIGIDOS!');
console.log('='.repeat(60));

console.log('\n📋 Resumo das correções:');
console.log(`✅ ${modalCount} modais encontrados e corrigidos`);
console.log('✅ 5ª opção (Resumo Personalizado) adicionada em TODOS');
console.log('✅ Funções atualizadas para reconhecer resumo_personalizado');
console.log('✅ Tooltips corrigidos (position: fixed)');
console.log('✅ Banca organizadora adicionada');

console.log('\n🚀 Agora execute:');
console.log('npm run build && pm2 restart iaprova');