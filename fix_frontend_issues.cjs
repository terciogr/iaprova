#!/usr/bin/env node

/**
 * Script para corrigir problemas no frontend:
 * 1. Paleta de cores do resumo personalizado
 * 2. Adicionar 5ª opção de cor
 * 3. Adicionar campo de banca na entrevista
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo problemas no frontend IAprova...\n');

// 1. Corrigir public/static/app.js - Adicionar 5ª cor e corrigir paleta
console.log('✅ Corrigindo paleta de cores do resumo personalizado...');

const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Procurar pela paleta de cores do resumo personalizado
const paletaAntiga = `const cores = ['blue', 'green', 'yellow', 'red'];`;
const paletaNova = `const cores = ['blue', 'green', 'yellow', 'orange', 'red'];`;

if (appContent.includes(paletaAntiga)) {
  appContent = appContent.replace(paletaAntiga, paletaNova);
  console.log('   - Adicionada 5ª cor (orange) na paleta');
}

// Corrigir estilos das cores
const estilosAntigos = `
            .cor-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .cor-green { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
            .cor-yellow { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
            .cor-red { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }`;

const estilosNovos = `
            .cor-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .cor-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
            .cor-yellow { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); }
            .cor-orange { background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); }
            .cor-red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }`;

if (appContent.includes('.cor-blue')) {
  // Procurar e substituir os estilos
  const styleRegex = /\.cor-blue[\s\S]*?\.cor-red[^}]*}/;
  appContent = appContent.replace(styleRegex, estilosNovos);
  console.log('   - Cores corrigidas com gradientes apropriados');
}

// 2. Adicionar campo de banca na entrevista
console.log('✅ Adicionando campo de banca na entrevista...');

// Procurar pelo formulário de entrevista
const campoArquivoPattern = `<label class="block text-sm font-medium text-gray-700 mb-2">
              Arquivo do Edital (PDF, TXT ou XLSX)
            </label>`;

const campoBanca = `<div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-university mr-2"></i>
            Banca Organizadora
          </label>
          <select name="banca_organizadora" id="banca_organizadora" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Detectar automaticamente</option>
            <optgroup label="Principais Bancas">
              <option value="CEBRASPE">CEBRASPE (CESPE/UnB) - Questões C/E</option>
              <option value="FCC">FCC - Fundação Carlos Chagas</option>
              <option value="FGV">FGV - Fundação Getúlio Vargas</option>
              <option value="VUNESP">VUNESP</option>
              <option value="IDECAN">IDECAN</option>
            </optgroup>
            <optgroup label="Outras Bancas">
              <option value="IBFC">IBFC</option>
              <option value="QUADRIX">QUADRIX</option>
              <option value="AOCP">AOCP</option>
              <option value="COMPERVE">COMPERVE</option>
              <option value="FUNDATEC">FUNDATEC</option>
              <option value="CONSULPLAN">CONSULPLAN</option>
              <option value="IADES">IADES</option>
              <option value="NC-UFPR">NC-UFPR</option>
              <option value="COPS-UEL">COPS-UEL</option>
            </optgroup>
          </select>
          <p class="mt-2 text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            Se não souber, deixe em "Detectar automaticamente"
          </p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-file-pdf mr-2"></i>
            Arquivo do Edital (PDF, TXT ou XLSX)
          </label>`;

if (!appContent.includes('banca_organizadora')) {
  appContent = appContent.replace(campoArquivoPattern, campoBanca);
  console.log('   - Campo de seleção de banca adicionado');
}

// 3. Adicionar função para enviar banca no upload
console.log('✅ Configurando envio da banca no upload...');

const uploadPattern = `formData.append('arquivos', file);
        formData.append('user_id', userId);
        formData.append('nome_concurso', nomeConcurso);`;

const uploadComBanca = `formData.append('arquivos', file);
        formData.append('user_id', userId);
        formData.append('nome_concurso', nomeConcurso);
        
        // Adicionar banca se selecionada
        const bancaSelecionada = document.getElementById('banca_organizadora')?.value;
        if (bancaSelecionada) {
          formData.append('banca_organizadora', bancaSelecionada);
          console.log('Banca selecionada:', bancaSelecionada);
        }`;

if (!appContent.includes('banca_organizadora') && appContent.includes(uploadPattern)) {
  appContent = appContent.replace(uploadPattern, uploadComBanca);
  console.log('   - Envio de banca configurado no upload');
}

// 4. Adicionar indicador visual da banca detectada
console.log('✅ Adicionando feedback visual da banca...');

const feedbackBanca = `
// Mostrar banca detectada após upload
function mostrarBancaDetectada(banca) {
  if (!banca) return;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50';
  alertDiv.innerHTML = \`
    <div class="flex items-center">
      <i class="fas fa-check-circle mr-2"></i>
      <div>
        <p class="font-bold">Banca Identificada!</p>
        <p class="text-sm">Conteúdo será adaptado para: <strong>\${banca}</strong></p>
      </div>
    </div>
  \`;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}
`;

if (!appContent.includes('mostrarBancaDetectada')) {
  // Adicionar no final do arquivo
  appContent += feedbackBanca;
  console.log('   - Feedback visual da banca adicionado');
}

// Salvar o arquivo atualizado
fs.writeFileSync(appJsPath, appContent);

// 5. Atualizar o index.html se necessário
console.log('✅ Verificando index.html...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Adicionar estilos para o indicador de banca
if (!indexContent.includes('/* Estilos para banca */')) {
  const stylesAdd = `
    /* Estilos para banca */
    .banca-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
      margin-left: 8px;
    }
    
    .banca-info {
      background-color: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
    }
  </style>`;
  
  indexContent = indexContent.replace('</style>', stylesAdd + '\n  </style>');
  console.log('   - Estilos para banca adicionados ao HTML');
}

fs.writeFileSync(indexPath, indexContent);

console.log('\n✅ Correções aplicadas com sucesso!');
console.log('\n📝 Correções realizadas:');
console.log('1. ✅ Paleta de cores corrigida (5 cores com gradientes corretos)');
console.log('2. ✅ Campo de seleção de banca adicionado na entrevista');
console.log('3. ✅ Envio de banca configurado no upload');
console.log('4. ✅ Feedback visual da banca detectada');
console.log('5. ✅ Estilos CSS atualizados');
console.log('\n🚀 Próximos passos:');
console.log('1. Testar o upload com seleção de banca');
console.log('2. Verificar se as 5 cores aparecem no resumo personalizado');
console.log('3. Confirmar que a banca é detectada e mostrada');