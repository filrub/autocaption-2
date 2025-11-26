# ✅ Testing & Deployment Checklist

## Phase 1: Initial Review (5 minutes)

- [ ] Read `QUICK_START.md`
- [ ] Read `FINAL_SUMMARY.md`
- [ ] Review `FILE_MANIFEST.md` to see what changed
- [ ] Check git status: `git status`

## Phase 2: Basic Testing (15 minutes)

### Start the App
```bash
npm run dev
```

### Test Core Functionality
- [ ] App starts without errors
- [ ] No console errors in dev tools
- [ ] Main window appears correctly
- [ ] All buttons are visible and styled

### Test Image Loading
- [ ] Click "Select Folder"
- [ ] Choose folder with 10-20 images
- [ ] Click "Start Recognition"
- [ ] **NEW:** Progress bar appears and updates
- [ ] Images load in thumbnail gallery
- [ ] Click through thumbnails to view

### Test Face Recognition
- [ ] Click "Refresh Names" button
- [ ] Faces are detected and matched
- [ ] Names appear on images
- [ ] Click "Refresh Names" rapidly 3-5 times
- [ ] **FIXED:** Only one recognition runs (no race condition)

### Test Caption Saving
- [ ] Select an image with recognized faces
- [ ] Press Shift+Enter or click save
- [ ] Caption is written to image
- [ ] Image disappears from gallery (marked as done)

## Phase 3: Performance Testing (10 minutes)

### Test Large Folder
- [ ] Load folder with 100+ images
- [ ] **NEW:** UI remains responsive during load
- [ ] Progress bar shows accurate progress
- [ ] Memory usage stays reasonable (check Task Manager)
- [ ] All images eventually load

### Test Caching
- [ ] Load same folder again
- [ ] **NEW:** Should be faster (cached lowres images)
- [ ] Check `/Pictures/autocaption-lowres/` has cached files
- [ ] Modify one source image
- [ ] Reload - only modified image re-processes

### Test Rapid Actions
- [ ] Click buttons rapidly
- [ ] **FIXED:** No crashes or errors
- [ ] **FIXED:** No multiple operations running
- [ ] App remains stable

## Phase 4: Edge Cases (10 minutes)

### Test Error Scenarios
- [ ] Try empty folder
- [ ] Try folder with no images
- [ ] Try folder with only non-image files
- [ ] Disconnect from network (test local server)
- [ ] Test with corrupted image

### Test Settings
- [ ] Change similarity threshold
- [ ] Change face size threshold
- [ ] Change max faces
- [ ] Switch recognition server
- [ ] All settings persist after restart

## Phase 5: Code Review (15 minutes)

### Check New Files
- [ ] Review `src/main/config/constants.js`
- [ ] Review `src/shared/utils/math.js`
- [ ] Review `src/shared/utils/async.js`
- [ ] Check new components compile

### Check Modified Files
- [ ] Look at `image-manager.js` changes
- [ ] Look at `PhotoCaptioner.jsx` changes
- [ ] Verify imports are correct
- [ ] Check for any TypeScript/ESLint errors

### Run Utilities
```bash
chmod +x scripts.sh
./scripts.sh test-app
```
- [ ] All checks pass

## Phase 6: Documentation Review (10 minutes)

- [ ] Skim `DEVELOPER_GUIDE.md`
- [ ] Review `REFACTORING_SUMMARY.md`
- [ ] Check `CHANGELOG.md` makes sense
- [ ] Read `FILES_TO_REMOVE.md`

## Phase 7: Build Testing (20 minutes)

### Build the App
```bash
npm run build:mac  # or build:win / build:linux
```

### Test Built Version
- [ ] Build completes successfully
- [ ] Find built app in `out/` or `dist/`
- [ ] Launch built app
- [ ] Test basic functionality
- [ ] Test recognition still works
- [ ] Python server starts automatically
- [ ] ExifTool works in production

### Check Bundle
- [ ] App size is reasonable
- [ ] All resources included
- [ ] Recognition binary included
- [ ] No console errors in built version

## Phase 8: Cleanup (5 minutes)

If everything works:

```bash
# Backup old files
./scripts.sh backup

# Remove old files
./scripts.sh remove-old

# Update README
mv README.md README_OLD.md
mv README_NEW.md README.md
```

## Phase 9: Commit Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Refactor: Performance improvements and code cleanup

- Add centralized configuration
- Implement batch processing
- Fix race conditions in PhotoCaptioner
- Add progress indicators
- Create shared utilities
- Improve caching logic
- Update documentation

See REFACTORING_SUMMARY.md for details"

# Tag the release
git tag -a v1.27.0 -m "v1.27.0 - Major refactoring release"
```

## Phase 10: Deployment

### If Distributing to Users
- [ ] Test on clean machine
- [ ] Verify Python dependencies
- [ ] Check signed/notarized (macOS)
- [ ] Test auto-update (if applicable)
- [ ] Prepare release notes
- [ ] Update version in about dialog

### For Internal Use
- [ ] Update your local installation
- [ ] Test with real photos from recent shoot
- [ ] Verify database connectivity
- [ ] Check Supabase functions work
- [ ] Test on different photo formats

## 🚨 Rollback Plan

If something breaks:

```bash
# Immediate rollback
git stash
git checkout [previous-commit-hash]
npm install
npm run dev

# Or revert specific files
git checkout HEAD~1 -- [file-path]
```

## 📊 Success Criteria

All these should be true:
- ✅ App starts and runs without errors
- ✅ All existing features work
- ✅ Progress bar shows during loading
- ✅ No race conditions on rapid clicks
- ✅ Memory usage is controlled
- ✅ Caching improves performance
- ✅ Build succeeds for target platform
- ✅ Documentation is helpful

## 🎉 When Everything Passes

Congratulations! Your refactored app is:
- ⚡ Faster
- 🐛 More stable
- 🎨 Better UX
- 🧹 Cleaner code
- 📈 More maintainable

Time to celebrate! 🎊

---

## 📝 Notes Section

Use this space to note any issues found:

```
Issue: 
Solution: 

Issue: 
Solution: 
```

---

**Estimated Total Time: ~90 minutes**
**Break it into multiple sessions if needed!**

Last updated: 2024-11-24
