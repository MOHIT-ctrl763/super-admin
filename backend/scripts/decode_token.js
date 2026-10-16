const { Client } = require('pg');
const jwt = require('jsonwebtoken');

async function check() {
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });

  await saClient.connect();
  const res = await saClient.query("SELECT value FROM system_settings WHERE key = 'crm_active_session_token'");
  const token = res.rows[0]?.value;
  console.log('Decoded Token Payload:', jwt.decode(token));

  await saClient.end();
}

check().catch(console.error);
