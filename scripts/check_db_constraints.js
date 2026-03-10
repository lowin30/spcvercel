const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https', 'postgres').replace('.supabase.co', ':5432/postgres')
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'partes_de_trabajo'::regclass AND n.nspname = 'public';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  
  const res2 = await client.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = 'tipo_jornada'::regtype;`);
  console.log("Tipos de Jornada Permitidos (si es enum):", res2.rows);

  await client.end();
}

check().catch(console.error);
