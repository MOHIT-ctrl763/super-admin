const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');

// CRM Database connection parameters (matching CRM backend environment)
const CRM_DB_CONFIG = {
  host: process.env.CRM_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CRM_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.CRM_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.CRM_DB_PASSWORD || process.env.DB_PASSWORD || '798214',
  database: process.env.CRM_DB_NAME || 'CRM'
};

const CRM_JWT_SECRET = process.env.CRM_JWT_SECRET || 'abcd1234sjkynqoinkerhkaw';

/**
 * Connect to CRM PostgreSQL database
 */
async function getCrmClient() {
  const client = new Client(CRM_DB_CONFIG);
  await client.connect();
  return client;
}

/**
 * Fully provision a tenant workspace and initial administrator in both
 * superadmin_db and the CRM database (IMSDATABASE / CRM)
 */
async function provisionTenantInCrm({
  companyId,
  name,
  email,
  phone = '',
  address = '',
  state = 'Maharashtra',
  stateCode = '27',
  planId = null,
  planName = 'Standard',
  adminName = 'Administrator',
  adminEmail,
  adminPasswordHash
}) {
  const compId = companyId || require('crypto').randomUUID();
  const cleanEmail = (adminEmail || email).toLowerCase().trim();

  // 1. Record in superadmin_db.crm_companies ledger
  await query(`
    INSERT INTO crm_companies (
      id, name, email, phone, address, state, state_code,
      plan_id, plan_name, status, source, crm_synced, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', 'Super Admin Provisioned', TRUE, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      plan_id = EXCLUDED.plan_id,
      plan_name = EXCLUDED.plan_name,
      crm_synced = TRUE,
      updated_at = NOW()
  `, [compId, name, cleanEmail, phone || '', address || '', state || 'Maharashtra', stateCode || '27', planId, planName]);

  // 2. Provision in actual CRM database
  let crmClient = null;
  try {
    crmClient = await getCrmClient();

    // Ensure company exists in CRM.companies
    await crmClient.query(`
      INSERT INTO public.companies (
        id, name, email, phone, address, state_code, financial_year_start, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        updated_at = NOW()
    `, [compId, name, cleanEmail, phone || '', address || '', stateCode || '27', '2026-04-01']);

    // Ensure administrator user exists in CRM.users
    const userCheck = await crmClient.query(`SELECT id FROM public.users WHERE email = $1`, [cleanEmail]);
    if (userCheck.rows.length === 0) {
      await crmClient.query(`
        INSERT INTO public.users (
          company_id, name, email, password_hash, role, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'owner_/_ceo', true, NOW(), NOW())
      `, [compId, adminName, cleanEmail, adminPasswordHash || '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890']);
    } else {
      await crmClient.query(`
        UPDATE public.users 
        SET company_id = $1, is_active = true, updated_at = NOW() 
        WHERE email = $2
      `, [compId, cleanEmail]);
    }

    console.log(`[CRM_PROVISION] Successfully provisioned tenant '${name}' (${compId}) and administrator '${cleanEmail}' in CRM database.`);
    return { success: true, companyId: compId };
  } catch (err) {
    console.error(`[CRM_PROVISION_WARN] Direct CRM DB sync failed (handled gracefully):`, err.message);
    return { success: false, companyId: compId, warning: err.message };
  } finally {
    if (crmClient) {
      try { await crmClient.end(); } catch (e) {}
    }
  }
}

/**
 * Generate a cryptographically valid, tenant-isolated CRM Access Token
 * Guaranteed to be scoped ONLY to the target company_id
 */
function createTenantCrmToken({ userId, email, companyId, role = 'admin' }) {
  if (!companyId) {
    throw new Error('Tenant CRM token requires a valid company_id context');
  }

  return jwt.sign(
    {
      id: userId || require('crypto').randomUUID(),
      email: email.toLowerCase().trim(),
      company_id: String(companyId),
      companyId: String(companyId),
      role: role || 'admin'
    },
    CRM_JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  provisionTenantInCrm,
  createTenantCrmToken,
  CRM_JWT_SECRET
};
