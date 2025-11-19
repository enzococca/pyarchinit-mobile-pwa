"""
Script per inizializzare/aggiornare il database auth su Railway

Esegue:
1. Creazione tabelle auth (users, projects, project_teams) se non esistono
2. Aggiornamento schema esistente con colonne mancanti
3. Verifica integrità dello schema
"""

import sqlite3
import os
from pathlib import Path

# Path del database auth
AUTH_DB_PATH = os.getenv('AUTH_DB_PATH', '/data/auth.sqlite')

def init_auth_database():
    """Inizializza o aggiorna il database auth con lo schema completo"""

    print(f"🔧 Inizializzazione database auth: {AUTH_DB_PATH}")

    # Assicurati che la directory esista
    db_dir = Path(AUTH_DB_PATH).parent
    db_dir.mkdir(parents=True, exist_ok=True)
    print(f"✅ Directory creata: {db_dir}")

    conn = sqlite3.connect(AUTH_DB_PATH)
    cursor = conn.cursor()

    try:
        # ============================================
        # 1. TABELLA USERS
        # ============================================
        print("📝 Creazione/Aggiornamento tabella users...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Tabella users OK")

        # ============================================
        # 2. TABELLA PROJECTS
        # ============================================
        print("📝 Creazione/Aggiornamento tabella projects...")

        # Verifica se la tabella esiste
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        table_exists = cursor.fetchone() is not None

        if table_exists:
            # Verifica colonne esistenti
            cursor.execute("PRAGMA table_info(projects)")
            columns = {row[1] for row in cursor.fetchall()}
            print(f"   Colonne esistenti: {columns}")

            # Aggiungi colonne mancanti una alla volta
            missing_columns = {
                'owner_id': 'INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE',
                'description': 'TEXT',
                'db_mode': "VARCHAR(20) NOT NULL DEFAULT 'sqlite' CHECK (db_mode IN ('sqlite', 'postgres', 'hybrid'))",
                'db_config': 'TEXT NOT NULL',
                'is_personal': 'BOOLEAN DEFAULT FALSE',
                'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            }

            for col_name, col_type in missing_columns.items():
                if col_name not in columns:
                    print(f"   ➕ Aggiunta colonna: {col_name}")
                    try:
                        cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
                    except sqlite3.OperationalError as e:
                        if "duplicate column name" not in str(e).lower():
                            print(f"   ⚠️  Errore aggiunta colonna {col_name}: {e}")
        else:
            # Crea tabella da zero
            cursor.execute("""
                CREATE TABLE projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    db_mode VARCHAR(20) NOT NULL CHECK (db_mode IN ('sqlite', 'postgres', 'hybrid')),
                    db_config TEXT NOT NULL,
                    is_personal BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("   ✅ Tabella projects creata da zero")

        print("✅ Tabella projects OK")

        # ============================================
        # 3. TABELLA PROJECT_TEAMS
        # ============================================
        print("📝 Creazione/Aggiornamento tabella project_teams...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS project_teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
                permissions TEXT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, user_id)
            )
        """)
        print("✅ Tabella project_teams OK")

        # ============================================
        # 4. INDICI PER PERFORMANCE
        # ============================================
        print("📝 Creazione indici...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_project_teams_project ON project_teams(project_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_project_teams_user ON project_teams(user_id)")
        print("✅ Indici OK")

        # Commit delle modifiche
        conn.commit()

        # ============================================
        # 5. VERIFICA FINALE
        # ============================================
        print("\n🔍 Verifica schema finale:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        for table in tables:
            table_name = table[0]
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            print(f"\n📋 Tabella: {table_name}")
            for col in columns:
                print(f"   - {col[1]} ({col[2]})")

        print("\n✅ Database auth inizializzato/aggiornato con successo!")
        return True

    except Exception as e:
        print(f"\n❌ Errore durante inizializzazione: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    success = init_auth_database()
    exit(0 if success else 1)
