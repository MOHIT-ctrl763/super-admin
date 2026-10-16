const { Client } = require('pg');

async function migrateTenantIsolation() {
  console.log('=== Step 1: Migrating CRM Database for Strict Multi-Tenancy ===');
  const crmClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'CRM'
  });

  try {
    await crmClient.connect();

    // 1. Add company_id columns to all tenant-scoped tables if missing
    await crmClient.query(`
      ALTER TABLE IF EXISTS public.leads ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);

      ALTER TABLE IF EXISTS public.activities ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.activities(company_id);

      ALTER TABLE IF EXISTS public.quotations ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON public.quotations(company_id);

      ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);

      ALTER TABLE IF EXISTS public.calls ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_calls_company_id ON public.calls(company_id);

      ALTER TABLE IF EXISTS public.campaigns ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON public.campaigns(company_id);

      ALTER TABLE IF EXISTS public.whatsapp_chats ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_company_id ON public.whatsapp_chats(company_id);

      ALTER TABLE IF EXISTS public.parties ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_parties_company_id ON public.parties(company_id);

      ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
    `);
    console.log('✓ Added company_id columns and indexes to CRM tables.');

    // 2. Identify Asib's default company ID
    let asibCompId = 'e24218c7-7f84-4ff8-b082-f4dace04f181';
    const compCheck = await crmClient.query(`SELECT id FROM companies WHERE id = $1`, [asibCompId]);
    if (compCheck.rows.length === 0) {
      await crmClient.query(`
        INSERT INTO companies (id, name, email, phone, state_code, created_at, updated_at)
        VALUES ($1, 'Digi Solution', 'digi@gmail.com', '1234567891', '27', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [asibCompId]);
    }
    console.log(`✓ Default company ID for legacy data: ${asibCompId}`);

    // 3. Migrate existing records belonging to Asib to Asib's company ID
    const updateLeads = await crmClient.query(`
      UPDATE public.leads 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateLeads.rowCount} existing leads to company ${asibCompId}`);

    const updateActivities = await crmClient.query(`
      UPDATE public.activities 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateActivities.rowCount} existing activities to company ${asibCompId}`);

    const updateQuotations = await crmClient.query(`
      UPDATE public.quotations 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateQuotations.rowCount} existing quotations to company ${asibCompId}`);

    const updateProjects = await crmClient.query(`
      UPDATE public.projects 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateProjects.rowCount} existing projects to company ${asibCompId}`);

    const updateCalls = await crmClient.query(`
      UPDATE public.calls 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateCalls.rowCount} existing calls to company ${asibCompId}`);

    const updateCampaigns = await crmClient.query(`
      UPDATE public.campaigns 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateCampaigns.rowCount} existing campaigns to company ${asibCompId}`);

    const updateChats = await crmClient.query(`
      UPDATE public.whatsapp_chats 
      SET company_id = $1 
      WHERE company_id IS NULL OR company_id = ''
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateChats.rowCount} existing chats to company ${asibCompId}`);

    const updateUsers = await crmClient.query(`
      UPDATE public.users 
      SET company_id = $1::uuid 
      WHERE company_id IS NULL AND (role != 'super_admin' OR email = 'aasibkhan155471@gmail.com')
    `, [asibCompId]);
    console.log(`✓ Mapped ${updateUsers.rowCount} existing users to company ${asibCompId}`);

    await crmClient.end();
  } catch (err) {
    console.error('CRM DB Migration Error:', err);
  }

  console.log('\n=== Step 2: Migrating superadmin_db Database ===');
  const saClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '798214',
    database: 'superadmin_db'
  });

  try {
    await saClient.connect();

    // Ensure crm_company_id on organizations and users
    await saClient.query(`
      ALTER TABLE IF EXISTS organizations ADD COLUMN IF NOT EXISTS crm_company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_sa_orgs_crm_company_id ON organizations(crm_company_id);

      ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS crm_company_id VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_sa_users_crm_company_id ON users(crm_company_id);
    `);

    // Ensure every organization has a valid crm_company_id
    const orgsWithoutCrm = await saClient.query(`
      SELECT id, name, slug, email FROM organizations WHERE crm_company_id IS NULL OR crm_company_id = ''
    `);

    for (const org of orgsWithoutCrm.rows) {
      // Check if crm_companies has a record
      const crmCompRes = await saClient.query(`
        SELECT id FROM crm_companies WHERE email = $1 OR name = $2 LIMIT 1
      `, [org.email, org.name]);

      let compId;
      if (crmCompRes.rows.length > 0) {
        compId = String(crmCompRes.rows[0].id);
      } else {
        const insComp = await saClient.query(`
          INSERT INTO crm_companies (name, email, status, source)
          VALUES ($1, $2, 'ACTIVE', 'Migration Sync')
          RETURNING id
        `, [org.name, org.email]);
        compId = String(insComp.rows[0].id);
      }

      await saClient.query(`
        UPDATE organizations SET crm_company_id = $1 WHERE id = $2
      `, [compId, org.id]);

      await saClient.query(`
        UPDATE users SET crm_company_id = $1 WHERE organization_id = $2
      `, [compId, org.id]);

      console.log(`✓ Linked Organization ID ${org.id} (${org.name}) to CRM Company ID: ${compId}`);
    }

    await saClient.end();
    console.log('✓ SuperAdmin DB Migration Complete.');
  } catch (err) {
    console.error('SuperAdmin DB Migration Error:', err);
  }
}

migrateTenantIsolation().catch(console.error);
