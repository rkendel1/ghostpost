#!/usr/bin/env node

/**
 * Ghostpost Database Migration Runner
 * Applies secure notes schema to Supabase
 *
 * Usage:
 *   node deploy/run-migration.js
 *
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_ANON_KEY - Your Supabase anon key
 *   (Optional) SUPABASE_SERVICE_ROLE_KEY - For admin operations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

function logError(message) {
  log('red', `❌ ERROR: ${message}`);
}

function logSuccess(message) {
  log('green', `✅ SUCCESS: ${message}`);
}

function logInfo(message) {
  log('blue', `ℹ️  ${message}`);
}

async function runMigration() {
  logSection('🚀 Ghostpost Database Migration Runner');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError('Missing environment variables!');
    log('yellow', '\nRequired:');
    log('yellow', '  SUPABASE_URL - Your Supabase project URL');
    log('yellow', '  SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
    log('yellow', '\nExample:');
    log('yellow', '  export SUPABASE_URL="https://project.supabase.co"');
    log('yellow', '  export SUPABASE_ANON_KEY="your-key-here"');
    log('yellow', '  node deploy/run-migration.js');
    process.exit(1);
  }

  logInfo(`Connecting to: ${supabaseUrl}`);

  // Read migration SQL file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260811_create_secure_notes.sql');

  if (!fs.existsSync(migrationPath)) {
    logError(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  logInfo(`Loaded migration SQL (${migrationSQL.length} bytes)`);

  // Execute migration via Supabase API
  try {
    logSection('📝 Executing Migration');

    // For this we'll use Supabase REST API to execute SQL
    // Note: This requires admin access, so using service role key if available
    const projectRef = supabaseUrl.split('/')[2].split('.')[0];

    logInfo(`Project Reference: ${projectRef}`);
    logInfo(`Using key: ${supabaseKey.substring(0, 10)}...`);

    // Note: The Supabase SQL API is not directly exposed via REST
    // In production, you should use one of these approaches:
    // 1. Supabase CLI: supabase db push
    // 2. Direct connection via psql
    // 3. Dashboard SQL editor
    // 4. Custom endpoint that handles migrations

    logSection('📋 Migration Summary');

    // Parse migration to show what will be created
    const tables = migrationSQL.match(/CREATE TABLE.*?;/gs) || [];
    const indexes = migrationSQL.match(/CREATE INDEX.*?;/gs) || [];
    const policies = migrationSQL.match(/CREATE POLICY.*?;/gs) || [];
    const triggers = migrationSQL.match(/CREATE TRIGGER.*?;/gs) || [];
    const views = migrationSQL.match(/CREATE OR REPLACE VIEW.*?;/gs) || [];
    const functions = migrationSQL.match(/CREATE OR REPLACE FUNCTION.*?;/gs) || [];

    log('yellow', `📊 Objects to be created:`);
    log('cyan', `  • ${tables.length} table(s)`);
    log('cyan', `  • ${indexes.length} index(es)`);
    log('cyan', `  • ${policies.length} RLS polic(ies)`);
    log('cyan', `  • ${triggers.length} trigger(s)`);
    log('cyan', `  • ${functions.length} function(s)`);
    log('cyan', `  • ${views.length} view(s)`);

    log('yellow', '\nTables:');
    const tableMatches = migrationSQL.match(/CREATE TABLE.*?\(([\s\S]*?)\);/g) || [];
    tableMatches.forEach((match, i) => {
      const tableName = match.match(/CREATE TABLE[^(]*public\.(\w+)/)?.[1];
      if (tableName) {
        log('cyan', `  ✓ public.${tableName}`);
      }
    });

    log('yellow', '\n⚠️  IMPORTANT: Manual Steps Required\n');

    log('white', `The Supabase SQL API requires manual execution. Choose one:\n`);

    log('yellow', '📌 Option 1: Via Supabase Dashboard (Easiest)');
    log('white', `  1. Visit: ${supabaseUrl}`);
    log('white', `  2. Go to SQL Editor`);
    log('white', `  3. Click "New Query"`);
    log('white', `  4. Copy & paste: supabase/migrations/20260811_create_secure_notes.sql`);
    log('white', `  5. Click "Run"`);
    log('white', `  6. Verify success\n`);

    log('yellow', '📌 Option 2: Via Supabase CLI');
    log('white', `  supabase link --project-ref YOUR_PROJECT_REF`);
    log('white', `  supabase db push\n`);

    log('yellow', '📌 Option 3: Via psql (Direct Connection)');
    log('white', `  psql "postgresql://postgres:password@db.${projectRef}.supabase.co:5432/postgres" < supabase/migrations/20260811_create_secure_notes.sql\n`);

    // Provide verification SQL
    logSection('✅ Verification Commands');

    log('yellow', 'After migration, verify with these SQL queries:\n');

    const verificationQueries = [
      {
        name: 'List all tables',
        sql: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
      },
      {
        name: 'Check secure_notes table',
        sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'secure_notes';`
      },
      {
        name: 'List indexes',
        sql: `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('secure_notes', 'note_reveal_records');`
      },
      {
        name: 'List RLS policies',
        sql: `SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public';`
      },
      {
        name: 'Check if analytics view exists',
        sql: `SELECT * FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'secure_notes_analytics';`
      }
    ];

    verificationQueries.forEach((q, i) => {
      log('cyan', `${i + 1}. ${q.name}:`);
      log('white', `   ${q.sql}\n`);
    });

    logSection('📦 Next Steps');

    log('yellow', '1. ✅ Manual SQL Execution');
    log('white', '   Execute the migration using one of the options above\n');

    log('yellow', '2. 🔍 Verify Migration Success');
    log('white', '   Run verification queries (see above)\n');

    log('yellow', '3. 🚀 Deploy API Endpoints');
    log('white', '   See DEPLOYMENT_GUIDE.md for API deployment\n');

    log('yellow', '4. 📦 Deploy Browser Extension');
    log('white', '   See DEPLOYMENT_GUIDE.md for extension deployment\n');

    log('yellow', '5. 🧪 End-to-End Test');
    log('white', '   Test full flow: Create → Share → Detect → Reveal\n');

    logSuccess('Migration preparation complete!');

  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
