with open('src/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir \` por `
content = content.replace('\\`', '`')
# Substituir \${ por ${
content = content.replace('\\${', '${')

with open('src/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('TSX escapes corrigidos')
