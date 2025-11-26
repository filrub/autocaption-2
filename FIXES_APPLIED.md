# 🔧 AutoCaption - Correzioni Applicate

## Problema Originale
```
Error: build.rollupOptions.input option is required in the electron vite renderer config.
```

L'applicazione non partiva a causa di configurazioni errate nei path dei file.

---

## ✅ Correzioni Applicate

### 1. **electron.vite.config.mjs** - Aggiunto Input Renderer
**Problema:** Mancava la configurazione `rollupOptions.input` per il renderer.

**Correzione:**
```javascript
renderer: {
  build: {
    rollupOptions: {
      input: resolve("renderer/index.html"),  // ✅ AGGIUNTO
    },
  },
  resolve: {
    alias: {
      "@renderer": resolve("renderer/src"),
    },
  },
  plugins: [react({
    fastRefresh: false,
  })],
}
```

---

### 2. **renderer/index.html** - Path Script Corretto
**Problema:** Il path dello script puntava a `/src/main.jsx` ma il file è in `/main.jsx`.

**Prima:**
```html
<script type="module" src="/src/main.jsx"></script>
```

**Dopo:**
```html
<script type="module" src="/main.jsx"></script>  <!-- ✅ CORRETTO -->
```

---

### 3. **package.json** - Rimossi Extra Resources Mancanti
**Problema:** La configurazione build faceva riferimento a file che non esistono.

**Righe rimosse:**
```json
"extraResources": [
  {
    "from": "dist/server.py",           // ❌ File mancante
    "to": "server.py"
  },
  {
    "from": "dist/exiftool-perl",       // ❌ File mancante
    "to": "exiftool-perl"
  },
  {
    "from": "src/main/recognition",     // ❌ Path errato
    "to": "recognition"
  },
  {
    "from": "src/main/icon.icns",       // ❌ File mancante
    "to": "icon.icns"
  }
]
```

**Nota:** Queste risorse possono essere aggiunte in seguito quando i file verranno creati.

---

## 🚀 Come Avviare l'App

### Installazione Dipendenze
```bash
cd /path/to/autocaption
npm install
```

### Avvio Sviluppo
```bash
npm run dev
```

### Build Produzione
```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

---

## 📂 Struttura Corretta del Progetto

```
autocaption/
├── config/
│   └── constants.js              ✅ Configurazioni centrali
├── main/
│   ├── index.js                  ✅ Entry point Electron
│   ├── image-manager.js
│   ├── recognition-manager.js
│   ├── exiftool-manager.js
│   ├── face-recognition-service.js
│   ├── ipc-handlers.js
│   └── utils/
├── renderer/
│   ├── index.html                ✅ Corretto
│   ├── main.jsx                  ✅ Entry point React
│   ├── App.jsx
│   ├── components/
│   ├── hooks/
│   ├── styles/
│   └── utils/
├── preload/
│   └── index.js
├── electron.vite.config.mjs      ✅ Corretto
└── package.json                  ✅ Corretto
```

---

## ⚠️ Note Importanti

### File da Creare (Opzionale)
Se vuoi fare il build per distribuzione, dovrai creare:

1. **Icon File** (`icon.icns` per macOS)
   - Posizione: `assets/icon.icns` 
   - Rimuovi il commento in `main/index.js` linea 5

2. **Recognition Service**
   - Se hai un server Python per il riconoscimento facciale
   - Crea directory `dist/recognition/`

3. **ExifTool Distribution**
   - Se vuoi includere ExifTool standalone
   - Aggiungi in `dist/exiftool-perl/`

### Variabili d'Ambiente
Crea un file `.env` nella root del progetto:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

**⚠️ IMPORTANTE:** Non commitare il file `.env` su Git!

---

## 🎯 Prossimi Passi Consigliati

### 1. Testing (5 minuti)
```bash
npm run dev
```
Verifica che:
- L'app si avvii senza errori
- Il caricamento delle immagini funzioni
- Il riconoscimento facciale funzioni (se configurato)

### 2. Sicurezza Variabili d'Ambiente
- Sposta le credenziali Supabase da `App.jsx` al file `.env`
- Aggiungi `.env` al `.gitignore`

### 3. Build Test
```bash
npm run build:mac  # o build:win / build:linux
```

---

## 📞 Supporto

Se incontri altri problemi:
1. Verifica che `node_modules` sia stato installato completamente
2. Controlla i log in console
3. Verifica che tutti i path siano corretti
4. Assicurati di avere Node.js >= 18

---

## ✨ Risultato

Dopo queste correzioni, l'applicazione dovrebbe:
- ✅ Avviarsi senza errori di configurazione
- ✅ Caricare correttamente il renderer React
- ✅ Funzionare in modalità sviluppo
- ✅ Essere pronta per il build produzione

---

**Correzioni applicate il:** 26 Novembre 2025
**Versione:** 1.26.0
