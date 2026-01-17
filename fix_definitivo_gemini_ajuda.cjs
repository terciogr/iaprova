#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 CORREÇÃO DEFINITIVA E PROFISSIONAL\n');

// 1. CORRIGIR ANÁLISE DE EDITAL - USAR NOVA API GEMINI
console.log('1. Configurando NOVA API Gemini para análise de edital...');

const indexPath = path.join(__dirname, 'src', 'index.tsx');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Localizar a seção de processamento de edital
const processingSection = indexContent.indexOf('// Processar edital: extrair disciplinas');
if (processingSection > -1) {
  console.log('✓ Seção de processamento encontrada');
  
  // Substituir TODA referência a Groq por Gemini na análise
  // Procurar a linha onde define a chave da API
  indexContent = indexContent.replace(
    /const groqKey = c\.env\.GROQ_API_KEY[^;]*/g,
    "const geminiKey = c.env.GEMINI_API_KEY || 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY'"
  );
  
  // Se ainda tiver geminiKey antiga, atualizar
  indexContent = indexContent.replace(
    /const geminiKey = c\.env\.GEMINI_API_KEY \|\| '[^']*'/g,
    "const geminiKey = c.env.GEMINI_API_KEY || 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY'"
  );
  
  // Substituir chamada Groq por Gemini
  const groqCallPattern = /const groqResponse = await fetch\('https:\/\/api\.groq\.com[\s\S]*?\}\);/g;
  
  if (indexContent.match(groqCallPattern)) {
    indexContent = indexContent.replace(groqCallPattern, 
      `const geminiResponse = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${geminiKey}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
          candidateCount: 1
        }
      })
    });`);
    
    // Substituir processamento da resposta
    indexContent = indexContent.replace(
      /if \(!groqResponse\.ok\)/g,
      'if (!geminiResponse.ok)'
    );
    
    indexContent = indexContent.replace(
      /const groqData = await groqResponse\.json\(\)/g,
      'const geminiData = await geminiResponse.json()'
    );
    
    indexContent = indexContent.replace(
      /groqData\.choices\?\.\[0\]\?\.message\?\.content/g,
      'geminiData.candidates?.[0]?.content?.parts?.[0]?.text'
    );
    
    console.log('✓ Chamada Groq substituída por Gemini');
  }
  
  // Se ainda não tiver a chamada correta, procurar o padrão antigo de Gemini
  if (!indexContent.includes('generativelanguage.googleapis.com')) {
    // Procurar onde faz a chamada da API
    const apiCallIndex = indexContent.indexOf('// Chamar Gemini AI para extrair');
    if (apiCallIndex > -1 || indexContent.includes('Enviando para análise com IA')) {
      // Inserir a chamada correta do Gemini
      const promptEndIndex = indexContent.indexOf('📤 RETORNE SOMENTE JSON');
      if (promptEndIndex > -1) {
        const insertPoint = indexContent.indexOf('\n', promptEndIndex + 200);
        
        const geminiCall = `
    
    // Chamar API Gemini para análise
    console.log('🤖 Chamando Gemini API...');
    const geminiResponse = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${geminiKey}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
          candidateCount: 1
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('❌ Erro na API Gemini:', errorData);
      throw new Error(\`Erro na API: \${errorData.error?.message || 'Erro desconhecido'}\`);
    }
    
    const geminiData = await geminiResponse.json();
    const iaResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!iaResponse) {
      throw new Error('Resposta vazia da IA');
    }
`;
        
        // Verificar se já não existe
        if (!indexContent.includes('generativelanguage.googleapis.com')) {
          indexContent = indexContent.substring(0, insertPoint) + geminiCall + indexContent.substring(insertPoint);
        }
      }
    }
  }
}

// Atualizar .dev.vars com nova chave Gemini
const devVarsPath = path.join(__dirname, '.dev.vars');
let devVars = fs.readFileSync(devVarsPath, 'utf8');
devVars = devVars.replace(
  /GEMINI_API_KEY=.*/,
  'GEMINI_API_KEY=AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY'
);
fs.writeFileSync(devVarsPath, devVars);

