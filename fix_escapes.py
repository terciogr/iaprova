with open('public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Substituir \${ por ${
content = content.replace('\\${', '${')

with open('public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Escapes corrigidos')
