#!/usr/bin/env python3
"""
Script para processar o dataset de concursos públicos e gerar migration SQL
"""

import csv
import json
from collections import defaultdict

# Mapeamento de ÁREA do CSV para 'area' do banco de dados
AREA_MAP = {
    'TRIBUNAL': 'tribunais',
    'FISCAL': 'fiscal',
    'SAÚDE': 'saude',
    'EDUCAÇÃO': 'educacao',
    'ADMINISTRATIVO': 'administrativo',
    'POLICIAL': 'policial'
}

# Mapeamento de FREQUÊNCIA para nivel_dificuldade e carga_horaria
FREQUENCIA_MAP = {
    'Frequente': {'nivel': 3, 'carga': 4},      # Avançado, 4h
    'Comum': {'nivel': 2, 'carga': 3},          # Intermediário, 3h
    'Ocasional': {'nivel': 1, 'carga': 2},      # Básico, 2h
    'Raro': {'nivel': 1, 'carga': 1}            # Básico, 1h
}

def processar_dataset(csv_path):
    """Processa o CSV e retorna estrutura organizada"""
    
    disciplinas = {}  # {nome: {area, descricao, topicos: []}}
    topicos_por_disciplina = defaultdict(list)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            area_csv = row['ÁREA']
            disciplina_nome = row['DISCIPLINA']
            topico_nome = row['TÓPICO']
            nivel_superior = row['NÍVEL_SUPERIOR_INDICADO']
            frequencia = row['FREQUÊNCIA_EDITAIS']
            
            # Mapear área
            area_db = AREA_MAP.get(area_csv, 'geral')
            
            # Criar chave única para disciplina (nome + área)
            disc_key = f"{disciplina_nome}_{area_db}"
            
            # Adicionar disciplina se não existe
            if disc_key not in disciplinas:
                # Gerar descrição baseada na área e nível
                if nivel_superior == 'Sim':
                    desc = f"{disciplina_nome} - Nível Superior ({area_csv})"
                else:
                    desc = f"{disciplina_nome} - Ensino Médio/Técnico ({area_csv})"
                
                disciplinas[disc_key] = {
                    'nome': disciplina_nome,
                    'area': area_db,
                    'descricao': desc,
                    'topicos': []
                }
            
            # Mapear frequência para dificuldade e carga horária
            freq_info = FREQUENCIA_MAP.get(frequencia, {'nivel': 2, 'carga': 2})
            
            # Adicionar tópico
            topico = {
                'nome': topico_nome,
                'categoria': area_csv,
                'nivel_dificuldade': freq_info['nivel'],
                'carga_horaria_estimada': freq_info['carga'],
                'peso': 3 if frequencia == 'Frequente' else 2 if frequencia == 'Comum' else 1
            }
            
            disciplinas[disc_key]['topicos'].append(topico)
    
    return disciplinas

def gerar_sql(disciplinas):
    """Gera SQL para inserir disciplinas e tópicos"""
    
    sql_lines = []
    sql_lines.append("-- Migration gerada automaticamente do dataset de concursos públicos")
    sql_lines.append("-- Total de disciplinas: " + str(len(disciplinas)))
    sql_lines.append("")
    
    # Contador de tópicos
    total_topicos = sum(len(d['topicos']) for d in disciplinas.values())
    sql_lines.append(f"-- Total de tópicos: {total_topicos}")
    sql_lines.append("")
    
    # 1. Criar disciplinas
    sql_lines.append("-- ========== DISCIPLINAS ==========")
    sql_lines.append("")
    
    for disc_key, disc in sorted(disciplinas.items()):
        nome = disc['nome'].replace("'", "''")
        area = disc['area']
        descricao = disc['descricao'].replace("'", "''")
        
        sql = f"""INSERT OR IGNORE INTO disciplinas (nome, area, descricao) 
VALUES ('{nome}', '{area}', '{descricao}');"""
        sql_lines.append(sql)
        sql_lines.append("")
    
    # 2. Criar tópicos
    sql_lines.append("")
    sql_lines.append("-- ========== TÓPICOS POR DISCIPLINA ==========")
    sql_lines.append("")
    
    ordem = 0
    for disc_key, disc in sorted(disciplinas.items()):
        nome_disciplina = disc['nome'].replace("'", "''")
        
        sql_lines.append(f"-- Tópicos de: {disc['nome']} ({disc['area']})")
        sql_lines.append("")
        
        for i, topico in enumerate(disc['topicos'], 1):
            nome_topico = topico['nome'].replace("'", "''")
            categoria = topico['categoria'].replace("'", "''")
            nivel = topico['nivel_dificuldade']
            carga = topico['carga_horaria_estimada']
            peso = topico['peso']
            
            sql = f"""INSERT OR IGNORE INTO topicos_edital (disciplina_id, nome, categoria, ordem, peso, nivel_dificuldade, carga_horaria_estimada)
SELECT id, '{nome_topico}', '{categoria}', {i}, {peso}, {nivel}, {carga}
FROM disciplinas WHERE nome = '{nome_disciplina}' AND area = '{disc["area"]}';"""
            
            sql_lines.append(sql)
            sql_lines.append("")
            ordem += 1
    
    return "\n".join(sql_lines)

def main():
    csv_path = '/home/user/webapp/migrations/dataset_concursos_publicos_completo_final.csv'
    output_path = '/home/user/webapp/migrations/0012_popular_topicos_dataset.sql'
    
    print("📚 Processando dataset de concursos públicos...")
    disciplinas = processar_dataset(csv_path)
    
    print(f"✅ {len(disciplinas)} disciplinas processadas")
    total_topicos = sum(len(d['topicos']) for d in disciplinas.values())
    print(f"✅ {total_topicos} tópicos processados")
    
    print("\n📝 Gerando SQL...")
    sql = gerar_sql(disciplinas)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"✅ Migration salva em: {output_path}")
    print(f"📊 Tamanho: {len(sql)} caracteres")
    
    # Estatísticas por área
    print("\n📊 Estatísticas por área:")
    stats = defaultdict(lambda: {'disciplinas': 0, 'topicos': 0})
    for disc in disciplinas.values():
        stats[disc['area']]['disciplinas'] += 1
        stats[disc['area']]['topicos'] += len(disc['topicos'])
    
    for area, data in sorted(stats.items()):
        print(f"  {area}: {data['disciplinas']} disciplinas, {data['topicos']} tópicos")

if __name__ == '__main__':
    main()
