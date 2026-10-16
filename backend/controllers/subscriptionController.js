const { query } = require('../db/database');

exports.getSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = (req.query.status || 'ALL').toUpperCase();
    const search = (req.query.search || '').trim();

    let sql = `
      SELECT s.*, 
             COALESCE(s.current_period_end, s.created_at + INTERVAL '30 days') as end_date,
             s.current_period_start as start_date,
             (NOT COALESCE(s.cancel_at_period_end, false)) as auto_renew,
             o.email as organization_email,
             sp.name as scheduled_plan_name
      FROM saas_subscriptions s
      LEFT JOIN organizations o ON s.organization_id = o.id
      LEFT JOIN saas_plans sp ON s.scheduled_plan_id = sp.id
      WHERE 1=1
    `;
    let countSql = `
      SELECT COUNT(*) as total 
      FROM saas_subscriptions s
      LEFT JOIN organizations o ON s.organization_id = o.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (status !== 'ALL') {
      sql += ` AND s.status = $${pIdx}`;
      countSql += ` AND s.status = $${pIdx}`;
      params.push(status);
      pIdx++;
    }

    // Tenant isolation: External tenant users only see their own organization's subscriptions
    // SaaS Platform staff (Super Admin, Sales, Support, Finance) can view all subscriptions
    const isPlatformStaff = req.user?.isSuperAdmin === true || req.user?.isPlatformUser === true || !req.user?.organization_id;
    if (!isPlatformStaff && req.user?.organization_id) {
      sql += ` AND s.organization_id = $${pIdx}`;
      countSql += ` AND s.organization_id = $${pIdx}`;
      params.push(req.user.organization_id);
      pIdx++;
    }

    if (search) {
      sql += ` AND (s.organization_name ILIKE $${pIdx} OR s.plan_name ILIKE $${pIdx} OR o.email ILIKE $${pIdx})`;
      countSql += ` AND (s.organization_name ILIKE $${pIdx} OR s.plan_name ILIKE $${pIdx} OR o.email ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    sql += ` ORDER BY s.id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    const formattedItems = itemsRes.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount || 0),
      auto_renew: !!row.auto_renew,
      end_date: row.end_date || row.current_period_end
    }));

    return res.json({
      success: true,
      data: {
        items: formattedItems,
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

exports.createSubscription = async (req, res) => {
  try {
    const {
      organizationId,
      organization_id = organizationId,
      planId,
      plan_id = planId,
      billingCycle,
      billing_cycle = billingCycle || 'MONTHLY',
      status = 'ACTIVE',
      durationDays,
      auto_renew = true,
      paymentMethod,
      payment_method = paymentMethod || 'DIRECT_ADMIN',
      paymentStatus,
      payment_status = paymentStatus
    } = req.body;

    if (!organization_id) {
      return res.status(400).json({ success: false, message: 'Organization is required' });
    }
    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'Plan is required' });
    }

    // Lookup organization by numeric ID, crm_company_id (UUID), email, or name
    let org = null;
    const targetIdStr = String(organization_id || organizationId || '').trim();
    const crmCompIdStr = String(req.body.crm_company_id || req.body.crmCompanyId || '').trim();
    const companyEmail = String(req.body.companyEmail || req.body.email || '').trim().toLowerCase();
    const companyName = String(req.body.companyName || req.body.name || '').trim();

    // 1. Try by numeric organization ID
    if (/^\d+$/.test(targetIdStr)) {
      const orgRes = await query('SELECT id, name, email, crm_company_id FROM organizations WHERE id = $1', [parseInt(targetIdStr, 10)]);
      if (orgRes.rows.length > 0) org = orgRes.rows[0];
    }

    // 2. Try by crm_company_id in organizations
    if (!org && targetIdStr) {
      const orgByCrm = await query('SELECT id, name, email, crm_company_id FROM organizations WHERE crm_company_id = $1', [targetIdStr]);
      if (orgByCrm.rows.length > 0) org = orgByCrm.rows[0];
    }
    if (!org && crmCompIdStr) {
      const orgByCrm2 = await query('SELECT id, name, email, crm_company_id FROM organizations WHERE crm_company_id = $1', [crmCompIdStr]);
      if (orgByCrm2.rows.length > 0) org = orgByCrm2.rows[0];
    }

    // 3. Try by email or name in organizations
    if (!org && companyEmail) {
      const orgByEmail = await query('SELECT id, name, email, crm_company_id FROM organizations WHERE LOWER(email) = $1', [companyEmail]);
      if (orgByEmail.rows.length > 0) org = orgByEmail.rows[0];
    }
    if (!org && companyName) {
      const orgByName = await query('SELECT id, name, email, crm_company_id FROM organizations WHERE LOWER(name) = LOWER($1)', [companyName]);
      if (orgByName.rows.length > 0) org = orgByName.rows[0];
    }

    // 4. Try from local crm_companies table and auto-provision organization
    if (!org) {
      let crmComp = null;
      if (targetIdStr) {
        const crmRes = await query('SELECT id, name, email, phone FROM crm_companies WHERE id::text = $1', [targetIdStr]);
        if (crmRes.rows.length > 0) crmComp = crmRes.rows[0];
      }
      if (!crmComp && crmCompIdStr) {
        const crmRes = await query('SELECT id, name, email, phone FROM crm_companies WHERE id::text = $1', [crmCompIdStr]);
        if (crmRes.rows.length > 0) crmComp = crmRes.rows[0];
      }
      if (!crmComp && companyEmail) {
        const crmRes = await query('SELECT id, name, email, phone FROM crm_companies WHERE LOWER(email) = $1', [companyEmail]);
        if (crmRes.rows.length > 0) crmComp = crmRes.rows[0];
      }
      if (!crmComp && companyName) {
        const crmRes = await query('SELECT id, name, email, phone FROM crm_companies WHERE LOWER(name) = LOWER($1)', [companyName]);
        if (crmRes.rows.length > 0) crmComp = crmRes.rows[0];
      }

      // 5. If not in local crm_companies, try CRM PostgreSQL database
      if (!crmComp && (targetIdStr || companyEmail || companyName)) {
        try {
          const { Client } = require('pg');
          const crmClient = new Client({
            host: process.env.CRM_DB_HOST || process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.CRM_DB_PORT || process.env.DB_PORT || '5432', 10),
            user: process.env.CRM_DB_USER || process.env.DB_USER || 'postgres',
            password: process.env.CRM_DB_PASSWORD || process.env.DB_PASSWORD || '798214',
            database: process.env.CRM_DB_NAME || 'CRM',
            connectionTimeoutMillis: 2000
          });
          await crmClient.connect();
          let crmDbRes = null;
          if (targetIdStr) {
            crmDbRes = await crmClient.query('SELECT id, name, email, phone FROM public.companies WHERE id::text = $1 LIMIT 1', [targetIdStr]).catch(() => null);
          }
          if ((!crmDbRes || crmDbRes.rows.length === 0) && companyEmail) {
            crmDbRes = await crmClient.query('SELECT id, name, email, phone FROM public.companies WHERE LOWER(email) = $1 LIMIT 1', [companyEmail]).catch(() => null);
          }
          if (crmDbRes && crmDbRes.rows.length > 0) {
            crmComp = crmDbRes.rows[0];
          }
          await crmClient.end();
        } catch (e) {}
      }

      if (crmComp) {
        const slug = (crmComp.name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Math.floor(1000 + Math.random() * 9000);
        const ins = await query(`
          INSERT INTO organizations (name, slug, email, phone, status, plan_id, plan_name, owner_name, users_count, crm_company_id)
          VALUES ($1, $2, $3, $4, 'ACTIVE', $5, 'Standard', $6, 1, $7)
          RETURNING id, name, email, crm_company_id
        `, [crmComp.name, slug, crmComp.email || '', crmComp.phone || '', plan_id, crmComp.name + ' Admin', String(crmComp.id)]);
        org = ins.rows[0];
      }
    }

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization or CRM Company not found' });
    }

    // Lookup plan
    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    const plan = planRes.rows[0];

    // Compute amount
    const cycle = (billing_cycle || 'MONTHLY').toUpperCase();
    let calculatedAmount = cycle === 'YEARLY' 
      ? parseFloat(plan.price_yearly || 0) 
      : parseFloat(plan.price_monthly || 0);

    if (req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== '') {
      const explicitAmt = parseFloat(req.body.amount);
      if (!isNaN(explicitAmt) && explicitAmt >= 0) {
        calculatedAmount = explicitAmt;
      }
    }

    const days = parseInt(durationDays || (cycle === 'YEARLY' ? 365 : 30), 10);
    const cancelAtEnd = auto_renew === false;
    const subStatus = (status || 'ACTIVE').toUpperCase();

    // Insert new subscription
    const insertRes = await query(`
      INSERT INTO saas_subscriptions (
        organization_id, organization_name, plan_id, plan_name,
        billing_cycle, amount, status, current_period_start,
        current_period_end, cancel_at_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($8 || ' days')::interval, $9)
      RETURNING *
    `, [
      org.id,
      org.name,
      plan.id,
      plan.name,
      cycle,
      calculatedAmount,
      subStatus,
      days,
      cancelAtEnd
    ]);

    const createdSub = insertRes.rows[0];

    // Update organization with plan and status
    await query(`
      UPDATE organizations 
      SET plan_id = $1, plan_name = $2, status = $3 
      WHERE id = $4
    `, [plan.id, plan.name, subStatus === 'ACTIVE' ? 'ACTIVE' : 'TRIAL', org.id]);

    // Also update CRM companies ledger if mapped
    if (org.crm_company_id) {
      await query(`
        UPDATE crm_companies
        SET plan_id = $1, plan_name = $2, status = $3, updated_at = NOW()
        WHERE id::text = $4
      `, [plan.id, plan.name, subStatus === 'ACTIVE' ? 'ACTIVE' : 'TRIAL', org.crm_company_id]);
    }

    // Determine payment status (if TRIAL, default to PENDING; if ACTIVE, default to SUCCESS)
    let effectivePaymentStatus = payment_status;
    if (!effectivePaymentStatus) {
      effectivePaymentStatus = subStatus === 'TRIAL' ? 'PENDING' : 'SUCCESS';
    }
    const cleanMethod = (payment_method || 'DIRECT_ADMIN').toUpperCase();

    // Create invoice and payment record if status is SUCCESS or PENDING and amount > 0
    if ((effectivePaymentStatus === 'SUCCESS' || effectivePaymentStatus === 'PENDING') && calculatedAmount > 0) {
      const isPaid = effectivePaymentStatus === 'SUCCESS';
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      const dueDays = subStatus === 'TRIAL' ? Math.min(days, 14) : 7;

      await query(`
        INSERT INTO saas_invoices (invoice_number, organization_id, organization_name, plan_name, amount, currency, status, billing_period, due_date, paid_at)
        VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, CURRENT_TIMESTAMP + ($8 || ' days')::interval, $9)
      `, [
        invNum,
        org.id,
        org.name,
        plan.name,
        calculatedAmount,
        isPaid ? 'PAID' : 'PENDING',
        `${cycle} ${new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}`,
        dueDays,
        isPaid ? new Date() : null
      ]);

      await query(`
        INSERT INTO saas_payments (payment_id, organization_id, organization_name, amount, currency, method, status)
        VALUES ($1, $2, $3, $4, 'INR', $5, $6)
      `, [
        `PAY-${Date.now().toString().slice(-6)}`,
        org.id,
        org.name,
        calculatedAmount,
        cleanMethod,
        isPaid ? 'SUCCESS' : 'PENDING'
      ]);
    }

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'CREATE_SUBSCRIPTION', 'SUBSCRIPTIONS', $4)
    `, [
      req.user?.id || 1,
      req.user?.name || 'Super Admin',
      org.id,
      `Created ${cycle} subscription for ${org.name} on ${plan.name} at ₹${calculatedAmount}`
    ]);

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        ...createdSub,
        amount: parseFloat(createdSub.amount || 0),
        end_date: createdSub.current_period_end,
        auto_renew: !createdSub.cancel_at_period_end,
        organization_email: org.email
      }
    });
  } catch (err) {
    console.error('Create subscription error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.extendSubscription = async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10) || 30;
    const subRes = await query('SELECT * FROM saas_subscriptions WHERE id = $1', [req.params.id]);
    if (subRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const isPlatformStaff = req.user?.isSuperAdmin === true || req.user?.isPlatformUser === true || !req.user?.organization_id;
    if (!isPlatformStaff && req.user?.organization_id && String(subRes.rows[0].organization_id) !== String(req.user?.organization_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to other organization subscriptions.' });
    }

    await query(`
      UPDATE saas_subscriptions 
      SET current_period_end = COALESCE(current_period_end, CURRENT_TIMESTAMP) + ($1 || ' days')::interval, status = 'ACTIVE'
      WHERE id = $2
    `, [days, req.params.id]);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'EXTEND_SUBSCRIPTION', 'SUBSCRIPTIONS', $4)
    `, [req.user?.id || 1, req.user?.name || 'Super Admin', subRes.rows[0].organization_id, `Extended subscription for ${subRes.rows[0].organization_name} by ${days} days`]);

    return res.json({ success: true, message: `Subscription extended by ${days} days` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const { reason, immediate, feedback } = req.body;
    const subRes = await query('SELECT * FROM saas_subscriptions WHERE id = $1', [req.params.id]);
    if (subRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const sub = subRes.rows[0];
    const isPlatformStaff = req.user?.isSuperAdmin === true || req.user?.isPlatformUser === true || !req.user?.organization_id;
    if (!isPlatformStaff && req.user?.organization_id && String(sub.organization_id) !== String(req.user?.organization_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to other organization subscriptions.' });
    }

    const cancelReasonText = (reason || 'Admin request').trim();
    const feedbackText = (feedback || '').trim();

    if (immediate) {
      // Immediate cancellation
      await query(`
        UPDATE saas_subscriptions 
        SET status = 'CANCELLED', 
            cancel_at_period_end = true, 
            current_period_end = CURRENT_TIMESTAMP,
            cancel_reason = $1,
            cancellation_feedback = $2
        WHERE id = $3
      `, [cancelReasonText, feedbackText, req.params.id]);

      // Record churn event idempotently
      await query(`
        INSERT INTO saas_subscription_churn_events (
          subscription_id, organization_id, organization_name, plan_id, plan_name, churn_type, reason, churn_date
        )
        VALUES ($1, $2, $3, $4, $5, 'VOLUNTARY_CANCEL', $6, CURRENT_TIMESTAMP)
        ON CONFLICT (subscription_id, churn_type) DO NOTHING
      `, [sub.id, sub.organization_id, sub.organization_name, sub.plan_id, sub.plan_name, cancelReasonText]);
    } else {
      // Scheduled cancellation: keep current status until period end, set cancel_at_period_end = true
      await query(`
        UPDATE saas_subscriptions 
        SET cancel_at_period_end = true,
            cancel_reason = $1,
            cancellation_feedback = $2
        WHERE id = $3
      `, [cancelReasonText, feedbackText, req.params.id]);
    }

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'CANCEL_SUBSCRIPTION', 'SUBSCRIPTIONS', $4)
    `, [
      req.user?.id || 1, 
      req.user?.name || 'Super Admin', 
      sub.organization_id, 
      `${immediate ? 'Immediate' : 'Scheduled period-end'} cancellation for ${sub.organization_name}. Reason: ${cancelReasonText}`
    ]);

    return res.json({ 
      success: true, 
      message: immediate 
        ? 'Subscription cancelled immediately.' 
        : 'Subscription scheduled for cancellation at the end of the current billing period.' 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reactivateSubscription = async (req, res) => {
  try {
    const subRes = await query('SELECT * FROM saas_subscriptions WHERE id = $1', [req.params.id]);
    if (subRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const currentEnd = subRes.rows[0].current_period_end ? new Date(subRes.rows[0].current_period_end) : null;
    const isPast = !currentEnd || currentEnd < new Date();

    if (isPast) {
      await query(`
        UPDATE saas_subscriptions 
        SET status = 'ACTIVE', 
            cancel_at_period_end = false, 
            cancel_reason = NULL,
            cancellation_feedback = NULL,
            grace_period_end = NULL,
            current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days' 
        WHERE id = $1
      `, [req.params.id]);
    } else {
      await query(`
        UPDATE saas_subscriptions 
        SET status = 'ACTIVE', 
            cancel_at_period_end = false,
            cancel_reason = NULL,
            cancellation_feedback = NULL,
            grace_period_end = NULL
        WHERE id = $1
      `, [req.params.id]);
    }

    // Ensure organization status is restored to ACTIVE if it was suspended or expired
    await query(`
      UPDATE organizations 
      SET status = 'ACTIVE', suspension_reason = NULL 
      WHERE id = $1 AND status IN ('SUSPENDED', 'EXPIRED')
    `, [subRes.rows[0].organization_id]);

    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
      VALUES ($1, $2, $3, 'REACTIVATE_SUBSCRIPTION', 'SUBSCRIPTIONS', $4)
    `, [req.user?.id || 1, req.user?.name || 'Super Admin', subRes.rows[0].organization_id, `Reactivated subscription for ${subRes.rows[0].organization_name}`]);

    return res.json({ success: true, message: 'Subscription reactivated and access restored.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePlan = async (req, res) => {
  try {
    const subId = req.params.id;
    const { planId, plan_id = planId, billingCycle, billing_cycle = billingCycle || 'MONTHLY', immediate = true } = req.body;

    const subRes = await query('SELECT * FROM saas_subscriptions WHERE id = $1', [subId]);
    if (subRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });
    const sub = subRes.rows[0];

    const planRes = await query('SELECT * FROM saas_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Selected plan not found' });
    const targetPlan = planRes.rows[0];

    const cycle = (billing_cycle || 'MONTHLY').toUpperCase();
    const newAmount = cycle === 'YEARLY'
      ? parseFloat(targetPlan.price_yearly || 0)
      : parseFloat(targetPlan.price_monthly || 0);

    if (immediate) {
      // Immediate Upgrade / Downgrade
      const durationDays = cycle === 'YEARLY' ? 365 : 30;
      await query(`
        UPDATE saas_subscriptions
        SET plan_id = $1, plan_name = $2, billing_cycle = $3, amount = $4,
            status = 'ACTIVE', cancel_at_period_end = false,
            scheduled_plan_id = NULL, scheduled_billing_cycle = NULL, scheduled_change_date = NULL,
            current_period_start = CURRENT_TIMESTAMP,
            current_period_end = CURRENT_TIMESTAMP + ($5::text || ' days')::interval
        WHERE id = $6
      `, [targetPlan.id, targetPlan.name, cycle, newAmount, durationDays, sub.id]);

      await query(`
        UPDATE organizations
        SET plan_id = $1, plan_name = $2, status = 'ACTIVE'
        WHERE id = $3
      `, [targetPlan.id, targetPlan.name, sub.organization_id]);

      // Generate Invoice
      const invNum = `INV-${Date.now().toString().slice(-6)}`;
      await query(`
        INSERT INTO saas_invoices (invoice_number, organization_id, organization_name, plan_name, amount, currency, status, billing_period, due_date, paid_at, created_at)
        VALUES ($1, $2, $3, $4, $5, 'INR', 'PAID', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        invNum,
        sub.organization_id,
        sub.organization_name,
        targetPlan.name,
        newAmount,
        `${cycle} Plan Transition`
      ]);

      // Record real payment in saas_payments
      const cleanPayMethod = (req.body.paymentMethod || req.body.method || 'CREDIT_CARD').toUpperCase();
      const paymentStatus = (req.body.paymentStatus || 'SUCCESS').toUpperCase();
      await query(`
        INSERT INTO saas_payments (payment_id, organization_id, organization_name, amount, currency, method, status, created_at)
        VALUES ($1, $2, $3, $4, 'INR', $5, $6, CURRENT_TIMESTAMP)
      `, [
        `PAY-${Date.now().toString().slice(-6)}`,
        sub.organization_id,
        sub.organization_name,
        newAmount,
        cleanPayMethod,
        paymentStatus === 'PENDING' ? 'PENDING' : 'SUCCESS'
      ]);

      await query(`
        INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
        VALUES ($1, $2, $3, 'UPGRADE_DOWNGRADE_PLAN', 'SUBSCRIPTIONS', $4)
      `, [
        req.user?.id || 1,
        req.user?.name || 'Super Admin',
        sub.organization_id,
        `Changed plan immediately for ${sub.organization_name} from ${sub.plan_name} to ${targetPlan.name} (${cycle}: ₹${newAmount})`
      ]);

      return res.json({
        success: true,
        message: `Plan changed successfully to ${targetPlan.name} (${cycle}).`
      });
    } else {
      // Scheduled Plan Change for next renewal period
      await query(`
        UPDATE saas_subscriptions
        SET scheduled_plan_id = $1,
            scheduled_billing_cycle = $2,
            scheduled_change_date = current_period_end
        WHERE id = $3
      `, [targetPlan.id, cycle, sub.id]);

      await query(`
        INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details)
        VALUES ($1, $2, $3, 'SCHEDULE_PLAN_CHANGE', 'SUBSCRIPTIONS', $4)
      `, [
        req.user?.id || 1,
        req.user?.name || 'Super Admin',
        sub.organization_id,
        `Scheduled plan transition for ${sub.organization_name} to ${targetPlan.name} (${cycle}) starting next billing period`
      ]);

      return res.json({
        success: true,
        message: `Plan transition to ${targetPlan.name} (${cycle}) scheduled for the end of the current billing cycle.`
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    await query('DELETE FROM saas_subscriptions WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.triggerAutomationCheck = async (req, res) => {
  try {
    const { runLifecycleCheck } = require('../services/subscriptionAutomationService');
    const result = await runLifecycleCheck({ triggerSource: 'SUPER_ADMIN_MANUAL' });
    return res.json({
      success: true,
      message: 'Subscription Lifecycle Automation check completed successfully.',
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getChurnAnalytics = async (req, res) => {
  try {
    // 1. Total churn events count
    const totalChurnRes = await query('SELECT COUNT(*) as total_churn FROM saas_subscription_churn_events');
    const totalChurn = parseInt(totalChurnRes.rows[0].total_churn || 0, 10);

    // 2. Churn by type breakdown
    const byTypeRes = await query(`
      SELECT churn_type, COUNT(*) as count 
      FROM saas_subscription_churn_events 
      GROUP BY churn_type 
      ORDER BY count DESC
    `);

    // 3. Top cancellation reasons
    const byReasonRes = await query(`
      SELECT reason, COUNT(*) as count 
      FROM saas_subscription_churn_events 
      WHERE reason IS NOT NULL AND reason != ''
      GROUP BY reason 
      ORDER BY count DESC 
      LIMIT 6
    `);

    // 4. Recent churn events
    const recentRes = await query(`
      SELECT * FROM saas_subscription_churn_events 
      ORDER BY id DESC 
      LIMIT 10
    `);

    // 5. Active vs Churned ratio
    const activeRes = await query("SELECT COUNT(*) as active_count FROM saas_subscriptions WHERE status = 'ACTIVE'");
    const activeCount = parseInt(activeRes.rows[0].active_count || 0, 10);
    const denominator = activeCount + totalChurn;
    const churnRatePercent = denominator > 0 ? parseFloat(((totalChurn / denominator) * 100).toFixed(1)) : 0;

    return res.json({
      success: true,
      data: {
        totalChurn,
        churnRatePercent,
        activeSubscriptions: activeCount,
        byType: byTypeRes.rows.map(r => ({ type: r.churn_type, count: parseInt(r.count, 10) })),
        topReasons: byReasonRes.rows.map(r => ({ reason: r.reason, count: parseInt(r.count, 10) })),
        recentEvents: recentRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

