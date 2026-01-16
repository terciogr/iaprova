#!/bin/bash

# Script de Deploy para IAprova - Cloudflare Pages

echo "🚀 Iniciando deploy do IAprova para Cloudflare Pages..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o token está configurado
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ CLOUDFLARE_API_TOKEN não configurado!${NC}"
    echo "Configure o token com: export CLOUDFLARE_API_TOKEN=seu_token_aqui"
    exit 1
fi

# Nome do projeto
PROJECT_NAME="iaprova"

echo -e "${YELLOW}📦 Buildando o projeto...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído!${NC}"

# Criar banco de dados D1 em produção (se ainda não existir)
echo -e "${YELLOW}🗄️ Criando banco de dados D1...${NC}"
npx wrangler d1 create ${PROJECT_NAME}-db 2>/dev/null || echo "Banco já existe ou erro na criação"

# Deploy para Cloudflare Pages
echo -e "${YELLOW}☁️ Fazendo deploy para Cloudflare Pages...${NC}"
npx wrangler pages deploy dist --project-name $PROJECT_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
    echo ""
    echo "🌐 Seu app está disponível em:"
    echo "   https://${PROJECT_NAME}.pages.dev"
    echo ""
    echo "📝 Próximos passos:"
    echo "1. Configure as secrets no Cloudflare Dashboard:"
    echo "   npx wrangler pages secret put RESEND_API_KEY --project-name $PROJECT_NAME"
    echo "   npx wrangler pages secret put GROQ_API_KEY --project-name $PROJECT_NAME"
    echo "   npx wrangler pages secret put JWT_SECRET --project-name $PROJECT_NAME"
    echo ""
    echo "2. Aplique as migrações no banco de produção:"
    echo "   npx wrangler d1 migrations apply ${PROJECT_NAME}-db"
else
    echo -e "${RED}❌ Erro no deploy!${NC}"
    exit 1
fi