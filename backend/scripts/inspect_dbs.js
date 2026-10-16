const { Client } = require('pg');

async function check() {
  console.log('=== Checking CRM Database ===');
  const crmClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'CRM'
  });

  try {
    await crmClient.connect();
    const tables = await crmClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('CRM Tables:', tables.rows.map(r => r.table_name));

    // Check users
    const users = await crmClient.query(`SELECT id, name, email, role, company_id FROM users LIMIT 10`);
    console.log('CRM Users:', users.rows);

    // Check companies
    const companies = await crmClient.query(`SELECT * FROM companies LIMIT 10`);
    console.log('CRM Companies:', companies.rows);

    // Check leads columns
    const leadCols = await crmClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      ORDER BY ordinal_position
    `);
    console.log('CRM Leads columns:', leadCols.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Check sample leads
    const leads = await crmClient.query(`SELECT id, name, company, email FROM leads LIMIT 5`);
    console.log('CRM sample leads:', leads.rows);

    await crmClient.end();
  } catch (err) {
    console.error('CRM DB Error:', err.message);
  }

  console.log('\n=== Checking superadmin_db Database ===');
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });

  try {
    await saClient.connect();
    const saTables = await saClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('SuperAdmin Tables:', saTables.rows.map(r => r.table_name));

    const orgs = await saClient.query(`SELECT id, name, slug, email, plan_name, status, crm_company_id FROM organizations LIMIT 10`);
    console.log('SuperAdmin Orgs:', orgs.rows);

    const subs = await saClient.query(`SELECT id, organization_id, plan_name, billing_cycle, amount, status FROM saas_subscriptions LIMIT 10`);
    console.log('SuperAdmin Subs:', subs.rows);

    const payments = await saClient.query(`SELECT id, organization_id, amount, status, payment_method, created_at FROM saas_payments LIMIT 10`);
    console.log('SuperAdmin Payments:', payments.rows);

    await saClient.end();
  } catch (err) {
    console.error('SuperAdmin DB Error:', err.message);
  }
}

check();
