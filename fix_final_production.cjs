const fs = require('fs');
const path = require('path');

console.log('🔧 CORREÇÃO DEFINITIVA PARA PRODUÇÃO');

// 1. Corrigir backend para usar Gemini 2.0 Flash
const backendFile = path.join(__dirname, 'src', 'index.tsx');
let backendContent = fs.readFileSync(backendFile, 'utf8');

// Corrigir modelo Gemini
backendContent = backendContent.replace(
  /gemini-1\.5-flash-latest|gemini-pro|gemini-1\.5-flash|gemini-1\.5-pro/g,
  'gemini-2.0-flash'
);

// Garantir que está usando a nova chave
if (!backendContent.includes('AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY')) {
  backendContent = backendContent.replace(
    /const GEMINI_API_KEY = env\.GEMINI_API_KEY \|\| '[^']+'/g,
    "const GEMINI_API_KEY = env.GEMINI_API_KEY || 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY'"
  );
}

fs.writeFileSync(backendFile, backendContent);
console.log('✅ Backend configurado com Gemini 2.0 Flash');

// 2. Corrigir frontend - Mover ajuda para menu flutuante
const frontendFile = path.join(__dirname, 'public', 'static', 'app.js');
let content = fs.readFileSync(frontendFile, 'utf8');

// Remover todos os botões de interrogação antigos
content = content.replace(
  /<button[^>]*onclick="showTooltip[^>]*>[\s\S]*?<\/button>/g,
  ''
);

// Adicionar ajuda no menu flutuante (junto com configurações de IA)
const menuFlutuante = `
    <!-- Menu Flutuante com Ajuda -->
    <div id="menu-flutuante" class="fixed bottom-6 right-6 z-50">
        <!-- Botão Principal do Menu -->
        <button id="btn-menu-principal" class="w-14 h-14 bg-[#1A3A7F] text-white rounded-full shadow-lg hover:bg-[#132C5C] transition-all duration-300 flex items-center justify-center">
            <i class="fas fa-ellipsis-v text-xl"></i>
        </button>
        
        <!-- Opções do Menu -->
        <div id="opcoes-menu" class="hidden absolute bottom-16 right-0 space-y-3">
            <!-- Botão de Ajuda -->
            <button onclick="abrirAjuda()" class="w-48 px-4 py-3 bg-white border-2 border-[#1A3A7F] text-[#1A3A7F] rounded-lg shadow-lg hover:bg-[#F8F9FA] transition-all duration-300 flex items-center space-x-3">
                <i class="fas fa-question-circle"></i>
                <span>Ajuda</span>
            </button>
            
            <!-- Botão Configurar IA -->
            <button onclick="abrirConfiguracaoIA()" class="w-48 px-4 py-3 bg-white border-2 border-[#1A3A7F] text-[#1A3A7F] rounded-lg shadow-lg hover:bg-[#F8F9FA] transition-all duration-300 flex items-center space-x-3">
                <i class="fas fa-cogs"></i>
                <span>Configurar IA</span>
            </button>
            
            <!-- Botão Sobre -->
            <button onclick="abrirSobre()" class="w-48 px-4 py-3 bg-white border-2 border-[#1A3A7F] text-[#1A3A7F] rounded-lg shadow-lg hover:bg-[#F8F9FA] transition-all duration-300 flex items-center space-x-3">
                <i class="fas fa-info-circle"></i>
                <span>Sobre</span>
            </button>
        </div>
    </div>

    <script>
    // Toggle menu flutuante
    document.getElementById('btn-menu-principal').addEventListener('click', function() {
        const opcoes = document.getElementById('opcoes-menu');
        opcoes.classList.toggle('hidden');
    });

    // Função de Ajuda
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
                        <p>Faça upload do PDF do edital. A IA analisará automaticamente e extrairá as disciplinas e tópicos.</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">2️⃣ Criação do Plano</h3>
                        <p>Defina suas metas semanais, tempo disponível e a banca organizadora será detectada automaticamente.</p>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">3️⃣ Geração de Conteúdo</h3>
                        <p>Escolha entre 5 tipos: Teoria, Exercícios, Resumo, Flashcards ou Resumo Personalizado (com upload).</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h3 class="font-bold text-lg mb-2">4️⃣ Acompanhamento</h3>
                        <p>Monitore seu progresso no dashboard e receba lembretes automáticos por email.</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full py-3 bg-[#1A3A7F] text-white rounded-lg hover:bg-[#132C5C] transition-colors">
                        Entendi! 👍
                    </button>
                </div>
            </div>
        \`;
        document.body.appendChild(modal);
    };

    // Fechar menu ao clicar fora
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('menu-flutuante');
        if (!menu.contains(e.target)) {
            document.getElementById('opcoes-menu').classList.add('hidden');
        }
    });
    </script>
`;

// Adicionar menu flutuante se não existir
if (!content.includes('menu-flutuante')) {
    content = content.replace('</body>', menuFlutuante + '</body>');
}

fs.writeFileSync(frontendFile, content);
console.log('✅ Menu flutuante com ajuda adicionado');

// 3. Testar nova API Gemini
const testGemini = `
const API_KEY = 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY';

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{
            parts: [{
                text: 'Responda apenas: OK'
            }]
        }]
    })
})
.then(res => res.json())
.then(data => {
    if (data.candidates) {
        console.log('✅ Gemini API funcionando!');
        console.log('Resposta:', data.candidates[0].content.parts[0].text);
    } else {
        console.error('❌ Erro:', data);
    }
});
`;

fs.writeFileSync('test-gemini-api.js', testGemini);

console.log('\n📌 CORREÇÕES APLICADAS:');
console.log('1. ✅ Gemini 2.0 Flash configurado para análise de edital');
console.log('2. ✅ Ajuda movida para menu flutuante (canto inferior direito)');
console.log('3. ✅ Nova API key configurada');
console.log('\n🚀 Próximos passos:');
console.log('1. npm run build');
console.log('2. pm2 restart iaprova');
console.log('3. node test-gemini-api.js (para testar)');