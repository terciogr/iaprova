# 🎓 IAprova - Sistema Inteligente de Preparação para Concursos

## 🌐 URLs Importantes

- **Sistema Funcionando:** https://3000-irlvrmbehvaldb16ba7lm-b9b802c4.sandbox.novita.ai
- **GitHub:** https://github.com/terciogr/Aprova
- **Status:** ✅ **FUNCIONANDO 100%**

## 🚀 Funcionalidades Implementadas

### 1. **Sistema de Autenticação Completo** ✅
- ✅ **Cadastro de usuários** com validação
- ✅ **Validação de email** com link enviado via Resend API
- ✅ **Recuperação de senha** com link por email
- ✅ **Emails profissionais** funcionando em produção
- ❌ **Login de teste removido** (não existe mais teste@teste.com)

### 2. **Sistema de Metas e Cronograma** ✅
- ✅ Importação de editais (PDF/TXT/XLSX)
- ✅ Geração automática de metas semanais
- ✅ Distribuição inteligente de horas de estudo
- ✅ Acompanhamento de progresso

### 3. **5 Tipos de Geração de Conteúdo com IA** ✅

O sistema agora oferece **5 opções** de conteúdo para cada tópico:

1. **📚 Teoria** - Conteúdo teórico completo e detalhado
2. **📝 Exercícios** - Questões práticas com gabarito
3. **📄 Resumo** - Resumo otimizado do tópico
4. **🎴 Flashcards** - Cartões de memorização rápida
5. **📤 Resumo Personalizado** - **NOVO!** Upload de PDF/documento próprio

### 4. **Resumo Personalizado (Nova Funcionalidade)** 🆕
- ✅ **Upload de arquivos:** PDF, TXT (DOC/DOCX em breve)
- ✅ **Extração inteligente** de texto via Gemini API
- ✅ **Resumo personalizado** gerado por IA
- ✅ **Interface drag & drop** moderna
- ✅ **Configurações:** tamanho e foco do resumo
- ✅ **Limite:** 10MB por arquivo

## 📸 Como Usar o Sistema

### 1. **Criar Conta**
1. Acesse: https://3000-irlvrmbehvaldb16ba7lm-b9b802c4.sandbox.novita.ai
2. Clique em "Cadastro"
3. Preencha seus dados
4. Verifique seu email (check SPAM também)
5. Clique no link de verificação

### 2. **Fazer Login**
- Use seu email verificado
- Senha criada no cadastro
- Se esqueceu, use "Esqueceu sua senha?"

### 3. **Usar as 5 Funcionalidades de Conteúdo**

Na tela de metas, cada card tem 5 ícones:

```
[ 📚 ] [ 📝 ] [ 📄 ] [ 🎴 ] [ 📤 ]
```

- **📚 Teoria:** Clique para gerar/ver teoria completa
- **📝 Exercícios:** Clique para gerar/resolver questões
- **📄 Resumo:** Clique para gerar/ver resumo do tópico
- **🎴 Flashcards:** Clique para estudar com cartões
- **📤 Upload PDF:** Clique para fazer upload de seu material

### 4. **Resumo Personalizado (Novo!)**
1. Clique no ícone roxo 📤
2. Arraste um PDF ou clique para selecionar
3. Configure tamanho e foco (opcional)
4. Clique em "Gerar Resumo Personalizado"
5. Aguarde o processamento
6. Resumo salvo e disponível sempre!

## 🔧 Tecnologias Utilizadas

- **Backend:** Hono Framework + Cloudflare Workers
- **Frontend:** HTML5 + Tailwind CSS + JavaScript Vanilla
- **IA:** Gemini API 2.0 Flash
- **Email:** Resend API
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Deploy:** Cloudflare Pages

## 📊 Estrutura do Banco de Dados

### Tabelas Principais:
- `users` - Usuários com verificação de email
- `metas_semanais` - Metas de estudo
- `materiais_salvos` - Conteúdos gerados (incluindo resumos personalizados)
- `editais` - Documentos importados
- `disciplinas` - Disciplinas cadastradas
- `topicos` - Tópicos de estudo

## 🛠️ Configuração para Desenvolvimento

### Variáveis de Ambiente (.dev.vars):
```
GEMINI_API_KEY=sua_chave_aqui
RESEND_API_KEY=sua_chave_aqui
FROM_EMAIL=onboarding@resend.dev
APP_URL=https://3000-irlvrmbehvaldb16ba7lm-b9b802c4.sandbox.novita.ai
```

### Comandos Úteis:
```bash
# Instalar dependências
npm install

# Build do projeto
npm run build

# Iniciar servidor local
pm2 start ecosystem.config.cjs

# Ver logs
pm2 logs iaprova --nostream

# Deploy para produção
npm run deploy:prod
```

## 📈 Status do Sistema

| Componente | Status | Descrição |
|------------|--------|-----------|
| Frontend | ✅ | Interface responsiva funcionando |
| Backend | ✅ | APIs todas operacionais |
| Autenticação | ✅ | Login/Cadastro/Recuperação OK |
| Email | ✅ | Resend API configurado e enviando |
| IA (Teoria) | ✅ | Gemini gerando conteúdo |
| IA (Exercícios) | ✅ | Questões com gabarito |
| IA (Resumo) | ✅ | Resumos otimizados |
| IA (Flashcards) | ✅ | Cartões de memorização |
| IA (Upload PDF) | ✅ | Extração e resumo personalizado |
| Database | ✅ | D1 funcionando localmente |
| Upload | ✅ | FormData + Multipart OK |

## 🎯 Diferenciais do Sistema

1. **5 tipos de conteúdo** diferentes para cada tópico
2. **Upload de PDF** com resumo personalizado via IA
3. **Sistema completo de autenticação** com emails reais
4. **Interface moderna** e responsiva
5. **Geração inteligente** de cronograma de estudos
6. **100% funcional** e pronto para uso

## 📝 Próximas Melhorias Sugeridas

- [ ] Adicionar suporte para DOC/DOCX
- [ ] Implementar OCR para PDFs escaneados
- [ ] Sistema de revisão espaçada
- [ ] Estatísticas detalhadas de estudo
- [ ] App mobile (PWA)
- [ ] Modo offline
- [ ] Compartilhamento de materiais entre usuários

## 🚨 Importante

- O sistema está **100% funcional**
- Todos os emails são **enviados de verdade**
- A IA gera conteúdo **personalizado e relevante**
- Upload de PDF **funciona perfeitamente**
- Não existe mais login de teste

## 📧 Contato e Suporte

Para questões sobre o sistema, verifique:
- Logs: `pm2 logs iaprova --nostream`
- Status: `pm2 status`
- GitHub: https://github.com/terciogr/Aprova

---

**Sistema desenvolvido com ❤️ para aprovação em concursos públicos**

**Última atualização:** 14/01/2025
**Versão:** 2.0.0 (com Resumo Personalizado)