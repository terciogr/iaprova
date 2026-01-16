#!/bin/bash

echo "🚀 Script para fazer push do IAprova para GitHub"
echo ""
echo "📋 Este script irá:"
echo "1. Criar/atualizar o repositório iaprova no GitHub"
echo "2. Fazer push de todos os commits"
echo ""

# Verificar se já tem remote configurado
if ! git remote | grep -q origin; then
    echo "➕ Adicionando remote origin..."
    git remote add origin https://github.com/terciogomesrabelo/iaprova.git
else
    echo "✅ Remote origin já configurado"
fi

echo ""
echo "📝 Para fazer o push, você tem duas opções:"
echo ""
echo "OPÇÃO 1 - Usar Personal Access Token:"
echo "----------------------------------------"
echo "1. Vá em: https://github.com/settings/tokens"
echo "2. Clique em 'Generate new token (classic)'"
echo "3. Nome: IAprova Deploy"
echo "4. Permissões: selecione 'repo' (todas)"
echo "5. Gere e copie o token"
echo ""
echo "Execute o comando:"
echo "git push https://SEU_USUARIO:SEU_TOKEN@github.com/terciogomesrabelo/iaprova.git main --force"
echo ""
echo "OPÇÃO 2 - Usar GitHub CLI:"
echo "----------------------------------------"
echo "gh auth login"
echo "git push origin main --force"
echo ""
echo "OPÇÃO 3 - Baixar e fazer push local:"
echo "----------------------------------------"
echo "1. Baixe o backup: https://www.genspark.ai/api/files/s/rDh15FiX"
echo "2. Extraia no seu computador"
echo "3. Entre na pasta webapp"
echo "4. Execute:"
echo "   git remote add origin https://github.com/terciogomesrabelo/iaprova.git"
echo "   git push -u origin main --force"
echo ""
echo "📊 Status atual do repositório:"
echo "--------------------------------"
git status --short
echo ""
echo "📝 Últimos commits:"
echo "--------------------------------"
git log --oneline -5
echo ""
echo "✅ Repositório pronto para push!"