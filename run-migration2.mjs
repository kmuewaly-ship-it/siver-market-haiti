import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://iqpkfxkqxoodlwvnrpki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcGtmeGtxeG9vZGx3dm5ycGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDQwNjcsImV4cCI6MjA4NDA4MDA2N30.BlPaoJgdlw59_XWmtPPYo3IevQ1fy87tgMMMoaARvBY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQLFile() {
  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260115200006_remix_migration_from_pg_dump.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Ejecutando migración SQL...');
    console.log('📁 Archivo:', migrationPath);
    console.log('📏 Tamaño:', (sqlContent.length / 1024).toFixed(2), 'KB');

    // Try to execute via the admin API using fetch
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: sqlContent
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQLFile();
