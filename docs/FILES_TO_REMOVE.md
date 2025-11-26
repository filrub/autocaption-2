# Files to Remove

These files are duplicates, unused, or have been replaced by the refactored code:

## Main Process

### Documentation files (can be archived)
- src/main/ELECTRON_EXAMPLES.js
- src/main/ELECTRON_MIGRATION.md
- src/main/ELECTRON_REFACTORING.md

### Duplicate/Old implementations
- src/main/face.js (old implementation, replaced by face-recognition-service.js)
- src/main/faceRecognition.js (old implementation, replaced by face-recognition-service.js)
- src/main/recognitionManager.js (old implementation, replaced by recognition-manager.js)

### Old server files
- server.py (root level - duplicate of src/main/server.py)
- server.spec (root level - duplicate of src/main/server.spec)
- pyinstaller_spec.py (root level - can be in src/main if needed)

## Renderer

### Example/template files
- src/renderer/src/Test.jsx (if not used)
- src/renderer/src/EXAMPLES.js (documentation, can archive)
- src/renderer/src/MIGRATION.md (documentation, can archive)
- src/renderer/src/REFACTORING.md (documentation, can archive)
- src/renderer/src/QUICKSTART.md (documentation, can archive)
- src/renderer/src/ARCHITECTURE.md (documentation, can archive)
- src/renderer/src/INDEX.md (documentation, can archive)
- src/renderer/src/UI_UX_IMPROVEMENTS.md (documentation, can archive)

### Duplicate components
- src/renderer/src/AutoCaption.jsx (root level - we use components/AutoCaption.jsx)

## Commands to Clean

```bash
# Backup first!
mkdir -p ../autocaption-backup/docs
mkdir -p ../autocaption-backup/old-code

# Move documentation to backup
mv src/main/ELECTRON_*.{js,md} ../autocaption-backup/docs/
mv src/renderer/src/*.md ../autocaption-backup/docs/
mv src/renderer/src/EXAMPLES.js ../autocaption-backup/docs/

# Move old implementations to backup
mv src/main/face.js ../autocaption-backup/old-code/
mv src/main/faceRecognition.js ../autocaption-backup/old-code/
mv src/main/recognitionManager.js ../autocaption-backup/old-code/

# Remove root duplicates (if they exist)
rm -f server.py server.spec

# Remove duplicate AutoCaption.jsx if it exists at root level
rm -f src/renderer/src/AutoCaption.jsx

# Remove Test component if not used
rm -f src/renderer/src/Test.jsx
```

## Verification

After removing files, verify the app still works:

```bash
# Run in dev mode
npm run dev

# Check for any import errors in console
# Test all features
# Build the app
npm run build
```

## Files to Keep

These look similar but are actually in use:
- ✅ src/main/recognition-manager.js (active, refactored)
- ✅ src/main/face-recognition-service.js (active, refactored)
- ✅ src/main/recognition.py (active Python server)
- ✅ src/main/server.py (active Python server)
- ✅ src/renderer/src/components/AutoCaption.jsx (active component)

## Safety First

Before deleting anything:
1. Commit current working code to git
2. Create backup folder
3. Move files to backup (don't delete yet)
4. Test thoroughly
5. If everything works after a week, can delete backup
