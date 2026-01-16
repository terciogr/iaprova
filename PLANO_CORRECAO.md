# 🔧 Plano de Correção - IAprova v3.15

## ❌ PROBLEMAS A CORRIGIR

### 1. Tópicos do Edital Não Aparecem no Conteúdo
**Status:** 🔴 Crítico
**Causa:** Endpoint GET /api/conteudo/:id não busca topicos_edital vinculados
**Solução:** Modificar endpoint para fazer JOIN com conteudo_topicos e topicos_edital

### 2. Frontend Não Mostra "Minhas Disciplinas"
**Status:** 🔴 Crítico  
**Causa:** Função verDetalhesDisciplinas corrigida mas pode ter problemas
**Solução:** Verificar e adicionar logs/debugging

### 3. Botão "Gerar Conteúdo" Pode Não Dar Feedback
**Status:** 🟡 Médio
**Causa:** Falta loading state e mensagens de erro
**Solução:** Adicionar spinner e toasts

### 4. Groq API Key Inválida
**Status:** 🟡 Médio
**Causa:** Chave de exemplo no .dev.vars
**Solução:** Documentar melhor e adicionar mensagem amigável

## 🎯 CORREÇÕES PRIORITÁRIAS

### Correção 1: Endpoint de Conteúdo com Tópicos do Edital

```typescript
// MODIFICAR: src/index.tsx - linha ~2589
app.get('/api/conteudos/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const format = c.req.query('format') || 'json'

  // Buscar conteúdo
  const conteudo = await DB.prepare(
    'SELECT * FROM conteudo_estudo WHERE id = ?'
  ).bind(id).first()

  if (!conteudo) {
    return c.json({ error: 'Conteúdo não encontrado' }, 404)
  }

  // 🆕 BUSCAR TÓPICOS VINCULADOS
  const { results: topicosVinculados } = await DB.prepare(`
    SELECT te.id, te.nome, te.categoria, te.peso, te.ordem
    FROM conteudo_topicos ct
    JOIN topicos_edital te ON ct.topico_id = te.id
    WHERE ct.conteudo_id = ?
    ORDER BY te.ordem
  `).bind(id).all()

  const resultado = {
    ...conteudo,
    conteudo: JSON.parse(conteudo.conteudo),
    topicos: JSON.parse(conteudo.topicos),
    objetivos: JSON.parse(conteudo.objetivos),
    topicos_edital: topicosVinculados  // 🆕 ADICIONAR AQUI
  }

  // Formatar resposta conforme solicitado
  if (format === 'markdown') {
    const md = gerarMarkdown(resultado)
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${conteudo.disciplina_nome || 'conteudo'}_${conteudo.tipo}_${conteudo.id}.md"`
      }
    })
  }
  
  if (format === 'html') {
    const html = gerarHTML(resultado)
    return c.html(html)
  }

  return c.json(resultado)
})
```

### Correção 2: Frontend - Adicionar Loading State

```javascript
// ADICIONAR: public/static/app.js

async function gerarConteudoMetaPorId(metaId) {
  const btn = document.getElementById(`btn-gerar-${metaId}`)
  const originalHTML = btn.innerHTML
  
  try {
    // 🆕 MOSTRAR LOADING
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Gerando...'
    
    // Buscar info da meta
    const metasRes = await axios.get(`/api/metas/hoje/${currentUser.id}`)
    const meta = metasRes.data.find(m => m.id === metaId)
    
    if (!meta) {
      throw new Error('Meta não encontrada')
    }

    // Gerar conteúdo
    const response = await axios.post('/api/conteudo/gerar', {
      meta_id: metaId,
      user_id: currentUser.id,
      disciplina_id: meta.disciplina_id,
      tipo: meta.tipo,
      tempo_minutos: meta.tempo_minutos
    })

    // 🆕 MOSTRAR SUCESSO
    alert('✅ Conteúdo gerado com sucesso!')
    await renderDashboard() // Recarregar
    
  } catch (error) {
    console.error('Erro:', error)
    // 🆕 MOSTRAR ERRO
    alert('❌ Erro ao gerar conteúdo: ' + (error.response?.data?.error || error.message))
    btn.disabled = false
    btn.innerHTML = originalHTML
  }
}
```

### Correção 3: Melhorar Visualização de Disciplinas

```javascript
// VERIFICAR: public/static/app.js - função verDetalhesDisciplina

async function verDetalhesDisciplina(disciplinaId, disciplinaNome) {
  try {
    console.log(`📚 Carregando detalhes de: ${disciplinaNome} (ID: ${disciplinaId})`)
    
    // Buscar conteúdos
    const conteudosRes = await axios.get(`/api/conteudos/usuario/${currentUser.id}`)
    const todosConteudos = conteudosRes.data
    console.log(`✅ Total de conteúdos: ${todosConteudos.length}`)
    
    // Filtrar
    const conteudos = todosConteudos.filter(c => c.disciplina_id === disciplinaId)
    console.log(`✅ Conteúdos da disciplina: ${conteudos.length}`)
    
    if (conteudos.length === 0) {
      alert(`Nenhum conteúdo gerado ainda para ${disciplinaNome}.\n\nGere conteúdo nas metas diárias primeiro!`)
      return
    }
    
    await renderDetalheDisciplina(disciplinaId, disciplinaNome, conteudos)
  } catch (error) {
    console.error('❌ Erro:', error)
    alert('Erro ao carregar conteúdos: ' + (error.response?.data?.error || error.message))
  }
}
```

## 🧪 TESTES NECESSÁRIOS

1. ✅ Backend funcionando (já testado)
2. ⏳ Endpoint retorna topicos_edital
3. ⏳ Frontend lista disciplinas
4. ⏳ Click em "Ver Conteúdos" funciona
5. ⏳ Botão "Gerar Conteúdo" com loading
6. ⏳ Download Markdown com tópicos

## 📝 ORDEM DE IMPLEMENTAÇÃO

1. **Correção 1** - Backend: Adicionar topicos_edital ao endpoint
2. **Correção 2** - Frontend: Loading state no botão
3. **Correção 3** - Frontend: Logs e validações
4. **Rebuild** - npm run build
5. **Teste end-to-end** - Fluxo completo
6. **Commit** - v3.15 com todas as correções
7. **Backup** - ProjectBackup final

## 🎯 RESULTADO ESPERADO

Após implementação:
- ✅ Tópicos do edital aparecem no conteúdo
- ✅ "Minhas Disciplinas" funciona perfeitamente
- ✅ Botões têm feedback visual
- ✅ Mensagens de erro claras
- ✅ Sistema 100% funcional
