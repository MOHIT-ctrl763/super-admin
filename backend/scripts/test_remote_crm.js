const { Client } = require('pg');

async function testRemoteEndpoints() {
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });
  await saClient.connect();
  const tokenRes = await saClient.query("SELECT value FROM system_settings WHERE key = 'crm_active_session_token'");
  const token = tokenRes.rows[0]?.value;
  await saClient.end();

  const headers = { Authorization: `Bearer ${token}` };

  // 1. Get companies
  try {
    const compRes = await fetch('https://api.nexflowcrm.com/api/v1/company', { headers });
    const compData = await compRes.json();
    console.log('GET /company:', compRes.status, compData);
  } catch (e) {
    console.log('GET /company error:', e.message);
  }

  // 2. Get company users
  try {
    const userRes = await fetch('https://api.nexflowcrm.com/api/v1/auth/company-users/all', { headers });
    const userData = await userRes.json();
    console.log('GET /auth/company-users/all:', userRes.status, userData);
  } catch (e) {
    console.log('GET /auth/company-users/all error:', e.message);
  }

  // 3. Get leads
  try {
    const leadRes = await fetch('https://api.nexflowcrm.com/api/v1/leads', { headers });
    const leadData = await leadRes.json();
    console.log('GET /leads:', leadRes.status, leadData.data?.items?.length || leadData);
  } catch (e) {
    console.log('GET /leads error:', e.message);
  }
}

testRemoteEndpoints();
