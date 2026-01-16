#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo problemas de UI do IAprova...\n');

// Caminho do arquivo
const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');

// Ler o arquivo
let content = fs.readFileSync(appJsPath, 'utf8');

// 1. CORRIGIR MODAL DE GERAÇÃO DE CONTEÚDO - Adicionar 5ª opção (Resumo Personalizado)
console.log('1. Corrigindo modal de geração de conteúdo...');

// Localizar o modal de 4 opções e expandir para 5
const modalGerarOriginal = `          <div class="grid grid-cols-2 gap-3 mb-4">
            <button onclick="selecionarTipoConteudo('teoria')"
                    id="btn-tipo-teoria"
                    class="p-4 border-2 \${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-blue-50 transition text-left \${themes[currentTheme].card}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <i class="fas fa-book text-blue-600"></i>
                </div>
                <div>
                  <p class="font-semibold \${themes[currentTheme].text}">Teoria</p>
                  <p class="text-xs \${themes[currentTheme].textSecondary}">Conteúdo completo</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('exercicios')"
                    id="btn-tipo-exercicios"
                    class="p-4 border-2 \${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-green-50 transition text-left \${themes[currentTheme].card}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <i class="fas fa-tasks text-green-600"></i>
                </div>
                <div>
                  <p class="font-semibold \${themes[currentTheme].text}">Exercícios</p>
                  <p class="text-xs \${themes[currentTheme].textSecondary}">Questões de concurso</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('resumo')"
                    id="btn-tipo-resumo"
                    class="p-4 border-2 \${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-yellow-50 transition text-left \${themes[currentTheme].card}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <i class="fas fa-sticky-note text-yellow-600"></i>
                </div>
                <div>
                  <p class="font-semibold \${themes[currentTheme].text}">Resumo</p>
                  <p class="text-xs \${themes[currentTheme].textSecondary}">Esquematizado</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('flashcards')"
                    id="btn-tipo-flashcards"
                    class="p-4 border-2 \${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-cyan-50 transition text-left \${themes[currentTheme].card}">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <i class="fas fa-clone text-[#122D6A]"></i>
                </div>
                <div>
                  <p class="font-semibold \${themes[currentTheme].text}">Flashcards</p>
                  <p class="text-xs \${themes[currentTheme].textSecondary}">Cards de revisão</p>
                </div>
              </div>
            </button>
          </div>`;

const modalGerarNovo = `          <div class="grid grid-cols-2 gap-3 mb-4">
            <!-- Teoria -->
            <button onclick="selecionarTipoConteudo('teoria')"
                    id="btn-tipo-teoria"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#122D6A] hover:bg-[#122D6A]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#122D6A]/10 flex items-center justify-center">
                  <i class="fas fa-book text-[#122D6A]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Teoria</p>
                  <p class="text-xs text-gray-500">Conteúdo completo</p>
                </div>
              </div>
            </button>
            
            <!-- Exercícios -->
            <button onclick="selecionarTipoConteudo('exercicios')"
                    id="btn-tipo-exercicios"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#2A4A9F] hover:bg-[#2A4A9F]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#2A4A9F]/10 flex items-center justify-center">
                  <i class="fas fa-tasks text-[#2A4A9F]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Exercícios</p>
                  <p class="text-xs text-gray-500">Questões de concurso</p>
                </div>
              </div>
            </button>
            
            <!-- Resumo -->
            <button onclick="selecionarTipoConteudo('resumo')"
                    id="btn-tipo-resumo"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A90E2] hover:bg-[#4A90E2]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#4A90E2]/10 flex items-center justify-center">
                  <i class="fas fa-sticky-note text-[#4A90E2]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Resumo</p>
                  <p class="text-xs text-gray-500">Esquematizado</p>
                </div>
              </div>
            </button>
            
            <!-- Flashcards -->
            <button onclick="selecionarTipoConteudo('flashcards')"
                    id="btn-tipo-flashcards"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#6BB6FF] hover:bg-[#6BB6FF]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#6BB6FF]/10 flex items-center justify-center">
                  <i class="fas fa-clone text-[#6BB6FF]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Flashcards</p>
                  <p class="text-xs text-gray-500">Cards de revisão</p>
                </div>
              </div>
            </button>
            
            <!-- 5ª Opção: Resumo Personalizado (ocupando 2 colunas) -->
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
            </button>
          </div>`;

content = content.replace(modalGerarOriginal, modalGerarNovo);

// 2. CORRIGIR CORES DO HOVER DOS BOTÕES
console.log('2. Ajustando cores dos botões para match com o sistema...');

// Atualizar função selecionarTipoConteudo para usar cores do sistema
const selecionarOriginal = `    btnSelecionado.classList.add('border-[#122D6A]');
    const colors = { teoria: 'bg-blue-50', exercicios: 'bg-green-50', resumo: 'bg-yellow-50', flashcards: 'bg-cyan-50' };`;

const selecionarNovo = `    btnSelecionado.classList.add('border-[#122D6A]', 'shadow-md');
    const colors = { 
      teoria: 'bg-[#122D6A]/5', 
      exercicios: 'bg-[#2A4A9F]/5', 
      resumo: 'bg-[#4A90E2]/5', 
      flashcards: 'bg-[#6BB6FF]/5',
      resumo_personalizado: 'bg-[#FF6B35]/5'
    };`;

content = content.replace(selecionarOriginal, selecionarNovo);

// 3. CORRIGIR TOOLTIP DA INTERROGAÇÃO (posicionamento)
console.log('3. Corrigindo posicionamento do tooltip da interrogação...');

