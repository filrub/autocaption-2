#!/bin/bash

# AutoCAPTION Cleanup Script
# Rimuove file vecchi e conflitti

echo "🧹 Pulizia AutoCAPTION in corso..."

cd "$(dirname "$0")"

# Backup
echo "📦 Creazione backup..."
mkdir -p ../autocaption-backup-$(date +%Y%m%d)
cp -r src/main/face.js ../autocaption-backup-$(date +%Y%m%d)/ 2>/dev/null || true
cp -r src/main/faceRecognition.js ../autocaption-backup-$(date +%Y%m%d)/ 2>/dev/null || true
cp -r src/main/recognitionManager.js ../autocaption-backup-$(date +%Y%m%d)/ 2>/dev/null || true

# Rimuovi file vecchi da src/main
echo "🗑️  Rimozione file vecchi da src/main..."
rm -f src/main/face.js
rm -f src/main/faceRecognition.js
rm -f src/main/recognitionManager.js
rm -f src/main/ELECTRON_EXAMPLES.js
rm -f src/main/ELECTRON_MIGRATION.md
rm -f src/main/ELECTRON_REFACTORING.md
rm -f src/main/config.js

# Rimuovi file vecchi da src/renderer
echo "🗑️  Rimozione file vecchi da src/renderer..."
rm -f src/renderer/src/Test.jsx
rm -f src/renderer/src/AutoCaption.jsx
rm -f src/renderer/src/EXAMPLES.js
rm -f src/renderer/src/*.md

# Verifica file corretti esistono
echo "✅ Verifica file corretti..."

REQUIRED_FILES=(
    "src/main/config/constants.js"
    "src/main/utils/math.js"
    "src/main/utils/async.js"
    "src/main/recognition-manager.js"
    "src/main/face-recognition-service.js"
    "src/main/image-manager.js"
    "src/main/exiftool-manager.js"
    "src/main/ipc-handlers.js"
    "src/preload/index.js"
    "src/renderer/src/utils/math.js"
    "src/renderer/src/utils/faceMatching.js"
    "src/renderer/src/components/AutoCaption.jsx"
    "src/renderer/src/components/PhotoCaptioner.jsx"
    "src/renderer/src/components/LoadingProgress.jsx"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ Tutti i file necessari sono presenti!"
else
    echo "⚠️  File mancanti:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "📥 Scarica i file mancanti dal pacchetto refactored"
fi

# Verifica index.js
echo "🔍 Verifica imports in index.js..."
if grep -q "from './face'" src/main/index.js 2>/dev/null; then
    echo "⚠️  ATTENZIONE: index.js contiene ancora import vecchi!"
    echo "   Rimuovi manualmente: import ... from './face'"
    echo "   O scarica index.js corretto dal pacchetto"
else
    echo "✅ index.js sembra corretto"
fi

# Verifica App.jsx
echo "🔍 Verifica imports in App.jsx..."
if grep -q 'from "./AutoCaption"' src/renderer/src/App.jsx 2>/dev/null; then
    echo "⚠️  ATTENZIONE: App.jsx contiene import sbagliato!"
    echo "   Cambia: import AutoCaption from './AutoCaption'"
    echo "   In:     import AutoCaption from './components/AutoCaption'"
    echo "   O scarica App.jsx corretto dal pacchetto"
else
    echo "✅ App.jsx sembra corretto"
fi

echo ""
echo "✅ Pulizia completata!"
echo ""
echo "🚀 Prossimi passi:"
echo "   1. Verifica che tutti i file necessari siano presenti"
echo "   2. Esegui: npm run dev"
echo "   3. Se ci sono ancora errori, controlla la console"
echo ""
echo "📦 Backup salvato in: ../autocaption-backup-$(date +%Y%m%d)/"
