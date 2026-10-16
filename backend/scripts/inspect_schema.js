const { Client } = require('pg');

async function inspectSuperAdminSchema() {
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });
  await saClient.connect();

  const tables = ['saas_subscriptions', 'saas_payments', 'saas_invoices', 'organizations', 'saas_plans', 'users'];
  for (const t of tables) {
    const res = await saClient.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [t]);
    console.log(`\n--- ${t} ---`);
    console.log(res.rows.map(r => `${r.column_name}: ${r.data_type} (null: ${r.is_nullable})`).join('\n'));
  }

  await saClient.end();
}

inspectSuperAdminSchema().catch(console.error);
