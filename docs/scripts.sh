#!/bin/bash

# AutoCAPTION Maintenance Scripts

function show_help() {
    echo "AutoCAPTION Maintenance Utilities"
    echo ""
    echo "Usage: ./scripts.sh [command]"
    echo ""
    echo "Commands:"
    echo "  cleanup       - Clean build artifacts and cache"
    echo "  backup        - Backup old files before removal"
    echo "  remove-old    - Remove old/duplicate files (after backup)"
    echo "  check-deps    - Check for outdated dependencies"
    echo "  build-all     - Build for all platforms"
    echo "  test-app      - Run basic app tests"
    echo "  help          - Show this help"
}

function cleanup() {
    echo "🧹 Cleaning build artifacts..."
    rm -rf out/
    rm -rf dist/
    rm -rf .electron-vite/
    rm -rf node_modules/.vite/
    echo "✅ Cleanup complete"
}

function backup_old_files() {
    echo "📦 Creating backup of old files..."
    
    mkdir -p ../autocaption-backup/docs
    mkdir -p ../autocaption-backup/old-code
    
    # Documentation
    [ -f "src/main/ELECTRON_EXAMPLES.js" ] && cp src/main/ELECTRON_EXAMPLES.js ../autocaption-backup/docs/
    [ -f "src/main/ELECTRON_MIGRATION.md" ] && cp src/main/ELECTRON_MIGRATION.md ../autocaption-backup/docs/
    [ -f "src/main/ELECTRON_REFACTORING.md" ] && cp src/main/ELECTRON_REFACTORING.md ../autocaption-backup/docs/
    
    # Old code
    [ -f "src/main/face.js" ] && cp src/main/face.js ../autocaption-backup/old-code/
    [ -f "src/main/faceRecognition.js" ] && cp src/main/faceRecognition.js ../autocaption-backup/old-code/
    [ -f "src/main/recognitionManager.js" ] && cp src/main/recognitionManager.js ../autocaption-backup/old-code/
    
    echo "✅ Backup created in ../autocaption-backup/"
}

function remove_old_files() {
    echo "🗑️  Removing old files..."
    echo "⚠️  Make sure you have a backup!"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f src/main/ELECTRON_EXAMPLES.js
        rm -f src/main/ELECTRON_MIGRATION.md
        rm -f src/main/ELECTRON_REFACTORING.md
        rm -f src/main/face.js
        rm -f src/main/faceRecognition.js
        rm -f src/main/recognitionManager.js
        rm -f src/renderer/src/Test.jsx
        echo "✅ Old files removed"
    else
        echo "❌ Cancelled"
    fi
}

function check_dependencies() {
    echo "🔍 Checking for outdated dependencies..."
    npx npm-check-updates
    echo ""
    echo "To update: npx npm-check-updates -u && npm install"
}

function build_all() {
    echo "🏗️  Building for all platforms..."
    npm run build
    echo "✅ Build complete"
}

function test_app() {
    echo "🧪 Running basic tests..."
    
    # Check if key files exist
    echo "Checking file structure..."
    [ -f "src/main/index.js" ] && echo "✅ Main process" || echo "❌ Main process missing"
    [ -f "src/preload/index.js" ] && echo "✅ Preload" || echo "❌ Preload missing"
    [ -f "src/renderer/src/App.jsx" ] && echo "✅ Renderer" || echo "❌ Renderer missing"
    [ -f "src/main/recognition.py" ] && echo "✅ Recognition server" || echo "❌ Recognition server missing"
    
    # Check config
    [ -f "src/main/config/constants.js" ] && echo "✅ Config" || echo "❌ Config missing"
    
    # Check shared utils
    [ -f "src/shared/utils/math.js" ] && echo "✅ Math utils" || echo "❌ Math utils missing"
    [ -f "src/shared/utils/async.js" ] && echo "✅ Async utils" || echo "❌ Async utils missing"
    
    echo ""
    echo "To run full test: npm run dev"
}

# Main script logic
case "$1" in
    cleanup)
        cleanup
        ;;
    backup)
        backup_old_files
        ;;
    remove-old)
        remove_old_files
        ;;
    check-deps)
        check_dependencies
        ;;
    build-all)
        build_all
        ;;
    test-app)
        test_app
        ;;
    help|*)
        show_help
        ;;
esac
