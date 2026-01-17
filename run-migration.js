import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://iqpkfxkqxoodlwvnrpki.supabase.co';
const SUPABASE_PASSWORD = 'Kamounou*78*';

// Create a service role client (with admin access)
const supabase = createClient(
  SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcGtmeGtxeG9vZGx3dm5ycGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDQwNjcsImV4cCI6MjA4NDA4MDA2N30.BlPaoJgdlw59_XWmtPPYo3IevQ1fy87tgMMMoaARvBY'
);

// Read the migration file
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260115200006_remix_migration_from_pg_dump.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Iniciando migración de base de datos...');

// Execute the migration using raw SQL via Supabase Admin API
async function runMigration() {
  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PASSWORD}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcGtmeGtxeG9vZGx3dm5ycGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDQwNjcsImV4cCI6MjA4NDA4MDA2N30.BlPaoJgdlw59_XWmtPPYo3IevQ1fy87tgMMMoaARvBY'
      },
      body: JSON.stringify({ sql: migrationSQL })
    });

    if (!response.ok) {
      console.error('❌ Error en la migración:');
      const error = await response.json();
      console.error(error);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Migración completada exitosamente!');
    console.log('📊 Resultado:', result);
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
