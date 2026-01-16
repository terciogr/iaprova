// Tipos para o banco de dados e API

export type Bindings = {
  DB: D1Database;
  EDITAIS: R2Bucket;
  GEMINI_API_KEY?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Interview {
  id: number;
  user_id: number;
  objetivo_tipo: 'concurso_especifico' | 'area_geral';
  concurso_nome?: string;
  area_geral?: string;
  tempo_disponivel_dia: number;
  experiencia: 'iniciante' | 'intermediario' | 'avancado';
  ja_estudou_antes: number;
  prazo_prova?: string;
  reprovacoes: number;
  created_at: string;
}

export interface Disciplina {
  id: number;
  nome: string;
  area: string;
  descricao?: string;
}

export interface UserDisciplina {
  id: number;
  user_id: number;
  disciplina_id: number;
  ja_estudou: number;
  nivel_atual: number;
  dificuldade: number;
  created_at: string;
  updated_at: string;
}

export interface PlanoEstudo {
  id: number;
  user_id: number;
  interview_id: number;
  diagnostico: string;
  mapa_prioridades: string;
  ativo: number;
  created_at: string;
}

export interface CicloEstudo {
  id: number;
  plano_id: number;
  disciplina_id: number;
  tipo: 'teoria' | 'exercicios' | 'revisao';
  dia_semana: number;
  tempo_minutos: number;
  ordem: number;
  created_at: string;
}

export interface MetaDiaria {
  id: number;
  user_id: number;
  plano_id: number;
  data: string;
  ciclo_id: number;
  concluida: number;
  tempo_real_minutos: number;
  created_at: string;
}

export interface Material {
  id: number;
  user_id: number;
  disciplina_id: number;
  titulo: string;
  arquivo_url: string;
  tipo: string;
  paginas_total: number;
  paginas_lidas: number;
  created_at: string;
}

export interface Desempenho {
  id: number;
  user_id: number;
  disciplina_id: number;
  nivel: number;
  data_avaliacao: string;
  tipo_avaliacao?: string;
  created_at: string;
}

export interface Revisao {
  id: number;
  user_id: number;
  disciplina_id: number;
  conteudo: string;
  data_proxima_revisao: string;
  frequencia?: string;
  concluida: number;
  resultado?: number;
  created_at: string;
}

export interface Flashcard {
  id: number;
  user_id: number;
  disciplina_id: number;
  material_id?: number;
  pergunta: string;
  resposta: string;
  dificuldade: number;
  proxima_revisao?: string;
  acertos: number;
  erros: number;
  created_at: string;
}

// Tipos para requisições da API
export interface InterviewRequest {
  user_id: number;
  objetivo_tipo: 'concurso_especifico' | 'area_geral';
  concurso_nome?: string;
  area_geral?: string;
  tempo_disponivel_dia: number;
  experiencia: 'iniciante' | 'intermediario' | 'avancado';
  ja_estudou_antes: boolean;
  prazo_prova?: string;
  reprovacoes: number;
  disciplinas: Array<{
    disciplina_id: number;
    ja_estudou: boolean;
    nivel_atual: number;
    dificuldade: boolean;
  }>;
}

export interface DiagnosticoResponse {
  nivel_geral: string;
  prioridades: Array<{
    disciplina_id: number;
    nome: string;
    peso: number;
    razao: string;
  }>;
  lacunas: string[];
  recomendacao: string;
}
