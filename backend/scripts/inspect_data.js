const { Client } = require('pg');

async function inspectData() {
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });
  await saClient.connect();

  const subs = await saClient.query('SELECT * FROM saas_subscriptions ORDER BY id DESC');
  console.log('Subscriptions count:', subs.rows.length);
  console.log('Subscriptions:', subs.rows);

  const payments = await saClient.query('SELECT * FROM saas_payments ORDER BY id DESC');
  console.log('\nPayments count:', payments.rows.length);
  console.log('Payments:', payments.rows);

  const orgs = await saClient.query('SELECT id, name, slug, email, plan_name, status, crm_company_id, trial_ends_at, created_at FROM organizations ORDER BY id DESC');
  console.log('\nOrganizations count:', orgs.rows.length);
  console.log('Organizations:', orgs.rows);

  await saClient.end();
}

inspectData().catch(console.error);
