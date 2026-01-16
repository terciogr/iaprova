# 📚 Melhorias no Sistema de Metas e Tópicos

## 🎯 Objetivo
Garantir que as metas diárias cubram **TODOS os tópicos** de cada disciplina ao longo do tempo, não apenas repetir as mesmas disciplinas.

## 📊 Situação Atual

### Como Funciona Hoje:
1. Ciclos são criados por **disciplina** (não por tópico)
2. Cada dia tem 3-5 disciplinas
3. Mesmas disciplinas se repetem ciclicamente
4. Tópicos são sugeridos, mas não há garantia de cobertura completa

**Exemplo Atual**:
```
Dia 1: Direito Constitucional (30min) + Português (45min) + Raciocínio (30min)
Dia 2: Direito Administrativo (30min) + Português (45min) + Raciocínio (30min)
Dia 3: Direito Constitucional (30min) + Português (45min) + Raciocínio (30min)
...
```

**Problema**: Direito Constitucional tem 10 tópicos, mas sempre estuda aleatoriamente.

---

## 🚀 Nova Estratégia Proposta

### Abordagem: Sistema de Rotação de Tópicos

#### 1. Estrutura de Dados
```typescript
interface CicloEstudoTema {
  id: number
  plano_id: number
  disciplina_id: number
  topico_id: number | null  // NULL = tópico genérico
  tipo: 'teoria' | 'exercicios' | 'revisao'
  dia_semana: number
  tempo_minutos: number
  ordem: number
  ciclo_numero: number  // Qual ciclo de rotação (1, 2, 3...)
  prioridade: number    // Baseado em peso e domínio
}
```

#### 2. Lógica de Distribuição

**Fase 1: Mapear Todos os Tópicos**
```sql
SELECT 
  d.id as disciplina_id,
  d.nome as disciplina_nome,
  COUNT(te.id) as total_topicos,
  AVG(COALESCE(utp.nivel_dominio, 0)) as dominio_medio
FROM disciplinas d
JOIN topicos_edital te ON te.disciplina_id = d.id
LEFT JOIN user_topicos_progresso utp ON utp.topico_id = te.id
WHERE d.id IN (lista_user_disciplinas)
GROUP BY d.id
```

**Fase 2: Criar Ciclos Rotativos**
- Ciclo 1: Tópicos 1-3 de cada disciplina
- Ciclo 2: Tópicos 4-6 de cada disciplina
- Ciclo 3: Tópicos 7-9 de cada disciplina
- ...

**Fase 3: Distribuir por Dia**
```
Semana 1:
  Seg: Direito Const (Tópico 1) + Português (Tópico 1) + Raciocínio (Tópico 1)
  Ter: Direito Admin (Tópico 1) + Português (Tópico 2) + Informática (Tópico 1)
  Qua: Direito Const (Tópico 2) + Matemática (Tópico 1) + Raciocínio (Tópico 2)
  ...

Semana 2:
  Seg: Direito Const (Tópico 3) + Português (Tópico 3) + Raciocínio (Tópico 3)
  ...
```

#### 3. Algoritmo de Geração

```typescript
async function gerarCiclosComTopicos(
  DB, 
  plano_id, 
  disciplinas, 
  tempoDiario
) {
  // 1. Para cada disciplina, buscar TODOS os tópicos
  for (const disc of disciplinas) {
    const topicos = await buscarTopicosOrdenados(DB, disc.disciplina_id, user_id)
    
    // 2. Dividir tópicos em chunks (3 tópicos por sessão)
    const chunks = dividirEmChunks(topicos, 3)
    
    // 3. Distribuir chunks pelos dias da semana
    for (let i = 0; i < chunks.length; i++) {
      const dia = i % 7
      const chunk = chunks[i]
      
      // Criar meta para esse conjunto de tópicos
      await criarMetaComTopicos(DB, plano_id, disc, chunk, dia)
    }
  }
}

function buscarTopicosOrdenados(DB, disciplina_id, user_id) {
  return DB.prepare(`
    SELECT te.*, COALESCE(utp.nivel_dominio, 0) as dominio
    FROM topicos_edital te
    LEFT JOIN user_topicos_progresso utp 
      ON te.id = utp.topico_id AND utp.user_id = ?
    WHERE te.disciplina_id = ?
    ORDER BY 
      dominio ASC,        -- Menos dominados primeiro
      te.peso DESC,       -- Mais importantes depois
      te.ordem ASC        -- Ordem do edital
  `).bind(user_id, disciplina_id).all()
}
```

