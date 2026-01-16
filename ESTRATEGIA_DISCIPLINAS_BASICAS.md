# Estratégia de Disciplinas Básicas + Personalizadas - IAprova

## Data: 2025-12-02
## Versão: v5.6

---

## 🎯 PROBLEMAS IDENTIFICADOS

### 1️⃣ **Disciplinas básicas estão em áreas específicas**

**Situação atual:**
- ❌ Português está em `area: tribunais` (id: 21)
- ❌ Raciocínio Lógico está em `area: policial` (id: 13)
- ❌ Informática está em `area: policial` (id: 14)
- ✅ Redação está em `area: geral` (id: 35) - CORRETO

**Impacto:**
- Enfermeiro não vê Português/RL na entrevista
- Auditor Fiscal não vê Informática
- Apenas concursos policiais veem essas disciplinas básicas

---

### 2️⃣ **Falta opção para adicionar disciplinas personalizadas**

**Situação atual:**
- Usuário só pode escolher da lista pré-existente
- Não há campo para incluir "Legislação Específica do SESAPI" ou "Conhecimentos sobre o Piauí"

---

## 💡 ESTRATÉGIA DE SOLUÇÃO

### FASE 1: Criar categoria "básico" e reorganizar disciplinas

```sql
-- 1. Adicionar nova área "basico" para disciplinas universais
-- 2. Mover disciplinas que aparecem em TODOS os concursos

-- Disciplinas BÁSICAS (aparecem em 90%+ dos concursos):
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Português';          -- id: 21
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Raciocínio Lógico'; -- id: 13
UPDATE disciplinas SET area = 'basico' WHERE nome = 'Informática';       -- id: 14

-- Disciplinas GERAIS (aparecem em muitos concursos):
-- Redação (id: 35) - já está em 'geral' ✅
-- Inglês (id: 34) - já está em 'geral' ✅
-- Ética e Conduta (id: 74) - já está em 'geral' ✅
```

**Benefício:**
- ✅ Disciplinas básicas aparecem para TODAS as áreas
- ✅ Mantém disciplinas específicas de cada área

---

### FASE 2: Modificar lógica da entrevista

**No Step 3 (seleção de disciplinas):**

```javascript
// ANTES:
const disciplinasDisponiveis = disciplinas.filter(d => d.area === areaGeral);

// DEPOIS:
const disciplinasBasicas = disciplinas.filter(d => d.area === 'basico');
const disciplinasGerais = disciplinas.filter(d => d.area === 'geral');
const disciplinasArea = disciplinas.filter(d => d.area === areaGeral);

// Combinar: BÁSICAS + GERAIS + ESPECÍFICAS DA ÁREA
const disciplinasDisponiveis = [
  ...disciplinasBasicas,    // Português, RL, Informática (SEMPRE)
  ...disciplinasGerais,     // Redação, Inglês, Ética (OPCIONAL)
  ...disciplinasArea        // Enfermagem, Saúde Pública, etc.
];
```

---

### FASE 3: Adicionar campo de disciplinas personalizadas

**Interface no Step 3:**

```html
<!-- Após lista de disciplinas existentes -->
<div class="bg-blue-50 p-4 rounded-lg mt-6">
  <h4 class="font-semibold text-blue-900 mb-2">
    📚 Adicionar Disciplinas Personalizadas
  </h4>
  <p class="text-sm text-blue-700 mb-3">
    Seu concurso tem disciplinas específicas não listadas acima? 
    Adicione-as aqui (ex: "Conhecimentos sobre o Piauí", "Legislação Municipal")
  </p>
  
  <div class="flex gap-2 mb-2">
    <input 
      type="text" 
      id="nova-disciplina-input"
      placeholder="Nome da disciplina personalizada"
      class="flex-1 border rounded px-3 py-2"
    >
    <button 
      onclick="adicionarDisciplinaCustom()"
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      ➕ Adicionar
    </button>
  </div>
  
  <!-- Lista de disciplinas personalizadas -->
  <div id="disciplinas-custom-list"></div>
</div>
```

**Lógica JavaScript:**

```javascript
let disciplinasCustom = [];

function adicionarDisciplinaCustom() {
  const input = document.getElementById('nova-disciplina-input');
  const nome = input.value.trim();
  
  if (!nome) {
    showToast('Digite o nome da disciplina', 'warning');
    return;
  }
  
  // Adicionar à lista temporária
  disciplinasCustom.push({
    nome: nome,
    custom: true,
    area: interviewData.area_geral || 'especifica',
    ja_estudou: false,
    nivel_atual: 0,
    dificuldade: 0
  });
  
  renderDisciplinasCustomList();
  input.value = '';
  showToast('Disciplina adicionada!', 'success');
}

function renderDisciplinasCustomList() {
  const container = document.getElementById('disciplinas-custom-list');
  container.innerHTML = disciplinasCustom.map((d, idx) => `
    <div class="flex items-center justify-between bg-white p-2 rounded mb-2">
      <span class="text-sm font-medium">${d.nome}</span>
      <button 
        onclick="removerDisciplinaCustom(${idx})"
        class="text-red-600 hover:text-red-800 text-sm"
      >
        ❌ Remover
      </button>
    </div>
  `).join('');
}
```

