const { Client } = require('pg');

async function inspectCRM() {
  const crmClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'CRM'
  });

  await crmClient.connect();
  const userCount = await crmClient.query('SELECT COUNT(*) FROM users');
  console.log('CRM User count:', userCount.rows[0].count);

  const users = await crmClient.query('SELECT * FROM users');
  console.log('CRM Users:', users.rows.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, company_id: u.company_id })));

  const leadsCount = await crmClient.query('SELECT COUNT(*) FROM leads');
  console.log('CRM Leads count:', leadsCount.rows[0].count);

  const leadsByComp = await crmClient.query('SELECT company_id, COUNT(*) FROM leads GROUP BY company_id');
  console.log('CRM Leads by company_id:', leadsByComp.rows);

  const contacts = await crmClient.query('SELECT COUNT(*) FROM parties');
  console.log('CRM Parties (Contacts/Customers) count:', contacts.rows[0].count);

  const activities = await crmClient.query('SELECT COUNT(*) FROM activities');
  console.log('CRM Activities count:', activities.rows[0].count);

  // Check columns of activities
  const actCols = await crmClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'activities'");
  console.log('CRM Activities columns:', actCols.rows.map(r => r.column_name));

  // Check columns of parties
  const partyCols = await crmClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'parties'");
  console.log('CRM Parties columns:', partyCols.rows.map(r => r.column_name));

  await crmClient.end();
}

inspectCRM().catch(console.error);
