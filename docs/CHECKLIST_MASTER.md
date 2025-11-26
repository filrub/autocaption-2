# ✅ CHECKLIST MASTER - Installazione AutoCAPTION Refactored

## 📦 Download

[**💾 SCARICA ZIP COMPLETO v4 (117KB)**](computer:///mnt/user-data/outputs/autocaption-refactored.zip)

---

## 🎯 FILE DA COPIARE - CHECKLIST COMPLETA

### ROOT del progetto (6 files)

```bash
cd /Users/filipporubin/Desktop/PhotoARCHIVIO/AutoCAPTION

# Copia questi file nella ROOT (stessa cartella di package.json)
[ ] electron.vite.config.mjs
[ ] electron-builder.yml
[ ] dev-app-update.yml
[ ] eslint.config.mjs
[ ] .gitignore
[ ] package.json
[ ] cleanup.sh
```

**Comando:**
```bash
cp ~/Downloads/autocaption-refactored/electron.vite.config.mjs .
cp ~/Downloads/autocaption-refactored/electron-builder.yml .
cp ~/Downloads/autocaption-refactored/dev-app-update.yml .
cp ~/Downloads/autocaption-refactored/eslint.config.mjs .
cp ~/Downloads/autocaption-refactored/.gitignore .
cp ~/Downloads/autocaption-refactored/package.json .
cp ~/Downloads/autocaption-refactored/cleanup.sh .
```

---

### src/main/ (11 files + 2 cartelle)

```bash
# Cartelle
[ ] src/main/config/
[ ] src/main/utils/

# File in config/
[ ] src/main/config/constants.js

# File in utils/
[ ] src/main/utils/math.js
[ ] src/main/utils/async.js

# File main root
[ ] src/main/index.js
[ ] src/main/recognition-manager.js
[ ] src/main/face-recognition-service.js
[ ] src/main/image-manager.js
[ ] src/main/exiftool-manager.js
[ ] src/main/ipc-handlers.js
```

**Comandi:**
```bash
mkdir -p src/main/config src/main/utils
cp ~/Downloads/autocaption-refactored/main/config/constants.js src/main/config/
cp ~/Downloads/autocaption-refactored/main/utils/*.js src/main/utils/
cp ~/Downloads/autocaption-refactored/main/*.js src/main/
```

---

### src/preload/ (1 file)

```bash
[ ] src/preload/index.js
```

**Comando:**
```bash
cp ~/Downloads/autocaption-refactored/preload/index.js src/preload/
```

---

### src/renderer/src/ (23+ files)

**Componenti (11 files):**
```bash
[ ] src/renderer/src/components/AutoCaption.jsx
[ ] src/renderer/src/components/PhotoCaptioner.jsx
[ ] src/renderer/src/components/LoadingProgress.jsx
[ ] src/renderer/src/components/Stats.jsx
[ ] src/renderer/src/components/Sidebar.jsx
[ ] src/renderer/src/components/PhotoViewer.jsx
[ ] src/renderer/src/components/Header.jsx
[ ] src/renderer/src/components/Footer.jsx
[ ] src/renderer/src/components/PersonLabel.jsx
[ ] src/renderer/src/components/RecognitionMonitor.jsx
[ ] src/renderer/src/components/photowall.css
```

**Hooks (2 files):**
```bash
[ ] src/renderer/src/hooks/usePhotos.js
[ ] src/renderer/src/hooks/useRecognitionService.js
```

**Utils (2 files):**
```bash
[ ] src/renderer/src/utils/math.js
[ ] src/renderer/src/utils/faceMatching.js
```

**Styles (1+ files):**
```bash
[ ] src/renderer/src/styles/main.css
```

**Assets (all):**
```bash
[ ] src/renderer/src/assets/*
```

**Root files:**
```bash
[ ] src/renderer/src/App.jsx
[ ] src/renderer/src/main.jsx
[ ] src/renderer/src/createCaption.js
```

**Comandi:**
```bash
mkdir -p src/renderer/src/utils src/renderer/src/hooks src/renderer/src/styles src/renderer/src/assets

# Copia tutto in un comando
cp -r ~/Downloads/autocaption-refactored/renderer/* src/renderer/src/
```

---

## 🗑️ FILE DA RIMUOVERE

### PRIMA di copiare i nuovi, rimuovi questi file vecchi:

```bash
# Main process - file vecchi
[ ] src/main/face.js
[ ] src/main/faceRecognition.js
[ ] src/main/recognitionManager.js (senza trattino!)
[ ] src/main/config.js
[ ] src/main/ELECTRON_*.js
[ ] src/main/ELECTRON_*.md

# Renderer - file vecchi
[ ] src/renderer/src/Test.jsx
[ ] src/renderer/src/AutoCaption.jsx (solo se NON in components/)
[ ] src/renderer/src/EXAMPLES.js
[ ] src/renderer/src/*.md
```

**Comando automatico:**
```bash
chmod +x cleanup.sh
./cleanup.sh
```

---

## ✅ VERIFICA INSTALLAZIONE

### Step 1: Verifica ROOT
```bash
ls -la | grep -E "(electron|package)"
```
Devi vedere:
- electron.vite.config.mjs ✓
- electron-builder.yml ✓
- package.json ✓

### Step 2: Verifica src/main/
```bash
ls -la src/main/config/
ls -la src/main/utils/
```
Devi vedere:
- config/constants.js ✓
- utils/math.js ✓
- utils/async.js ✓

### Step 3: Verifica src/renderer/src/
```bash
ls -la src/renderer/src/hooks/
ls -la src/renderer/src/utils/
ls -la src/renderer/src/components/ | grep -E "(Loading|Stats)"
```
Devi vedere:
- hooks/usePhotos.js ✓
- utils/math.js ✓
- utils/faceMatching.js ✓
- components/LoadingProgress.jsx ✓
- components/Stats.jsx ✓

### Step 4: Test
```bash
npm run dev
```

---

## 📊 RIEPILOGO NUMERICO

**File da copiare:**
- ROOT: 7 files
- src/main/: 11 files
- src/preload/: 1 file
- src/renderer/src/: 23+ files

**TOTALE: ~42 files**

**File da rimuovere:**
- ~10 file vecchi

**Tempo stimato:**
- Con script automatico: ~2 minuti
- Manuale: ~10 minuti

---

## 🚀 INSTALLAZIONE RAPIDA (TUTTO IN UNO)

```bash
cd /Users/filipporubin/Desktop/PhotoARCHIVIO/AutoCAPTION

# 1. Backup
git add . && git commit -m "Backup before refactoring" || true

# 2. Download ed estrai ZIP

# 3. Copia ROOT files
cp ~/Downloads/autocaption-refactored/*.{mjs,yml,json,sh} .
cp ~/Downloads/autocaption-refactored/.gitignore .
chmod +x cleanup.sh

# 4. Cleanup
./cleanup.sh

# 5. Crea cartelle
mkdir -p src/main/config src/main/utils
mkdir -p src/renderer/src/utils src/renderer/src/hooks

# 6. Copia tutto src/
cp -r ~/Downloads/autocaption-refactored/main/* src/main/
cp -r ~/Downloads/autocaption-refactored/preload/* src/preload/
cp -r ~/Downloads/autocaption-refactored/renderer/* src/renderer/src/

# 7. Test
npm run dev
```

---

## 🆘 TROUBLESHOOTING

### Errore: "Entry point required"
→ [ ] electron.vite.config.mjs mancante nella ROOT

### Errore: "Cannot resolve ./face"
→ [ ] File vecchi non rimossi (esegui cleanup.sh)

### Errore: "Cannot resolve import X"
→ [ ] File X non copiato (verifica checklist sopra)

### Finestra bianca
→ [ ] Mancano componenti renderer
→ [ ] Apri DevTools per vedere errori

---

## 📖 GUIDE DETTAGLIATE

Nel ZIP trovi:

- `FIX_CONFIG.md` - Fix per "entry point required"
- `INSTALLAZIONE_SEMPLICE.md` - Guida step-by-step
- `GUIDA_COMPLETA_FIX.md` - Tutti i fix
- `DEVELOPER_GUIDE.md` - Per sviluppatori
- `TESTING_CHECKLIST.md` - Test completo

---

**Versione:** 1.27.0 v4 (Completa)
**Files:** 42+ files
**Status:** ✅ TUTTO INCLUSO!

Segui questa checklist e funzionerà! 🎉
