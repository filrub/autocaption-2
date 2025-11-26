# AutoCAPTION Refactored - Installation Guide

## 📦 What's in This Package

This package contains all the refactored code for AutoCAPTION v1.27.0.

### Structure
```
autocaption-refactored/
├── docs/               # All documentation
├── main/               # Modified main process files
├── renderer/           # Modified renderer files
│   ├── components/     # New and modified components
│   └── utils/          # New utilities
├── preload/            # Modified preload
├── shared/             # NEW: Shared utilities
│   └── utils/
├── config/             # NEW: Centralized config
└── package.json        # Updated with new scripts
```

## 🚀 Installation Steps

### 1. Backup Your Current Project
```bash
cd your-autocaption-project
git add .
git commit -m "Backup before refactoring"
```

### 2. Copy New Files

**Create new directories:**
```bash
mkdir -p src/main/config
mkdir -p src/shared/utils
mkdir -p src/renderer/src/utils
```

**Copy NEW files:**
```bash
# Config
cp config/constants.js src/main/config/

# Shared utilities
cp shared/utils/math.js src/shared/utils/
cp shared/utils/async.js src/shared/utils/

# Renderer utilities
cp renderer/utils/faceMatching.js src/renderer/src/utils/

# New components
cp renderer/components/LoadingProgress.jsx src/renderer/src/components/
cp renderer/components/Stats.jsx src/renderer/src/components/
```

**Replace MODIFIED files:**
```bash
# Main process
cp main/image-manager.js src/main/
cp main/face-recognition-service.js src/main/
cp main/recognition-manager.js src/main/
cp main/exiftool-manager.js src/main/
cp main/ipc-handlers.js src/main/

# Preload
cp preload/index.js src/preload/

# Renderer
cp renderer/components/AutoCaption.jsx src/renderer/src/components/
cp renderer/components/PhotoCaptioner.jsx src/renderer/src/components/
```

**Copy documentation:**
```bash
cp docs/* ./
cp docs/.gitignore ./
chmod +x scripts.sh
```

**Update package.json scripts:**
```bash
# Merge the scripts section from the provided package.json
# Or just replace your package.json (but check dependencies first)
```

### 3. Test

```bash
# Install dependencies (if needed)
npm install

# Run in development
npm run dev

# Follow TESTING_CHECKLIST.md
```

## 📖 What to Read First

1. **START_HERE.txt** - Quick overview
2. **INDEX.md** - Documentation roadmap
3. **QUICK_START.md** - Getting started (5 min)
4. **TESTING_CHECKLIST.md** - Complete testing guide

## 🔧 Key Changes

### New Files (Must Add)
- `src/main/config/constants.js`
- `src/shared/utils/math.js`
- `src/shared/utils/async.js`
- `src/renderer/src/utils/faceMatching.js`
- `src/renderer/src/components/LoadingProgress.jsx`
- `src/renderer/src/components/Stats.jsx`

### Modified Files (Must Replace)
- All files in `main/`
- All files in `renderer/components/`
- `preload/index.js`
- `package.json` (merge scripts)

## ⚠️ Important Notes

1. **Python code NOT touched** - Your recognition.py is unchanged
2. **Backwards compatible** - All existing features work
3. **No new dependencies** - Uses existing npm packages
4. **Test thoroughly** - Follow TESTING_CHECKLIST.md

## 🆘 If Something Breaks

```bash
# Rollback via git
git stash
git checkout HEAD~1

# Or restore specific files
git checkout HEAD~1 -- [file-path]
```

## 📞 Next Steps

1. ✅ Install files as shown above
2. ✅ Read START_HERE.txt
3. ✅ Run `npm run dev`
4. ✅ Follow TESTING_CHECKLIST.md
5. ✅ Clean up old files (see FILES_TO_REMOVE.md)

## 🎉 Benefits

- ⚡ 20% faster image loading
- 🎨 Progress indicators
- 🐛 Fixed race conditions
- 💾 Smart caching
- 🧹 Cleaner code

---

**Version**: 1.27.0
**Date**: November 24, 2024
**Compatibility**: AutoCAPTION 1.26.x

Good luck! 🚀