fs.writeFileSync(indexPath, indexContent);
console.log('✅ Backend configurado com NOVA API Gemini!');

// 2. CORRIGIR BOTÃO DE AJUDA - TORNAR VISÍVEL E ACESSÍVEL
console.log('\n2. Criando botão de ajuda VISÍVEL e FUNCIONAL...');

const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Primeiro, remover TODOS os botões de interrogação antigos
appContent = appContent.replace(
  /<button[^>]*(?:onmouseover|onmouseenter)="showTooltip[^>]*>[\s\S]*?<i[^>]*fa-question-circle[^>]*>[\s\S]*?<\/button>/gi,
  ''
);

// Remover funções antigas de tooltip
appContent = appContent.replace(/function showTooltip\([^)]*\)[^}]*\}/g, '');
appContent = appContent.replace(/function hideTooltip\([^)]*\)[^}]*\}/g, '');

console.log('✓ Removidos botões de interrogação antigos');

// Adicionar botão de ajuda FIXO no canto inferior direito (estilo WhatsApp)
const helpButtonHTML = `
<!-- Botão de Ajuda Flutuante -->
<div id="help-button-container" style="position: fixed; bottom: 80px; right: 20px; z-index: 9998;">
  <button onclick="toggleHelpMenu()" 
    class="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
    <i class="fas fa-question text-xl group-hover:scale-110 transition-transform"></i>
  </button>
  
  <!-- Menu de Ajuda (oculto por padrão) -->
  <div id="help-menu" class="hidden absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-72">
    <div class="space-y-3">
      <h3 class="font-bold text-gray-800 dark:text-white border-b pb-2">
        <i class="fas fa-question-circle text-blue-500 mr-2"></i>
        Central de Ajuda
      </h3>
      
      <button onclick="showHelpTopic('inicio')" 
        class="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
        <i class="fas fa-play-circle text-green-500 mr-2"></i>
        Como começar
      </button>
      
      <button onclick="showHelpTopic('edital')" 
        class="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
        <i class="fas fa-file-pdf text-red-500 mr-2"></i>
        Upload de edital
      </button>
      
      <button onclick="showHelpTopic('conteudo')" 
        class="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
        <i class="fas fa-brain text-purple-500 mr-2"></i>
        Gerar conteúdo com IA
      </button>
      
      <button onclick="showHelpTopic('plano')" 
        class="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
        <i class="fas fa-calendar text-blue-500 mr-2"></i>
        Plano de estudos
      </button>
      
      <button onclick="showFullHelp()" 
        class="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition font-semibold">
        <i class="fas fa-book text-orange-500 mr-2"></i>
        Ver toda ajuda
      </button>
    </div>
  </div>
</div>
`;

// Adicionar no body do HTML (antes do fechamento)
if (appContent.includes('</body>')) {
  appContent = appContent.replace('</body>', helpButtonHTML + '\n</body>');
} else {
  // Se não encontrar, adicionar no final
  appContent += helpButtonHTML;
}

