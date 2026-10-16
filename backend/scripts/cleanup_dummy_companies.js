const { query } = require('../db/database');

async function cleanupDummyCompanies() {
  try {
    console.log('Starting cleanup of 17 dummy companies...');

    // 1. Get real companies
    const realCrmCompanies = await query(`
      SELECT id, name, email FROM crm_companies
    `);
    console.log('Real CRM companies in crm_companies:', realCrmCompanies.rows);

    const realCrmCompanyIds = realCrmCompanies.rows.map(c => c.id);

    if (realCrmCompanyIds.length === 0) {
      console.error('No real CRM companies found! Aborting to prevent data loss.');
      process.exit(1);
    }

    // 2. Identify real organizations
    const realOrgsRes = await query(`
      SELECT id, name, crm_company_id FROM organizations 
      WHERE crm_company_id = ANY($1::text[])
    `, [realCrmCompanyIds]);

    const realOrgIds = realOrgsRes.rows.map(o => o.id);
    console.log('Real organizations found:', realOrgsRes.rows);

    // 3. Update organization names to match crm_companies name
    for (const realComp of realCrmCompanies.rows) {
      await query(`
        UPDATE organizations 
        SET name = $1 
        WHERE crm_company_id = $2
      `, [realComp.name, realComp.id]);

      await query(`
        UPDATE saas_subscriptions 
        SET organization_name = $1 
        WHERE organization_id IN (
          SELECT id FROM organizations WHERE crm_company_id = $2
        )
      `, [realComp.name, realComp.id]);

      await query(`
        UPDATE users 
        SET organization_name = $1 
        WHERE crm_company_id = $2
      `, [realComp.name, realComp.id]);
    }

    // 4. Find all dummy organizations to delete
    const dummyOrgsRes = await query(`
      SELECT id, name, crm_company_id FROM organizations 
      WHERE id != ALL($1::int[])
    `, [realOrgIds]);

    const dummyOrgIds = dummyOrgsRes.rows.map(o => o.id);
    console.log(`Found ${dummyOrgIds.length} dummy organizations to delete:`, dummyOrgsRes.rows.map(o => `${o.id}: ${o.name}`));

    if (dummyOrgIds.length > 0) {
      // Delete child data belonging to dummy orgs
      const delUsage = await query(`DELETE FROM saas_usage_metrics WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delUsage.rowCount} saas_usage_metrics`);

      const delChurn = await query(`DELETE FROM saas_subscription_churn_events WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delChurn.rowCount} churn events`);

      const delReminders = await query(`DELETE FROM saas_reminder_logs WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delReminders.rowCount} reminder logs`);

      const delInvoices = await query(`DELETE FROM saas_invoices WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delInvoices.rowCount} invoices`);

      const delPayments = await query(`DELETE FROM saas_payments WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delPayments.rowCount} payments`);

      const delSubs = await query(`DELETE FROM saas_subscriptions WHERE organization_id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delSubs.rowCount} subscriptions`);

      // Delete users of dummy orgs, but NEVER delete SUPER_ADMIN or users without organization_id
      const delUsers = await query(`
        DELETE FROM users 
        WHERE organization_id = ANY($1::int[]) 
        AND role_name != 'SUPER_ADMIN' 
        AND email != 'mohitpoewal12@gmail.com'
      `, [dummyOrgIds]);
      console.log(`Deleted ${delUsers.rowCount} dummy users`);

      // Delete dummy organizations
      const delOrgs = await query(`DELETE FROM organizations WHERE id = ANY($1::int[])`, [dummyOrgIds]);
      console.log(`Deleted ${delOrgs.rowCount} dummy organizations!`);
    }

    // 5. Verify remaining organizations and companies
    const remainingOrgs = await query(`SELECT id, name, crm_company_id, status FROM organizations ORDER BY id`);
    console.log('Remaining organizations in database:', remainingOrgs.rows);

    const remainingSubs = await query(`SELECT id, organization_id, organization_name, plan_name, amount, status FROM saas_subscriptions`);
    console.log('Remaining subscriptions:', remainingSubs.rows);

    const remainingPayments = await query(`SELECT id, organization_id, amount, status FROM saas_payments`);
    console.log('Remaining payments:', remainingPayments.rows);

    console.log('SUCCESS: Cleanup completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanupDummyCompanies();
