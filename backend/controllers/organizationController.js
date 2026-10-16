const bcrypt = require('bcryptjs');
const { query } = require('../db/database');

exports.getOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || 'ALL').toUpperCase();

    let sql = 'SELECT * FROM organizations WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM organizations WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (status !== 'ALL') {
      sql += ` AND status = $${pIdx}`;
      countSql += ` AND status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    // Tenant Isolation: External tenant users only see their own organization
    const isPlatformStaff = req.user?.isSuperAdmin === true || req.user?.isPlatformUser === true || !req.user?.organization_id;
    if (!isPlatformStaff && req.user?.organization_id) {
      sql += ` AND id = $${pIdx}`;
      countSql += ` AND id = $${pIdx}`;
      params.push(req.user.organization_id);
      pIdx++;
    }

    if (search) {
      sql += ` AND (name ILIKE $${pIdx} OR slug ILIKE $${pIdx} OR email ILIKE $${pIdx} OR owner_name ILIKE $${pIdx})`;
      countSql += ` AND (name ILIKE $${pIdx} OR slug ILIKE $${pIdx} OR email ILIKE $${pIdx} OR owner_name ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    sql += ` ORDER BY id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    return res.json({
      success: true,
      data: {
        items: itemsRes.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrganizationById = async (req, res) => {
  try {
    const isPlatformStaff = req.user?.isSuperAdmin === true || req.user?.isPlatformUser === true || !req.user?.organization_id;
    if (!isPlatformStaff && req.user?.organization_id && String(req.user?.organization_id) !== String(req.params.id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot view other organizations.' });
    }

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const org = orgRes.rows[0];
    const subRes = await query('SELECT * FROM saas_subscriptions WHERE organization_id = $1 ORDER BY id DESC LIMIT 1', [org.id]);
    const usageRes = await query('SELECT * FROM saas_usage_metrics WHERE organization_id = $1', [org.id]);
    const usersRes = await query('SELECT id, name, email, phone, role_name, is_active, last_login, created_at FROM users WHERE organization_id = $1', [org.id]);
    const invoicesRes = await query('SELECT * FROM saas_invoices WHERE organization_id = $1 ORDER BY id DESC', [org.id]);
    const paymentsRes = await query('SELECT * FROM saas_payments WHERE organization_id = $1 ORDER BY id DESC LIMIT 1', [org.id]);

    const rawSub = subRes.rows[0] || null;
    const planIdToLookup = rawSub?.plan_id || org.plan_id || 2;
    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [planIdToLookup]);
    const plan = planRes.rows[0] || null;

    let planFeatures = [];
    if (plan?.features_json) {
      if (Array.isArray(plan.features_json)) {
        planFeatures = plan.features_json;
      } else if (typeof plan.features_json === 'string') {
        try { planFeatures = JSON.parse(plan.features_json); } catch (e) { planFeatures = []; }
      }
    }

    const latestInvoice = invoicesRes.rows[0] || null;
    const latestPayment = paymentsRes.rows[0] || null;
    const paymentStatus = latestPayment ? latestPayment.status : (latestInvoice ? latestInvoice.status : (org.status === 'ACTIVE' ? 'PAID' : 'TRIAL'));

    const formattedStartDate = rawSub?.current_period_start || org.created_at;
    const defaultEnd = new Date(new Date(formattedStartDate).getTime() + (rawSub?.billing_cycle === 'YEARLY' ? 365 : 30) * 86400000).toISOString();
    const formattedEndDate = rawSub?.current_period_end || defaultEnd;

    const formattedSub = rawSub ? {
      ...rawSub,
      amount: parseFloat(rawSub.amount ?? plan?.price_monthly ?? 79),
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      current_period_start: formattedStartDate,
      current_period_end: formattedEndDate,
      auto_renew: !rawSub.cancel_at_period_end,
      payment_status: paymentStatus,
      payment_method: latestPayment?.method || 'CREDIT_CARD',
      invoice_number: latestInvoice?.invoice_number || `INV-${org.id}-001`,
      last_payment_date: latestPayment?.created_at || latestInvoice?.paid_at || formattedStartDate
    } : {
      plan_name: org.plan_name || plan?.name || 'Pro',
      plan_id: plan?.id || org.plan_id || 2,
      billing_cycle: 'MONTHLY',
      amount: parseFloat(plan?.price_monthly || 79),
      status: org.status || 'ACTIVE',
      start_date: org.created_at,
      end_date: defaultEnd,
      current_period_start: org.created_at,
      current_period_end: defaultEnd,
      auto_renew: true,
      payment_status: paymentStatus,
      payment_method: 'CREDIT_CARD',
      invoice_number: `INV-${org.id}-001`,
      last_payment_date: org.created_at
    };

    const metricsMap = {};
    usageRes.rows.forEach(r => {
      metricsMap[r.metric_name] = {
        current: parseFloat(r.current_value || 0),
        max: parseFloat(r.max_limit || 100)
      };
    });

    const structuredUsage = {
      users: metricsMap['users'] || { current: org.users_count || 1, max: plan?.max_users || 10 },
      customers: metricsMap['customers'] || { current: 35, max: 500 },
      orders: metricsMap['orders'] || { current: 120, max: 1000 },
      storage: {
        currentMb: metricsMap['storage']?.current || 45,
        maxMb: metricsMap['storage']?.max || ((plan?.max_storage_gb || 25) * 1024)
      }
    };

    return res.json({
      success: true,
      data: {
        organization: org,
        subscription: formattedSub,
        plan: plan ? {
          ...plan,
          features: planFeatures,
          monthly_price: parseFloat(plan.price_monthly || 0),
          yearly_price: parseFloat(plan.price_yearly || 0)
        } : null,
        features: planFeatures.map(f => typeof f === 'object' ? f : { name: String(f) }),
        latestPayment,
        latestInvoice,
        usage: structuredUsage,
        rawUsage: usageRes.rows,
        users: usersRes.rows,
        invoices: invoicesRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createOrganization = async (req, res) => {
  try {
    const { name, slug, email, phone, city, state, status, planId, ownerName, ownerEmail } = req.body;
    if (!name || (!email && !ownerEmail)) {
      return res.status(400).json({ success: false, message: 'Company name and email are required' });
    }

    const targetEmail = (ownerEmail || email || '').toLowerCase().trim();

    // Verify OTP confirmation for organization email
    const verRes = await query(`
      SELECT id FROM saas_email_verifications
      WHERE email = $1 AND is_verified = TRUE
      ORDER BY id DESC LIMIT 1
    `, [targetEmail]);

    if (verRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Email ${targetEmail} has not been verified with OTP yet. Please verify before creating organization.`
      });
    }

    const orgEmail = (email || ownerEmail).toLowerCase().trim();
    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Contact phone number must be exactly 10 digits without letters or special characters.' });
      }
    }
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [planId || 2]);
    const plan = planRes.rows[0];
    const planName = plan ? plan.name : 'Pro';

    const insertRes = await query(`
      INSERT INTO organizations (name, slug, email, phone, city, state, status, plan_id, plan_name, owner_name, users_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING *
    `, [name, generatedSlug, orgEmail, cleanPhone, city || '', state || '', status || 'TRIAL', planId || 2, planName, ownerName || 'Admin']);

    const newOrg = insertRes.rows[0];

    // Create or link Owner Admin user account
    const ownerCleanEmail = (ownerEmail || orgEmail).toLowerCase().trim();
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [ownerCleanEmail]);
    const ownerPass = req.body.ownerPassword || 'Company@123';
    const hash = bcrypt.hashSync(ownerPass, 10);
    let userId;
    if (existingUser.rows.length === 0) {
      const userRes = await query(`
        INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, organization_id, organization_name)
        VALUES ($1, $2, $3, $4, 'ORG_ADMIN', 'Organization Admin', true, $5, $6)
        RETURNING id
      `, [ownerName || 'Admin', ownerCleanEmail, hash, cleanPhone, newOrg.id, name]);
      userId = userRes.rows[0].id;
    } else {
      userId = existingUser.rows[0].id;
      await query('UPDATE users SET organization_id = $1, organization_name = $2 WHERE id = $3', [newOrg.id, name, userId]);
    }

    // Ensure org_admin / company_admin role in user_roles
    const roleLookup = await query("SELECT id FROM roles WHERE slug IN ('org_admin', 'company_admin') LIMIT 1");
    if (roleLookup.rows.length > 0) {
      await query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, roleLookup.rows[0].id]);
    }

    // Provision dedicated isolated workspace in CRM
    let crmCompId = newOrg.crm_company_id;
    if (!crmCompId) {
      crmCompId = require('crypto').randomUUID();
      await query('UPDATE organizations SET crm_company_id = $1 WHERE id = $2', [String(crmCompId), newOrg.id]);
      newOrg.crm_company_id = crmCompId;
    }
    await query('UPDATE users SET crm_company_id = $1 WHERE id = $2', [String(crmCompId), userId]);

    try {
      const crmProvisioningService = require('../services/crmProvisioningService');
      await crmProvisioningService.provisionTenantInCrm({
        companyId: crmCompId,
        name,
        email: orgEmail,
        phone: cleanPhone,
        address: city || '',
        state: state || 'Maharashtra',
        planId: planId || 2,
        planName,
        adminName: ownerName || 'Admin',
        adminEmail: ownerCleanEmail,
        adminPasswordHash: hash
      });
    } catch (crmSyncErr) {
      console.warn('Auto CRM sync for organization skipped:', crmSyncErr.message);
    }

    const subAmount = parseFloat(plan?.price_monthly) || (plan?.price_yearly ? parseFloat(plan.price_yearly) / 12 : 79);
    const initialDays = status === 'ACTIVE' ? 30 : (parseInt(req.body.trialDays, 10) || 14);

    // Create Subscription
    await query(`
      INSERT INTO saas_subscriptions (
        organization_id, organization_name, plan_id, plan_name,
        billing_cycle, amount, status, current_period_start,
        current_period_end, cancel_at_period_end
      )
      VALUES ($1, $2, $3, $4, 'MONTHLY', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($7 || ' days')::interval, false)
    `, [newOrg.id, name, planId || 2, planName, subAmount, status === 'ACTIVE' ? 'ACTIVE' : 'TRIAL', initialDays]);

    // Create initial usage metrics
    await query(`
      INSERT INTO saas_usage_metrics (organization_id, organization_name, metric_name, current_value, max_limit, unit)
      VALUES 
      ($1, $2, 'storage_gb', 0, $3, 'GB'),
      ($1, $2, 'api_calls', 0, $4, 'calls'),
      ($1, $2, 'active_users', 1, $5, 'users')
    `, [newOrg.id, name, plan ? plan.max_storage_gb : 50, plan ? plan.max_api_calls_per_month : 50000, plan ? plan.max_users : 10]);

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'CREATE_ORGANIZATION', 'ORGANIZATIONS', $4)
    `, [req.user.id, req.user.name, newOrg.id, `Provisioned tenant ${name} with CRM workspace ${crmCompId}`]);

    return res.status(201).json({
      success: true,
      message: 'Organization created successfully and provisioned to CRM workspace',
      data: {
        ...newOrg,
        crm_company_id: crmCompId,
        adminCredentials: {
          email: ownerCleanEmail,
          temporaryPassword: ownerPass,
          crmWorkspaceId: crmCompId
        }
      }
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.suspendOrganization = async (req, res) => {
  try {
    const { reason } = req.body;
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Organization not found' });

    const org = orgRes.rows[0];
    await query("UPDATE organizations SET status = 'SUSPENDED', suspension_reason = $1 WHERE id = $2", [reason || 'Administrative suspension', org.id]);
    await query("UPDATE saas_subscriptions SET status = 'SUSPENDED' WHERE organization_id = $1", [org.id]);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'SUSPEND_ORGANIZATION', 'ORGANIZATIONS', $4)
    `, [req.user.id, req.user.name, org.id, `Suspended tenant ${org.name}: ${reason || 'Admin action'}`]);

    return res.json({ success: true, message: `Organization '${org.name}' suspended.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.activateOrganization = async (req, res) => {
  try {
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Organization not found' });

    const org = orgRes.rows[0];
    await query("UPDATE organizations SET status = 'ACTIVE', suspension_reason = NULL WHERE id = $1", [org.id]);
    await query("UPDATE saas_subscriptions SET status = 'ACTIVE' WHERE organization_id = $1", [org.id]);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'ACTIVATE_ORGANIZATION', 'ORGANIZATIONS', $4)
    `, [req.user.id, req.user.name, org.id, `Reactivated tenant ${org.name}`]);

    return res.json({ success: true, message: `Organization '${org.name}' activated.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePlan = async (req, res) => {
  try {
    const rawPlanId = req.body.planId || req.body.newPlanId || req.body.targetPlanId;
    const planId = parseInt(rawPlanId, 10);
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Invalid or missing plan ID' });
    }

    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Organization not found' });

    const org = orgRes.rows[0];
    const wasTrial = org.status === 'TRIAL';
    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Plan not found' });

    const plan = planRes.rows[0];
    const cycle = (req.body.billingCycle || req.body.billing_cycle || 'MONTHLY').toUpperCase();
    
    // Support custom or calculated amount in INR
    const defaultAmount = cycle === 'YEARLY'
      ? (parseFloat(plan.price_yearly) || parseFloat(plan.yearly_price) || 0)
      : (parseFloat(plan.price_monthly) || parseFloat(plan.monthly_price) || 0);

    const cycleAmount = req.body.amount !== undefined && req.body.amount !== null && !isNaN(parseFloat(req.body.amount))
      ? parseFloat(req.body.amount)
      : defaultAmount;

    // Payment details
    const paymentMethod = (req.body.paymentMethod || req.body.method || 'UPI').toUpperCase();
    const paymentStatus = (req.body.paymentStatus || 'SUCCESS').toUpperCase();
    const isPending = paymentStatus === 'PENDING';
    const transactionId = (req.body.transactionId || req.body.referenceId || `PAY-${Date.now().toString().slice(-6)}`).trim();
    const notes = req.body.notes ? String(req.body.notes).trim() : '';

    const endDate = new Date(Date.now() + (cycle === 'YEARLY' ? 365 : 30) * 86400000).toISOString();

    // 1. Update organization: set active plan and mark ACTIVE (clearing trial)
    await query(`
      UPDATE organizations 
      SET plan_id = $1, plan_name = $2, status = $3, trial_ends_at = NULL 
      WHERE id = $4
    `, [
      plan.id,
      plan.name,
      org.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      org.id
    ]);

    // 2. Upsert active subscription record
    const subCheck = await query('SELECT * FROM saas_subscriptions WHERE organization_id = $1 ORDER BY id DESC LIMIT 1', [org.id]);
    let subscriptionId = null;
    if (subCheck.rows.length === 0) {
      const insSub = await query(`
        INSERT INTO saas_subscriptions (
          organization_id, organization_name, plan_id, plan_name, 
          billing_cycle, amount, status, cancel_at_period_end, current_period_start, current_period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', false, CURRENT_TIMESTAMP, $7)
        RETURNING id
      `, [org.id, org.name, plan.id, plan.name, cycle, cycleAmount, endDate]);
      subscriptionId = insSub.rows[0].id;
    } else {
      subscriptionId = subCheck.rows[0].id;
      await query(`
        UPDATE saas_subscriptions 
        SET plan_id = $1, plan_name = $2, billing_cycle = $3, amount = $4, 
            status = 'ACTIVE', cancel_at_period_end = false,
            scheduled_plan_id = NULL, scheduled_billing_cycle = NULL, scheduled_change_date = NULL,
            current_period_start = CURRENT_TIMESTAMP, current_period_end = $5
        WHERE id = $6
      `, [plan.id, plan.name, cycle, cycleAmount, endDate, subscriptionId]);
    }

    // 3. Insert real payment record into saas_payments (Directly updates Dashboard & SaaS Analytics!)
    await query(`
      INSERT INTO saas_payments (
        payment_id, organization_id, organization_name, amount, currency, method, status, created_at
      )
      VALUES ($1, $2, $3, $4, 'INR', $5, $6, CURRENT_TIMESTAMP)
    `, [
      transactionId,
      org.id,
      org.name,
      cycleAmount,
      paymentMethod,
      isPending ? 'PENDING' : 'SUCCESS'
    ]);

    // 4. Insert invoice record for this activation into saas_invoices
    const invoiceNumber = `INV-${org.id}-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO saas_invoices (
        invoice_number, organization_id, organization_name, plan_name, amount, currency, status, billing_period, due_date, paid_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP)
    `, [
      invoiceNumber,
      org.id,
      org.name,
      plan.name,
      cycleAmount,
      isPending ? 'PENDING' : 'PAID',
      cycle === 'YEARLY' ? 'Annual Plan' : 'Monthly Plan',
      isPending ? null : new Date()
    ]);

    // 5. Audit Log
    const userId = req.user?.id || 1;
    const userName = req.user?.name || req.user?.email || 'Super Admin';
    const auditAction = wasTrial ? 'CONVERT_TRIAL_TO_PAID' : 'CHANGE_PLAN';
    const auditDetails = wasTrial
      ? `Converted trial organization ${org.name} to ${plan.name} (${cycle}: ₹${cycleAmount}) via ${paymentMethod} [Payment: ${isPending ? 'PENDING' : 'SUCCESS'}, Ref: ${transactionId}]`
      : `Changed plan for ${org.name} to ${plan.name} (${cycle}: ₹${cycleAmount}) via ${paymentMethod} [Payment: ${isPending ? 'PENDING' : 'SUCCESS'}, Ref: ${transactionId}]`;

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, $4, 'ORGANIZATIONS', $5)
    `, [userId, userName, org.id, auditAction, auditDetails]);

    return res.json({
      success: true,
      message: wasTrial
        ? `Organization '${org.name}' successfully converted to active paid plan via ${paymentMethod} (₹${cycleAmount}).`
        : `Plan changed successfully to ${plan.name} (${cycle}: ₹${cycleAmount}).`,
      data: {
        organization_id: org.id,
        plan_id: plan.id,
        plan_name: plan.name,
        billing_cycle: cycle,
        amount: cycleAmount,
        end_date: endDate,
        payment_method: paymentMethod,
        payment_status: isPending ? 'PENDING' : 'SUCCESS',
        transaction_id: transactionId,
        invoice_number: invoiceNumber
      }
    });
  } catch (err) {
    console.error('changePlan / convertToPaid error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.convertToPaid = exports.changePlan;

exports.extendTrial = async (req, res) => {
  try {
    const rawDays = req.body.days || req.body.additionalDays;
    const days = parseInt(rawDays, 10) || 14;
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Organization not found' });

    const org = orgRes.rows[0];
    await query(`
      UPDATE organizations 
      SET trial_ends_at = COALESCE(trial_ends_at, CURRENT_TIMESTAMP) + ($1 || ' days')::interval, status = 'TRIAL'
      WHERE id = $2
    `, [days, org.id]);

    const userId = req.user?.id || 1;
    const userName = req.user?.name || req.user?.email || 'Super Admin';
    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'EXTEND_TRIAL', 'ORGANIZATIONS', $4)
    `, [userId, userName, org.id, `Extended trial for ${org.name} by ${days} days`]);

    return res.json({ success: true, message: `Trial extended by ${days} days.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOrganization = async (req, res) => {
  try {
    const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [req.params.id]);
    if (orgRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Organization not found' });

    const org = orgRes.rows[0];
    const orgEmail = org.email ? org.email.trim().toLowerCase() : null;

    // 1. Revoke and delete associated users in NexFlow CRM so they cannot log in
    try {
      const crmApiService = require('../services/crmApiService');
      const allCrmUsersRes = await crmApiService.getCompanyUsers();
      const crmUsers = Array.isArray(allCrmUsersRes.data)
        ? allCrmUsersRes.data
        : (allCrmUsersRes.data?.items || []);

      for (const u of crmUsers) {
        const uEmail = u.email ? u.email.trim().toLowerCase() : '';
        const uCompId = u.companyId || u.company_id || null;

        const isMatch = (orgEmail && uEmail === orgEmail) ||
                        (org.crm_company_id && String(uCompId) === String(org.crm_company_id));

        if (isMatch && u.id) {
          console.log(`[CRM_DELETE_ORG] Revoking user ${uEmail} in NexFlow CRM`);
          await crmApiService.toggleCompanyUserStatus(u.id, false).catch(() => {});
          await crmApiService.deleteCompanyUser(u.id, { permanent: true }).catch(() => {});
        }
      }

      if (org.crm_company_id) {
        await crmApiService.deleteCompany(org.crm_company_id).catch(() => {});
      }
    } catch (crmErr) {
      console.warn('CRM sync on deleteOrganization warning:', crmErr.message);
    }

    // 2. Delete local records
    await query('DELETE FROM saas_subscriptions WHERE organization_id = $1', [org.id]);
    await query('DELETE FROM saas_usage_metrics WHERE organization_id = $1', [org.id]);
    await query('DELETE FROM organizations WHERE id = $1', [org.id]);

    if (org.crm_company_id) {
      await query('DELETE FROM crm_companies WHERE id::text = $1', [org.crm_company_id]);
      await query('DELETE FROM crm_company_users WHERE company_id = $1', [org.crm_company_id]);
      await query('DELETE FROM users WHERE crm_company_id = $1', [org.crm_company_id]);
    }
    if (orgEmail) {
      await query('DELETE FROM crm_companies WHERE email = $1', [orgEmail]);
      await query('DELETE FROM users WHERE email = $1', [orgEmail]);
    }

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'DELETE_ORGANIZATION', 'ORGANIZATIONS', $4)
    `, [req.user.id, req.user.name, org.id, `Deleted tenant ${org.name}`]);

    return res.json({ success: true, message: `Organization '${org.name}' deleted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
