const { Client } = require('pg');

async function inspectColumns() {
  const crmClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'CRM'
  });

  await crmClient.connect();

  const tablesToCheck = [
    'users',
    'leads',
    'parties',
    'activities',
    'branches',
    'quotations',
    'projects',
    'calls',
    'campaigns',
    'whatsapp_chats',
    'lead_capture_forms',
    'workflows',
    'teams',
    'notifications'
  ];

  for (const t of tablesToCheck) {
    const res = await crmClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [t]);
    const cols = res.rows.map(r => r.column_name);
    const hasCompany = cols.includes('company_id') || cols.includes('companyId');
    console.log(`Table '${t}': ${hasCompany ? 'HAS company_id' : 'NO company_id'} (total cols: ${cols.length})`);
  }

  // Also check existing companies in CRM
  const comps = await crmClient.query('SELECT id, name, email FROM companies');
  console.log('\nExisting CRM Companies in DB:', comps.rows);

  await crmClient.end();
}

inspectColumns().catch(console.error);
