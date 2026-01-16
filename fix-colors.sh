#!/bin/bash

FILE="public/static/app.js"
BACKUP="public/static/app.js.backup-colors"

# Criar backup
cp "$FILE" "$BACKUP"

# Substituições principais para cards e containers
sed -i 's/class="bg-white /class="${themes[currentTheme].card} /g' "$FILE"
sed -i "s/class='bg-white /class='\${themes[currentTheme].card} /g" "$FILE"

# Textos que devem respeitar o tema
sed -i 's/text-gray-800/\${themes[currentTheme].text}/g' "$FILE"
sed -i 's/text-gray-600/\${themes[currentTheme].textSecondary}/g' "$FILE"
sed -i 's/text-gray-700/\${themes[currentTheme].text}/g' "$FILE"

# Bordas
sed -i 's/border-gray-200/\${themes[currentTheme].border}/g' "$FILE"
sed -i 's/border-gray-300/\${themes[currentTheme].border}/g' "$FILE"

echo "✅ Correções aplicadas em $FILE"
echo "📦 Backup criado em $BACKUP"
