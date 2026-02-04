// Script de pós-build para ajustar _routes.json
// Garante que arquivos estáticos como og-image.png não sejam interceptados pelo Worker

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../dist/_routes.json');

// Lê o arquivo atual
let routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

// Arquivos que devem ser excluídos (servidos diretamente pelo Cloudflare Pages)
const excludeFiles = [
  '/og-image.png',
  '/favicon.ico',
  '/robots.txt'
];

// Adiciona os arquivos à lista de exclusões se não existirem
excludeFiles.forEach(file => {
  if (!routes.exclude.includes(file)) {
    routes.exclude.push(file);
  }
});

// Salva o arquivo atualizado
fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));

console.log('✅ _routes.json atualizado com exclusões:', routes.exclude);
