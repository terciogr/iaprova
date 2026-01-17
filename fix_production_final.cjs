const fs = require('fs');
const path = require('path');

console.log('🚀 CORREÇÕES FINAIS PARA PRODUÇÃO');

// 1. Corrigir backend - Nova API Gemini
const backendFile = path.join(__dirname, 'src', 'index.tsx');
let backend = fs.readFileSync(backendFile, 'utf8');

// Atualizar modelo Gemini para 2.0 Flash
backend = backend.replace(
  /gemini-1\.5-flash-latest|gemini-pro|gemini-1\.5-flash|gemini-1\.5-pro/g,
  'gemini-2.0-flash'
);

// Atualizar chave API
backend = backend.replace(
  /AIzaSyD[A-Za-z0-9_-]{33}/g,
  'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY'
);

fs.writeFileSync(backendFile, backend);
console.log('✅ Backend: Gemini 2.0 Flash + nova API key');

// 2. Remover botões de interrogação e adicionar menu flutuante
const frontendFile = path.join(__dirname, 'public', 'static', 'app.js');
let frontend = fs.readFileSync(frontendFile, 'utf8');

// Remover botões de interrogação com tooltip
frontend = frontend.replace(
  /<button[^>]*onclick=['"]showTooltip[^>]*>[\s\S]*?<\/button>/g,
  ''
);

// Verificar se menu flutuante já existe
if (!frontend.includes('menu-flutuante')) {
  // Adicionar menu flutuante no final do body
  const menuHTML = `
    <!-- Menu Flutuante Completo -->
    <div id="menu-flutuante" class="fixed bottom-6 right-6 z-50">
        <button id="btn-menu-principal" class="w-14 h-14 bg-[#1A3A7F] text-white rounded-full shadow-lg hover:bg-[#132C5C] transition-all flex items-center justify-center">
            <i class="fas fa-ellipsis-v text-xl"></i>
        </button>
        <div id="opcoes-menu" class="hidden absolute bottom-16 right-0 space-y-3">
            <button onclick="window.abrirAjuda()" class="w-48 px-4 py-3 bg-white border-2 border-[#1A3A7F] text-[#1A3A7F] rounded-lg shadow-lg hover:bg-[#F8F9FA] flex items-center space-x-3">
                <i class="fas fa-question-circle"></i>
                <span>Ajuda</span>
            </button>
            <button onclick="window.abrirConfiguracaoIA()" class="w-48 px-4 py-3 bg-white border-2 border-[#1A3A7F] text-[#1A3A7F] rounded-lg shadow-lg hover:bg-[#F8F9FA] flex items-center space-x-3">
                <i class="fas fa-cogs"></i>
                <span>Configurar IA</span>
            </button>
        </div>
    </div>
    
    <script>
    // Menu flutuante
    document.addEventListener('DOMContentLoaded', function() {
        const btnMenu = document.getElementById('btn-menu-principal');
        const opcoesMenu = document.getElementById('opcoes-menu');
        
        if (btnMenu && opcoesMenu) {
            btnMenu.addEventListener('click', function(e) {
                e.stopPropagation();
                opcoesMenu.classList.toggle('hidden');
            });
            
            document.addEventListener('click', function(e) {
                if (!btnMenu.contains(e.target) && !opcoesMenu.contains(e.target)) {
                    opcoesMenu.classList.add('hidden');
                }
            });
        }
    });
    
    // Função de ajuda
    window.abrirAjuda = function() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = \`
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="bg-[#1A3A7F] text-white p-6 rounded-t-lg">
                    <h2 class="text-2xl font-bold">📚 Como usar o IAprova</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">1️⃣ Upload do Edital</h3>
                        <p>Faça upload do edital (PDF/TXT). A IA processará automaticamente.</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">2️⃣ Plano de Estudos</h3>
                        <p>Defina metas semanais. A banca organizadora será identificada.</p>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">3️⃣ Conteúdo com IA</h3>
                        <p>5 opções: Teoria, Exercícios, Resumo, Flashcards, Resumo Personalizado</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="w-full py-3 bg-[#1A3A7F] text-white rounded-lg hover:bg-[#132C5C]">
                        Entendi!
                    </button>
                </div>
            </div>
        \`;
        document.body.appendChild(modal);
    };
    </script>
  `;
  
  frontend = frontend.replace('</body>', menuHTML + '</body>');
}

fs.writeFileSync(frontendFile, frontend);
console.log('✅ Frontend: Menu flutuante adicionado');

console.log('\n✅ CORREÇÕES APLICADAS:');
console.log('1. Gemini 2.0 Flash configurado');
console.log('2. Nova API key ativada');
console.log('3. Menu flutuante com ajuda no canto inferior direito');
console.log('\n🚀 Execute: npm run build && pm2 restart iaprova');