#!/bin/bash

# Ghostpost Deployment Verification Script
# Checks that all components are ready for production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

function print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

function check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASS++))
}

function check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAIL++))
}

function check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

# Start verification
print_header "🚀 Ghostpost Deployment Verification"

# Check Node.js
print_header "1️⃣  Environment Setup"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not found"
fi

# Check environment variables
print_header "2️⃣  Environment Variables"
if [ -z "$SUPABASE_URL" ]; then
    check_warn "SUPABASE_URL not set (needed for database migration)"
else
    check_pass "SUPABASE_URL set"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    check_warn "SUPABASE_ANON_KEY not set (needed for API)"
else
    check_pass "SUPABASE_ANON_KEY set"
fi

# Check build files
print_header "3️⃣  Build & Dependencies"
if [ -f "package.json" ]; then
    check_pass "package.json found"
else
    check_fail "package.json not found"
fi

if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_warn "node_modules not installed (run: npm install)"
fi

# Check source files
print_header "4️⃣  Source Files"
declare -a FILES=(
    "src/routes/api/secure-notes/create/+server.ts"
    "src/routes/api/secure-notes/reveal/+server.ts"
    "src/routes/api/secure-notes/status/+server.ts"
    "src/routes/api/secure-notes/revoke/+server.ts"
    "src/lib/secure-notes.ts"
    "src/lib/secure-notes-service.ts"
    "src/routes/compose/SecureNoteComposer.svelte"
    "src/routes/decode/SecureNoteReveal.svelte"
    "src/lib/dom-walker.ts"
    "browser-extension/manifest.json"
    "supabase/migrations/20260811_create_secure_notes.sql"
    "wasm/src/hidenly.rs"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "Found: $file"
    else
        check_fail "Missing: $file"
    fi
done

# Check WASM
print_header "5️⃣  WASM Module"
if [ -f "wasm/pkg/hidenly.wasm" ] || [ -f "browser-extension/wasm/wasm_bg.wasm" ]; then
    check_pass "WASM binary compiled"
else
    check_warn "WASM binary not found (run: npm run wasm:build)"
fi

# Check database migration
print_header "6️⃣  Database Migration"
if [ -f "supabase/migrations/20260811_create_secure_notes.sql" ]; then
    TABLES=$(grep -c "CREATE TABLE" supabase/migrations/20260811_create_secure_notes.sql || true)
    INDEXES=$(grep -c "CREATE INDEX" supabase/migrations/20260811_create_secure_notes.sql || true)
    POLICIES=$(grep -c "CREATE POLICY" supabase/migrations/20260811_create_secure_notes.sql || true)

    check_pass "Migration SQL found"
    echo "   - $TABLES table(s)"
    echo "   - $INDEXES index(es)"
    echo "   - $POLICIES RLS polic(ies)"
else
    check_fail "Migration SQL not found"
fi

# Check browser extension
print_header "7️⃣  Browser Extension"
if [ -f "browser-extension/manifest.json" ]; then
    check_pass "manifest.json exists"

    if grep -q "\"manifest_version\": 3" browser-extension/manifest.json; then
        check_pass "Manifest V3 format"
    else
        check_warn "Not using Manifest V3"
    fi
else
    check_fail "manifest.json not found"
fi

EXTENSION_FILES=(
    "browser-extension/scripts/content.js"
    "browser-extension/scripts/background.js"
    "browser-extension/utils/dom-walker.js"
    "browser-extension/sidebar/panel.html"
)

for file in "${EXTENSION_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "Extension file: $(basename $file)"
    else
        check_fail "Extension file missing: $file"
    fi
done

# Check deployment files
print_header "8️⃣  Deployment Files"
DEPLOY_FILES=(
    "deploy/ghostpost-extension.zip"
    "deploy/ghostpost.user.js"
    "deploy/DEPLOYMENT_GUIDE.md"
    "deploy/.env.example"
    "deploy/run-migration.js"
)

for file in "${DEPLOY_FILES[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(du -h "$file" | cut -f1)
        check_pass "Deployment file: $file ($SIZE)"
    else
        check_fail "Deployment file missing: $file"
    fi
done

# Check build ability
print_header "9️⃣  Build Verification"
if [ -d "node_modules" ]; then
    echo "Testing build (this may take a minute)..."
    if npm run build > /dev/null 2>&1; then
        if [ -d ".svelte-kit/output" ]; then
            check_pass "Build successful (.svelte-kit/output exists)"
        else
            check_fail "Build output not found"
        fi
    else
        check_fail "Build failed"
    fi
else
    check_warn "Can't test build (npm install required first)"
fi

# Summary
print_header "📊 Deployment Readiness Summary"
echo -e "✅ Passed:  ${GREEN}$PASS${NC}"
echo -e "❌ Failed:  ${RED}$FAIL${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARN${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}✨ All checks passed! Ready for deployment.${NC}\n"

    echo "📋 Next steps:"
    echo "   1. Set environment variables (see deploy/.env.example)"
    echo "   2. Apply database migration (see deploy/DEPLOYMENT_GUIDE.md)"
    echo "   3. Deploy API endpoints"
    echo "   4. Submit browser extension to Chrome Web Store"
    echo "   5. Submit userscript to GreasyFork"
    echo "   6. Run end-to-end tests"

    exit 0
else
    echo -e "\n${RED}❌ Deployment blocked due to failed checks${NC}"
    echo -e "${YELLOW}   Please fix errors above before deploying${NC}\n"
    exit 1
fi
