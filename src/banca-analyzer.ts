// Analisador de Banca Organizadora para IAprova

export interface BancaInfo {
  nome: string
  caracteristicas: {
    tipo: string
    complexidade: string
    interpretacao: string
    pegadinhas?: string
    interdisciplinar?: boolean
    atualidades?: boolean
    pratica?: boolean
    tradicional?: boolean
    regional?: boolean
  }
  dicas: string
}

// Lista de bancas e suas variações de nome
const BANCAS_CONHECIDAS: Record<string, string[]> = {
  'CEBRASPE': ['cebraspe', 'cespe', 'unb', 'centro brasileiro'],
  'FCC': ['fcc', 'fundação carlos chagas', 'carlos chagas'],
  'FGV': ['fgv', 'fundação getulio vargas', 'getúlio vargas', 'getulio vargas'],
  'VUNESP': ['vunesp', 'fundação vunesp', 'unesp'],
  'IDECAN': ['idecan', 'instituto idecan'],
  'IBFC': ['ibfc', 'instituto brasileiro de formação'],
  'QUADRIX': ['quadrix', 'instituto quadrix'],
  'AOCP': ['aocp', 'instituto aocp', 'assessoria em organização'],
  'COMPERVE': ['comperve', 'ufrn'],
  'FUNDATEC': ['fundatec', 'fundação fundatec'],
  'CONSULPLAN': ['consulplan', 'consultoria e planejamento'],
  'IADES': ['iades', 'instituto americano'],
  'NC-UFPR': ['nc-ufpr', 'núcleo de concursos ufpr', 'nucleo de concursos ufpr', 'ufpr'],
  'COPS-UEL': ['cops-uel', 'cops uel', 'uel']
}

// Características específicas de cada banca
const CARACTERISTICAS_BANCAS: Record<string, BancaInfo> = {
  'CEBRASPE': {
    nome: 'CEBRASPE',
    caracteristicas: {
      tipo: 'certo_errado',
      complexidade: 'alta',
      interpretacao: 'muito_alta',
      pegadinhas: 'frequentes',
      interdisciplinar: true
    },
    dicas: 'Questões Certo ou Errado com pegadinhas. Foco extremo em interpretação, detalhes e exceções. Cuidado com palavras absolutas (sempre, nunca, todos).'
  },
  'FCC': {
    nome: 'FCC',
    caracteristicas: {
      tipo: 'multipla_escolha',
      complexidade: 'media',
      interpretacao: 'media',
      tradicional: true
    },
    dicas: 'Questões tradicionais de múltipla escolha. Cobra letra da lei, menos interpretação. Foco em decorar artigos e súmulas.'
  },
  'FGV': {
    nome: 'FGV',
    caracteristicas: {
      tipo: 'multipla_escolha',
      complexidade: 'alta',
      interpretacao: 'alta',
      atualidades: true,
      pratica: true
    },
    dicas: 'Questões práticas e atualizadas. Interpretação moderna, casos práticos, jurisprudência recente. Atualidades muito importantes.'
  },
  'VUNESP': {
    nome: 'VUNESP',
    caracteristicas: {
      tipo: 'multipla_escolha',
      complexidade: 'media',
      interpretacao: 'media',
      tradicional: true
    },
    dicas: 'Questões detalhistas, cobra exceções e pegadinhas em detalhes. Foco em memorização de conceitos e definições exatas.'
  },
  'IDECAN': {
    nome: 'IDECAN',
    caracteristicas: {
      tipo: 'multipla_escolha',
      complexidade: 'media_baixa',
      interpretacao: 'baixa'
    },
    dicas: 'Questões mais diretas e simples. Foco em conceitos básicos, menos pegadinhas. Boa para iniciantes.'
  }
}

/**
 * Identifica a banca organizadora a partir do texto do edital
 */
export function identificarBanca(textoEdital: string): string | null {
  const textoLower = textoEdital.toLowerCase()
  
  // Procurar por padrões comuns de identificação da banca
  const padroes = [
    /realização[:\s]+([^.\n]+)/i,
    /banca[:\s]+([^.\n]+)/i,
    /organizadora[:\s]+([^.\n]+)/i,
    /execução[:\s]+([^.\n]+)/i,
    /responsável[:\s]+([^.\n]+)/i,
    /instituição[:\s]+([^.\n]+)/i
  ]
  
  // Primeiro, tentar identificar por padrões
  for (const padrao of padroes) {
    const match = textoEdital.match(padrao)
    if (match && match[1]) {
      const bancaTexto = match[1].toLowerCase().trim()
      
      // Verificar se corresponde a alguma banca conhecida
      for (const [banca, variacoes] of Object.entries(BANCAS_CONHECIDAS)) {
        for (const variacao of variacoes) {
          if (bancaTexto.includes(variacao)) {
            console.log(`✅ Banca identificada por padrão: ${banca}`)
            return banca
          }
        }
      }
    }
  }
  
  // Se não encontrou por padrão, buscar diretamente no texto
  for (const [banca, variacoes] of Object.entries(BANCAS_CONHECIDAS)) {
    for (const variacao of variacoes) {
      if (textoLower.includes(variacao)) {
        console.log(`✅ Banca identificada por busca direta: ${banca}`)
        return banca
      }
    }
  }
  
  console.log('⚠️ Banca não identificada automaticamente')
  return null
}

