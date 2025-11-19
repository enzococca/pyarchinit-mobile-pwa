"""
Dynamic Database Manager
Gestisce connessioni multiple a database di progetti differenti.
Permette switching dinamico tra SQLite e PostgreSQL per ogni progetto.
"""
import os
import json
import shutil
from typing import Dict, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool

from backend.config import settings


class DynamicDatabaseManager:
    """
    Gestisce dinamicamente connessioni a database di progetti.

    Features:
    - Auth DB: sempre SQLite (gestione utenti e progetti)
    - Project DBs: SQLite, PostgreSQL o Hybrid (configurabile per progetto)
    - Connection pooling e caching
    - Inizializzazione automatica nuovi database
    """

    def __init__(self):
        # Auth database (sempre SQLite)
        auth_db_path = settings.AUTH_DB_PATH
        os.makedirs(os.path.dirname(auth_db_path), exist_ok=True)

        self.auth_engine = create_engine(
            f"sqlite:///{auth_db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )

        # Cache delle connessioni ai database dei progetti
        self._project_engines: Dict[int, Engine] = {}

        # Inizializza tabelle auth se non esistono
        self._init_auth_tables()

        print(f"✅ DynamicDatabaseManager initialized")
        print(f"   Auth DB: {auth_db_path}")

    def _init_auth_tables(self):
        """Inizializza tabelle auth e projects nel database auth"""
        migration_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "migrations",
            "001_add_projects_multitenancy.sql"
        )

        if os.path.exists(migration_path):
            with open(migration_path, 'r') as f:
                migration_sql = f.read()

            # Esegui migration
            with self.auth_engine.connect() as conn:
                # Divide per statement SQL (semplice split su ;)
                statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

                for statement in statements:
                    if statement:
                        try:
                            conn.execute(text(statement))
                        except Exception as e:
                            # Ignora errori se tabelle già esistono
                            if "already exists" not in str(e):
                                print(f"⚠️  Warning executing migration: {e}")

                conn.commit()

            print("✅ Auth database tables initialized")

    def get_auth_db(self) -> Engine:
        """Ritorna engine del database autenticazione"""
        return self.auth_engine

    def get_project_db(self, project_id: int) -> Engine:
        """
        Ottieni connessione database per progetto.
        Legge configurazione dal database auth e crea connessione dinamicamente.

        Args:
            project_id: ID del progetto

        Returns:
            Engine SQLAlchemy per il database del progetto

        Raises:
            ValueError: Se progetto non esiste
        """
        # Check cache
        if project_id in self._project_engines:
            return self._project_engines[project_id]

        # Leggi configurazione progetto dal database auth
        with self.auth_engine.connect() as conn:
            result = conn.execute(
                text("SELECT db_mode, db_config FROM projects WHERE id = :id"),
                {"id": project_id}
            ).fetchone()

        if not result:
            raise ValueError(f"Project {project_id} not found")

        db_mode = result[0]
        db_config = json.loads(result[1])

        # Crea engine basato su configurazione
        if db_mode == 'sqlite':
            engine = self._create_sqlite_engine(project_id, db_config)
        elif db_mode == 'postgres':
            engine = self._create_postgres_engine(db_config)
        elif db_mode == 'hybrid':
            # Hybrid usa PostgreSQL con Row-Level Security
            engine = self._create_postgres_engine(db_config)
            self._setup_rls(engine, project_id)
        else:
            raise ValueError(f"Unknown db_mode: {db_mode}")

        # Cache engine
        self._project_engines[project_id] = engine

        print(f"✅ Connected to project {project_id} database ({db_mode})")

        return engine

    def _create_sqlite_engine(self, project_id: int, db_config: dict) -> Engine:
        """Crea engine SQLite per progetto"""
        db_path = db_config.get('path')

        if not db_path:
            raise ValueError("SQLite db_config must have 'path'")

        # Assicurati che la directory esista
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        # Se il database non esiste, inizializzalo
        if not os.path.exists(db_path):
            print(f"📦 Creating new SQLite database: {db_path}")
            self._initialize_pyarchinit_db(db_path)

        # Crea engine
        engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )

        return engine

    def _create_postgres_engine(self, db_config: dict) -> Engine:
        """Crea engine PostgreSQL per progetto"""
        required_keys = ['host', 'port', 'database', 'user', 'password']

        for key in required_keys:
            if key not in db_config:
                raise ValueError(f"PostgreSQL db_config missing '{key}'")

        connection_string = (
            f"postgresql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        )

        engine = create_engine(
            connection_string,
            pool_size=5,
            max_overflow=10,
            echo=False
        )

        return engine

    def _initialize_pyarchinit_db(self, db_path: str):
        """
        Inizializza nuovo database SQLite copiando il template PyArchInit completo.

        Copia il database pyarchinit_db.sqlite (completo con schema e dati) come template
        invece di eseguire SQL, garantendo che tutte le tabelle e relazioni siano corrette.
        """
        # Path al database template (completo, ~4.9MB)
        template_db_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "pyarchinit_db.sqlite"
        )

        if not os.path.exists(template_db_path):
            raise FileNotFoundError(
                f"PyArchInit template database not found: {template_db_path}\n"
                f"Expected a complete PyArchInit database file (~4-5MB)"
            )

        # Copia il database template nella posizione target
        shutil.copy2(template_db_path, db_path)

        print(f"✅ Initialized PyArchInit database from template: {db_path}")
        print(f"   Template: {template_db_path} ({os.path.getsize(template_db_path) / 1024 / 1024:.1f}MB)")

    def _setup_rls(self, engine: Engine, project_id: int):
        """
        Setup Row-Level Security per modalità hybrid.
        Permette multi-tenancy su PostgreSQL condiviso.
        """
        with engine.connect() as conn:
            # Enable RLS on tables
            tables = [
                'us_table',
                'inventario_materiali_table',
                'pottery_table',
                'media_table',
                'mobile_notes'
            ]

            for table in tables:
                try:
                    # Aggiungi colonna project_id se non esiste
                    conn.execute(text(f"""
                        ALTER TABLE {table}
                        ADD COLUMN IF NOT EXISTS project_id INTEGER
                    """))

                    # Enable RLS
                    conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))

                    # Create policy
                    conn.execute(text(f"""
                        CREATE POLICY IF NOT EXISTS project_isolation_{table}
                        ON {table}
                        USING (project_id = {project_id})
                    """))

                except Exception as e:
                    # Ignora errori se RLS già configurato
                    if "already exists" not in str(e):
                        print(f"⚠️  Warning setting up RLS on {table}: {e}")

            conn.commit()

        print(f"✅ Row-Level Security configured for project {project_id}")

    def create_personal_workspace(self, user_id: int, user_name: str) -> int:
        """
        Crea workspace personale per nuovo utente.

        Args:
            user_id: ID dell'utente
            user_name: Nome dell'utente

        Returns:
            ID del progetto creato
        """
        db_path = f"/data/users/user_{user_id}.sqlite"

        # Crea record progetto
        with self.auth_engine.connect() as conn:
            result = conn.execute(
                text("""
                    INSERT INTO projects (name, description, owner_id, db_mode, db_config, is_personal)
                    VALUES (:name, :description, :owner_id, :db_mode, :db_config, :is_personal)
                """),
                {
                    "name": f"Personal Workspace - {user_name}",
                    "description": "Il tuo database personale per lavori archeologici",
                    "owner_id": user_id,
                    "db_mode": "sqlite",
                    "db_config": json.dumps({"path": db_path}),
                    "is_personal": True
                }
            )

            project_id = conn.execute(text("SELECT last_insert_rowid()")).scalar()

            # Aggiungi utente al team del progetto
            conn.execute(
                text("""
                    INSERT INTO project_teams (project_id, user_id, role, permissions)
                    VALUES (:project_id, :user_id, :role, :permissions)
                """),
                {
                    "project_id": project_id,
                    "user_id": user_id,
                    "role": "owner",
                    "permissions": json.dumps({
                        "can_edit": True,
                        "can_delete": True,
                        "can_invite": False  # Personal workspace non può invitare altri
                    })
                }
            )

            conn.commit()

        # Inizializza database SQLite
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._initialize_pyarchinit_db(db_path)

        print(f"✅ Created personal workspace for user {user_id} (project {project_id})")

        return project_id

    def close_all(self):
        """Chiudi tutte le connessioni"""
        for project_id, engine in self._project_engines.items():
            engine.dispose()
            print(f"🔌 Closed connection to project {project_id}")

        self.auth_engine.dispose()
        print("🔌 Closed auth database connection")


