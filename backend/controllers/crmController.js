/**
 * CRM Integration Controller for Super Admin Backend
 * Bridges Super Admin console with external CRM API.
 */

const bcrypt = require('bcryptjs');
const crmApiService = require('../services/crmApiService');
const { query } = require('../db/database');
const { createTenantCrmToken } = require('../services/crmProvisioningService');

/**
 * Helper to resolve the authenticated caller's company/tenant scope
 */
function getCallerTenantScope(req) {
  const isSuperAdmin = req.user?.isSuperAdmin === true;
  const companyId = req.user?.crm_company_id ? String(req.user.crm_company_id) : (req.user?.organization_id ? String(req.user.organization_id) : null);
  const companyName = req.user?.organization_name || null;
  const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;
  return { isSuperAdmin, companyId, companyName, userEmail };
}

/**
 * Helper to generate tenant-scoped CRM API options for requests
 */
function getTenantApiOptions(req) {
  const scope = getCallerTenantScope(req);
  if (!scope.isSuperAdmin && scope.companyId) {
    try {
      const token = createTenantCrmToken({
        userId: req.user?.id,
        email: scope.userEmail || 'tenant@crm.local',
        companyId: scope.companyId,
        role: req.user?.role_name || 'admin'
      });
      return { token, scope };
    } catch (e) {
      return { token: null, scope };
    }
  }
  return { token: null, scope };
}

/**
 * Check CRM API status, connectivity, and active session
 */
exports.getStatus = async (req, res) => {
  try {
    const health = await crmApiService.checkHealth();
    const token = await crmApiService.getActiveToken();

    // Check count of linked Super Admin organizations
    let linkedCount = 0;
    try {
      const linkedRes = await query(`
        SELECT COUNT(*) as count FROM organizations 
        WHERE EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'crm_company_id'
        ) AND crm_company_id IS NOT NULL
      `);
      linkedCount = parseInt(linkedRes.rows[0]?.count || 0, 10);
    } catch (e) {
      linkedCount = 0;
    }

    return res.json({
      success: true,
      data: {
        ...health,
        hasActiveSession: !!token,
        isConfigured: !!(process.env.CRM_API_BASE_URL || health.baseUrl),
        linkedOrganizationsCount: linkedCount
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error checking CRM status'
    });
  }
};

/**
 * Run dynamic live audit across all 82 cataloged CRM endpoints
 */
exports.getEndpointsCoverage = async (req, res) => {
  try {
    const auditResults = await crmApiService.runFullEndpointAudit();
    return res.json(auditResults);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to execute endpoint coverage audit'
    });
  }
};

/**
 * Connect to CRM by providing credentials or manual bearer token
 */
