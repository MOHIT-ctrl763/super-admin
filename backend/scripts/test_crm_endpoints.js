const { Client } = require('pg');

async function testRemoteAndLocal() {
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

  console.log('CRM token found:', token ? token.substring(0, 30) + '...' : 'none');

  if (token) {
    try {
      const remoteRes = await fetch('https://api.nexflowcrm.com/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await remoteRes.json();
      console.log('Remote https://api.nexflowcrm.com/api/v1/auth/me response:', remoteRes.status, data);
    } catch (e) {
      console.log('Remote error:', e.message);
    }
  }

  // Check if localhost:7000 is running
  try {
    const localRes = await fetch('http://localhost:7000/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const localData = await localRes.json();
    console.log('Local http://localhost:7000/api/v1/auth/me response:', localRes.status, localData);
  } catch (e) {
    console.log('Local port 7000 status:', e.message);
  }
}

testRemoteAndLocal();
