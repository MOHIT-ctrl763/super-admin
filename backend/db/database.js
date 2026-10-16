const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '798214',
      database: process.env.DB_NAME || 'superadmin_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('[DATABASE_QUERY_ERROR]', { text, error: err.message });
    throw err;
  }
}

async function initSchema() {
  console.log('🔄 Initializing PostgreSQL Schema for superadmin_db...');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role_name VARCHAR(50) DEFAULT 'SUPER_ADMIN',
      role_display_name VARCHAR(100) DEFAULT 'Super Administrator',
      is_active BOOLEAN DEFAULT true,
      organization_id INTEGER,
      organization_name VARCHAR(255),
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      city VARCHAR(100),
      state VARCHAR(100),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      plan_id INTEGER DEFAULT 2,
      plan_name VARCHAR(100) DEFAULT 'Pro',
      owner_name VARCHAR(255) DEFAULT 'Admin',
      users_count INTEGER DEFAULT 1,
      trial_ends_at TIMESTAMP,
      suspension_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      price_monthly NUMERIC(10, 2) DEFAULT 0,
      price_yearly NUMERIC(10, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      is_popular BOOLEAN DEFAULT false,
      max_users INTEGER DEFAULT 10,
      max_storage_gb INTEGER DEFAULT 25,
      max_api_calls_per_month INTEGER DEFAULT 50000,
      features_json JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_features (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(50) DEFAULT 'CORE',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      plan_id INTEGER NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      billing_cycle VARCHAR(50) DEFAULT 'MONTHLY',
      amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      organization_id INTEGER NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      status VARCHAR(50) DEFAULT 'PAID',
      billing_period VARCHAR(100),
      due_date TIMESTAMP,
      paid_at TIMESTAMP,
      invoice_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_payments (
      id SERIAL PRIMARY KEY,
      payment_id VARCHAR(100) UNIQUE NOT NULL,
      organization_id INTEGER NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      method VARCHAR(50) DEFAULT 'CREDIT_CARD',
      status VARCHAR(50) DEFAULT 'SUCCESS',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(100) UNIQUE NOT NULL,
      discount_type VARCHAR(50) DEFAULT 'PERCENTAGE',
      discount_value NUMERIC(10, 2) NOT NULL,
      max_uses INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_usage_metrics (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      current_value NUMERIC(12, 2) DEFAULT 0,
      max_limit NUMERIC(12, 2) DEFAULT 100,
      unit VARCHAR(50) DEFAULT 'count',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'INFO',
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_name VARCHAR(255),
      organization_id INTEGER,
      action VARCHAR(100) NOT NULL,
      module VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saas_password_resets (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Subscription Lifecycle Automation Additive Tables & Columns
    CREATE TABLE IF NOT EXISTS saas_reminder_logs (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER NOT NULL,
      organization_id INTEGER,
      reminder_type VARCHAR(50) NOT NULL,
      reminder_window VARCHAR(50) NOT NULL,
      recipient_email VARCHAR(255),
      delivery_status VARCHAR(50) DEFAULT 'SENT',
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uniq_reminder UNIQUE (entity_type, entity_id, reminder_type, reminder_window)
    );

    CREATE TABLE IF NOT EXISTS saas_subscription_churn_events (
      id SERIAL PRIMARY KEY,
      subscription_id INTEGER NOT NULL,
      organization_id INTEGER NOT NULL,
      organization_name VARCHAR(255) NOT NULL,
      plan_id INTEGER NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      churn_type VARCHAR(50) NOT NULL,
      reason TEXT,
      churn_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uniq_sub_churn UNIQUE (subscription_id, churn_type)
    );

    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS cancellation_feedback TEXT;
    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS scheduled_plan_id INTEGER;
    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS scheduled_billing_cycle VARCHAR(50);
    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS scheduled_change_date TIMESTAMP;
    ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP;

    -- Universal Email OTP Verifications Table
    CREATE TABLE IF NOT EXISTS saas_email_verifications (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      purpose VARCHAR(50) DEFAULT 'GENERAL',
      is_verified BOOLEAN DEFAULT false,
      verification_token VARCHAR(100),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_saas_email_verifications_lookup 
      ON saas_email_verifications (email, otp, is_verified);

    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      purpose VARCHAR(50) DEFAULT 'GENERAL',
      is_verified BOOLEAN DEFAULT false,
      verification_token VARCHAR(100),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_company_id VARCHAR(100);

    -- CRM Local Ledger Tables (Ensures zero-downtime & proper working of all CRM views)
    CREATE TABLE IF NOT EXISTS crm_company_users (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) DEFAULT 'SALES_REP',
      branch_id VARCHAR(100),
      branch_name VARCHAR(100),
      position_id VARCHAR(100),
      position_title VARCHAR(100),
      company_id VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE crm_company_users ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);

    CREATE TABLE IF NOT EXISTS crm_branches (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      city VARCHAR(100),
      state VARCHAR(100),
      address TEXT,
      company_id VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE crm_branches ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);

    CREATE TABLE IF NOT EXISTS crm_positions (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      department VARCHAR(100),
      level VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedData();
  await seedCrmLedger();
  const { seedRBAC } = require('../services/rbacService');
  await seedRBAC();
  console.log('✅ PostgreSQL Schema & Seed Data ready in superadmin_db!');
}

async function seedData() {
  const usersRes = await query('SELECT COUNT(*) as count FROM users');
  if (parseInt(usersRes.rows[0].count, 10) === 0) {
    const passwordHash = bcrypt.hashSync('123456', 10);

    // Super Admin user
    await query(`
      INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)
    `, ['Mohit (Super Admin)', 'mohitpoewal12@gmail.com', passwordHash, '+91 9999999999', 'SUPER_ADMIN', 'Super Administrator']);

    // Demo Tenant Admins
    await query(`
      INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, organization_id, organization_name, last_login)
      VALUES 
      ($1, $2, $3, $4, 'ORG_ADMIN', 'Organization Admin', true, 1, 'Solaris Cloud Solutions', CURRENT_TIMESTAMP),
      ($5, $6, $7, $8, 'ORG_ADMIN', 'Organization Admin', true, 2, 'Vanguard Engineering', CURRENT_TIMESTAMP),
      ($9, $10, $11, $12, 'ORG_ADMIN', 'Organization Admin', true, 3, 'NexGen Robotics', CURRENT_TIMESTAMP)
    `, [
      'Alex Rivera', 'alex@solariscloud.in', passwordHash, '+91 98111 22334',
      'Sarah Jenkins', 'supply@vanguardeng.in', passwordHash, '+91 98222 33445',
      'David Zhang', 'orders@nexgenrobotics.com', passwordHash, '+91 98333 44556'
    ]);
  }

  const orgsRes = await query('SELECT COUNT(*) as count FROM organizations');
  if (parseInt(orgsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO organizations (name, slug, email, phone, city, state, status, plan_id, plan_name, owner_name, users_count)
      VALUES 
      ('Solaris Cloud Solutions', 'solaris-cloud', 'billing@solariscloud.in', '+91 98111 22334', 'Bengaluru', 'Karnataka', 'ACTIVE', 2, 'Pro', 'Alex Rivera', 1),
      ('Vanguard Engineering', 'vanguard-eng', 'supply@vanguardeng.in', '+91 98222 33445', 'Pune', 'Maharashtra', 'ACTIVE', 1, 'Basic', 'Sarah Jenkins', 1),
      ('NexGen Robotics', 'nexgen-robotics', 'orders@nexgenrobotics.com', '+91 98333 44556', 'Hyderabad', 'Telangana', 'ACTIVE', 2, 'Pro', 'David Zhang', 1),
      ('Zenith Logistics', 'zenith-logistics', 'admin@zenithlog.com', '+91 98444 55667', 'Mumbai', 'Maharashtra', 'ACTIVE', 3, 'Enterprise', 'Priya Sharma', 1),
      ('Apex Auto Tech', 'apex-tech', 'procurement@apexauto.in', '+91 98555 66778', 'Chennai', 'Tamil Nadu', 'ACTIVE', 2, 'Pro', 'Karan Mehta', 6)
    `);
  }

  const plansRes = await query('SELECT COUNT(*) as count FROM saas_plans');
  if (parseInt(plansRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_plans (name, slug, description, price_monthly, price_yearly, is_active, is_popular, max_users, max_storage_gb, max_api_calls_per_month, features_json)
      VALUES 
      ('Basic Plan', 'basic-plan', 'Starter plan designed for lean operations and boutique teams.', 29, 290, true, false, 5, 10, 25000, '["CRM Pipeline", "Contact Management", "Standard Reports", "Email Support"]'::jsonb),
      ('Pro Plan', 'pro-plan', 'Comprehensive multi-tenant engine for fast-growing companies.', 79, 790, true, true, 25, 50, 100000, '["All Basic Features", "Role-Based Access Control", "Custom Fields & Tags", "Automated Backups", "REST API & Webhooks", "Priority Support"]'::jsonb),
      ('Enterprise Plan', 'enterprise-plan', 'Full platform capability with dedicated SLAs, unlimited scale, and custom branding.', 199, 1990, true, false, 100, 500, 1000000, '["All Pro Features", "Dedicated Support & 99.9% SLA", "Custom Domain & White Label", "Audit Logs & Compliance", "Unlimited Integrations", "Single Sign-On (SSO)"]'::jsonb)
    `);
  }

  const featRes = await query('SELECT COUNT(*) as count FROM saas_features');
  if (parseInt(featRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_features (name, code, category, description, is_active)
      VALUES 
      ('CRM Pipeline & Deals', 'crm_pipeline', 'CORE', 'Visual sales deal flow tracking and stages', true),
      ('Custom Branding & Domains', 'custom_branding', 'BRANDING', 'White-labeling, logos and custom tenant domains', true),
      ('Webhooks & REST API', 'webhooks_api', 'INTEGRATION', 'Developer API keys and real-time webhook events', true),
      ('Advanced Analytics & BI', 'advanced_analytics', 'ANALYTICS', 'Predictive reporting, conversion charts, and export tools', true),
      ('Multi-Tenant Roles & RBAC', 'multi_tenant_roles', 'SECURITY', 'Granular team permissions and policy isolation', true),
      ('Automated Cloud Backups', 'automated_backups', 'RELIABILITY', 'Daily automated snapshots and instant recovery', true),
      ('Audit Logs & Security', 'audit_logs', 'SECURITY', 'Comprehensive session tracking and compliance logs', true),
      ('Priority 24/7 SLA Support', 'priority_support', 'SUPPORT', 'Dedicated account manager and direct phone line', true)
    `);
  }

  const subsRes = await query('SELECT COUNT(*) as count FROM saas_subscriptions');
  if (parseInt(subsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_subscriptions (organization_id, organization_name, plan_id, plan_name, billing_cycle, amount, status, current_period_end)
      VALUES 
      (10, 'ajay', 1, 'Basic Plan', 'MONTHLY', 29, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '30 days')
    `);
  }

  const invsRes = await query('SELECT COUNT(*) as count FROM saas_invoices');
  if (parseInt(invsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_invoices (invoice_number, organization_id, organization_name, plan_name, amount, currency, status, billing_period, due_date, paid_at)
      VALUES 
      ('INV-10-1385', 10, 'ajay', 'Basic Plan', 29, 'INR', 'PAID', 'Monthly Plan', CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP)
    `);
  }

  const paysRes = await query('SELECT COUNT(*) as count FROM saas_payments');
  if (parseInt(paysRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_payments (payment_id, organization_id, organization_name, amount, currency, method, status)
      VALUES 
      ('TXN-682755', 10, 'ajay', 29, 'INR', 'UPI', 'SUCCESS')
    `);
  }

  const coupsRes = await query('SELECT COUNT(*) as count FROM saas_coupons');
  if (parseInt(coupsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_coupons (code, discount_type, discount_value, max_uses, used_count, is_active, expires_at)
      VALUES 
      ('WELCOME50', 'PERCENTAGE', 50, 500, 24, true, CURRENT_TIMESTAMP + INTERVAL '90 days'),
      ('LAUNCH20', 'PERCENTAGE', 20, 200, 12, true, CURRENT_TIMESTAMP + INTERVAL '60 days'),
      ('FLAT100', 'FIXED', 100, 100, 8, true, CURRENT_TIMESTAMP + INTERVAL '90 days'),
      ('VIPGROWTH', 'PERCENTAGE', 30, 50, 5, true, CURRENT_TIMESTAMP + INTERVAL '30 days')
    `);
  }

  const usageRes = await query('SELECT COUNT(*) as count FROM saas_usage_metrics');
  if (parseInt(usageRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_usage_metrics (organization_id, organization_name, metric_name, current_value, max_limit, unit)
      VALUES 
      (1, 'Solaris Cloud Solutions', 'storage_gb', 8.4, 50, 'GB'),
      (1, 'Solaris Cloud Solutions', 'api_calls', 14200, 100000, 'calls'),
      (1, 'Solaris Cloud Solutions', 'active_users', 1, 25, 'users'),
      (2, 'Vanguard Engineering', 'storage_gb', 2.1, 10, 'GB'),
      (3, 'NexGen Robotics', 'storage_gb', 12.8, 50, 'GB'),
      (4, 'Zenith Logistics', 'storage_gb', 45.2, 500, 'GB'),
      (5, 'Apex Auto Tech', 'storage_gb', 24.6, 50, 'GB')
    `);
  }

  const notifsRes = await query('SELECT COUNT(*) as count FROM saas_notifications');
  if (parseInt(notifsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO saas_notifications (title, message, type)
      VALUES 
      ('System Health Normal', 'All multi-tenant API gateways and database clusters are operating at 99.98% uptime.', 'SUCCESS'),
      ('New Tenant Registered', 'Solaris Cloud Solutions signed up for Pro Plan evaluation.', 'INFO'),
      ('Monthly Revenue Target Reached', 'Gross recurring MRR exceeded targeted benchmark for this cycle.', 'SUCCESS'),
      ('Audit Alert', 'Administrator generated an impersonation session token.', 'WARNING')
    `);
  }

  const auditRes = await query('SELECT COUNT(*) as count FROM audit_logs');
  if (parseInt(auditRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO audit_logs (user_id, user_name, organization_id, action, module, details, ip_address)
      VALUES 
      (1, 'Mohit (Super Admin)', NULL, 'AUTH_LOGIN', 'AUTH', 'Super Administrator logged into control center', '127.0.0.1'),
      (1, 'Mohit (Super Admin)', 1, 'PLAN_UPDATE', 'ORGANIZATIONS', 'Upgraded tenant Solaris Cloud Solutions to Pro Plan', '127.0.0.1'),
      (1, 'Mohit (Super Admin)', NULL, 'FEATURE_TOGGLE', 'FEATURES', 'Activated Webhooks & REST API flag globally', '127.0.0.1')
    `);
  }

  const setsRes = await query('SELECT COUNT(*) as count FROM system_settings');
  if (parseInt(setsRes.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO system_settings (key, value, description)
      VALUES 
      ('platform_name', 'SaaS Platform Console', 'Global platform brand name'),
      ('allow_registrations', 'true', 'Permit public self-service tenant signups'),
      ('default_trial_days', '14', 'Standard evaluation duration for newly provisioned tenants'),
      ('enforce_2fa', 'false', 'Mandatory multi-factor authentication for Super Admin accounts'),
      ('maintenance_mode', 'false', 'Lock platform for scheduled infrastructure maintenance')
    `);
  }
}

async function seedCrmLedger() {
  try {
    const branchesRes = await query('SELECT COUNT(*) as count FROM crm_branches');
    if (parseInt(branchesRes.rows[0].count, 10) === 0) {
      await query(`
        INSERT INTO crm_branches (id, name, code, city, state, address, is_active)
        VALUES 
        ('DEL01', 'Delhi Main Branch', 'DEL01', 'New Delhi', 'Delhi', 'Connaught Place, Central Delhi', true),
        ('DEL59', 'Delhi MG Road Hub', 'DEL59', 'New Delhi', 'Delhi', 'MG Road Commercial Complex', true),
        ('MUM01', 'Mumbai HQ Office', 'MUM01', 'Mumbai', 'Maharashtra', 'Andheri East Business District', true),
        ('PUN01', 'Pune Tech Office', 'PUN01', 'Pune', 'Maharashtra', 'Hinjewadi Phase 1, Pune', true)
      `);
    }

    const posRes = await query('SELECT COUNT(*) as count FROM crm_positions');
    if (parseInt(posRes.rows[0].count, 10) === 0) {
      await query(`
        INSERT INTO crm_positions (id, title, department, level, is_active)
        VALUES 
        ('POS-01', 'Sales Representative', 'Sales', 'Associate', true),
        ('POS-02', 'Senior Sales Executive', 'Sales', 'Senior', true),
        ('POS-03', 'Branch Manager', 'Operations', 'Lead', true),
        ('POS-04', 'Account Manager', 'Client Relations', 'Mid', true),
        ('POS-05', 'Customer Support Specialist', 'Customer Support', 'Associate', true)
      `);
    }

    const usersRes = await query('SELECT COUNT(*) as count FROM crm_company_users');
    if (parseInt(usersRes.rows[0].count, 10) === 0) {
      await query(`
        INSERT INTO crm_company_users (id, name, email, phone, role, branch_id, branch_name, position_id, position_title, is_active)
        VALUES 
        ('e24218c7-7f84-4ff8-b082-f4dace04f181', 'AASIB KHAN', 'aasibkhan155471@gmail.com', '+91 98765 43210', 'SUPER_ADMIN', 'MUM01', 'Mumbai HQ Office', 'POS-03', 'Branch Manager', true),
        ('c1a2b3c4-1111-4444-8888-000000000001', 'Rohit Varma', 'rohit.v@nexflowcrm.com', '+91 98201 22334', 'SALES_REP', 'DEL01', 'Delhi Main Branch', 'POS-01', 'Sales Representative', true),
        ('c1a2b3c4-1111-4444-8888-000000000002', 'Ananya Sen', 'ananya.s@nexflowcrm.com', '+91 98202 33445', 'SALES_REP', 'MUM01', 'Mumbai HQ Office', 'POS-02', 'Senior Sales Executive', true),
        ('c1a2b3c4-1111-4444-8888-000000000003', 'Vikram Rao', 'vikram.r@nexflowcrm.com', '+91 98203 44556', 'MANAGER', 'PUN01', 'Pune Tech Office', 'POS-03', 'Branch Manager', true),
        ('c1a2b3c4-1111-4444-8888-000000000004', 'Pooja Deshmukh', 'pooja.d@nexflowcrm.com', '+91 98204 55667', 'SUPPORT', 'DEL59', 'Delhi MG Road Hub', 'POS-05', 'Customer Support Specialist', true)
      `);
    }
  } catch (err) {
    console.error('⚠️ seedCrmLedger notice:', err.message);
  }
}

module.exports = {
  pool,
  query,
  initSchema
};