# Singleton instance
_db_manager_instance: Optional[DynamicDatabaseManager] = None


def get_db_manager() -> DynamicDatabaseManager:
    """Get singleton instance of DynamicDatabaseManager"""
    global _db_manager_instance

    if _db_manager_instance is None:
        _db_manager_instance = DynamicDatabaseManager()

    return _db_manager_instance


def get_auth_db():
    """Dependency per ottenere sessione auth database"""
    manager = get_db_manager()
    engine = manager.get_auth_db()

    from sqlalchemy.orm import Session
    session = Session(engine)

    try:
        yield session
    finally:
        session.close()


def get_project_db(project_id: int):
    """Dependency per ottenere sessione database progetto"""
    manager = get_db_manager()
    engine = manager.get_project_db(project_id)

    from sqlalchemy.orm import Session
    session = Session(engine)

    try:
        yield session
    finally:
        session.close()


def get_user_workspace_db(current_user: "User"):
    """
    Dependency per ottenere sessione database del workspace personale dell'utente.

    IMPORTANT: Must be used with get_current_user dependency.

    Usage:
        from backend.services.auth_service import get_current_user
        from backend.services.dynamic_db_manager import get_user_workspace_db

        @router.post("/upload")
        async def upload(
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_user_workspace_db)
        ):
            # db is now the user's personal workspace database
            ...

    Args:
        current_user: Current authenticated user (injected by FastAPI from get_current_user)

    Yields:
        Database session for user's personal workspace
    """
    manager = get_db_manager()

    # Get user's personal workspace from auth database
    with manager.auth_engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT p.id
                FROM projects p
                INNER JOIN project_teams pt ON p.id = pt.project_id
                WHERE pt.user_id = :user_id AND p.is_personal = 1
                LIMIT 1
            """),
            {"user_id": current_user.id}
        ).fetchone()

    if not result:
        raise ValueError(f"No personal workspace found for user {current_user.id}")

    project_id = result[0]

    # Get project database session
    engine = manager.get_project_db(project_id)

    from sqlalchemy.orm import Session
    session = Session(engine)

    try:
        yield session
    finally:
        session.close()
