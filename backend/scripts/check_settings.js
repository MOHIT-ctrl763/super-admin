const { Client } = require('pg');

async function checkSettings() {
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });

  await saClient.connect();
  const settings = await saClient.query('SELECT key, value FROM system_settings');
  for (const s of settings.rows) {
    if (s.key.includes('token') || s.key.includes('pass')) {
      console.log(s.key, ':', s.value.substring(0, 25) + '... (len: ' + s.value.length + ')');
    } else {
      console.log(s.key, ':', s.value);
    }
  }

  // Also check crm_companies table in superadmin_db
  const crmComps = await saClient.query('SELECT * FROM crm_companies');
  console.log('\ncrm_companies in superadmin_db:', crmComps.rows);

  await saClient.end();
}

checkSettings().catch(console.error);
