# Configurazione Variabili d'Ambiente Railway

## IMPORTANTE: Configura queste variabili su Railway

Vai su: **Railway Dashboard → Progetto → Backend Service → Settings → Variables**

## 1. DATABASE AUTHENTICATION (Sempre SQLite)
```
AUTH_DB_PATH=/data/auth.db
```

## 2. DATABASE PYARCHINIT - Scegli UNA delle tre modalità:

### OPZIONE A: SQLite (Offline-First, Mobile)
```
DB_MODE=sqlite
USE_SQLITE=true
SQLITE_DB_PATH=/data/pyarchinit_db.sqlite
```

### OPZIONE B: PostgreSQL Condiviso (Multi-Utente, Server)
```
DB_MODE=separate
USE_SQLITE=false
PYARCHINIT_DB_HOST=your-postgres-host.railway.app
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=railway
PYARCHINIT_DB_USER=postgres
PYARCHINIT_DB_PASSWORD=your-password
```

### OPZIONE C: Hybrid (SQLite per Mobile + PostgreSQL per Server)
```
DB_MODE=hybrid
USE_SQLITE=false
PYARCHINIT_DB_HOST=your-postgres-host.railway.app
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=railway
PYARCHINIT_DB_USER=postgres
PYARCHINIT_DB_PASSWORD=your-password
```

## 3. MEDIA STORAGE (Sempre su volume persistente)
```
PYARCHINIT_MEDIA_ROOT=/data/pyarchinit_media
```

## 4. AI SERVICES (Opzionale, per note vocali)
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 5. SECURITY
```
SECRET_KEY=genera-una-chiave-sicura-random-qui
CORS_ORIGINS=https://pyarchinit-mobile-pwa.vercel.app
```

## COME APPLICARE:

1. Copia le variabili dalla sezione che hai scelto (A, B, o C)
2. Vai su Railway Dashboard
3. Settings → Variables → Raw Editor
4. Incolla le variabili
5. Clicca "Add" per ogni variabile
6. Railway farà automaticamente il redeploy

## NOTE IMPORTANTI:

- **Volume `/data` è OBBLIGATORIO** - Senza questo, i dati vanno persi ad ogni deploy
- Se usi PostgreSQL, crea prima il database su Railway: New → Database → PostgreSQL
- Il database auth è SEMPRE SQLite (per semplicità gestione utenti web)
- Il database PyArchInit può essere SQLite O PostgreSQL (in base alla scelta)