**Backend - Salvar disciplinas personalizadas:**

```typescript
// Em /api/interviews (linha ~1656)
app.post('/api/interviews', async (c) => {
  const { disciplinas, disciplinasCustom } = await c.req.json();
  
  // 1. Criar disciplinas personalizadas no banco
  if (disciplinasCustom && disciplinasCustom.length > 0) {
    for (const disc of disciplinasCustom) {
      // Verificar se já existe
      const existe = await env.DB.prepare(`
        SELECT id FROM disciplinas WHERE nome = ? AND area = ?
      `).bind(disc.nome, disc.area).first();
      
      if (!existe) {
        // Criar nova disciplina
        const result = await env.DB.prepare(`
          INSERT INTO disciplinas (nome, area, descricao)
          VALUES (?, ?, ?)
        `).bind(
          disc.nome, 
          disc.area,
          'Disciplina personalizada criada pelo usuário'
        ).run();
        
        disc.id = result.meta.last_row_id; // Usar novo ID
      } else {
        disc.id = existe.id; // Usar ID existente
      }
    }
  }
  
  // 2. Combinar disciplinas padrão + personalizadas
  const todasDisciplinas = [...disciplinas, ...(disciplinasCustom || [])];
  
  // 3. Salvar normalmente
  for (const disc of todasDisciplinas) {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO user_disciplinas 
      (user_id, disciplina_id, ja_estudou, nivel_atual, dificuldade)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user_id, disc.id, 
      disc.ja_estudou ? 1 : 0,
      disc.nivel_atual || 0,
      disc.dificuldade || 0
    ).run();
  }
});
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Fase 1: Reorganizar Disciplinas Básicas
- [ ] Criar migration para área "basico"
- [ ] Mover Português, RL, Informática para "basico"
- [ ] Testar queries de filtragem

### ✅ Fase 2: Modificar Entrevista
- [ ] Atualizar `renderEntrevistaStep3()` para combinar básicas + gerais + área
- [ ] Ajustar filtro de 15 disciplinas (básicas sempre incluídas)
- [ ] Testar com diferentes áreas (saúde, policial, fiscal)

### ✅ Fase 3: Disciplinas Personalizadas
- [ ] Adicionar UI de "Adicionar Disciplina Custom"
- [ ] Implementar lógica frontend de adicionar/remover
- [ ] Modificar backend `/api/interviews` para criar disciplinas dinâmicas
- [ ] Testar fluxo completo

---

## 🎯 RESULTADO ESPERADO

### Exemplo: Enfermeiro SESAPI

**Disciplinas exibidas na entrevista:**

```
🔵 BÁSICAS (sempre aparecem):
  ✓ Português
  ✓ Raciocínio Lógico
  ✓ Informática

🟢 GERAIS (opcionais comuns):
  ✓ Redação
  ✓ Inglês
  ✓ Ética e Conduta

🟠 ÁREA SAÚDE (específicas):
  ✓ Enfermagem
  ✓ Saúde Pública
  ✓ Legislação do SUS
  ✓ Ética em Enfermagem
  ✓ Anatomia e Fisiologia
  ✓ Farmacologia
  ... (14 disciplinas de saúde)

➕ PERSONALIZADAS (criadas pelo usuário):
  ✓ Conhecimentos sobre o Piauí
  ✓ Legislação Municipal de Teresina
  ✓ Políticas de Saúde do SESAPI
```

**Total:** ~25-30 disciplinas disponíveis
**Seleção:** Limite de 15 mais relevantes (com contador visual)

---

## 💪 BENEFÍCIOS

1. ✅ **Disciplinas básicas em todos os concursos**
   - Português, RL, Informática sempre disponíveis
   - Não importa a área escolhida

2. ✅ **Flexibilidade total**
   - Usuário pode adicionar disciplinas específicas do edital
   - Sistema aprende com disciplinas customizadas mais usadas

3. ✅ **Mantém organização**
   - Hierarquia: básicas → gerais → específicas → personalizadas
   - Limite de 15 disciplinas continua funcionando

4. ✅ **Escalabilidade**
   - Disciplinas personalizadas ficam no banco
   - Outros usuários podem reutilizar se necessário
