#!/usr/bin/env bash

# Enhanced build script for Ghostpost Reveal Browser Extension
# This script prepares the extension for distribution with better packaging

set -e

echo "🎭 Building Ghostpost Reveal Browser Extension..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: Please run this script from the project root directory"
  exit 1
fi

# Ensure WASM is built
echo "📦 Building WASM module..."
npm run build:wasm

# Copy WASM files to extension
echo "📋 Copying WASM files to extension..."
cp wasm/pkg/wasm.js browser-extension/wasm/
cp wasm/pkg/wasm_bg.wasm browser-extension/wasm/

# Create dist directory for packaged extension
echo "📁 Creating distribution packages..."
mkdir -p dist/extension

# Copy extension files to dist for packaging
echo "📄 Preparing extension files..."
rsync -av --exclude='test-*.html' --exclude='.DS_Store' browser-extension/ dist/extension/

# Create zip file for Chrome/Edge distribution
cd dist/extension
zip -r ../ghostpost-reveal-extension.zip . \
  -x "*.DS_Store" \
  -x "test-*.html"
cd ../..

# Copy the zip to static folder for web distribution
echo "📦 Copying distribution package to static folder..."
cp dist/ghostpost-reveal-extension.zip static/

echo "✅ Build complete!"
echo "📦 Extension packages created:"
echo "   - dist/ghostpost-reveal-extension.zip (Chrome/Edge/Firefox)"
echo "   - static/ghostpost-reveal-extension.zip (Web distribution)"
echo ""
echo "Installation methods:"
echo ""
echo "🔷 Chrome/Edge (Developer mode):"
echo "1. Open chrome://extensions (or edge://extensions)"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the browser-extension folder"
echo ""
echo "🦊 Firefox (Temporary):"
echo "1. Open about:debugging#/runtime/this-firefox"
echo "2. Click 'Load Temporary Add-on'"
echo "3. Navigate to browser-extension and select any file"
echo ""
echo "🌐 Web Installation:"
echo "Users can download from: https://your-domain.com/ghostpost-reveal-extension.zip"
echo ""
echo "For permanent Firefox installation, submit to: https://addons.mozilla.org"
echo "For Chrome Web Store submission, use: dist/ghostpost-reveal-extension.zip"