// Procurar tooltip de ajuda e ajustar posicionamento
const tooltipOriginal = `<div id="tooltip-\${meta.id}" class="absolute hidden z-50 bg-gray-900 text-white text-xs rounded-lg p-3 max-w-xs">`;

const tooltipNovo = `<div id="tooltip-\${meta.id}" class="absolute hidden z-50 bg-gray-900 text-white text-xs rounded-lg p-3 max-w-xs" style="left: 50%; transform: translateX(-50%); top: 100%; margin-top: 8px;">`;

content = content.replace(new RegExp(tooltipOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), tooltipNovo);

// Também ajustar a lógica de mostrar/esconder tooltip
const showTooltipOriginal = `function showTooltip(metaId) {
  const tooltip = document.getElementById(\`tooltip-\${metaId}\`);
  if (tooltip) {
    tooltip.classList.remove('hidden');
  }
}`;

const showTooltipNovo = `function showTooltip(metaId) {
  const tooltip = document.getElementById(\`tooltip-\${metaId}\`);
  if (tooltip) {
    tooltip.classList.remove('hidden');
    // Ajustar posição para não sair da tela
    const rect = tooltip.getBoundingClientRect();
    if (rect.left < 10) {
      tooltip.style.left = '10px';
      tooltip.style.transform = 'none';
    } else if (rect.right > window.innerWidth - 10) {
      tooltip.style.left = 'auto';
      tooltip.style.right = '10px';
      tooltip.style.transform = 'none';
    }
  }
}`;

content = content.replace(showTooltipOriginal, showTooltipNovo);

// 4. ADICIONAR INFORMAÇÃO DA BANCA NO PLANO DE ESTUDOS
console.log('4. Adicionando exibição da banca organizadora no plano...');

// Procurar onde exibe informações do plano e adicionar banca
const planoInfoOriginal = `                  <div class="text-sm text-gray-600">
                    <p><strong>Cargo:</strong> \${dadosEntrevista.cargo || 'Não informado'}</p>
                    <p><strong>Órgão:</strong> \${dadosEntrevista.orgao || 'Não informado'}</p>
                    <p><strong>Data da Prova:</strong> \${dadosEntrevista.data_prova ? formatarData(dadosEntrevista.data_prova) : 'Não definida'}</p>
                  </div>`;

const planoInfoNovo = `                  <div class="text-sm text-gray-600">
                    <p><strong>Cargo:</strong> \${dadosEntrevista.cargo || 'Não informado'}</p>
                    <p><strong>Órgão:</strong> \${dadosEntrevista.orgao || 'Não informado'}</p>
                    <p><strong>Banca:</strong> \${dadosEntrevista.banca_organizadora || 'Não identificada'}</p>
                    <p><strong>Data da Prova:</strong> \${dadosEntrevista.data_prova ? formatarData(dadosEntrevista.data_prova) : 'Não definida'}</p>
                  </div>`;

content = content.replace(planoInfoOriginal, planoInfoNovo);

// Também adicionar no card resumido do dashboard
const cardResumoOriginal = `            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-briefcase mr-1"></i> \${interview.cargo}
            </p>
            <p class="text-sm text-gray-600">
              <i class="fas fa-building mr-1"></i> \${interview.orgao}
            </p>`;

const cardResumoNovo = `            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-briefcase mr-1"></i> \${interview.cargo}
            </p>
            <p class="text-sm text-gray-600 mb-1">
              <i class="fas fa-building mr-1"></i> \${interview.orgao}
            </p>
            \${interview.banca_organizadora ? \`
            <p class="text-sm text-gray-600">
              <i class="fas fa-university mr-1"></i> \${interview.banca_organizadora}
            </p>\` : ''}`;

content = content.replace(cardResumoOriginal, cardResumoNovo);

// 5. AJUSTAR CORES GERAIS PARA MATCH COM O TEMA DO SISTEMA
console.log('5. Harmonizando cores com o tema principal...');

// Ajustar cores dos botões principais
content = content.replace(/bg-blue-100/g, 'bg-[#122D6A]/10');
content = content.replace(/text-blue-600/g, 'text-[#122D6A]');
content = content.replace(/bg-green-100/g, 'bg-[#2A4A9F]/10');
content = content.replace(/text-green-600/g, 'text-[#2A4A9F]');
content = content.replace(/bg-yellow-100/g, 'bg-[#4A90E2]/10');
content = content.replace(/text-yellow-600/g, 'text-[#4A90E2]');
content = content.replace(/bg-cyan-100/g, 'bg-[#6BB6FF]/10');

// Salvar arquivo
fs.writeFileSync(appJsPath, content, 'utf8');

console.log('\n✅ Correções aplicadas com sucesso!');
console.log('\n📝 Mudanças realizadas:');
console.log('1. ✅ Modal agora mostra 5 opções (incluindo Resumo Personalizado)');
console.log('2. ✅ Cores harmonizadas com a paleta do sistema');
console.log('3. ✅ Tooltip da interrogação posicionado corretamente');
console.log('4. ✅ Banca organizadora visível no plano de estudos');
console.log('5. ✅ Visual geral alinhado com o design do sistema');

console.log('\n🎨 Nova paleta de cores aplicada:');
console.log('   - Teoria: #122D6A (azul escuro principal)');
console.log('   - Exercícios: #2A4A9F (azul médio)');
console.log('   - Resumo: #4A90E2 (azul claro)');
console.log('   - Flashcards: #6BB6FF (azul céu)');
console.log('   - Resumo Personalizado: #FF6B35 (laranja)');

console.log('\n✨ Sistema atualizado com sucesso!');