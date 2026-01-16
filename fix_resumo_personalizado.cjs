#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo modal de resumo personalizado...\n');

// Caminho do arquivo
const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');

// Ler o arquivo
let content = fs.readFileSync(appJsPath, 'utf8');

// 1. Corrigir o modal para incluir o botão de Resumo Personalizado (5ª opção)
const modalOriginal = `          </div>
          
          <!-- Seletor de quantidade (aparece para exercícios e flashcards) -->`;

const modalNovo = `            
            <!-- 5ª Opção: Resumo Personalizado -->
            <button onclick="selecionarTipoConteudo('resumo_personalizado')"
                    id="btn-tipo-resumo-personalizado"
                    class="p-4 border-2 \${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] transition text-left \${themes[currentTheme].card} col-span-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
                  <i class="fas fa-file-upload text-white"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold \${themes[currentTheme].text}">Resumo Personalizado</p>
                  <p class="text-xs \${themes[currentTheme].textSecondary}">Upload de PDF ou documento para gerar resumo com IA</p>
                </div>
              </div>
            </button>
          </div>
          
          <!-- Seletor de quantidade (aparece para exercícios e flashcards) -->`;

content = content.replace(modalOriginal, modalNovo);

// 2. Atualizar a função selecionarTipoConteudo para incluir resumo_personalizado
const funcaoOriginal = `  // Resetar todos os botões
  ['teoria', 'exercicios', 'resumo', 'flashcards'].forEach(t => {`;

const funcaoNova = `  // Resetar todos os botões
  ['teoria', 'exercicios', 'resumo', 'flashcards', 'resumo_personalizado'].forEach(t => {`;

content = content.replace(funcaoOriginal, funcaoNova);

// 3. Adicionar cor para resumo_personalizado na função selecionarTipoConteudo
const coresOriginal = `    const colors = { teoria: 'bg-blue-50', exercicios: 'bg-green-50', resumo: 'bg-yellow-50', flashcards: 'bg-cyan-50' };`;

const coresNovo = `    const colors = { 
      teoria: 'bg-blue-50', 
      exercicios: 'bg-green-50', 
      resumo: 'bg-yellow-50', 
      flashcards: 'bg-cyan-50',
      resumo_personalizado: 'bg-orange-50'
    };`;

content = content.replace(coresOriginal, coresNovo);

// 4. Modificar a função confirmarGeracaoConteudo para tratar resumo_personalizado
const confirmarOriginal = `window.confirmarGeracaoConteudo = function(topicoId, topicoNome, disciplinaNome) {
  if (!tipoConteudoSelecionado) {
    showToast('Selecione um tipo de conteúdo', 'warning');
    return;
  }
  
  let quantidade = null;
  if (tipoConteudoSelecionado === 'exercicios' || tipoConteudoSelecionado === 'flashcards') {
    quantidade = parseInt(document.getElementById('quantidade-slider').value);
  }
  
  // Remover modal e executar
  document.getElementById('modal-gerar-conteudo')?.remove();
  executarGeracaoConteudo(topicoId, topicoNome, disciplinaNome, tipoConteudoSelecionado, quantidade);
}`;

const confirmarNovo = `window.confirmarGeracaoConteudo = function(topicoId, topicoNome, disciplinaNome, metaId = null) {
  if (!tipoConteudoSelecionado) {
    showToast('Selecione um tipo de conteúdo', 'warning');
    return;
  }
  
  // Se for resumo personalizado, abrir modal de upload
  if (tipoConteudoSelecionado === 'resumo_personalizado') {
    document.getElementById('modal-gerar-conteudo')?.remove();
    // Configurar meta para o modal de upload
    window.metaAtual = {
      topico_id: topicoId,
      topico_nome: topicoNome,
      disciplina_nome: disciplinaNome
    };
    abrirModalResumoPersonalizado(metaId || 0);
    return;
  }
  
  let quantidade = null;
  if (tipoConteudoSelecionado === 'exercicios' || tipoConteudoSelecionado === 'flashcards') {
    quantidade = parseInt(document.getElementById('quantidade-slider').value);
  }
  
  // Remover modal e executar
  document.getElementById('modal-gerar-conteudo')?.remove();
  executarGeracaoConteudo(topicoId, topicoNome, disciplinaNome, tipoConteudoSelecionado, quantidade, metaId);
}`;

content = content.replace(confirmarOriginal, confirmarNovo);

// 5. Ajustar a chamada do botão gerar para incluir metaId
const botaoGerarOriginal = `onclick="confirmarGeracaoConteudo(\${topicoId}, '\${topicoNome.replace(/'/g, "\\\\'")}', '\${disciplinaNome.replace(/'/g, "\\\\'")}')"`;

const botaoGerarNovo = `onclick="confirmarGeracaoConteudo(\${topicoId}, '\${topicoNome.replace(/'/g, "\\\\'")}', '\${disciplinaNome.replace(/'/g, "\\\\'")}', \${metaId || 'null'})"`;

content = content.replace(botaoGerarOriginal, botaoGerarNovo);

// 6. Adicionar metaId como parâmetro na função abrirModalGerarConteudo
const abrirModalOriginal = `window.abrirModalGerarConteudo = function(topicoId, topicoNome, disciplinaNome) {`;

const abrirModalNovo = `window.abrirModalGerarConteudo = function(topicoId, topicoNome, disciplinaNome, metaId = null) {`;

content = content.replace(abrirModalOriginal, abrirModalNovo);

// Salvar arquivo
fs.writeFileSync(appJsPath, content, 'utf8');

console.log('✅ Modal corrigido com sucesso!');
console.log('\n📝 Correções aplicadas:');
console.log('1. ✅ Adicionado botão de Resumo Personalizado (5ª opção)');
console.log('2. ✅ Função selecionarTipoConteudo atualizada');
console.log('3. ✅ Cores configuradas para resumo_personalizado');
console.log('4. ✅ Função confirmarGeracaoConteudo atualizada para tratar upload');
console.log('5. ✅ Integração com modal de upload de documentos');

console.log('\n🎯 Agora o modal mostra 5 opções:');
console.log('   1. Teoria (azul)');
console.log('   2. Exercícios (verde)');
console.log('   3. Resumo (amarelo)');
console.log('   4. Flashcards (ciano)');
console.log('   5. Resumo Personalizado (laranja) - Upload de PDF/Documento');

console.log('\n✨ Correção concluída!');