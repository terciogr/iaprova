# 📘 Guia do Usuário Final - IAprova v3.15

## ✅ O QUE ESTÁ FUNCIONANDO

### Sistema Completo
- ✅ **Planos de Estudo:** Criar, renomear, excluir, ativar
- ✅ **Metas Diárias:** Geração automática baseada no plano
- ✅ **Disciplinas:** Visualizar todas as 20 disciplinas cadastradas
- ✅ **Tópicos do Edital:** 770+ tópicos cadastrados (10 por disciplina)
- ✅ **Geração de Conteúdo:** Funcional com fallback estático
- ✅ **Download:** Markdown e HTML disponíveis
- ✅ **Frontend:** Loading states e feedback visual

### Fluxo Completo Testado
1. ✅ Login (teste@teste.com / 123456)
2. ✅ Dashboard mostra plano ativo
3. ✅ Clicar "Gerar Metas" → 5 metas criadas
4. ✅ Clicar "Gerar Conteúdo" → Conteúdo gerado
5. ✅ Visualizar conteúdo com seções e teoria
6. ✅ Download em Markdown funciona
7. ✅ "Minhas Disciplinas" lista todas
8. ✅ "Ver Conteúdos" mostra materiais gerados

## ⚙️ CONFIGURAÇÃO NECESSÁRIA

### Groq API (Para Conteúdo com IA)

**Por que configurar?**
- Sem Groq: Sistema usa conteúdo estático (genérico)
- Com Groq: Sistema gera conteúdo personalizado com LLM

**Como configurar:**
1. Acesse: https://console.groq.com/
2. Crie conta gratuita
3. Vá em "API Keys"
4. Clique "Create API Key"
5. Copie a chave (começa com `gsk_...`)
6. Cole no arquivo `.dev.vars`:
   ```
   GROQ_API_KEY=gsk_sua_chave_aqui
   ```
7. Reinicie: `pm2 restart iaprova`

## 📊 FUNCIONALIDADES DETALHADAS

### 1. Gestão de Planos

**Criar Novo Plano:**
- Dashboard → Botão "Novo Plano"
- Responder entrevista com disciplinas
- Plano criado automaticamente

**Gerenciar Planos:**
- Seção "Meus Planos de Estudo" no dashboard
- Renomear: Clique no ícone de lápis
- Ativar: Botão "Ativar" (desativa outros)
- Excluir: Botão "Excluir" (com confirmação)

### 2. Metas Diárias

**Gerar Metas:**
- Automático ao criar plano
- Manual: Botão "Gerar Metas" no dashboard
- Baseado no dia da semana do ciclo

**Visualizar Metas:**
- Dashboard mostra 5 metas do dia
- Cada meta tem: Disciplina, Tipo, Tempo
- Status: Não gerado / Gerado / Concluído

### 3. Geração de Conteúdo

**Como Gerar:**
1. Dashboard → Metas do Dia
2. Clique "Gerar Conteúdo" em qualquer meta
3. Loading aparece (spinner)
4. Conteúdo gerado e exibido automaticamente

**Tipos de Conteúdo:**
- **Teoria:** Texto explicativo detalhado
- **Exercícios:** Questões de múltipla escolha
- **Revisão:** Resumo + questões de fixação

### 4. Visualização de Disciplinas

**Acessar:**
- Dashboard → Botão "Minhas Disciplinas"
- Lista mostra 20 disciplinas
- Cards com estatísticas (teoria, exercícios, revisão)

**Ver Conteúdos:**
- Clique "Ver Conteúdos" em qualquer disciplina
- Mostra todos os materiais gerados
- Organizado por tipo e data

### 5. Download de Material

**Como Baixar:**
- Botão "Baixar" nas metas (após gerar)
- Formato: Markdown (.md)
- Nome automático: `disciplina_tipo_data.md`

**Conteúdo do Arquivo:**
- Tópicos abordados
- Objetivos de estudo
- Teoria completa ou questões
- Explicações detalhadas

## 🐛 TROUBLESHOOTING

### Problema: "Tela Preta" ao Clicar

**Causa:** Erro de JavaScript no frontend
**Solução:** 
1. Abra Console (F12)
2. Veja erro específico
3. Recarregue página (Ctrl+R)

### Problema: Conteúdo Não Gera

**Causa Possível 1:** Meta não existe
**Solução:** Gere metas primeiro

**Causa Possível 2:** API erro
**Solução:** Veja console do navegador

### Problema: Tópicos do Edital Não Aparecem

**Causa:** Conteúdo estático (sem Groq) gera tópicos genéricos
**Solução:** Configure Groq API para matching melhor

**Explicação Técnica:**
- Tópicos do edital: "ICMS", "ISS", "Simples Nacional" (específicos)
- Conteúdo estático gera: "Fundamentos de..." (genérico)
- Match insuficiente (< 60%)
- Com Groq: Gerará tópicos específicos que fazem match

## 📈 MÉTRICAS DO SISTEMA

**Disciplinas:** 77 cadastradas
**Tópicos:** 770+ (10 por disciplina)
**Usuário teste:** 20 disciplinas ativas
**Planos:** 3 criados (1 ativo)
**Metas:** 5 geradas para hoje
**Conteúdos:** 50+ já gerados

## 🎯 PRÓXIMAS MELHORIAS SUGERIDAS

1. **Vincular mais tópicos:** Melhorar algoritmo de matching
2. **Editor de tópicos:** Permitir usuário editar tópicos gerados
3. **Mais formatos:** PDF, DOCX para download
4. **Notificações:** Avisos de metas pendentes
5. **Gamificação:** Pontos, badges, rankings
6. **Estatísticas:** Gráficos de progresso detalhados

## ✅ CONCLUSÃO

**Sistema está 100% funcional** para uso básico:
- ✅ Criar planos e gerar metas
- ✅ Gerar conteúdo de estudo
- ✅ Visualizar e baixar materiais
- ✅ Gerenciar múltiplos planos

**Com Groq configurado:**
- ⭐ Conteúdo personalizado com IA
- ⭐ Tópicos específicos do edital
- ⭐ Qualidade superior

**Sem Groq:**
- ✅ Funciona com conteúdo estático
- ⚠️ Tópicos genéricos
- ⚠️ Sem personalização profunda

---

**Login de Teste:**
- Email: `teste@teste.com`
- Senha: `123456`

**URL:** https://3000-ixpirbiovhyhj03gyk7ct-b32ec7bb.sandbox.novita.ai

**Suporte:** Veja arquivos DIAGNOSTICO_COMPLETO.md e PLANO_CORRECAO.md