// Adicionar funções JavaScript para o menu de ajuda
const helpFunctions = `

// Funções do Menu de Ajuda
window.toggleHelpMenu = function() {
  const menu = document.getElementById('help-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

window.showHelpTopic = function(topic) {
  const helps = {
    inicio: {
      title: 'Como Começar',
      content: \`
        <ol class="space-y-2 text-sm">
          <li>1. Faça seu cadastro ou login</li>
          <li>2. Faça upload do edital do concurso</li>
          <li>3. Preencha a entrevista inicial</li>
          <li>4. Receba seu plano personalizado</li>
          <li>5. Comece a estudar com IA!</li>
        </ol>
      \`
    },
    edital: {
      title: 'Upload de Edital',
      content: \`
        <div class="space-y-2 text-sm">
          <p>📄 Formatos aceitos: PDF, TXT</p>
          <p>⚠️ Se o PDF der erro, converta para TXT em:</p>
          <p class="text-blue-600">ilovepdf.com/pt/pdf_para_texto</p>
          <p>✅ A IA analisará automaticamente o conteúdo</p>
        </div>
      \`
    },
    conteudo: {
      title: 'Gerar Conteúdo com IA',
      content: \`
        <div class="space-y-2 text-sm">
          <p><strong>5 tipos disponíveis:</strong></p>
          <p>📘 Teoria - Explicação completa</p>
          <p>📝 Exercícios - Questões práticas</p>
          <p>📋 Resumo - Síntese do conteúdo</p>
          <p>🎯 Flashcards - Memorização</p>
          <p>📄 Resumo Personalizado - Upload PDF</p>
        </div>
      \`
    },
    plano: {
      title: 'Plano de Estudos',
      content: \`
        <div class="space-y-2 text-sm">
          <p>📅 Cronograma semanal personalizado</p>
          <p>⏰ Baseado no seu tempo disponível</p>
          <p>📊 Acompanhe seu progresso</p>
          <p>🎯 Foco nas matérias do seu cargo</p>
        </div>
      \`
    }
  };
  
  const help = helps[topic];
  if (help) {
    showHelpModal(help.title, help.content);
  }
}

window.showFullHelp = function() {
  const content = \`
    <div class="space-y-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">🚀 Início Rápido</h3>
        <ol class="space-y-1 text-sm">
          <li>1. Cadastre-se com seu email</li>
          <li>2. Faça upload do edital (PDF ou TXT)</li>
          <li>3. Complete a entrevista inicial</li>
          <li>4. Explore seu plano de estudos</li>
          <li>5. Gere conteúdos com IA</li>
        </ol>
      </div>
      
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">💡 Dicas Importantes</h3>
        <ul class="space-y-1 text-sm">
          <li>• Configure a IA no menu (3 pontinhos)</li>
          <li>• Use tema escuro para estudar à noite</li>
          <li>• Revise com flashcards diariamente</li>
          <li>• Acompanhe progresso no dashboard</li>
        </ul>
      </div>
      
      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">⚠️ Problemas Comuns</h3>
        <ul class="space-y-1 text-sm">
          <li>• PDF não funciona? Converta para TXT</li>
          <li>• IA lenta? Aguarde 30-60 segundos</li>
          <li>• Email não chega? Verifique spam</li>
        </ul>
      </div>
    </div>
  \`;
  
  showHelpModal('Central de Ajuda Completa', content);
}

window.showHelpModal = function(title, content) {
  // Fechar menu dropdown
  document.getElementById('help-menu')?.classList.add('hidden');
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4';
  modal.innerHTML = \`
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          <i class="fas fa-question-circle text-blue-500 mr-2"></i>
          \${title}
        </h2>
        <button onclick="document.getElementById('help-modal').remove()" 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="p-6">
        \${content}
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(e) {
  const helpButton = document.querySelector('#help-button-container button');
  const helpMenu = document.getElementById('help-menu');
  if (helpMenu && !helpButton.contains(e.target) && !helpMenu.contains(e.target)) {
    helpMenu.classList.add('hidden');
  }
});
`;

// Adicionar as funções no final do arquivo
appContent += helpFunctions;

fs.writeFileSync(appJsPath, appContent);
console.log('✅ Botão de ajuda VISÍVEL adicionado (canto inferior direito)!');

console.log('\n' + '='.repeat(60));
console.log('🎯 CORREÇÕES PROFISSIONAIS APLICADAS:');
console.log('1. ✅ Gemini API NOVA configurada: AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY');
console.log('2. ✅ Botão de ajuda VISÍVEL no canto inferior direito');
console.log('3. ✅ Menu de ajuda com opções ao clicar');
console.log('4. ✅ Removidos TODOS os botões de interrogação antigos');
console.log('='.repeat(60));