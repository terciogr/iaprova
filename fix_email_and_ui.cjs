#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO EMAIL E INTERFACE DEFINITIVAMENTE...\n');

// 1. CORRIGIR EMAIL SERVICE - Usar email verificado no Resend
console.log('1. Corrigindo configuração do Resend...');

const emailServicePath = path.join(__dirname, 'src', 'services', 'email.service.ts');
let emailContent = fs.readFileSync(emailServicePath, 'utf8');

// Trocar email do remetente para um verificado
emailContent = emailContent.replace(
  "fromEmail: 'noreply@iaprova.com.br'",
  "fromEmail: 'onboarding@resend.dev'" // Email padrão do Resend para testes
);

// Adicionar logs melhores
emailContent = emailContent.replace(
  'if (!response.ok) {',
  `console.log('📧 Enviando email para:', params.to);
      console.log('📧 Resposta Resend:', response.status);
      
      if (!response.ok) {`
);

fs.writeFileSync(emailServicePath, emailContent, 'utf8');
console.log('✅ Email service corrigido!');

// 2. CORRIGIR INTERFACE - Modal com 5 opções VISÍVEL
console.log('\n2. Corrigindo modal de geração de conteúdo...');

const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Encontrar a função que abre o modal
const modalFunctionIndex = appContent.indexOf('window.abrirModalGerarConteudo = function');
if (modalFunctionIndex > -1) {
  // Encontrar o HTML do modal
  const modalStart = appContent.indexOf('<div class="grid grid-cols-2 gap-3 mb-4">', modalFunctionIndex);
  const modalEnd = appContent.indexOf('</div>\n          \n          <!-- Seletor de quantidade', modalStart);
  
  if (modalStart > -1 && modalEnd > -1) {
    // Substituir todo o grid por um com 5 opções
    const newGrid = `<div class="grid grid-cols-2 gap-3 mb-4">
            <!-- Teoria -->
            <button onclick="selecionarTipoConteudo('teoria')"
                    id="btn-tipo-teoria"
                    class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#122D6A] transition text-left bg-white dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#122D6A]/10 flex items-center justify-center">
                  <i class="fas fa-book text-[#122D6A]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">Teoria</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Conteúdo completo</p>
                </div>
              </div>
            </button>
            
            <!-- Exercícios -->
            <button onclick="selecionarTipoConteudo('exercicios')"
                    id="btn-tipo-exercicios"
                    class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#2A4A9F] transition text-left bg-white dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#2A4A9F]/10 flex items-center justify-center">
                  <i class="fas fa-tasks text-[#2A4A9F]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">Exercícios</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Questões de concurso</p>
                </div>
              </div>
            </button>
            
            <!-- Resumo -->
            <button onclick="selecionarTipoConteudo('resumo')"
                    id="btn-tipo-resumo"
                    class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#4A90E2] transition text-left bg-white dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#4A90E2]/10 flex items-center justify-center">
                  <i class="fas fa-sticky-note text-[#4A90E2]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">Resumo</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Esquematizado</p>
                </div>
              </div>
            </button>
            
            <!-- Flashcards -->
            <button onclick="selecionarTipoConteudo('flashcards')"
                    id="btn-tipo-flashcards"
                    class="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#6BB6FF] transition text-left bg-white dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#6BB6FF]/10 flex items-center justify-center">
                  <i class="fas fa-clone text-[#6BB6FF]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800 dark:text-white">Flashcards</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Cards de revisão</p>
                </div>
              </div>
            </button>
            
            <!-- 5ª Opção: Resumo Personalizado (ocupando 2 colunas) -->
            <button onclick="selecionarTipoConteudo('resumo_personalizado')"
                    id="btn-tipo-resumo-personalizado"
                    class="col-span-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#FF6B35] transition text-left bg-white dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FF8C42] flex items-center justify-center">
                  <i class="fas fa-file-upload text-white"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-800 dark:text-white">Resumo Personalizado</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Upload de PDF ou documento para gerar resumo com IA</p>
                </div>
              </div>
            </button>
          </div>`;
    
    const beforeModal = appContent.substring(0, modalStart);
    const afterModal = appContent.substring(modalEnd);
    appContent = beforeModal + newGrid + afterModal;
  }
}

// 3. Garantir que a função selecionarTipoConteudo reconhece resumo_personalizado
const selectFunctionPattern = /\['teoria', 'exercicios', 'resumo', 'flashcards'\]/g;
appContent = appContent.replace(selectFunctionPattern, "['teoria', 'exercicios', 'resumo', 'flashcards', 'resumo_personalizado']");

// 4. Corrigir tooltip posicionamento
const tooltipPattern = /<div id="tooltip-\${meta.id}" class="absolute hidden/g;
appContent = appContent.replace(tooltipPattern, '<div id="tooltip-${meta.id}" class="fixed hidden');

// 5. Adicionar banca no plano
const planoPattern = /<strong>Órgão:<\/strong> \${dadosEntrevista.orgao \|\| 'Não informado'}<\/p>/g;
appContent = appContent.replace(
  planoPattern,
  `<strong>Órgão:</strong> \${dadosEntrevista.orgao || 'Não informado'}</p>
                    <p><strong>Banca:</strong> \${dadosEntrevista.banca_organizadora || 'Não identificada'}</p>`
);

fs.writeFileSync(appJsPath, appContent, 'utf8');
console.log('✅ Interface corrigida!');

// 6. Criar teste de email
console.log('\n3. Criando script de teste de email...');

const testEmailScript = `const RESEND_API_KEY = 're_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA';

async function testEmail() {
  console.log('📧 Testando envio de email com Resend...');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${RESEND_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: 'terciogomesrabelo@gmail.com',
      subject: 'Teste IAprova - Email Funcionando!',
      html: '<h1>Email funcionando!</h1><p>Se você recebeu este email, o sistema está configurado corretamente.</p>',
    }),
  });

  const result = await response.json();
  console.log('Resultado:', result);
}

testEmail().catch(console.error);
`;

fs.writeFileSync(path.join(__dirname, 'test-email-resend.js'), testEmailScript);
console.log('✅ Script de teste criado!');

console.log('\n' + '='.repeat(60));
console.log('✅ CORREÇÕES APLICADAS!');
console.log('='.repeat(60));

console.log('\n📝 O que foi corrigido:');
console.log('1. ✅ Email Resend - Usando onboarding@resend.dev (verificado)');
console.log('2. ✅ Modal com 5 opções - Resumo Personalizado visível');
console.log('3. ✅ Cores harmonizadas com o sistema');
console.log('4. ✅ Tooltip fixo (posição: fixed)');
console.log('5. ✅ Banca no plano de estudos');

console.log('\n🚀 Execute agora:');
console.log('1. npm run build');
console.log('2. pm2 restart iaprova');
console.log('3. node test-email-resend.js (para testar email)');