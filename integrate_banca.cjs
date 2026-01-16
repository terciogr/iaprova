#!/usr/bin/env node

/**
 * Script para integrar o analisador de banca no sistema IAprova
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Integrando analisador de banca no sistema IAprova...\n');

// Ler o arquivo index.tsx
const indexPath = path.join(__dirname, 'src', 'index.tsx');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Adicionar import do analisador de banca
console.log('✅ Adicionando import do analisador de banca...');
const importStatement = `import { identificarBanca, ajustarPromptParaBanca, getCaracteristicasBanca } from './banca-analyzer'\n`;

if (!content.includes('banca-analyzer')) {
  // Adicionar após os outros imports
  const importPos = content.indexOf('import { Hono }');
  if (importPos > -1) {
    content = content.slice(0, importPos) + importStatement + content.slice(importPos);
    console.log('   - Import adicionado');
  }
}

// 2. Adicionar campo de banca na rota de upload de edital
console.log('✅ Modificando rota de upload de edital...');

// Buscar a rota de upload
const uploadRoutePattern = /const nomeConcurso = formData\.get\('nome_concurso'\) as string/;
const uploadRouteReplacement = `const nomeConcurso = formData.get('nome_concurso') as string
  const bancaInformada = formData.get('banca_organizadora') as string || null`;

if (content.match(uploadRoutePattern)) {
  content = content.replace(uploadRoutePattern, uploadRouteReplacement);
  console.log('   - Campo banca_organizadora adicionado ao upload');
}

// 3. Adicionar identificação automática de banca
console.log('✅ Adicionando identificação automática de banca...');

const afterTextExtraction = `console.log(\`✅ TXT lido: \${textoCompleto.length} caracteres\`)`;
const bancaIdentification = `console.log(\`✅ TXT lido: \${textoCompleto.length} caracteres\`)
        
        // Identificar banca automaticamente se não foi informada
        let bancaIdentificada = bancaInformada
        if (!bancaIdentificada && textoCompleto.length > 100) {
          bancaIdentificada = identificarBanca(textoCompleto)
          if (bancaIdentificada) {
            console.log(\`🎯 Banca identificada automaticamente: \${bancaIdentificada}\`)
          }
        }`;

if (content.includes(afterTextExtraction) && !content.includes('identificarBanca')) {
  content = content.replace(afterTextExtraction, bancaIdentification);
  console.log('   - Identificação automática de banca adicionada');
}

// 4. Salvar banca no banco de dados
console.log('✅ Salvando banca no banco de dados...');

const insertEditalString = 'VALUES (?, ?, ?, ?, ?)';
const insertEditalReplacement = 'VALUES (?, ?, ?, ?, ?, ?)';

const bindString = '.bind(userId, nomeConcurso, key, textoCompleto, \'pendente\')';
const bindReplacement = '.bind(userId, nomeConcurso, key, textoCompleto, \'pendente\', bancaIdentificada)';

if (content.includes(bindString)) {
  content = content.replace(insertEditalString, insertEditalReplacement);
  content = content.replace(bindString, bindReplacement);
  console.log('   - Salvamento de banca no banco configurado');
}

// 5. Modificar geração de conteúdo para considerar a banca
console.log('✅ Ajustando geração de conteúdo para banca...');

// Buscar onde o conteúdo é gerado
const contentGenerationString = 'const prompt = `Você é um professor especialista';
const contentGenerationReplacement = `// Buscar banca do edital se houver
    const editalInfo = await DB.prepare('SELECT banca_organizadora FROM editais WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId).first()
    const bancaUsuario = editalInfo?.banca_organizadora || null
    
    const prompt = \`Você é um professor especialista`;

if (content.includes(contentGenerationString) && !content.includes('bancaUsuario')) {
  content = content.replace(contentGenerationString, contentGenerationReplacement);
  console.log('   - Busca de banca para geração de conteúdo adicionada');
}

// Adicionar ajuste do prompt baseado na banca
const afterPromptCreation = 'Gere um conteúdo completo e detalhado.`';
const adjustPromptForBanca = `Gere um conteúdo completo e detalhado.\`
    
    // Ajustar prompt baseado na banca
    if (bancaUsuario) {
      prompt = ajustarPromptParaBanca(prompt, bancaUsuario)
      console.log(\`📝 Prompt ajustado para banca \${bancaUsuario}\`)
    }`;

if (content.includes(afterPromptCreation) && !content.includes('ajustarPromptParaBanca')) {
  content = content.replace(afterPromptCreation, adjustPromptForBanca);
  console.log('   - Ajuste de prompt para banca adicionado');
}

// 6. Adicionar endpoint para listar bancas disponíveis
console.log('✅ Adicionando endpoint de bancas...');

const newEndpoint = `
// Endpoint para listar bancas disponíveis
app.get('/api/bancas', async (c) => {
  const { DB } = c.env
  
  try {
    const bancas = await DB.prepare('SELECT nome, descricao, dicas_estudo FROM bancas_caracteristicas ORDER BY nome').all()
    return c.json({ bancas: bancas.results || [] })
  } catch (error) {
    console.error('Erro ao buscar bancas:', error)
    return c.json({ bancas: [] })
  }
})

// Endpoint para informações detalhadas de uma banca
app.get('/api/bancas/:nome', async (c) => {
  const { DB } = c.env
  const nomeBanca = c.req.param('nome')
  
  try {
    const banca = await DB.prepare('SELECT * FROM bancas_caracteristicas WHERE nome = ?').bind(nomeBanca.toUpperCase()).first()
    if (banca) {
      const info = getCaracteristicasBanca(nomeBanca)
      return c.json({ 
        banca: banca,
        caracteristicas: info?.caracteristicas || {},
        exemplos: info ? gerarExemploQuestaoBanca(nomeBanca) : null
      })
    }
    return c.json({ error: 'Banca não encontrada' }, 404)
  } catch (error) {
    console.error('Erro ao buscar banca:', error)
    return c.json({ error: 'Erro ao buscar informações da banca' }, 500)
  }
})
`;

// Adicionar antes do export default
const exportPattern = 'export default app';
if (!content.includes('/api/bancas')) {
  content = content.replace(exportPattern, newEndpoint + '\n' + exportPattern);
  console.log('   - Endpoints /api/bancas adicionados');
}

// Salvar o arquivo atualizado
fs.writeFileSync(indexPath, content);

console.log('\n✅ Integração do analisador de banca concluída!');
console.log('\n📝 Próximos passos:');
console.log('1. Aplicar a migração: npx wrangler d1 migrations apply iaprova-db --local');
console.log('2. Rebuild o projeto: npm run build');
console.log('3. Reiniciar o servidor: pm2 restart iaprova');
console.log('\n🎯 Funcionalidades adicionadas:');
console.log('- Identificação automática de banca no edital');
console.log('- Campo para informar banca manualmente');
console.log('- Geração de conteúdo adaptada para cada banca');
console.log('- Questões no estilo específico de cada banca');
console.log('- 15 bancas brasileiras pré-configuradas');