/**
 * Retorna as características da banca
 */
export function getCaracteristicasBanca(nomeBanca: string): BancaInfo | null {
  return CARACTERISTICAS_BANCAS[nomeBanca.toUpperCase()] || null
}

/**
 * Ajusta o prompt de geração de conteúdo baseado na banca
 */
export function ajustarPromptParaBanca(promptBase: string, banca: string | null): string {
  if (!banca) return promptBase
  
  const info = getCaracteristicasBanca(banca)
  if (!info) return promptBase
  
  let ajustes = '\n\n### IMPORTANTE - AJUSTAR CONTEÚDO PARA A BANCA ' + banca + ':\n'
  
  // Adicionar características específicas
  if (info.caracteristicas.tipo === 'certo_errado') {
    ajustes += '- Criar questões no formato CERTO ou ERRADO\n'
    ajustes += '- Incluir pegadinhas e detalhes sutis\n'
    ajustes += '- Usar palavras absolutas com cuidado (sempre, nunca, todos)\n'
    ajustes += '- Criar afirmações que parecem corretas mas têm detalhes errados\n'
  } else {
    ajustes += '- Criar questões de múltipla escolha com 5 alternativas\n'
    ajustes += '- Apenas uma alternativa correta\n'
  }
  
  if (info.caracteristicas.interpretacao === 'muito_alta') {
    ajustes += '- Foco EXTREMO em interpretação de texto\n'
    ajustes += '- Questões com enunciados longos e complexos\n'
    ajustes += '- Análise de múltiplos aspectos na mesma questão\n'
  } else if (info.caracteristicas.interpretacao === 'alta') {
    ajustes += '- Ênfase em interpretação e análise crítica\n'
    ajustes += '- Casos práticos e situações-problema\n'
  } else {
    ajustes += '- Questões mais diretas e objetivas\n'
    ajustes += '- Foco em conceitos e definições\n'
  }
  
  if (info.caracteristicas.interdisciplinar) {
    ajustes += '- Incluir questões interdisciplinares\n'
    ajustes += '- Relacionar diferentes áreas do conhecimento\n'
  }
  
  if (info.caracteristicas.atualidades) {
    ajustes += '- Incluir jurisprudência e legislação recente\n'
    ajustes += '- Abordar temas atuais e mudanças recentes\n'
  }
  
  if (info.caracteristicas.pegadinhas === 'frequentes') {
    ajustes += '- Adicionar pegadinhas sutis\n'
    ajustes += '- Atenção a exceções e casos especiais\n'
  }
  
  ajustes += '\nDICAS ESPECÍFICAS: ' + info.dicas + '\n'
  
  return promptBase + ajustes
}

/**
 * Gera exemplos de questões no estilo da banca
 */
export function gerarExemploQuestaoBanca(banca: string): string {
  const info = getCaracteristicasBanca(banca)
  if (!info) return ''
  
  if (info.caracteristicas.tipo === 'certo_errado') {
    return `
EXEMPLO DE QUESTÃO ESTILO ${banca}:

Julgue o item a seguir como CERTO ou ERRADO:

"Todos os servidores públicos federais, sem exceção, têm direito à estabilidade após três anos de efetivo exercício, sendo vedada a demissão, salvo por sentença judicial transitada em julgado."

( ) CERTO  ( ) ERRADO

Gabarito: ERRADO
Comentário: A afirmação contém imprecisões. Primeiro, nem todos os servidores têm direito à estabilidade (cargos em comissão não têm). Segundo, existem outras hipóteses de perda do cargo além de sentença judicial (processo administrativo, avaliação de desempenho insuficiente).
`
  } else {
    return `
EXEMPLO DE QUESTÃO ESTILO ${banca}:

Sobre os princípios da Administração Pública, assinale a alternativa correta:

a) O princípio da legalidade impede qualquer ação discricionária do administrador público.
b) A publicidade é princípio absoluto, não admitindo exceções em nenhuma hipótese.
c) A eficiência foi incluída como princípio constitucional expresso pela EC 19/1998.
d) A moralidade administrativa se confunde com a moralidade comum.
e) A impessoalidade veda toda e qualquer forma de promoção pessoal.

Gabarito: C
Comentário: A eficiência foi de fato incluída pela Emenda Constitucional 19/1998. As demais alternativas contêm erros conceituais.
`
  }
}

export default {
  identificarBanca,
  getCaracteristicasBanca,
  ajustarPromptParaBanca,
  gerarExemploQuestaoBanca
}