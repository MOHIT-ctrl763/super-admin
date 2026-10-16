const jwt = require('jsonwebtoken');
const { query } = require('../db/database');

async function syncLocalToLive() {
  try {
    console.log('Fetching local data...');
    const [compRes, orgRes, subRes, payRes, userRes] = await Promise.all([
      query('SELECT * FROM crm_companies'),
      query('SELECT * FROM organizations'),
      query('SELECT * FROM saas_subscriptions'),
      query('SELECT * FROM saas_payments'),
      query('SELECT id, name, email, password, phone, role_name, role_display_name, is_active, organization_id, organization_name, crm_company_id FROM users WHERE role_name != \'SUPER_ADMIN\'')
    ]);

    const payload = {
      crmCompanies: compRes.rows,
      organizations: orgRes.rows,
      subscriptions: subRes.rows,
      payments: payRes.rows,
      users: userRes.rows
    };

    console.log(`Found:
      - ${payload.crmCompanies.length} CRM companies
      - ${payload.organizations.length} Organizations
      - ${payload.subscriptions.length} Subscriptions
      - ${payload.payments.length} Payments
      - ${payload.users.length} Users
    `);

    const token = jwt.sign(
      { id: 1, email: 'mohitpoewal12@gmail.com', role: 'super_admin', isSuperAdmin: true, permissions: ['*'] },
      'superadmin_jwt_secret_standalone_9283749283472'
    );

    const liveUrl = 'https://super-admin-production-de49.up.railway.app/api/super-admin/crm/migrate-local-data';
    console.log(`Sending to ${liveUrl}...`);

    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      try {
        const response = await fetch(liveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`Attempt ${attempts} Response:`, data);

        if (data.success) {
          console.log('SUCCESS! All companies and data migrated to cloud database.');
          process.exit(0);
        }
      } catch (err) {
        console.log(`Waiting for live backend to redeploy... (attempt ${attempts}):`, err.message);
      }
      await new Promise(r => setTimeout(r, 6000));
    }

    process.exit(1);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncLocalToLive();
