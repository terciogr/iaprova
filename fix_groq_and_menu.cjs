#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORREÇÃO CIRÚRGICA: GROQ + MENU FLUTUANTE\n');

// 1. CORRIGIR BACKEND - Usar GROQ para análise de edital
const indexPath = path.join(__dirname, 'src', 'index.tsx');
let indexContent = fs.readFileSync(indexPath, 'utf8');

console.log('1. Substituindo Gemini por Groq na análise de edital...');

// Substituir a linha que chama Gemini
indexContent = indexContent.replace(
  /console\.log\('📋 PASSO 4: Enviando para análise com IA Gemini\.\.\.'\)/g,
  "console.log('📋 PASSO 4: Enviando para análise com IA...')"
);

// Substituir a variável geminiKey por groqKey
indexContent = indexContent.replace(
  /const geminiKey = c\.env\.GEMINI_API_KEY \|\| 'SUA_CHAVE_GEMINI_AQUI'/g,
  "const groqKey = c.env.GROQ_API_KEY || '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'"
);

// Substituir a chamada da API Gemini pela chamada Groq
const geminiApiPattern = /const geminiResponse = await fetch\(`https:\/\/generativelanguage\.googleapis\.com[\s\S]*?}\);/g;
const groqApiCall = `const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${groqKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de editais de concursos públicos. Sempre responda em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      })
    });`;

indexContent = indexContent.replace(geminiApiPattern, groqApiCall);

// Substituir o processamento da resposta
indexContent = indexContent.replace(
  /if \(!geminiResponse\.ok\) \{[\s\S]*?const geminiData = await geminiResponse\.json\(\);/g,
  `if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('❌ Erro na API Groq:', errorData);
      throw new Error(\`Erro na API: \${errorData.error?.message || 'Erro desconhecido'}\`);
    }
    
    const groqData = await groqResponse.json();`
);

// Substituir a extração do texto da resposta
indexContent = indexContent.replace(
  /const iaResponse = geminiData\.candidates\?\[0\]\.content\.parts\?\[0\]\.text/g,
  "const iaResponse = groqData.choices?.[0]?.message?.content"
);

// Salvar index.tsx
fs.writeFileSync(indexPath, indexContent);
console.log('✅ Backend configurado para usar Groq!');

// 2. MOVER INTERROGAÇÃO PARA O MENU FLUTUANTE
const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

console.log('\n2. Movendo interrogação para o menu flutuante...');

// Procurar o menu flutuante (onde tem "Personalizar IA")
const menuPattern = /<div id="floating-menu"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const menuMatch = appContent.match(menuPattern);

if (menuMatch) {
  // Adicionar botão de ajuda no menu flutuante
  const newMenuItem = `
        <!-- Ajuda -->
        <button onclick="abrirModalAjuda()" 
          class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition">
          <i class="fas fa-question-circle text-blue-500"></i>
          <span>Ajuda e Suporte</span>
        </button>`;
  
  // Inserir antes do fechamento do menu
  const updatedMenu = menuMatch[0].replace(
    '</div>\n      </div>\n    </div>',
    newMenuItem + '\n      </div>\n      </div>\n    </div>'
  );
  
  appContent = appContent.replace(menuPattern, updatedMenu);
  console.log('✅ Botão de ajuda adicionado ao menu flutuante!');
}

// Adicionar função para abrir modal de ajuda
const helpModalFunction = `
// Modal de Ajuda
window.abrirModalAjuda = function() {
  const modal = document.createElement('div');
  modal.id = 'modal-ajuda';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = \`
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
            <i class="fas fa-question-circle text-blue-500 mr-2"></i>
            Central de Ajuda
          </h2>
          <button onclick="document.getElementById('modal-ajuda').remove()" 
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <div class="p-6 space-y-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-blue-800 dark:text-blue-300">
            <i class="fas fa-info-circle mr-2"></i>Como usar o IAprova?
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Faça o upload do edital do seu concurso</li>
            <li>• Preencha a entrevista inicial com seus dados</li>
            <li>• Receba um plano de estudos personalizado</li>
            <li>• Gere conteúdos com IA para cada tópico</li>
          </ul>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-green-800 dark:text-green-300">
            <i class="fas fa-graduation-cap mr-2"></i>Recursos Disponíveis
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• <strong>Teoria:</strong> Conteúdo completo do tópico</li>
            <li>• <strong>Exercícios:</strong> Questões no estilo da banca</li>
            <li>• <strong>Resumo:</strong> Síntese do conteúdo</li>
            <li>• <strong>Flashcards:</strong> Cards para memorização</li>
            <li>• <strong>Resumo Personalizado:</strong> Upload de PDF para resumo</li>
          </ul>
        </div>
        
        <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-yellow-800 dark:text-yellow-300">
            <i class="fas fa-lightbulb mr-2"></i>Dicas Importantes
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Configure a IA no menu para personalizar o conteúdo</li>
            <li>• Use o tema escuro para estudar à noite</li>
            <li>• Acompanhe seu progresso no dashboard</li>
            <li>• Revise regularmente com flashcards</li>
          </ul>
        </div>
        
        <div class="text-center pt-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Precisa de mais ajuda? Entre em contato pelo suporte.
          </p>
        </div>
      </div>
    </div>
  \`;
  document.body.appendChild(modal);
}
`;

// Adicionar a função no final do arquivo
appContent += '\n' + helpModalFunction;

// Remover botões de interrogação antigos do dashboard
appContent = appContent.replace(
  /<button[^>]*onmouseover="showTooltip[^>]*class="[^"]*absolute[^"]*(?:left-2|right-2)[^"]*"[^>]*>[\s\S]*?<\/button>/g,
  ''
);

// Salvar app.js
fs.writeFileSync(appJsPath, appContent);
console.log('✅ Frontend atualizado com ajuda no menu flutuante!');

console.log('\n' + '='.repeat(60));
console.log('✅ CORREÇÕES APLICADAS:');
console.log('1. Groq configurado para análise de edital');
console.log('2. Botão de ajuda movido para menu flutuante');
console.log('3. Removidos botões de interrogação antigos');
console.log('='.repeat(60));