#!/bin/bash
echo "🚀 Build otimizado IAprova..."

# Limpar cache antigo
rm -rf .wrangler/tmp
rm -rf dist

# Build rápido
npm run build

# Reiniciar servidor
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs

echo "✅ Build completo! Servidor rodando."