exports.connect = async (req, res) => {
  try {
    const { email, password, token, customBaseUrl } = req.body;

    if (customBaseUrl && typeof customBaseUrl === 'string') {
      let cleanUrl = customBaseUrl.trim().replace(/\/+$/, '');
      if (!cleanUrl.endsWith('/api/v1') && !cleanUrl.includes('/api/')) {
        cleanUrl = `${cleanUrl}/api/v1`;
      }
      await query(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('crm_custom_base_url', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      `, [cleanUrl]);
      process.env.CRM_API_BASE_URL = cleanUrl;
    }

    if (token) {
      await crmApiService.setActiveToken(token);
      const health = await crmApiService.checkHealth();
      return res.json({
        success: true,
        message: 'CRM Bearer token saved successfully.',
        data: health
      });
    }

    if (email && password) {
      const loginRes = await crmApiService.login(email, password);
      if (!loginRes.success) {
        return res.status(loginRes.status || 401).json({
          success: false,
          message: loginRes.message || 'CRM login failed with provided credentials'
        });
      }

      const health = await crmApiService.checkHealth();
      return res.json({
        success: true,
        message: 'Connected to CRM API successfully.',
        data: {
          ...health,
          user: loginRes.user
        }
      });
    }

    if (!token && (!email || !password)) {
      if (customBaseUrl) {
        const health = await crmApiService.checkHealth();
        return res.json({
          success: true,
          message: 'CRM API base URL updated successfully.',
          data: health
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Please provide either CRM login credentials (email & password) or a valid Bearer token.'
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to connect to CRM'
    });
  }
};

/**
 * Disconnect CRM session
 */
exports.disconnect = async (req, res) => {
  try {
    await crmApiService.setActiveToken(null);
    return res.json({
      success: true,
      message: 'Disconnected from CRM session successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Companies Controllers (Super Admin Managed + CRM API Synced)
// ==========================================

async function ensureCrmCompaniesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      state VARCHAR(100),
      state_code VARCHAR(10),
      financial_year_start DATE,
      gstin VARCHAR(50),
      pan VARCHAR(50),
      website VARCHAR(255),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      source VARCHAR(50) DEFAULT 'Super Admin Provisioned',
      crm_synced BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS plan_id INTEGER;
    ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_company_id VARCHAR(100);
  `);
}

exports.getCompanies = async (req, res) => {
  try {
    await ensureCrmCompaniesTable();
    const { isSuperAdmin, companyId, companyName, userEmail } = getCallerTenantScope(req);

    // Strict Tenant Isolation: Non-SuperAdmin only sees their own company
    if (!isSuperAdmin) {
      let localRes;
      if (companyId) {
        localRes = await query(
          `SELECT * FROM crm_companies WHERE id::text = $1 ORDER BY created_at DESC`,
          [companyId]
        );
      } else {
        localRes = await query(
          `SELECT * FROM crm_companies WHERE email = $1 OR name = $2 ORDER BY created_at DESC`,
          [userEmail || '', companyName || '']
        );
      }

      const isolatedItems = localRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        state: r.state,
        state_code: r.state_code,
        financial_year_start: r.financial_year_start,
        gstin: r.gstin,
        pan: r.pan,
        website: r.website,
        status: r.status || 'ACTIVE',
        plan_id: r.plan_id,
        plan_name: r.plan_name || 'Standard',
        source: 'Tenant Isolated Ledger',
        createdAt: r.created_at,
        created_at: r.created_at
      }));

      return res.json({
        success: true,
        data: {
          items: isolatedItems,
          total: isolatedItems.length
        }
      });
    }

    // 1. Fetch Super Admin provisioned CRM companies
    const localRes = await query(`SELECT * FROM crm_companies ORDER BY created_at DESC`);
    const localItems = localRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      state: r.state,
      state_code: r.state_code,
      financial_year_start: r.financial_year_start,
      gstin: r.gstin,
      pan: r.pan,
      website: r.website,
      status: r.status || 'ACTIVE',
      plan_id: r.plan_id,
      plan_name: r.plan_name || 'Standard',
      source: r.source || 'Super Admin Provisioned',
      createdAt: r.created_at,
      created_at: r.created_at
    }));

    // 2. Fetch remote CRM companies
    let remoteItems = [];
    try {
      const result = await crmApiService.getCompanies(req.query);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          remoteItems = result.data;
        } else if (result.data.companies && Array.isArray(result.data.companies)) {
          remoteItems = result.data.companies;
        } else if (result.data.items && Array.isArray(result.data.items)) {
          remoteItems = result.data.items;
        } else if (typeof result.data === 'object' && result.data.id) {
          remoteItems = [result.data];
        }
      }
    } catch (e) {
      // Remote CRM endpoint fallback
    }

    // 3. Merge deduplicated
    const combined = [...localItems];
    for (const remote of remoteItems) {
      const exists = combined.some(c => String(c.id) === String(remote.id) || (c.name && remote.name && c.name.toLowerCase() === remote.name.toLowerCase()));
      if (!exists) {
        combined.push({
          ...remote,
          source: 'NexFlow CRM Live'
        });
      }
    }

    return res.json({
      success: true,
      data: {
        items: combined,
        total: combined.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    await ensureCrmCompaniesTable();
    const { isSuperAdmin, companyId, companyName, userEmail } = getCallerTenantScope(req);

    const localRes = await query('SELECT * FROM crm_companies WHERE id::text = $1', [req.params.id]);
    if (localRes.rows.length > 0) {
      const comp = localRes.rows[0];
      // Enforce isolation for non-superadmins
      if (!isSuperAdmin) {
        const isOwner = (companyId && String(comp.id) === companyId) ||
                        (companyName && comp.name && comp.name.toLowerCase() === companyName.toLowerCase()) ||
                        (userEmail && comp.email && comp.email.toLowerCase() === userEmail);
        if (!isOwner) {
          return res.status(403).json({ success: false, message: 'Forbidden: You can only view your own company profile.' });
        }
      }
      return res.json({ success: true, data: comp });
    }

    if (!isSuperAdmin) {
      return res.status(404).json({ success: false, message: 'Company not found or access denied.' });
    }

    const result = await crmApiService.getCompanyById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const { name, email, phone, address, state, stateCode, financialYearStart, gstin, pan, website, password, planId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Company Name is required' });
    }

    // Verify OTP confirmation for company email if provided
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const verRes = await query(`
        SELECT id FROM saas_email_verifications
        WHERE email = $1 AND is_verified = TRUE
        ORDER BY id DESC LIMIT 1
      `, [cleanEmail]);

      if (verRes.rows.length === 0) {
        const { isSuperAdmin } = getCallerTenantScope(req);
        if (isSuperAdmin) {
          await query(`
            INSERT INTO saas_email_verifications (email, otp, purpose, is_verified, expires_at)
            VALUES ($1, 'AUTO_VERIFIED', 'CRM_COMPANY', TRUE, CURRENT_TIMESTAMP + INTERVAL '1 day')
          `, [cleanEmail]);
        } else {
          return res.status(400).json({
            success: false,
            message: `Company email ${cleanEmail} has not been verified with OTP yet. Please verify email before provisioning.`
          });
        }
      }
    }

    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Company phone number must be exactly 10 digits without letters or special characters.'
        });
      }
    }

    await ensureCrmCompaniesTable();

    // Fetch the chosen plan
    let chosenPlan = null;
    if (planId) {
      const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [planId]);
      if (planRes.rows.length > 0) {
        chosenPlan = planRes.rows[0];
      }
    }
    if (!chosenPlan) {
      const defaultPlanRes = await query('SELECT * FROM saas_plans WHERE is_active = true ORDER BY id ASC LIMIT 1');
      if (defaultPlanRes.rows.length > 0) {
        chosenPlan = defaultPlanRes.rows[0];
      }
    }

    const assignedPlanId = chosenPlan ? chosenPlan.id : (planId || 2);
    const assignedPlanName = chosenPlan ? chosenPlan.name : 'Pro';

    const loginEmail = email ? email.trim().toLowerCase() : null;
    const adminPassword = (password && String(password).trim().length >= 6) ? String(password).trim() : (password || 'Company@123');
    const cleanCompPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';

    // 1. Provision account directly into live NexFlow CRM API so they can log in to https://login.nexflowcrm.com
    let crmSynced = false;
    let crmUserToken = null;
    let crmAssignedCompanyId = null;

    if (loginEmail) {
      try {
        const crmSignUpRes = await crmApiService.registerTenantUser({
          name: name.trim() + ' Admin',
          email: loginEmail,
          password: adminPassword,
          role: 'owner_/_ceo',
          phone: cleanCompPhone
        });

        if (crmSignUpRes.success && crmSignUpRes.data) {
          crmSynced = true;
          crmUserToken = crmSignUpRes.data.accessToken;
          crmAssignedCompanyId = crmSignUpRes.data.user?.companyId || crmSignUpRes.data.user?.company_id || null;
          console.log(`✅ [CRM_SYNC_SUCCESS] Registered CRM account for ${loginEmail} in NexFlow CRM`);

          // Attach company details via CRM /company endpoint with this user's token
          if (crmUserToken) {
            try {
              await crmApiService.createCompany({
                ...req.body,
                phone: cleanCompPhone,
                email: loginEmail
              }, { token: crmUserToken });
            } catch (compErr) {
              console.warn('[CRM_COMPANY_ATTACH_WARN]', compErr.message);
            }
          }
        } else if (crmSignUpRes.message && crmSignUpRes.message.includes('already registered')) {
          console.log(`ℹ️ [CRM_SYNC] User ${loginEmail} already registered in NexFlow CRM.`);
          crmSynced = true;
        }
      } catch (e) {
        console.warn('⚠️ [CRM_API_ERR] Error registering tenant user in live CRM:', e.message);
      }
    }

    // 2. Persist company record into SuperAdmin CRM ledger
    const companyIdToUse = crmAssignedCompanyId || require('crypto').randomUUID();
    const insertRes = await query(`
      INSERT INTO crm_companies (
        id, name, email, phone, address, state, state_code,
        financial_year_start, gstin, pan, website, status, source, crm_synced,
        plan_id, plan_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', 'Super Admin Provisioned', $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        status = 'ACTIVE',
        crm_synced = EXCLUDED.crm_synced
      RETURNING *
    `, [
      companyIdToUse,
      name.trim(),
      loginEmail,
      cleanCompPhone || null,
      address ? address.trim() : null,
      state || 'Maharashtra',
      stateCode || '27',
      financialYearStart || '2026-04-01',
      gstin ? gstin.trim() : null,
      pan ? pan.trim() : null,
      website ? website.trim() : null,
      crmSynced,
      assignedPlanId,
      assignedPlanName
    ]);

    const createdCompany = insertRes.rows[0];

    // 2b. Also create or link a corresponding SaaS organization and subscription for full platform compatibility
    let linkedOrgId = null;
    try {
      const orgSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
      const existingOrg = await query('SELECT id FROM organizations WHERE email = $1 OR name = $2 LIMIT 1', [loginEmail || '', name.trim()]);
      if (existingOrg.rows.length > 0) {
        linkedOrgId = existingOrg.rows[0].id;
        await query('UPDATE organizations SET crm_company_id = $1, plan_id = $2, plan_name = $3 WHERE id = $4', [
          createdCompany.id,
          assignedPlanId,
          assignedPlanName,
          linkedOrgId
        ]);
      } else {
        const newOrgRes = await query(`
          INSERT INTO organizations (name, slug, email, phone, city, state, status, plan_id, plan_name, owner_name, users_count, crm_company_id)
          VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, 1, $10)
          RETURNING id
        `, [
          name.trim(),
          orgSlug,
          loginEmail || '',
          cleanCompPhone,
          address ? address.split(',')[0].trim() : '',
          state || 'Maharashtra',
          assignedPlanId,
          assignedPlanName,
          name.trim() + ' Admin',
          createdCompany.id
        ]);
        linkedOrgId = newOrgRes.rows[0].id;

        // Create subscription entry
        const periodStart = new Date();
        const periodEnd = new Date(periodStart.getTime() + 30 * 86400000);
        await query(`
          INSERT INTO saas_subscriptions (
            organization_id, organization_name, plan_id, plan_name, billing_cycle,
            current_period_start, current_period_end, amount, status
          )
          VALUES ($1, $2, $3, $4, 'MONTHLY', $5, $6, $7, 'ACTIVE')
          ON CONFLICT DO NOTHING
        `, [
          linkedOrgId,
          name.trim(),
          assignedPlanId,
          assignedPlanName,
          periodStart.toISOString(),
          periodEnd.toISOString(),
          chosenPlan?.price_monthly || 79
        ]);
      }
    } catch (orgSyncErr) {
      console.warn('Auto SaaS org provisioning for CRM company:', orgSyncErr.message);
    }

    // 2c. Provision company and isolated workspace in local CRM Database if reachable
    try {
      const crmProvisioningService = require('../services/crmProvisioningService');
      await crmProvisioningService.provisionTenantInCrm({
        companyId: createdCompany.id,
        name: createdCompany.name,
        email: loginEmail || createdCompany.email,
        phone: cleanCompPhone,
        address: createdCompany.address || '',
        state: createdCompany.state || 'Maharashtra',
        stateCode: createdCompany.state_code || '27',
        planId: assignedPlanId,
        planName: assignedPlanName,
        adminName: name.trim() + ' Admin',
        adminEmail: loginEmail,
        adminPasswordHash: bcrypt.hashSync(adminPassword, 10)
      });
      console.log(`[CRM_TENANT_PROVISION] Tenant workspace created in CRM database for ${createdCompany.name} (UUID: ${createdCompany.id})`);
    } catch (directProvisionErr) {
      console.warn('[CRM_TENANT_PROVISION_WARN] Direct CRM DB provisioning:', directProvisionErr.message);
    }

    // 3. Provision Company Admin account in SuperAdmin users table
    let userCreated = false;
    if (loginEmail) {
      const hash = bcrypt.hashSync(adminPassword, 10);
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [loginEmail]);
      if (existingUser.rows.length === 0) {
        const newUsrRes = await query(`
          INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, crm_company_id, organization_id, organization_name)
          VALUES ($1, $2, $3, $4, 'COMPANY_ADMIN', 'Company Administrator', true, $5, $6, $7)
          RETURNING id
        `, [
          name.trim() + ' Admin',
          loginEmail,
          hash,
          cleanCompPhone,
          createdCompany.id,
          linkedOrgId,
          createdCompany.name
        ]);
        const newUserId = newUsrRes.rows[0].id;

        const roleRes = await query("SELECT id FROM roles WHERE slug = 'company_admin'");
        if (roleRes.rows.length > 0) {
          await query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [newUserId, roleRes.rows[0].id]);
        }

        userCreated = true;
      } else {
        await query(`
          UPDATE users
          SET password = $1, role_name = 'COMPANY_ADMIN', role_display_name = 'Company Administrator', is_active = true, crm_company_id = $2, organization_id = $3, organization_name = $4
          WHERE id = $5
        `, [hash, createdCompany.id, linkedOrgId, createdCompany.name, existingUser.rows[0].id]);
      }
    }

    return res.status(201).json({
      success: true,
      message: userCreated
        ? `CRM Company '${createdCompany.name}' created with ${assignedPlanName} plan! Login access configured for ${loginEmail} in NexFlow CRM.`
        : `CRM Company '${createdCompany.name}' created with ${assignedPlanName} plan and synced to NexFlow CRM!`,
      data: {
        ...createdCompany,
        plan_id: assignedPlanId,
        plan_name: assignedPlanName,
        loginCredentials: loginEmail ? {
          email: loginEmail,
          passwordSet: true,
          role: 'Company Administrator (owner_/_ceo)',
          plan: assignedPlanName
        } : null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetCompanyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    await ensureCrmCompaniesTable();
    const compRes = await query('SELECT * FROM crm_companies WHERE id::text = $1', [id]);
    if (compRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'CRM Company not found.' });
    }
    const company = compRes.rows[0];
    const email = company.email ? company.email.trim().toLowerCase() : null;
    if (!email) {
      return res.status(400).json({ success: false, message: 'This company does not have an associated contact email.' });
    }

    const cleanPass = String(password).trim();
    const hash = bcrypt.hashSync(cleanPass, 10);

    // 1. Update in local users table
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await query(`
        UPDATE users
        SET password = $1, role_name = 'COMPANY_ADMIN', role_display_name = 'Company Administrator', is_active = true, crm_company_id = $2
        WHERE id = $3
      `, [hash, company.id, existingUser.rows[0].id]);
      const roleRes = await query("SELECT id FROM roles WHERE slug = 'company_admin'");
      if (roleRes.rows.length > 0) {
        await query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [existingUser.rows[0].id, roleRes.rows[0].id]);
      }
    } else {
      const cleanPhone = company.phone ? String(company.phone).replace(/\D/g, '').slice(0, 10) : null;
      const newUsr = await query(`
        INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, crm_company_id, organization_name)
        VALUES ($1, $2, $3, $4, 'COMPANY_ADMIN', 'Company Administrator', true, $5, $6)
        RETURNING id
      `, [company.name + ' Admin', email, hash, cleanPhone, company.id, company.name]);
      const roleRes = await query("SELECT id FROM roles WHERE slug = 'company_admin'");
      if (roleRes.rows.length > 0) {
        await query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [newUsr.rows[0].id, roleRes.rows[0].id]);
      }
    }

    // 2. Sync to NexFlow CRM API
    let crmSynced = false;
    try {
      const crmCreateRes = await crmApiService.createCompanyUser({
        name: company.name,
        email: email,
        password: cleanPass,
        phone: company.phone ? String(company.phone).replace(/\D/g, '').slice(0, 10) : null,
        role: 'owner_/_ceo'
      });
      if (crmCreateRes.success) {
        crmSynced = true;
      } else if (crmCreateRes.message && crmCreateRes.message.includes('Email already exists')) {
        const allCrmUsers = await crmApiService.getCompanyUsers({ search: email });
        const items = Array.isArray(allCrmUsers.data) ? allCrmUsers.data : (allCrmUsers.data?.items || []);
        const matched = items.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (matched && matched.id) {
          const upRes = await crmApiService.updateCompanyUser(matched.id, { password: cleanPass });
          if (upRes.success) crmSynced = true;
        }
      }
    } catch (e) {
      console.warn('Sync to NexFlow CRM failed:', e.message);
    }

    return res.json({
      success: true,
      message: `Password updated successfully! Company admin (${email}) can now log in to NexFlow CRM with this password.`,
      crmSynced
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    await ensureCrmCompaniesTable();
    const { isSuperAdmin, companyId } = getCallerTenantScope(req);
    if (!isSuperAdmin && companyId && String(companyId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify other companies.' });
    }

    const { name, email, phone, address, state, gstin, pan, website } = req.body;
    await query(`
      UPDATE crm_companies
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          state = COALESCE($5, state),
          gstin = COALESCE($6, gstin),
          pan = COALESCE($7, pan),
          website = COALESCE($8, website),
          updated_at = CURRENT_TIMESTAMP
      WHERE id::text = $9
    `, [name, email, phone, address, state, gstin, pan, website, req.params.id]);

    await crmApiService.updateCompany(req.params.id, req.body).catch(() => {});
    return res.json({ success: true, message: 'Company updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    await ensureCrmCompaniesTable();
    const { isSuperAdmin, companyId } = getCallerTenantScope(req);
    if (!isSuperAdmin && companyId && String(companyId) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot delete other companies.' });
    }

    await query('DELETE FROM crm_companies WHERE id::text = $1', [req.params.id]);
    await crmApiService.deleteCompany(req.params.id).catch(() => {});
    return res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Users Controllers
// ==========================================

exports.getUsers = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName, userEmail } = getCallerTenantScope(req);

    // Strict Tenant Isolation: Non-SuperAdmin only sees their own company's staff
    if (!isSuperAdmin) {
      const localRes = await query(
        `SELECT * FROM crm_company_users 
         WHERE (company_id = $1 OR company_id = $2 OR (company_id IS NULL AND email = $3))
         ORDER BY created_at DESC`,
        [companyId || '', companyName || '', userEmail || '']
      );

      const localUsers = localRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        branch_id: r.branch_id,
        branch: r.branch_name,
        position_id: r.position_id,
        position: r.position_title,
        companyId: r.company_id,
        isActive: r.is_active,
        is_active: r.is_active,
        source: 'Tenant Isolated Ledger',
        createdAt: r.created_at,
        created_at: r.created_at
      }));

      return res.json({
        success: true,
        data: {
          items: localUsers,
          total: localUsers.length
        }
      });
    }

    // 1. Fetch local ledger CRM staff users
    const localRes = await query(`SELECT * FROM crm_company_users ORDER BY created_at DESC`);
    const localUsers = localRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      branch_id: r.branch_id,
      branch: r.branch_name,
      position_id: r.position_id,
      position: r.position_title,
      companyId: r.company_id,
      isActive: r.is_active,
      is_active: r.is_active,
      source: 'Super Admin Ledger',
      createdAt: r.created_at,
      created_at: r.created_at
    }));

    // 2. Fetch remote CRM users if reachable
    let remoteUsers = [];
    try {
      const result = await crmApiService.getCompanyUsers(req.query);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          remoteUsers = result.data;
        } else if (result.data && Array.isArray(result.data.users)) {
          remoteUsers = result.data.users;
        } else if (result.data && Array.isArray(result.data.items)) {
          remoteUsers = result.data.items;
        }
      }
    } catch (e) {
      // Remote CRM error handled gracefully
    }

    // 3. Deduplicate and merge
    const combined = [...localUsers];
    for (const remote of remoteUsers) {
      const exists = combined.some(u => 
        (u.id && remote.id && String(u.id) === String(remote.id)) ||
        (u.email && remote.email && u.email.toLowerCase() === remote.email.toLowerCase())
      );
      if (!exists) {
        combined.push({
          ...remote,
          is_active: remote.isActive !== undefined ? remote.isActive : (remote.is_active !== undefined ? remote.is_active : true),
          source: 'NexFlow CRM Live'
        });
      }
    }

    return res.json({
      success: true,
      data: {
        items: combined,
        total: combined.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    const localRes = await query('SELECT * FROM crm_company_users WHERE id = $1', [req.params.id]);
    if (localRes.rows.length > 0) {
      const r = localRes.rows[0];
      if (!isSuperAdmin && r.company_id && r.company_id !== companyId && r.company_id !== companyName) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot view staff of other companies.' });
      }
      return res.json({
        success: true,
        data: {
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          role: r.role,
          branch_id: r.branch_id,
          branch: r.branch_name,
          position_id: r.position_id,
          position: r.position_title,
          is_active: r.is_active
        }
      });
    }
    if (!isSuperAdmin) {
      return res.status(404).json({ success: false, message: 'User not found or access denied.' });
    }
    const result = await crmApiService.getCompanyUserById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, role, branch_id, position_id, password } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP confirmation for email
    const verRes = await query(`
      SELECT id FROM saas_email_verifications
      WHERE email = $1 AND is_verified = TRUE
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);

    if (verRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Email ${cleanEmail} has not been verified with OTP yet. Please verify email before provisioning staff member.`
      });
    }

    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Staff phone number must be exactly 10 digits without letters or special characters.'
        });
      }
    }

    // Resolve branch & position names if provided
    let branchName = null;
    if (branch_id) {
      const bRes = await query('SELECT name FROM crm_branches WHERE id = $1', [branch_id]);
      if (bRes.rows.length > 0) branchName = bRes.rows[0].name;
    }
    let positionTitle = null;
    if (position_id) {
      const pRes = await query('SELECT title FROM crm_positions WHERE id = $1', [position_id]);
      if (pRes.rows.length > 0) positionTitle = pRes.rows[0].title;
    }

    // Forward to upstream CRM API if reachable
    try {
      await crmApiService.createCompanyUser(req.body);
    } catch (e) {
      // Handled gracefully
    }

    const cleanStaffPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : null;
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    const assignedCompanyId = !isSuperAdmin ? (companyId || companyName) : (req.body.companyId || req.body.company_id || null);

    // Persist into local CRM ledger with company isolation
    const newId = 'crm-usr-' + Date.now();
    const insertRes = await query(`
      INSERT INTO crm_company_users (id, name, email, phone, role, branch_id, branch_name, position_id, position_title, company_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *
    `, [
      newId,
      name.trim(),
      cleanEmail,
      cleanStaffPhone,
      role || 'SALES_REP',
      branch_id || null,
      branchName,
      position_id || null,
      positionTitle,
      assignedCompanyId
    ]);

    const createdUser = insertRes.rows[0];

    return res.status(201).json({
      success: true,
      message: `CRM Staff Member '${createdUser.name}' provisioned successfully!`,
      data: {
        ...createdUser,
        branch: createdUser.branch_name,
        position: createdUser.position_title
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, branch_id, position_id } = req.body;
    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Staff phone number must be exactly 10 digits without letters or special characters.'
        });
      }
    }
    const cleanUpdatePhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : null;

    let branchName = null;
    if (branch_id) {
      const bRes = await query('SELECT name FROM crm_branches WHERE id = $1', [branch_id]);
      if (bRes.rows.length > 0) branchName = bRes.rows[0].name;
    }
    let positionTitle = null;
    if (position_id) {
      const pRes = await query('SELECT title FROM crm_positions WHERE id = $1', [position_id]);
      if (pRes.rows.length > 0) positionTitle = pRes.rows[0].title;
    }

    await query(`
      UPDATE crm_company_users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          role = COALESCE($4, role),
          branch_id = COALESCE($5, branch_id),
          branch_name = COALESCE($6, branch_name),
          position_id = COALESCE($7, position_id),
          position_title = COALESCE($8, position_title)
      WHERE id = $9
    `, [name, email, cleanUpdatePhone, role, branch_id, branchName, position_id, positionTitle, req.params.id]);

    await crmApiService.updateCompanyUser(req.params.id, req.body).catch(() => {});

    return res.json({ success: true, message: 'CRM User updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await query('DELETE FROM crm_company_users WHERE id = $1', [req.params.id]);
    await crmApiService.deleteCompanyUser(req.params.id).catch(() => {});
    return res.json({ success: true, message: 'CRM User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const nextStatus = isActive !== undefined ? !!isActive : true;
    const updRes = await query(`
      UPDATE crm_company_users
      SET is_active = $1
      WHERE id = $2
      RETURNING *
    `, [nextStatus, req.params.id]);

    await crmApiService.toggleCompanyUserStatus(req.params.id, nextStatus).catch(() => {});

    return res.json({
      success: true,
      message: `CRM user status updated to ${nextStatus ? 'Active' : 'Inactive'}`,
      data: updRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Branches Controllers
// ==========================================

exports.getBranches = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);

    if (!isSuperAdmin) {
      const localRes = await query(
        `SELECT * FROM crm_branches WHERE company_id = $1 OR company_id = $2 OR company_id IS NULL ORDER BY name ASC`,
        [companyId || '', companyName || '']
      );
      const localItems = localRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        city: r.city,
        state: r.state,
        address: r.address,
        isActive: r.is_active,
        is_active: r.is_active,
        source: 'Tenant Isolated Ledger'
      }));
      return res.json({
        success: true,
        data: {
          items: localItems,
          total: localItems.length
        }
      });
    }

    const localRes = await query(`SELECT * FROM crm_branches ORDER BY name ASC`);
    const localItems = localRes.rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      city: r.city,
      state: r.state,
      address: r.address,
      isActive: r.is_active,
      is_active: r.is_active,
      source: 'Super Admin Ledger'
    }));

    let remoteItems = [];
    try {
      const result = await crmApiService.getBranches(req.query);
      if (result.success && result.data) {
        remoteItems = result.data.items || (Array.isArray(result.data) ? result.data : []);
      }
    } catch (e) {}

    const combined = [...localItems];
    for (const remote of remoteItems) {
      const exists = combined.some(b => String(b.id) === String(remote.id) || b.name === remote.name);
      if (!exists) {
        combined.push({ ...remote, source: 'NexFlow CRM Live' });
      }
    }

    return res.json({
      success: true,
      data: {
        items: combined,
        total: combined.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchStats = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      const localRes = await query(`SELECT COUNT(*) as total FROM crm_branches WHERE company_id = $1 OR company_id = $2 OR company_id IS NULL`, [companyId || '', companyName || '']);
      const userRes = await query(`SELECT COUNT(*) as total_users FROM crm_company_users WHERE company_id = $1 OR company_id = $2`, [companyId || '', companyName || '']);
      return res.json({
        success: true,
        data: {
          totalBranches: parseInt(localRes.rows[0].total, 10),
          totalStaff: parseInt(userRes.rows[0].total_users, 10),
          activeBranches: parseInt(localRes.rows[0].total, 10)
        }
      });
    }

    const localRes = await query(`SELECT COUNT(*) as total FROM crm_branches`);
    const userRes = await query(`SELECT COUNT(*) as total_users FROM crm_company_users`);
    return res.json({
      success: true,
      data: {
        totalBranches: parseInt(localRes.rows[0].total, 10),
        totalStaff: parseInt(userRes.rows[0].total_users, 10),
        activeBranches: parseInt(localRes.rows[0].total, 10)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    const localRes = await query('SELECT * FROM crm_branches WHERE id = $1', [req.params.id]);
    if (localRes.rows.length > 0) {
      const br = localRes.rows[0];
      if (!isSuperAdmin && br.company_id && br.company_id !== companyId && br.company_id !== companyName) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot view branches of other companies.' });
      }
      return res.json({ success: true, data: br });
    }
    if (!isSuperAdmin) {
      return res.status(404).json({ success: false, message: 'Branch not found or access denied.' });
    }
    const result = await crmApiService.getBranchById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBranchUsers = async (req, res) => {
  try {
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    let localRes;
    if (!isSuperAdmin) {
      localRes = await query(
        'SELECT * FROM crm_company_users WHERE branch_id = $1 AND (company_id = $2 OR company_id = $3)',
        [req.params.id, companyId || '', companyName || '']
      );
    } else {
      localRes = await query('SELECT * FROM crm_company_users WHERE branch_id = $1', [req.params.id]);
    }
    if (localRes.rows.length > 0) {
      return res.json({ success: true, data: localRes.rows });
    }
    if (!isSuperAdmin) {
      return res.json({ success: true, data: [] });
    }
    const result = await crmApiService.getBranchUsers(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, code, city, state, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });
    const { isSuperAdmin, companyId, companyName } = getCallerTenantScope(req);
    const assignedCompanyId = !isSuperAdmin ? (companyId || companyName) : (req.body.company_id || null);

    const newId = code || ('BR-' + Date.now());
    const ins = await query(`
      INSERT INTO crm_branches (id, name, code, city, state, address, company_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `, [newId, name, code || newId, city || '', state || '', address || '', assignedCompanyId]);
    await crmApiService.createBranch(req.body).catch(() => {});
    return res.status(201).json({ success: true, message: 'Branch created successfully', data: ins.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const { name, code, city, state, address } = req.body;
    await query(`
      UPDATE crm_branches
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          city = COALESCE($3, city),
          state = COALESCE($4, state),
          address = COALESCE($5, address)
      WHERE id = $6
    `, [name, code, city, state, address, req.params.id]);
    await crmApiService.updateBranch(req.params.id, req.body).catch(() => {});
    return res.json({ success: true, message: 'Branch updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleBranchStatus = async (req, res) => {
  try {
    const upd = await query(`
      UPDATE crm_branches
      SET is_active = NOT is_active
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);
    await crmApiService.toggleBranchStatus(req.params.id).catch(() => {});
    return res.json({ success: true, message: 'Branch status updated', data: upd.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    await query('DELETE FROM crm_branches WHERE id = $1', [req.params.id]);
    await crmApiService.deleteBranch(req.params.id).catch(() => {});
    return res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Positions, Teams & Roles Controllers
// ==========================================

exports.getPositions = async (req, res) => {
  try {
    const localRes = await query(`SELECT * FROM crm_positions ORDER BY title ASC`);
    const localItems = localRes.rows.map(r => ({
      id: r.id,
      title: r.title,
      department: r.department,
      level: r.level,
      isActive: r.is_active,
      is_active: r.is_active
    }));

    let remoteItems = [];
    try {
      const result = await crmApiService.getPositions();
      if (result.success && result.data) {
        remoteItems = Array.isArray(result.data) ? result.data : (result.data.items || result.data.positions || []);
      }
    } catch (e) {}

    const combined = [...localItems];
    for (const remote of remoteItems) {
      const exists = combined.some(p => String(p.id) === String(remote.id) || p.title === remote.title);
      if (!exists) {
        combined.push(remote);
      }
    }

    return res.json({
      success: true,
      data: combined
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const result = await crmApiService.getTeams();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const result = await crmApiService.getRoles();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRoleStats = async (req, res) => {
  try {
    const result = await crmApiService.getRoleStats();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Leads & Configuration Controllers
// ==========================================

exports.getLeads = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const { isSuperAdmin, companyId, companyName } = scope;
    const options = token ? { token } : {};

    // 1. Fetch leads from CRM PostgreSQL database
    let localItems = [];
    try {
      const { Client } = require('pg');
      const crmClient = new Client({
        host: process.env.CRM_DB_HOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.CRM_DB_PORT || process.env.DB_PORT || '5432', 10),
        user: process.env.CRM_DB_USER || process.env.DB_USER || 'postgres',
        password: process.env.CRM_DB_PASSWORD || process.env.DB_PASSWORD || '798214',
        database: process.env.CRM_DB_NAME || 'CRM'
      });
      await crmClient.connect();

      let q = `SELECT * FROM public.leads`;
      let params = [];
      if (!isSuperAdmin) {
        q += ` WHERE company_id::text = $1`;
        params.push(companyId || '0');
      }
      q += ` ORDER BY created_at DESC LIMIT 100`;

      const dbRes = await crmClient.query(q, params);
      localItems = dbRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        company: r.company,
        email: r.email,
        phone: r.phone,
        stage: r.stage || 'NEW',
        priority: r.priority || 'MEDIUM',
        source: r.source || 'Direct',
        score: r.score || 50,
        company_id: r.company_id,
        companyId: r.company_id,
        createdAt: r.created_at,
        created_at: r.created_at
      }));
      await crmClient.end();
    } catch (dbErr) {
      // Graceful fallback
    }

    // 2. Fetch leads from remote CRM API
    let remoteItems = [];
    try {
      const result = await crmApiService.getLeads(req.query, options);
      if (result.success && result.data) {
        remoteItems = Array.isArray(result.data) ? result.data : (result.data.items || []);
      }
    } catch (e) {}

    // 3. Merge deduplicated
    const combined = [...localItems];
    for (const remote of remoteItems) {
      const exists = combined.some(i => String(i.id) === String(remote.id));
      if (!exists) {
        combined.push(remote);
      }
    }

    // Strict Tenant isolation filter
    if (!isSuperAdmin) {
      const filtered = combined.filter(item => {
        const cId = String(item.companyId || item.company_id || '');
        const cName = String(item.companyName || item.company_name || '');
        return (companyId && cId === companyId) ||
               (companyName && cName.toLowerCase() === companyName.toLowerCase());
      });
      return res.json({
        success: true,
        data: {
          items: filtered,
          total: filtered.length
        }
      });
    }

    return res.json({
      success: true,
      data: {
        items: combined,
        total: combined.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeadStats = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const { isSuperAdmin } = scope;
    const options = token ? { token } : {};
    const result = await crmApiService.getLeadStats(options);
    if (result.success) {
      return res.json(result);
    }
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: {
          total: 0,
          totalLeads: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          avgScore: 0,
          winRate: '0%'
        }
      });
    }
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const options = token ? { token } : {};
    const result = await crmApiService.getLeadById(req.params.id, options);
    if (!scope.isSuperAdmin && result.success && result.data) {
      const lead = result.data;
      const cId = String(lead.companyId || lead.company_id || '');
      if (scope.companyId && cId && cId !== scope.companyId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot access leads belonging to another company.' });
      }
    }
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const leadData = { ...req.body };
    if (!scope.isSuperAdmin && scope.companyId) {
      leadData.company_id = scope.companyId;
      leadData.companyId = scope.companyId;
    }
    const options = token ? { token } : {};
    const result = await crmApiService.createLead(leadData, options);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const options = token ? { token } : {};
    const result = await crmApiService.updateLead(req.params.id, req.body, options);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const { token, scope } = getTenantApiOptions(req);
    const options = token ? { token } : {};
    const result = await crmApiService.deleteLead(req.params.id, options);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPipelineStages = async (req, res) => {
  try {
    const result = await crmApiService.getPipelineStages();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStageFields = async (req, res) => {
  try {
    const result = await crmApiService.getStageFields(req.params.stageId);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCustomFields = async (req, res) => {
  try {
    const result = await crmApiService.getCustomFields();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getIndustryTemplates = async (req, res) => {
  try {
    const result = await crmApiService.getIndustryTemplates();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLeadCaptureForms = async (req, res) => {
  try {
    const result = await crmApiService.getLeadCaptureForms();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFormSubmissions = async (req, res) => {
  try {
    const result = await crmApiService.getFormSubmissions(req.params.formId);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// WhatsApp & AI Bot Controllers
// ==========================================

exports.getWhatsAppChats = async (req, res) => {
  try {
    const result = await crmApiService.getWhatsAppChats();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWhatsAppStats = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: { activeChats: 0, responseRate: '100%', messagesToday: 0 }
      });
    }
    const result = await crmApiService.getWhatsAppStats();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWhatsAppChatMessages = async (req, res) => {
  try {
    const result = await crmApiService.getWhatsAppChatMessages(req.params.chatId);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWhatsAppTemplates = async (req, res) => {
  try {
    const result = await crmApiService.getWhatsAppTemplates();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWhatsAppQuickReplies = async (req, res) => {
  try {
    const result = await crmApiService.getWhatsAppQuickReplies();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBotSettings = async (req, res) => {
  try {
    const result = await crmApiService.getBotSettings();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Workflows, Projects & Quotations
// ==========================================

exports.getWorkflows = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({ success: true, data: [] });
    }
    const result = await crmApiService.getWorkflows();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({ success: true, data: [], total: 0 });
    }
    const result = await crmApiService.getProjects(req.query);
    if (!result.success) {
      return res.json({
        success: false,
        crmAuthRequired: result.crmAuthRequired || false,
        message: result.message || 'CRM projects request failed',
        data: []
      });
    }
    const items = Array.isArray(result.data) ? result.data : (result.data?.items || []);
    return res.json({
      success: true,
      data: items,
      total: items.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const result = await crmApiService.getProjectById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectInventory = async (req, res) => {
  try {
    const result = await crmApiService.getProjectInventory(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectTasks = async (req, res) => {
  try {
    const result = await crmApiService.getProjectTasks(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: { items: [], total: 0 }
      });
    }
    const result = await crmApiService.getQuotations(req.query);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQuotationStats = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: {
          total: 0,
          totalValue: 0,
          accepted: 0,
          pending: 0,
          rejected: 0
        }
      });
    }
    const result = await crmApiService.getQuotationStats();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQuotationTemplates = async (req, res) => {
  try {
    const result = await crmApiService.getQuotationTemplates();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const result = await crmApiService.getQuotationById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// Calls, Campaigns, Activities, Analytics
// ==========================================

exports.getCalls = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({ success: true, data: { items: [], total: 0 } });
    }
    const result = await crmApiService.getCalls(req.query);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCallStats = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: { totalCalls: 0, connected: 0, avgDuration: '00:00' }
      });
    }
    const result = await crmApiService.getCallStats();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getScheduledCalls = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({ success: true, data: [] });
    }
    const result = await crmApiService.getScheduledCalls();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({ success: true, data: [] });
    }
    const result = await crmApiService.getCampaigns();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCampaignById = async (req, res) => {
  try {
    const result = await crmApiService.getCampaignById(req.params.id);
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { isSuperAdmin } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }
    const result = await crmApiService.getActivities(req.query);
    if (!result.success) {
      return res.json({
        success: false,
        crmAuthRequired: result.crmAuthRequired || false,
        message: result.message || 'CRM activities request failed',
        data: []
      });
    }

    const items = Array.isArray(result.data) ? result.data : (result.data?.items || []);
    return res.json({
      success: true,
      data: items,
      total: items.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReportsSummary = async (req, res) => {
  try {
    const { isSuperAdmin, companyId } = getCallerTenantScope(req);
    if (!isSuperAdmin) {
      // Fresh isolated metrics for this company
      return res.json({
        success: true,
        data: {
          totalLeads: 0,
          wonLeads: 0,
          totalQuotations: 0,
          totalRevenue: 0,
          totalCampaigns: 0,
          totalCalls: 0
        }
      });
    }
    const result = await crmApiService.getReportsSummary();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getIntegrations = async (req, res) => {
  try {
    const result = await crmApiService.getIntegrations();
    return res.status(result.status || 200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Link Super Admin organization to CRM Company ID
 */
exports.syncOrganization = async (req, res) => {
  try {
    const orgId = parseInt(req.params.id, 10);
    const { crmCompanyId } = req.body;

    if (!crmCompanyId) {
      return res.status(400).json({ success: false, message: 'crmCompanyId is required' });
    }

    await query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_company_id VARCHAR(100)');

    const updateRes = await query(`
      UPDATE organizations 
      SET crm_company_id = $1 
      WHERE id = $2
      RETURNING id, name, slug, email, crm_company_id
    `, [String(crmCompanyId).trim(), orgId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found in Super Admin database' });
    }

    return res.json({
      success: true,
      message: 'Organization linked with CRM Company successfully',
      data: updateRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.migrateLocalData = async (req, res) => {
  try {
    const { crmCompanies, organizations, subscriptions, payments, users } = req.body;
    await ensureCrmCompaniesTable();

    // 1. Insert crm_companies
    if (Array.isArray(crmCompanies)) {
      for (const comp of crmCompanies) {
        await query(`
          INSERT INTO crm_companies (id, name, email, phone, address, state, state_code, financial_year_start, gstin, pan, website, status, source, crm_synced, plan_id, plan_name, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, status = EXCLUDED.status
        `, [
          comp.id, comp.name, comp.email, comp.phone, comp.address, comp.state, comp.state_code,
          comp.financial_year_start, comp.gstin, comp.pan, comp.website, comp.status || 'ACTIVE',
          comp.source || 'Super Admin Provisioned', comp.crm_synced || false, comp.plan_id, comp.plan_name,
          comp.created_at || new Date()
        ]);
      }
    }

    // 2. Insert organizations
    if (Array.isArray(organizations)) {
      for (const org of organizations) {
        await query(`
          INSERT INTO organizations (id, name, slug, email, phone, city, state, status, plan_id, plan_name, owner_name, users_count, crm_company_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, crm_company_id = EXCLUDED.crm_company_id
        `, [
          org.id, org.name, org.slug, org.email, org.phone, org.city, org.state, org.status,
          org.plan_id, org.plan_name, org.owner_name, org.users_count, org.crm_company_id, org.created_at || new Date()
        ]);
      }
      await query(`SELECT setval(pg_get_serial_sequence('organizations', 'id'), COALESCE(MAX(id), 1)) FROM organizations`);
    }

    // 3. Insert subscriptions
    if (Array.isArray(subscriptions)) {
      for (const sub of subscriptions) {
        await query(`
          INSERT INTO saas_subscriptions (id, organization_id, organization_name, plan_id, plan_name, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          sub.id, sub.organization_id, sub.organization_name, sub.plan_id, sub.plan_name,
          sub.billing_cycle, sub.amount, sub.status, sub.current_period_start, sub.current_period_end, sub.created_at || new Date()
        ]);
      }
      await query(`SELECT setval(pg_get_serial_sequence('saas_subscriptions', 'id'), COALESCE(MAX(id), 1)) FROM saas_subscriptions`);
    }

    // 4. Insert payments
    if (Array.isArray(payments)) {
      for (const pay of payments) {
        await query(`
          INSERT INTO saas_payments (id, payment_id, organization_id, organization_name, amount, currency, method, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          pay.id, pay.payment_id, pay.organization_id, pay.organization_name, pay.amount,
          pay.currency, pay.method, pay.status, pay.created_at || new Date()
        ]);
      }
      await query(`SELECT setval(pg_get_serial_sequence('saas_payments', 'id'), COALESCE(MAX(id), 1)) FROM saas_payments`);
    }

    // 5. Insert users
    if (Array.isArray(users)) {
      for (const u of users) {
        await query(`
          INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, organization_id, organization_name, crm_company_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          ON CONFLICT (email) DO NOTHING
        `, [
          u.name, u.email, u.password, u.phone, u.role_name, u.role_display_name,
          u.is_active, u.organization_id, u.organization_name, u.crm_company_id
        ]);
      }
    }

    return res.json({ success: true, message: 'Local data successfully migrated to cloud database!' });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

