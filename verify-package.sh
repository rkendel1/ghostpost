#!/bin/bash
# verify-package.sh - Verify StackLive package structure

echo "🔍 Verifying StackLive Integration Package..."
echo ""

# Check if package directory exists
if [ ! -d "stacklive-package" ]; then
  echo "❌ Error: stacklive-package directory not found"
  exit 1
fi

echo "✅ Package directory exists"

# Check essential files
FILES=(
  "README.md"
  "INTEGRATION_GUIDE.md"
  "SUMMARY.md"
  "package.json"
  "stacklive-integration.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "stacklive-package/$file" ]; then
    echo "✅ $file"
  else
    echo "❌ Missing: $file"
  fi
done

# Check WASM files
echo ""
echo "📦 Checking WASM components..."
if [ -f "stacklive-package/wasm/wasm_bg.wasm" ]; then
  SIZE=$(du -h "stacklive-package/wasm/wasm_bg.wasm" | cut -f1)
  echo "✅ WASM binary ($SIZE)"
else
  echo "❌ Missing: WASM binary"
fi

if [ -f "stacklive-package/wasm/wasm.js" ]; then
  echo "✅ WASM loader"
else
  echo "❌ Missing: WASM loader"
fi

if [ -f "stacklive-package/wasm/wasm.d.ts" ]; then
  echo "✅ WASM types"
else
  echo "❌ Missing: WASM types"
fi

# Check overlay runtime
echo ""
echo "🎨 Checking overlay runtime..."
RUNTIME_FILES=(
  "overlay-runtime/index.ts"
  "overlay-runtime/pattern-detector/detector.ts"
  "overlay-runtime/overlay-core/overlayStateMachine.ts"
  "overlay-runtime/overlay-core/stackliveRuntimeBridge.ts"
  "overlay-runtime/stacklive-adapter/adapter.ts"
)

for file in "${RUNTIME_FILES[@]}"; do
  if [ -f "stacklive-package/$file" ]; then
    echo "✅ ${file##*/}"
  else
    echo "❌ Missing: $file"
  fi
done

# Check examples
echo ""
echo "📚 Checking examples..."
if [ -f "stacklive-package/examples/basic-integration.html" ]; then
  echo "✅ Basic integration example"
else
  echo "❌ Missing: basic-integration.html"
fi

if [ -f "stacklive-package/examples/vanilla-js.html" ]; then
  echo "✅ Vanilla JS example"
else
  echo "❌ Missing: vanilla-js.html"
fi

# Check web components
echo ""
echo "🧩 Checking web components..."
if [ -f "stacklive-package/web-components/stacklive-overlay.ts" ]; then
  echo "✅ StackLive overlay component"
else
  echo "❌ Missing: stacklive-overlay.ts"
fi

if [ -f "stacklive-package/web-components/index.html" ]; then
  echo "✅ Component demo page"
else
  echo "❌ Missing: component demo"
fi

# Check userscript
echo ""
echo "🔧 Checking userscript..."
if [ -f "stacklive-package/userscript/ghostpost-reveal.user.js" ]; then
  echo "✅ Userscript"
else
  echo "❌ Missing: userscript"
fi

# Count total files
echo ""
echo "📊 Package statistics..."
TOTAL_FILES=$(find stacklive-package -type f | wc -l)
TOTAL_SIZE=$(du -sh stacklive-package | cut -f1)
echo "Total files: $TOTAL_FILES"
echo "Total size: $TOTAL_SIZE"

# Check for TypeScript files
TS_FILES=$(find stacklive-package -name "*.ts" | wc -l)
echo "TypeScript files: $TS_FILES"

# Check for HTML files
HTML_FILES=$(find stacklive-package -name "*.html" | wc -l)
echo "HTML examples: $HTML_FILES"

# Check for documentation
MD_FILES=$(find stacklive-package -name "*.md" | wc -l)
echo "Documentation files: $MD_FILES"

echo ""
echo "✅ Package verification complete!"
echo ""
echo "📖 Next steps:"
echo "1. Review the README.md for usage instructions"
echo "2. Check INTEGRATION_GUIDE.md for StackLive integration"
echo "3. Try the examples in examples/ directory"
echo "4. Test by running: cd examples && npx serve"
