const { pool } = require('../db/database');

async function syncAllCrmCompaniesToOrgs() {
  const crmComps = await pool.query(`
    SELECT c.id, c.name, c.email, c.phone, c.plan_id, c.plan_name, c.status, o.id as org_id 
    FROM crm_companies c 
    LEFT JOIN organizations o ON o.crm_company_id = c.id::text
  `);

  for (const c of crmComps.rows) {
    if (!c.org_id) {
      const slug = (c.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Math.floor(1000 + Math.random() * 9000);
      const ins = await pool.query(`
        INSERT INTO organizations (name, slug, email, phone, status, plan_id, plan_name, owner_name, users_count, crm_company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)
        RETURNING id, name
      `, [c.name, slug, c.email || '', c.phone || '', c.status || 'ACTIVE', c.plan_id || 2, c.plan_name || 'Standard', c.name + ' Admin', String(c.id)]);
      console.log('✓ Linked CRM Company:', c.name, `(${c.id}) -> Organization ID:`, ins.rows[0].id);
    }
  }

  console.log('✓ Synchronization complete. All CRM companies have an organization mapping.');
  process.exit(0);
}

syncAllCrmCompaniesToOrgs().catch(err => {
  console.error('Error during sync:', err);
  process.exit(1);
});
