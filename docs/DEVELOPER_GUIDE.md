# Developer Guide - AutoCAPTION Refactored

## Quick Start

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build:mac  # or build:win, build:linux
```

## Project Structure

```
autocaption/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── config/
│   │   │   └── constants.js     # 🆕 All configuration
│   │   ├── image-manager.js     # ⚡ Image processing (refactored)
│   │   ├── face-recognition-service.js  # ⚡ Face matching (refactored)
│   │   ├── recognition-manager.js       # ⚡ Python server manager (refactored)
│   │   ├── exiftool-manager.js  # ⚡ EXIF writing (refactored)
│   │   ├── ipc-handlers.js      # ⚡ IPC with progress (refactored)
│   │   ├── index.js             # Main entry point
│   │   └── recognition.py       # Python FastAPI server
│   ├── preload/
│   │   └── index.js             # ⚡ IPC bridge (updated)
│   ├── renderer/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── AutoCaption.jsx      # ⚡ Main UI (refactored)
│   │       │   ├── PhotoCaptioner.jsx   # ⚡ Photo item (fixed races)
│   │       │   ├── LoadingProgress.jsx  # 🆕 Progress indicator
│   │       │   ├── Stats.jsx            # 🆕 Stats display
│   │       │   └── ...
│   │       ├── utils/
│   │       │   └── faceMatching.js      # 🆕 Face recognition utils
│   │       └── App.jsx
│   └── shared/                  # 🆕 Shared between main/renderer
│       └── utils/
│           ├── math.js          # 🆕 Math utilities
│           └── async.js         # 🆕 Async utilities
└── ...
```

Legend: 🆕 New file | ⚡ Refactored

## Architecture Overview

### Main Process (Node.js)

**Configuration** (`src/main/config/constants.js`)
- Centralized configuration for all services
- IMAGE_CONFIG, RECOGNITION_CONFIG, EXIFTOOL_CONFIG, UI_CONFIG

**Managers** (Singleton Pattern)
- `imageManager` - Image processing and caching
- `recognitionManager` - Python server lifecycle
- `exifToolManager` - EXIF metadata writing
- `faceRecognitionService` - Face matching logic

**IPC Handlers** (`src/main/ipc-handlers.js`)
- Bridges renderer ↔ main process
- Now includes progress reporting

### Renderer Process (React)

**State Management**
- Local storage for preferences
- React hooks for component state
- useCallback for stable references

**Components**
- Smart components: AutoCaption (container)
- Dumb components: PhotoCaptioner, PhotoViewer, etc.
- New: LoadingProgress, Stats

### Shared Utilities

**Math Utils** (`src/shared/utils/math.js`)
```javascript
import { cosineSimilarity, cosineSimilarityPercent } from '../shared/utils/math.js'

const similarity = cosineSimilarity(vector1, vector2) // 0-1
const percent = cosineSimilarityPercent(vector1, vector2) // 0-100
```

**Async Utils** (`src/shared/utils/async.js`)
```javascript
import { processBatch, retry } from '../shared/utils/async.js'

// Process in batches
const results = await processBatch(items, 10, async (item) => {
  return await processItem(item)
})

// Retry with exponential backoff
const result = await retry(async () => {
  return await unreliableOperation()
}, 3, 500)
```

## Key Improvements

### 1. Performance

**Before:**
```javascript
// Processed all images at once - UI freeze
const images = await Promise.all(files.map(processImage))
```

**After:**
```javascript
// Batch processing with progress
const images = await processBatchWithProgress(
  files, 
  10, 
  processImage,
  (processed, total) => sendProgress(processed, total)
)
```

### 2. Race Conditions

**Before:**
```javascript
// Multiple clicks could start multiple recognitions
const recognizeFaces = async () => {
  setIndexing(true)
  // ... recognition logic
  setIndexing(false)
}
```

**After:**
```javascript
// Proper guard and cancellation
const recognizeFaces = async () => {
  if (processingRef.current) return // Guard
  
  if (abortControllerRef.current) {
    abortControllerRef.current.abort() // Cancel previous
  }
  
  processingRef.current = true
  // ... recognition logic
}
```

### 3. Configuration

**Before:**
```javascript
const MAX_DIMENSION = 1500 // Magic number in code
```

**After:**
```javascript
import { IMAGE_CONFIG } from './config/constants.js'
const maxDim = IMAGE_CONFIG.MAX_DIMENSION // Centralized
```

## Common Tasks

### Adding a New Configuration Option

1. Edit `src/main/config/constants.js`:
```javascript
export const MY_CONFIG = {
  NEW_OPTION: 100
}
```

2. Import where needed:
```javascript
import { MY_CONFIG } from './config/constants.js'
```

### Adding a New Utility Function

1. Create or edit in `src/shared/utils/`:
```javascript
export function myUtility(input) {
  // Implementation
  return result
}
```

2. Import in main or renderer:
```javascript
import { myUtility } from '../shared/utils/myFile.js'
```

### Adding Progress Reporting

1. In main process (IPC handler):
```javascript
ipcMain.handle('my-operation', async (event, data) => {
  const onProgress = (current, total) => {
    event.sender.send('my-operation-progress', { current, total })
  }
  
  return await myOperation(data, onProgress)
})
```

2. In preload:
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  myOperation: (data) => ipcRenderer.invoke('my-operation', data),
  onMyOperationProgress: (callback) => {
    ipcRenderer.on('my-operation-progress', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('my-operation-progress')
  }
})
```

3. In renderer:
```javascript
useEffect(() => {
  const cleanup = window.electronAPI.onMyOperationProgress((data) => {
    setProgress(data)
  })
  return cleanup
}, [])
```

## Testing

### Manual Testing Checklist

- [ ] Load small folder (10 images)
- [ ] Load large folder (100+ images)
- [ ] Check progress indicator
- [ ] Click "Refresh Names" rapidly
- [ ] Check lowres cache works
- [ ] Save captions
- [ ] Test with no network
- [ ] Check memory usage
- [ ] Verify logs are clean

### Debugging

**Enable verbose logging:**
```javascript
// In main process
log.transports.file.level = 'debug'
```

**Check logs:**
- macOS: `~/Library/Logs/AutoCAPTION/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\AutoCAPTION\logs\main.log`
- Linux: `~/.config/AutoCAPTION/logs/main.log`

## Performance Tips

1. **Large folders** - Increase batch size in config
2. **Slow recognition** - Check Python server is running
3. **Memory issues** - Enable lowres cache cleanup
4. **UI freezing** - Check for missing useCallback

## Troubleshooting

**Images not loading:**
- Check target folder permissions
- Verify image formats are supported
- Check lowres folder exists

**Recognition not working:**
- Check Python server status
- Verify port 8000 is not in use
- Check Python dependencies installed

**EXIF writing fails:**
- Verify ExifTool is installed
- Check file permissions
- Look for "BatchCluster" errors in logs

## Contributing

1. Follow existing patterns
2. Use shared utilities
3. Add to centralized config
4. Include progress reporting for long operations
5. Use useCallback for handlers
6. Clean up in useEffect
7. Log appropriately (info, warn, error)

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Hooks](https://react.dev/reference/react)
- [Mantine UI](https://mantine.dev/)
- [InsightFace](https://github.com/deepinsight/insightface)
