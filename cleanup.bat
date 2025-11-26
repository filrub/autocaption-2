@echo off
REM AutoCAPTION Cleanup Script for Windows
REM Rimuove file vecchi e conflitti

echo 🧹 Pulizia AutoCAPTION in corso...

cd /d "%~dp0"

REM Backup
echo 📦 Creazione backup...
mkdir ..\autocaption-backup-%date:~0,4%%date:~5,2%%date:~8,2% 2>nul
copy src\main\face.js ..\autocaption-backup-%date:~0,4%%date:~5,2%%date:~8,2%\ 2>nul
copy src\main\faceRecognition.js ..\autocaption-backup-%date:~0,4%%date:~5,2%%date:~8,2%\ 2>nul

REM Rimuovi file vecchi da src\main
echo 🗑️  Rimozione file vecchi da src\main...
del /f /q src\main\face.js 2>nul
del /f /q src\main\faceRecognition.js 2>nul
del /f /q src\main\recognitionManager.js 2>nul
del /f /q src\main\ELECTRON_EXAMPLES.js 2>nul
del /f /q src\main\ELECTRON_MIGRATION.md 2>nul
del /f /q src\main\ELECTRON_REFACTORING.md 2>nul
del /f /q src\main\config.js 2>nul

REM Rimuovi file vecchi da src\renderer
echo 🗑️  Rimozione file vecchi da src\renderer...
del /f /q src\renderer\src\Test.jsx 2>nul
del /f /q src\renderer\src\AutoCaption.jsx 2>nul
del /f /q src\renderer\src\EXAMPLES.js 2>nul
del /f /q src\renderer\src\*.md 2>nul

echo.
echo ✅ Pulizia completata!
echo.
echo 🚀 Prossimi passi:
echo    1. Verifica che tutti i file necessari siano presenti
echo    2. Esegui: npm run dev
echo    3. Se ci sono ancora errori, controlla la console
echo.
echo 📦 Backup salvato in: ..\autocaption-backup-%date:~0,4%%date:~5,2%%date:~8,2%\
echo.
pause
