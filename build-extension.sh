#!/usr/bin/env bash

# Build script for Hidenly Browser Extension
# This script prepares the extension for distribution

set -e

echo "🎭 Building Hidenly Browser Extension..."

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
echo "📁 Creating distribution package..."
mkdir -p dist

# Create a zip file for distribution (exclude test files)
cd browser-extension
zip -r ../dist/hidenly-extension.zip . \
  -x "test-page.html" \
  -x "*.DS_Store"
cd ..

echo "✅ Build complete!"
echo "📦 Extension package: dist/hidenly-extension.zip"
echo ""
echo "To install:"
echo "1. Open chrome://extensions (or edge://extensions)"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select the browser-extension folder"
echo ""
echo "Or install from the zip file:"
echo "1. Extract dist/hidenly-extension.zip"
echo "2. Follow the steps above"
