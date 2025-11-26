# 🚀 AutoCaption - Quick Start

## ⚡ Avvio Rapido (3 minuti)

### 1. Installa le Dipendenze
```bash
npm install
```

### 2. Configura le Variabili d'Ambiente
```bash
# Copia il template
cp .env.example .env

# Modifica .env con le tue credenziali Supabase
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-key
```

### 3. Avvia l'App
```bash
npm run dev
```

---

## ✅ Correzioni Applicate

Le seguenti correzioni sono già state applicate al progetto:

1. ✅ Configurazione `electron.vite.config.mjs` corretta
2. ✅ Path dell'HTML renderer corretto
3. ✅ Configurazione build pulita (rimossi file mancanti)
4. ✅ Aggiunto `.env.example` per configurazione
5. ✅ Aggiunto `.gitignore` completo
6. ✅ Documentazione correzioni in `FIXES_APPLIED.md`

---

## 📁 File Importanti

- **FIXES_APPLIED.md** - Dettaglio completo di tutte le correzioni
- **INSTALL.md** - Guida installazione completa
- **.env.example** - Template configurazione
- **docs/** - Documentazione tecnica completa

---

## 🔧 Comandi Utili

```bash
# Sviluppo
npm run dev                 # Avvia in modalità sviluppo

# Build
npm run build              # Build generale
npm run build:mac          # Build per macOS
npm run build:win          # Build per Windows
npm run build:linux        # Build per Linux

# Manutenzione
npm run clean              # Pulisci build artifacts
npm run check-updates      # Controlla aggiornamenti
npm run update-deps        # Aggiorna dipendenze
```

---

## ⚠️ Problemi Comuni

### L'app non parte?
1. Verifica di aver eseguito `npm install`
2. Controlla che Node.js >= 18 sia installato
3. Verifica `.env` sia configurato correttamente

### Errori di build?
1. Esegui `npm run clean`
2. Riprova `npm install`
3. Controlla i log per errori specifici

### Recognition service non disponibile?
Il servizio di riconoscimento è opzionale. L'app funziona anche senza.

---

## 📞 Supporto

Per problemi o domande:
1. Consulta `docs/DEVELOPER_GUIDE.md`
2. Controlla `docs/TESTING_CHECKLIST.md`
3. Leggi `FIXES_APPLIED.md` per dettagli tecnici

---

**Buon lavoro! 📸**
