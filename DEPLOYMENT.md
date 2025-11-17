# Guida al Deployment - PyArchInit Mobile PWA

## Architettura di Deployment

- **Backend**: Railway.app (Python/FastAPI)
- **Frontend**: Vercel (React PWA)
- **Database**: SQLite (su Railway con volume persistente)

---

## PARTE 1: Deploy Backend su Railway

### 1.1 Crea Account Railway
1. Vai su https://railway.app
2. Registrati con GitHub
3. Conferma email

### 1.2 Deploy Backend
1. Click su "New Project"
2. Seleziona "Deploy from GitHub repo"
3. Autorizza Railway ad accedere al tuo repo GitHub
4. Seleziona il repository `pyarchinit-mobile-pwa`
5. Railway rileverà automaticamente il backend Python

### 1.3 Configura Variabili d'Ambiente
Nel dashboard Railway, vai su Variables e aggiungi:

```bash
USE_SQLITE=true
SECRET_KEY=<genera-una-stringa-random-lunga>
JWT_SECRET=<genera-un-altra-stringa-random>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=43200
PYARCHINIT_MEDIA_ROOT=/app/media
PYARCHINIT_MEDIA_THUMB=/app/media/thumb
PYARCHINIT_MEDIA_RESIZE=/app/media/resize
```

**Per generare chiavi sicure:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 1.4 Aggiungi Volume Persistente (Importante!)
Railway ha storage effimero per default. Per mantenere il database:

1. Nel progetto Railway, vai su "Settings"
2. Scroll fino a "Volumes"
3. Click "Add Volume"
4. Mount Path: `/app`
5. Size: 1GB (sufficiente per iniziare)

### 1.5 Ottieni URL Backend
Dopo il deploy, Railway ti darà un URL tipo:
`https://pyarchinit-backend-production.up.railway.app`

**Salva questo URL!** Ti servirà per il frontend.

---

## PARTE 2: Deploy Frontend su Vercel

### 2.1 Crea Account Vercel
1. Vai su https://vercel.com
2. Registrati con GitHub
3. Conferma email

### 2.2 Prepara Frontend per Produzione
Prima del deploy, aggiorna l'URL del backend nel frontend:

1. Crea file `frontend/.env.production`:
```bash
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

2. Sostituisci `your-railway-backend-url` con l'URL reale da Railway

### 2.3 Deploy Frontend
1. Nel dashboard Vercel, click "Add New Project"
2. Seleziona "Import Git Repository"
3. Scegli il repo `pyarchinit-mobile-pwa`
4. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Aggiungi Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-railway-backend-url.up.railway.app`

6. Click "Deploy"

### 2.4 Ottieni URL Frontend
Vercel ti darà un URL tipo:
`https://pyarchinit-mobile.vercel.app`

---

## PARTE 3: Configurazione Post-Deploy

### 3.1 Aggiorna CORS Backend
Torna su Railway e aggiungi/aggiorna la variabile:

```bash
ALLOWED_ORIGINS=https://pyarchinit-mobile.vercel.app,http://localhost:5173
```

(Sostituisci con il tuo URL Vercel reale)

### 3.2 Rideploy Backend
Railway farà automaticamente redeploy dopo aver salvato le variabili.

### 3.3 Crea Primo Utente
Usa questo comando (sostituisci l'URL con quello reale):

```bash
curl -X POST https://your-railway-backend.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@pyarchinit.com",
    "password":"SecurePassword123!",
    "name":"Administrator",
    "role":"admin"
  }'
```

---

## PARTE 4: Test della PWA

### 4.1 Accedi all'App
1. Apri `https://pyarchinit-mobile.vercel.app`
2. Fai login con le credenziali create
3. Sul mobile, clicca "Aggiungi a schermata Home"
4. L'app funzionerà offline dopo il primo caricamento

### 4.2 Test Funzionalità Offline
1. Carica alcune foto
2. Attiva modalità aereo sul telefono
3. Apri l'app dalla schermata home
4. Le foto caricate dovrebbero essere visibili
5. Puoi continuare a scattare foto (saranno sincronizzate quando torni online)

---

## Troubleshooting

### Backend non si avvia
- Controlla i logs su Railway: Dashboard → Deployments → View Logs
- Verifica che tutte le variabili d'ambiente siano impostate

### Frontend non si connette al Backend
- Verifica che `VITE_API_URL` sia corretto
- Controlla CORS su Railway (variabile `ALLOWED_ORIGINS`)
- Apri Developer Console del browser per vedere errori

### Database perso dopo redeploy
- Verifica che il Volume sia configurato correttamente su Railway
- Il Volume deve essere montato su `/app`

### Media/Foto non salvate
- Verifica le variabili `PYARCHINIT_MEDIA_*`
- Controlla che il Volume Railway abbia spazio sufficiente

---

## Costi Stimati (Free Tier)

### Railway (Backend)
- Free tier: $5/mese di crediti
- Dopo crediti: ~$5-10/mese con 1GB storage

### Vercel (Frontend)
- Free tier: Unlimited
- 100GB bandwidth/mese
- Commerciale: $20/mese per team

**Totale stimato**: €0-10/mese per iniziare

---

## Comandi Utili

### Vedere logs Railway:
```bash
railway logs
```

### Redeploy Vercel da CLI:
```bash
vercel --prod
```

### Backup database da Railway:
```bash
railway run python -c "import shutil; shutil.copy('pyarchinit_db.sqlite', 'backup.sqlite')"
railway download backup.sqlite
```

---

## Prossimi Passi

1. Configura dominio personalizzato (es. `pyarchinit.tuo-dominio.com`)
2. Aggiungi monitoring (Sentry per errori, Plausible per analytics)
3. Configura backup automatici del database
4. Aggiungi CI/CD con GitHub Actions per test automatici

---

**Supporto**: Per problemi, apri una issue su GitHub o contatta l'assistenza Railway/Vercel.
