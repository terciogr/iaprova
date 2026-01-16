#!/usr/bin/env python3
"""
Script para reorganizar disciplinas em hierarquia correta
"""
import sqlite3
import os
import glob

# Encontrar banco D1 local
DB_PATTERN = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"

def main():
    # Encontrar o banco
    db_files = glob.glob(DB_PATTERN)
    if not db_files:
        print(f"❌ Nenhum banco encontrado: {DB_PATTERN}")
        return
    
    DB_PATH = db_files[0]
    print(f"📂 Usando banco: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cursor = conn.cursor()
    
    print("🚀 Iniciando migração de disciplinas...")
    
    # 1. ENFERMAGEM - Agrupar subtópicos
    print("\n1️⃣ Agrupando Enfermagem...")
    enf_ids = [89, 91, 80, 88, 87, 85, 84, 83, 86, 79, 136]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 76 WHERE disciplina_id IN ({','.join(map(str, enf_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 76 WHERE disciplina_id IN ({','.join(map(str, enf_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, enf_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 2. SAÚDE PÚBLICA
    print("\n2️⃣ Agrupando Saúde Pública...")
    saude_ids = [78, 116]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 77 WHERE disciplina_id IN ({','.join(map(str, saude_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 77 WHERE disciplina_id IN ({','.join(map(str, saude_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, saude_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 3. CIÊNCIAS BÁSICAS DA SAÚDE
    print("\n3️⃣ Agrupando Ciências Básicas da Saúde...")
    cursor.execute("UPDATE disciplinas SET nome = 'Ciências Básicas da Saúde', descricao = 'Anatomia, Fisiologia, Farmacologia, Microbiologia, Imunologia, Patologia e Semiologia' WHERE id = 81")
    ciencias_ids = [82, 119, 131, 142]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 81 WHERE disciplina_id IN ({','.join(map(str, ciencias_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 81 WHERE disciplina_id IN ({','.join(map(str, ciencias_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, ciencias_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 4. CONHECIMENTOS PEDAGÓGICOS
    print("\n4️⃣ Agrupando Conhecimentos Pedagógicos...")
    pedag_ids = [95, 100, 101, 129, 138]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 72 WHERE disciplina_id IN ({','.join(map(str, pedag_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 72 WHERE disciplina_id IN ({','.join(map(str, pedag_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, pedag_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 5. LEGISLAÇÃO EDUCACIONAL
    print("\n5️⃣ Agrupando Legislação Educacional...")
    leg_educ_ids = [121, 122]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 73 WHERE disciplina_id IN ({','.join(map(str, leg_educ_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 73 WHERE disciplina_id IN ({','.join(map(str, leg_educ_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, leg_educ_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 6. CONTABILIDADE
    print("\n6️⃣ Agrupando Contabilidade...")
    cont_ids = [46, 47, 98]
    # Deletar duplicatas potenciais primeiro
    cursor.execute(f"DELETE FROM user_disciplinas WHERE disciplina_id IN ({','.join(map(str, cont_ids))}) AND user_id IN (SELECT user_id FROM user_disciplinas WHERE disciplina_id = 4)")
    print(f"   user_disciplinas duplicatas removidas: {cursor.rowcount}")
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 4 WHERE disciplina_id IN ({','.join(map(str, cont_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 4 WHERE disciplina_id IN ({','.join(map(str, cont_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, cont_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 7. AUDITORIA
    print("\n7️⃣ Agrupando Auditoria...")
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 6 WHERE disciplina_id = 94")
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 6 WHERE disciplina_id = 94")
    cursor.execute("DELETE FROM disciplinas WHERE id = 94")
    
    # 8. DIREITO ADMINISTRATIVO
    print("\n8️⃣ Agrupando Direito Administrativo...")
    dir_adm_ids = [125, 137, 130]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 3 WHERE disciplina_id IN ({','.join(map(str, dir_adm_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 3 WHERE disciplina_id IN ({','.join(map(str, dir_adm_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, dir_adm_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 9. LEGISLAÇÃO ESPECIAL
    print("\n9️⃣ Agrupando Legislação Especial...")
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 11 WHERE disciplina_id = 123")
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 11 WHERE disciplina_id = 123")
    cursor.execute("DELETE FROM disciplinas WHERE id = 123")
    
    # 10. ECONOMIA
    print("\n🔟 Agrupando Economia...")
    econ_ids = [90, 49, 115]
    cursor.execute(f"UPDATE user_disciplinas SET disciplina_id = 51 WHERE disciplina_id IN ({','.join(map(str, econ_ids))})")
    print(f"   user_disciplinas: {cursor.rowcount} atualizados")
    cursor.execute(f"UPDATE ciclos_estudo SET disciplina_id = 51 WHERE disciplina_id IN ({','.join(map(str, econ_ids))})")
    print(f"   ciclos_estudo: {cursor.rowcount} atualizados")
    cursor.execute(f"DELETE FROM disciplinas WHERE id IN ({','.join(map(str, econ_ids))})")
    print(f"   disciplinas deletadas: {cursor.rowcount}")
    
    # 11. PORTUGUÊS
    print("\n1️⃣1️⃣ Agrupando Português...")
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 21 WHERE disciplina_id = 126")
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 21 WHERE disciplina_id = 126")
    cursor.execute("DELETE FROM disciplinas WHERE id = 126")
    
    # 12. OUTROS
    print("\n1️⃣2️⃣ Outros agrupamentos...")
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 52 WHERE disciplina_id = 92")  # Análise de Dados → Estatística
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 52 WHERE disciplina_id = 92")
    cursor.execute("DELETE FROM disciplinas WHERE id = 92")
    
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 75 WHERE disciplina_id = 143")  # Ética → RJU
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 75 WHERE disciplina_id = 143")
    cursor.execute("DELETE FROM disciplinas WHERE id = 143")
    
    cursor.execute("UPDATE user_disciplinas SET disciplina_id = 14 WHERE disciplina_id = 120")  # Governança TI → Informática
    cursor.execute("UPDATE ciclos_estudo SET disciplina_id = 14 WHERE disciplina_id = 120")
    cursor.execute("DELETE FROM disciplinas WHERE id = 120")
    
    # Commit e reativar FK
    conn.commit()
    conn.execute("PRAGMA foreign_keys = ON")
    
    # Contagem final
    cursor.execute("SELECT COUNT(*) FROM disciplinas")
    total = cursor.fetchone()[0]
    
    print(f"\n✅ Migração concluída!")
    print(f"📊 Total de disciplinas agora: {total} (antes: ~102)")
    print(f"🎯 Redução: ~{102-total} disciplinas")
    
    conn.close()

if __name__ == "__main__":
    main()
