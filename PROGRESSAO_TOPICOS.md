# Sistema de Progressão de Tópicos - IAprova

## Data: 2025-12-02
## Versão: v5.7

---

## 🎯 PROBLEMA IDENTIFICADO

**Situação atual:**
- Tópicos estão "jogados de forma esparsa"
- Não há progressão clara (básico → intermediário → avançado)
- Usuário não consegue "fechar o edital" de forma estruturada
- Falta casamento entre tópicos e cronograma de estudos

**Impacto:**
- Usuário não sabe por onde começar
- Sensação de desorganização
- Difícil medir progresso real
- Sem visão clara de cobertura do edital

---

## 💡 SOLUÇÃO PROPOSTA

### **Estrutura de Progressão de Tópicos**

Cada tópico terá uma **ordem de progressão** e **nível de dificuldade**:

```sql
-- Estrutura existente:
CREATE TABLE topicos_edital (
  id INTEGER PRIMARY KEY,
  disciplina_id INTEGER,
  nome TEXT,
  categoria TEXT,      -- Ex: "Fundamentos", "Avançado"
  ordem INTEGER,        -- ✅ JÁ EXISTE! Usar para progressão
  peso INTEGER,         -- Importância (1-5)
  created_at DATETIME
)

-- Adicionar novos campos (OPCIONAL):
ALTER TABLE topicos_edital ADD COLUMN nivel_dificuldade INTEGER DEFAULT 1; -- 1=Básico, 2=Intermediário, 3=Avançado
ALTER TABLE topicos_edital ADD COLUMN prerequisitos TEXT; -- JSON: [topico_id, topico_id]
ALTER TABLE topicos_edital ADD COLUMN carga_horaria_estimada INTEGER; -- minutos
```

---

## 📋 ESTRATÉGIA DE IMPLEMENTAÇÃO

### **FASE 1: Organizar Tópicos Existentes por Ordem**

Atualizar tópicos das disciplinas principais com ordem progressiva:

```sql
-- Exemplo: Direito Constitucional (disciplina_id = 2)
-- Ordem 1-3: Fundamentos
UPDATE topicos_edital SET ordem = 1, categoria = 'Fundamentos' 
WHERE disciplina_id = 2 AND nome = 'Princípios Fundamentais da República';

UPDATE topicos_edital SET ordem = 2, categoria = 'Fundamentos'
WHERE disciplina_id = 2 AND nome = 'Direitos e Garantias Fundamentais';

-- Ordem 4-6: Intermediário
UPDATE topicos_edital SET ordem = 4, categoria = 'Intermediário'
WHERE disciplina_id = 2 AND nome = 'Organização do Estado';

UPDATE topicos_edital SET ordem = 5, categoria = 'Intermediário'
WHERE disciplina_id = 2 AND nome = 'Organização dos Poderes';

-- Ordem 7-10: Avançado
UPDATE topicos_edital SET ordem = 7, categoria = 'Avançado'
WHERE disciplina_id = 2 AND nome = 'Controle de Constitucionalidade';

UPDATE topicos_edital SET ordem = 8, categoria = 'Avançado'
WHERE disciplina_id = 2 AND nome = 'Ações Constitucionais';
```

---

### **FASE 2: Modificar Geração de Metas para Seguir Progressão**

**Lógica atual (aleatória):**
```typescript
// Busca tópicos por menor domínio
SELECT te.* FROM topicos_edital te
ORDER BY COALESCE(utp.nivel_dominio, 0) ASC
LIMIT 3
```

**Nova lógica (progressiva):**
```typescript
// Busca tópicos respeitando ordem de progressão
SELECT te.* FROM topicos_edital te
LEFT JOIN user_topicos_progresso utp ON te.id = utp.topico_id
WHERE te.disciplina_id = ?
  AND (
    -- Tópicos não estudados
    utp.nivel_dominio IS NULL
    OR 
    -- Tópicos com domínio baixo
    utp.nivel_dominio < 7
  )
ORDER BY 
  te.ordem ASC,                    -- PRIORIDADE 1: Ordem progressiva
  COALESCE(utp.nivel_dominio, 0) ASC, -- PRIORIDADE 2: Menor domínio
  te.peso DESC                     -- PRIORIDADE 3: Maior peso
LIMIT 3
```

---

### **FASE 3: Dashboard de Progresso por Categoria**

**Adicionar visualização de cobertura do edital:**

```javascript
// Exemplo de UI:
┌─────────────────────────────────────────────────────────┐
│ 📚 Direito Constitucional                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🟢 Fundamentos            [████████░░] 80% (8/10)       │
│   ✓ Princípios Fundamentais (Domínio: 9/10)            │
│   ✓ Direitos Fundamentais (Domínio: 8/10)              │
│   ⏳ Remédios Constitucionais (Domínio: 3/10)          │
│                                                          │
│ 🟡 Intermediário          [█████░░░░░] 50% (5/10)       │
│   ✓ Organização do Estado (Domínio: 7/10)              │
│   ⏳ Organização dos Poderes (Domínio: 4/10)           │
│   ❌ Federalismo (Não estudado)                         │
│                                                          │
│ 🔴 Avançado               [██░░░░░░░░] 20% (2/10)       │
│   ⏳ Controle de Constitucionalidade (Domínio: 2/10)   │
│   ❌ ADI e ADC (Não estudado)                           │
│   ❌ ADPF (Não estudado)                                │
│                                                          │
│ 📊 Progresso Geral: 50% (15/30 tópicos)                │
└─────────────────────────────────────────────────────────┘
```

