import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iqpkfxkqxoodlwvnrpki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxcGtmeGtxeG9vZGx3dm5ycGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDQwNjcsImV4cCI6MjA4NDA4MDA2N30.BlPaoJgdlw59_XWmtPPYo3IevQ1fy87tgMMMoaARvBY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMigrationStatus() {
  console.log('🔍 Verificando estado de migraciones en Supabase...\n');

  try {
    // Tablas clave que deberían existir después de la migración
    const criticalTables = [
      'users',
      'products',
      'product_variants',
      'categories',
      'b2b_carts',
      'b2c_carts',
      'orders',
      'order_items',
      'addresses',
    ];

    console.log('📋 Verificando tablas críticas:\n');

    let successCount = 0;
    let failCount = 0;

    for (const tableName of criticalTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error && error.code === 'PGRST116') {
          console.log(`❌ ${tableName} - NO EXISTE`);
          failCount++;
        } else if (error) {
          console.log(`⚠️  ${tableName} - ERROR: ${error.message}`);
          failCount++;
        } else {
          console.log(`✅ ${tableName} - EXISTE (${count || 0} registros)`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${tableName} - ERROR: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`✅ Tablas encontradas: ${successCount}`);
    console.log(`❌ Tablas faltantes: ${failCount}`);

    if (successCount === criticalTables.length) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('\n⚠️  La migración aún no se ha completado correctamente.');
    }

  } catch (error) {
    console.error('❌ Error verificando migraciones:', error.message);
  }
}

checkMigrationStatus();
