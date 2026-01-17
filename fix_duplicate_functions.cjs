#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo funções duplicadas...\n');

const appJsPath = path.join(__dirname, 'public', 'static', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Dividir o conteúdo em linhas
const lines = appContent.split('\n');

// Encontrar e remover a primeira ocorrência de showToast (linha 14)
console.log('Removendo função showToast duplicada...');

// Remover linhas 14-56 (primeira função showToast)
lines.splice(13, 43);

// Juntar novamente
appContent = lines.join('\n');

// Verificar se há outras duplicatas
const functionRegex = /^function\s+(\w+)/gm;
const functions = {};
let match;
let lineNum = 0;

appContent.split('\n').forEach((line, index) => {
  const funcMatch = line.match(/^function\s+(\w+)/);
  if (funcMatch) {
    const funcName = funcMatch[1];
    if (functions[funcName]) {
      console.log(`⚠️  Função duplicada encontrada: ${funcName} nas linhas ${functions[funcName]} e ${index + 1}`);
    } else {
      functions[funcName] = index + 1;
    }
  }
});

// Salvar arquivo corrigido
fs.writeFileSync(appJsPath, appContent, 'utf8');

console.log('\n✅ Funções duplicadas removidas!');
console.log('\n🚀 Execute: npm run build && pm2 restart iaprova');