---

## 📈 Vantagens da Nova Abordagem

### ✅ Cobertura Completa
- **Antes**: Estuda "Direito Constitucional" genericamente
- **Depois**: Estuda "Princípios Fundamentais", depois "Direitos Fundamentais", etc.

### ✅ Progressão Visível
- Usuário vê exatamente quantos tópicos já cobriu
- Sabe quantos faltam em cada disciplina
- Pode acompanhar progresso por tópico

### ✅ Evita Repetição Desnecessária
- Não fica estudando sempre os mesmos conceitos
- Sistema rotaciona automaticamente

### ✅ Personalização Real
- Prioriza tópicos com menor domínio
- Respeita peso dos tópicos no edital
- Adapta conforme progresso do usuário

---

## 🔧 Implementação Gradual

### Fase 1: Backend (Atual)
1. ✅ Adicionar `topicos_sugeridos` nas metas (já implementado)
2. ✅ Gerar conteúdo focado em tópicos (já implementado)
3. ⏳ Modificar `gerarCiclosEstudo` para incluir tópicos específicos
4. ⏳ Garantir rotação de tópicos ao longo do tempo

### Fase 2: Tracking
1. ⏳ Registrar quando cada tópico foi estudado
2. ⏳ Atualizar `user_topicos_progresso` após conclusão de meta
3. ⏳ Dashboard mostrando % de tópicos cobertos por disciplina

### Fase 3: Adaptação Inteligente
1. ⏳ Se usuário domina tópico (nível 8+), reduzir frequência
2. ⏳ Se usuário tem dificuldade, aumentar frequência
3. ⏳ Revisões programadas baseadas em curva de esquecimento

---

## 📊 Exemplo Prático

### Disciplina: Direito Constitucional (10 tópicos)

**Tópicos**:
1. Princípios Fundamentais (Peso: 3, Domínio: 2)
2. Direitos Fundamentais (Peso: 5, Domínio: 0)
3. Organização do Estado (Peso: 4, Domínio: 1)
4. Poder Legislativo (Peso: 3, Domínio: 0)
5. Poder Executivo (Peso: 3, Domínio: 3)
6. Poder Judiciário (Peso: 4, Domínio: 0)
7. Controle de Constitucionalidade (Peso: 5, Domínio: 0)
8. Defesa do Estado (Peso: 2, Domínio: 0)
9. Ordem Econômica (Peso: 2, Domínio: 0)
10. Ordem Social (Peso: 2, Domínio: 0)

**Priorização**: Ordenar por domínio ASC + peso DESC
```
1. Direitos Fundamentais (Domínio: 0, Peso: 5) ← Mais importante não estudado
2. Controle de Constitucionalidade (Domínio: 0, Peso: 5)
3. Poder Judiciário (Domínio: 0, Peso: 4)
4. Poder Legislativo (Domínio: 0, Peso: 3)
5. Organização do Estado (Domínio: 1, Peso: 4)
6. Princípios Fundamentais (Domínio: 2, Peso: 3)
...
```

**Distribuição no Cronograma** (3 tópicos por sessão):
```
Semana 1 - Seg: Dir. Const - Tópicos [1, 2, 3]
Semana 2 - Seg: Dir. Const - Tópicos [4, 5, 6]
Semana 3 - Seg: Dir. Const - Tópicos [7, 8, 9]
Semana 4 - Seg: Dir. Const - Tópico [10] + Revisão [1, 2]
```

---

## 🚧 Status Atual

- ✅ Tópicos sugeridos exibidos nas metas
- ✅ Conteúdo gerado focado em tópicos
- ⏳ **Ciclos ainda não rotacionam tópicos sistematicamente**
- ⏳ **Falta garantia de cobertura completa**

## 🎯 Próximos Passos

1. **Modificar tabela `ciclos_estudo`**: Adicionar `topico_id`
2. **Refatorar `gerarCiclosEstudo()`**: Implementar rotação de tópicos
3. **Criar função `distribuirTopicosNoCiclo()`**: Lógica de chunks
4. **Atualizar UI**: Mostrar progresso de cobertura de tópicos
5. **Testing**: Validar que todos os tópicos são eventualmente cobertos

---

**Data**: 2024-12-02  
**Versão**: v5.3  
**Prioridade**: ALTA
