import re
with open('public/static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# O problema sao caracteres backslash seguidos de backtick
# Substituir \` por apenas `
content = content.replace('\\`', '`')

with open('public/static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Backticks corrigidos')
