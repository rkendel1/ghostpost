#!/bin/bash

# Ghostpost Environment Setup Helper
# Sets up .env.local with Supabase credentials

set -e

echo "🔧 Ghostpost Environment Setup"
echo "================================"
echo ""
echo "This script will help you configure environment variables for deployment."
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Prompt for Supabase URL
echo ""
echo "📍 Enter your Supabase Project URL"
echo "   (From: Supabase Dashboard → Settings → API)"
echo "   Example: https://project.supabase.co"
read -p "SUPABASE_URL: " SUPABASE_URL

# Validate URL
if [[ ! $SUPABASE_URL =~ ^https:// ]]; then
    echo "❌ Invalid URL. Must start with https://"
    exit 1
fi

# Prompt for Anon Key
echo ""
echo "🔑 Enter your Supabase ANON KEY"
echo "   (From: Supabase Dashboard → Settings → API → anon)"
read -p "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

# Validate key
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Key cannot be empty"
    exit 1
fi

# Optional Service Role Key
echo ""
echo "🔐 Enter SUPABASE_SERVICE_ROLE_KEY (optional, only for backend)"
read -p "SUPABASE_SERVICE_ROLE_KEY (leave empty to skip): " SUPABASE_SERVICE_ROLE_KEY

# Create .env.local
cat > .env.local << EOF
# Ghostpost Environment Configuration
# Generated: $(date)

# Required: Supabase Configuration
PUBLIC_SUPABASE_URL=${SUPABASE_URL}
PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Optional: Service role key (for backend operations only)
$(if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then echo "PRIVATE_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"; else echo "# PRIVATE_SUPABASE_SERVICE_ROLE_KEY="; fi)

# API Configuration
PUBLIC_API_URL=https://ghostpost.app
PUBLIC_API_TIMEOUT=30000

# Feature Flags
PUBLIC_ENABLE_SECURE_NOTES=true
PUBLIC_ENABLE_CONVERSATIONAL=true
PUBLIC_ENABLE_ADAPTIVE_REVEALS=true

# Environment
NODE_ENV=production
EOF

echo ""
echo "✅ Configuration saved to .env.local"
echo ""
echo "📋 Configuration:"
echo "   SUPABASE_URL: ${SUPABASE_URL}"
echo "   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "   SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi

echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   • Keep ANON_KEY in frontend .env.local (safe to expose)"
echo "   • Never commit .env.local to version control"
echo "   • Never expose SERVICE_ROLE_KEY in frontend code"
echo "   • Use SERVICE_ROLE_KEY only on backend/server"

echo ""
echo "✨ Next steps:"
echo "   1. Verify configuration: npm run build"
echo "   2. Test locally: npm run preview"
echo "   3. Deploy: vercel deploy --prod"

echo ""
echo "ℹ️  To use these variables in Vercel:"
echo "   vercel env add PUBLIC_SUPABASE_URL"
echo "   vercel env add PUBLIC_SUPABASE_ANON_KEY"

exit 0