---

### **FASE 4: Roteiro de Estudos Progressivo**

**No momento da entrevista, gerar roteiro estruturado:**

```typescript
// Ao finalizar entrevista e criar plano
async function gerarRoteiroDisciplina(disciplina_id, tempo_disponivel) {
  // Buscar todos os tópicos da disciplina
  const topicos = await DB.prepare(`
    SELECT * FROM topicos_edital 
    WHERE disciplina_id = ?
    ORDER BY ordem ASC
  `).bind(disciplina_id).all()
  
  // Agrupar por categoria
  const fundamentos = topicos.filter(t => t.ordem <= 10)
  const intermediarios = topicos.filter(t => t.ordem > 10 && t.ordem <= 20)
  const avancados = topicos.filter(t => t.ordem > 20)
  
  // Distribuir ao longo do tempo
  const roteiro = {
    semana_1_2: fundamentos,        // 20% do tempo
    semana_3_5: intermediarios,     // 40% do tempo
    semana_6_8: avancados,          // 30% do tempo
    semana_9_10: revisao_geral      // 10% revisão
  }
  
  return roteiro
}
```

---

## 🎯 EXEMPLO PRÁTICO: ENFERMAGEM

### **Tópicos Organizados por Progressão:**

**🟢 Nível 1 - Fundamentos (ordem 1-10):**
1. Fundamentos de Enfermagem
2. Semiologia e Semiotécnica
3. Anatomia Básica
4. Fisiologia Básica
5. Ética e Legislação
6. SAE - Sistematização da Assistência
7. Biossegurança
8. Controle de Infecção
9. Administração de Medicamentos
10. Sinais Vitais

**🟡 Nível 2 - Intermediário (ordem 11-20):**
11. Enfermagem Clínica
12. Enfermagem Cirúrgica
13. Curativos e Feridas
14. Saúde da Mulher
15. Saúde da Criança
16. Saúde do Idoso
17. Doenças Crônicas
18. Farmacologia Aplicada
19. Exames Laboratoriais
20. Cuidados Intensivos

**🔴 Nível 3 - Avançado (ordem 21-30):**
21. Urgência e Emergência
22. Suporte Avançado de Vida
23. Administração em Enfermagem
24. Gestão de Equipes
25. Auditoria em Saúde
26. Segurança do Paciente
27. Políticas de Saúde Pública
28. Epidemiologia Aplicada
29. Educação em Saúde
30. Pesquisa em Enfermagem

---

## 📊 BENEFÍCIOS DA PROGRESSÃO

| Benefício | Impacto |
|-----------|---------|
| **Clareza de caminho** | Usuário sabe exatamente por onde começar |
| **Sensação de progresso** | Vê evolução clara: Básico → Avançado |
| **Cobertura do edital** | Dashboard mostra % de cobertura |
| **Motivação** | Gamificação natural (desbloqueio de níveis) |
| **Eficiência** | Estuda na ordem correta (base antes de avançado) |
| **Confiança** | Sabe que está "fechando o edital" |

---

## 🚀 PRÓXIMOS PASSOS

### **Implementação Imediata (v5.7):**
1. ✅ Migration para adicionar `nivel_dificuldade` aos tópicos
2. ✅ Atualizar ordem dos tópicos existentes (top 10 disciplinas)
3. ✅ Modificar query de geração de metas (ORDER BY ordem ASC)
4. ✅ Adicionar dashboard de progressão por categoria

### **Implementação Futura (v6.0):**
1. Sistema de pré-requisitos (tópico A antes de tópico B)
2. Estimativa de carga horária por tópico
3. Roteiro personalizado baseado no prazo do concurso
4. Algoritmo de revisão espaçada por tópico

---

## 🎨 MOCKUP DE UI

```
╔══════════════════════════════════════════════════════════╗
║  📚 Meu Progresso - Direito Constitucional              ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🎯 Próximo Tópico Recomendado:                         ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ 📖 Organização dos Poderes                         │ ║
║  │ 🟡 Nível: Intermediário | Ordem: 5/30             │ ║
║  │ ⏱️  Tempo estimado: 45 minutos                     │ ║
║  │ 📊 Domínio atual: 4/10                            │ ║
║  │ [Gerar Conteúdo] [Marcar como Estudado]           │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  📈 Visão Geral de Cobertura:                           ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ 🟢 Fundamentos:    [████████░░] 80%  (8/10)      │ ║
║  │ 🟡 Intermediário:  [████░░░░░░] 40%  (4/10)      │ ║
║  │ 🔴 Avançado:       [█░░░░░░░░░] 10%  (1/10)      │ ║
║  │                                                    │ ║
║  │ 📊 TOTAL:          [████░░░░░░] 43% (13/30)      │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## ✅ CONCLUSÃO

A implementação de um **sistema de progressão de tópicos** transformará o IAprova de uma ferramenta de estudos genérica em um **sistema estruturado de preparação para concursos**, onde o usuário tem:

1. **Caminho claro**: Sabe por onde começar e como progredir
2. **Visibilidade**: Vê seu progresso real no edital
3. **Motivação**: Sensação de estar "fechando o conteúdo"
4. **Eficiência**: Estuda na ordem pedagógica correta

Este é o diferencial que faltava para tornar o sistema verdadeiramente eficaz! 🚀
