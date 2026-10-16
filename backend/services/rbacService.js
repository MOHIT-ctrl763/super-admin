const { query } = require('../db/database');

const PERMISSIONS_LIST = [
  // 1. Dashboard
  { module: 'dashboard', action: 'view', code: 'dashboard.view', name: 'View Dashboard Overview', description: 'Access platform performance and KPI metrics' },

  // 2. Organizations
  { module: 'organizations', action: 'view', code: 'organizations.view', name: 'View Organizations', description: 'View customer tenant list and profiles' },
  { module: 'organizations', action: 'create', code: 'organizations.create', name: 'Create Organizations', description: 'Provision new tenant organizations' },
  { module: 'organizations', action: 'update', code: 'organizations.update', name: 'Update Organizations', description: 'Modify tenant organization details and settings' },
  { module: 'organizations', action: 'delete', code: 'organizations.delete', name: 'Delete Organizations', description: 'Permanently delete tenant organizations' },
  { module: 'organizations', action: 'suspend', code: 'organizations.suspend', name: 'Suspend / Activate Organizations', description: 'Suspend or restore access to tenant organizations' },

  // 3. Users
  { module: 'users', action: 'view', code: 'users.view', name: 'View Users', description: 'View user accounts and details' },
  { module: 'users', action: 'create', code: 'users.create', name: 'Create Users', description: 'Create new admin or tenant users' },
  { module: 'users', action: 'update', code: 'users.update', name: 'Update Users', description: 'Edit user accounts and reset passwords' },
  { module: 'users', action: 'delete', code: 'users.delete', name: 'Delete Users', description: 'Delete user accounts' },
  { module: 'users', action: 'suspend', code: 'users.suspend', name: 'Suspend / Activate Users', description: 'Toggle active or deactivated user status' },

  // 4. Plans
  { module: 'plans', action: 'view', code: 'plans.view', name: 'View Plans', description: 'View subscription tier configurations' },
  { module: 'plans', action: 'create', code: 'plans.create', name: 'Create Plans', description: 'Create new subscription plans' },
  { module: 'plans', action: 'update', code: 'plans.update', name: 'Update Plans', description: 'Edit pricing, limits, and plan details' },
  { module: 'plans', action: 'delete', code: 'plans.delete', name: 'Delete Plans', description: 'Remove subscription plans' },

  // 5. Subscriptions
  { module: 'subscriptions', action: 'view', code: 'subscriptions.view', name: 'View Subscriptions', description: 'Inspect tenant subscription details' },
  { module: 'subscriptions', action: 'create', code: 'subscriptions.create', name: 'Create Subscriptions', description: 'Assign new subscriptions' },
  { module: 'subscriptions', action: 'update', code: 'subscriptions.update', name: 'Update Subscriptions', description: 'Modify billing cadence and parameters' },
  { module: 'subscriptions', action: 'cancel', code: 'subscriptions.cancel', name: 'Cancel Subscriptions', description: 'Cancel ongoing tenant subscriptions' },
  { module: 'subscriptions', action: 'renew', code: 'subscriptions.renew', name: 'Renew / Extend Subscriptions', description: 'Renew or grant extension days' },

  // 6. Payments
  { module: 'payments', action: 'view', code: 'payments.view', name: 'View Payments', description: 'Inspect payment transaction records' },
  { module: 'payments', action: 'refund', code: 'payments.refund', name: 'Refund Payments', description: 'Initiate refunds on tenant payments' },
  { module: 'payments', action: 'export', code: 'payments.export', name: 'Export Payments', description: 'Export payment transactions to CSV/Excel' },

  // 7. Invoices
  { module: 'invoices', action: 'view', code: 'invoices.view', name: 'View Invoices', description: 'Inspect invoice ledger and billing records' },
  { module: 'invoices', action: 'create', code: 'invoices.create', name: 'Create Invoices', description: 'Generate and dispatch manual invoices' },
  { module: 'invoices', action: 'update', code: 'invoices.update', name: 'Update Invoices', description: 'Edit billing records and notes' },
  { module: 'invoices', action: 'download', code: 'invoices.download', name: 'Download Invoices', description: 'Download PDF invoices' },
  { module: 'invoices', action: 'export', code: 'invoices.export', name: 'Export Invoices', description: 'Export invoices to accounting formats' },

  // 8. Coupons
  { module: 'coupons', action: 'view', code: 'coupons.view', name: 'View Coupons', description: 'Inspect discount coupon vouchers' },
  { module: 'coupons', action: 'create', code: 'coupons.create', name: 'Create Coupons', description: 'Generate promotional discount codes' },
  { module: 'coupons', action: 'update', code: 'coupons.update', name: 'Update Coupons', description: 'Edit coupon discount rates and caps' },
  { module: 'coupons', action: 'delete', code: 'coupons.delete', name: 'Delete Coupons', description: 'Remove coupon vouchers' },

  // 9. Trials
  { module: 'trials', action: 'view', code: 'trials.view', name: 'View Trials', description: 'Inspect trial evaluations and status' },
  { module: 'trials', action: 'create', code: 'trials.create', name: 'Create Trials', description: 'Initiate trial evaluations for prospects' },
  { module: 'trials', action: 'update', code: 'trials.update', name: 'Update Trials', description: 'Adjust trial durations and details' },
  { module: 'trials', action: 'cancel', code: 'trials.cancel', name: 'Cancel Trials', description: 'Terminate trial access' },

  // 10. Features
  { module: 'features', action: 'view', code: 'features.view', name: 'View Features', description: 'Inspect platform capability catalog' },
  { module: 'features', action: 'create', code: 'features.create', name: 'Create Features', description: 'Define new feature flags and modules' },
  { module: 'features', action: 'update', code: 'features.update', name: 'Update Features', description: 'Modify feature descriptions and categories' },
  { module: 'features', action: 'activate', code: 'features.activate', name: 'Activate Features', description: 'Enable feature flags' },
  { module: 'features', action: 'deactivate', code: 'features.deactivate', name: 'Deactivate Features', description: 'Disable feature flags' },
  { module: 'features', action: 'delete', code: 'features.delete', name: 'Delete Features', description: 'Remove feature items' },

  // 11. Usage
  { module: 'usage', action: 'view', code: 'usage.view', name: 'View Usage & Limits', description: 'Inspect tenant resource consumption metrics' },
  { module: 'usage', action: 'export', code: 'usage.export', name: 'Export Usage', description: 'Export resource usage reports' },

  // 12. Notifications
  { module: 'notifications', action: 'view', code: 'notifications.view', name: 'View Notifications', description: 'View notification alerts' },
  { module: 'notifications', action: 'create', code: 'notifications.create', name: 'Create Notifications', description: 'Draft system alerts and announcements' },
  { module: 'notifications', action: 'update', code: 'notifications.update', name: 'Update Notifications', description: 'Edit notification configurations' },
  { module: 'notifications', action: 'send', code: 'notifications.send', name: 'Send / Broadcast Notifications', description: 'Broadcast messages to tenants or users' },
  { module: 'notifications', action: 'delete', code: 'notifications.delete', name: 'Delete Notifications', description: 'Remove notifications' },

  // 13. Support
  { module: 'support', action: 'view', code: 'support.view', name: 'View Support Tickets', description: 'Inspect support desk inquiries' },
  { module: 'support', action: 'create', code: 'support.create', name: 'Create Support Tickets', description: 'File support issues and inquiries' },
  { module: 'support', action: 'update', code: 'support.update', name: 'Update Support Tickets', description: 'Reply and adjust priority levels' },
  { module: 'support', action: 'resolve', code: 'support.resolve', name: 'Resolve / Close Tickets', description: 'Mark tickets resolved or closed' },

  // 14. Audit Logs
  { module: 'auditLogs', action: 'view', code: 'auditLogs.view', name: 'View Audit Logs', description: 'Inspect audit trail and compliance history' },
  { module: 'auditLogs', action: 'export', code: 'auditLogs.export', name: 'Export Audit Logs', description: 'Export compliance logs for security audits' },

  // 15. Settings
  { module: 'settings', action: 'view', code: 'settings.view', name: 'View Settings', description: 'Inspect system-wide settings' },
  { module: 'settings', action: 'update', code: 'settings.update', name: 'Update Settings', description: 'Modify global platform configuration' },

  // 16. Roles
  { module: 'roles', action: 'view', code: 'roles.view', name: 'View Roles', description: 'Inspect roles and permission mappings' },
  { module: 'roles', action: 'create', code: 'roles.create', name: 'Create Roles', description: 'Create new custom roles' },
  { module: 'roles', action: 'update', code: 'roles.update', name: 'Update Roles', description: 'Edit role metadata and assign permissions' },
  { module: 'roles', action: 'delete', code: 'roles.delete', name: 'Delete Roles', description: 'Remove custom roles' },
  { module: 'roles', action: 'assign', code: 'roles.assign', name: 'Assign Roles', description: 'Assign or revoke roles from users' },

  // 17. Permissions
  { module: 'permissions', action: 'view', code: 'permissions.view', name: 'View Permissions', description: 'Inspect available system permissions' },
  { module: 'permissions', action: 'manage', code: 'permissions.manage', name: 'Manage Permissions', description: 'Configure permission assignments' }
];

const DEFAULT_ROLES_CONFIG = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Full unrestricted platform access over all SaaS modules, billing, tenant companies, access control, and settings.',
    is_system: true,
    // Super Admin gets all permissions
    permissions: PERMISSIONS_LIST.map(p => p.code)
  },
  {
    name: 'Finance Role',
    slug: 'finance_role',
    description: 'Manages SaaS plans, subscriptions, payments, invoices, billing reconciliation, coupons, and financial analytics.',
    is_system: true,
    permissions: [
      'dashboard.view',
      'organizations.view',
      'plans.view', 'plans.create', 'plans.update',
      'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel', 'subscriptions.renew',
      'payments.view', 'payments.refund', 'payments.export',
      'invoices.view', 'invoices.create', 'invoices.update', 'invoices.download', 'invoices.export',
      'coupons.view', 'coupons.create', 'coupons.update', 'coupons.delete',
      'trials.view', 'trials.update'
    ]
  },
  {
    name: 'Support Role',
    slug: 'support_role',
    description: 'Assists tenant companies, manages customer support tickets, unlocks accounts, inspects usage quotas and audit compliance logs.',
    is_system: true,
    permissions: [
      'dashboard.view',
      'organizations.view', 'organizations.update',
      'users.view', 'users.update', 'users.suspend',
      'support.view', 'support.create', 'support.update', 'support.resolve',
      'notifications.view', 'notifications.create', 'notifications.update', 'notifications.send',
      'usage.view', 'usage.export',
      'auditLogs.view'
    ]
  },
  {
    name: 'Sales Role',
    slug: 'sales_role',
    description: 'Handles client acquisition, onboards new tenant companies, sells CRM subscriptions, and manages free trial evaluations.',
    is_system: true,
    permissions: [
      'dashboard.view',
      'organizations.view', 'organizations.create', 'organizations.update',
      'plans.view',
      'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.renew',
      'trials.view', 'trials.create', 'trials.update',
      'invoices.view', 'invoices.download'
    ]
  },
  {
    name: 'Company Admin',
    slug: 'company_admin',
    description: 'Autonomous administration of tenant company CRM resources, staff users, branches, and customer pipeline.',
    is_system: true,
    permissions: [
      'dashboard.view',
      'organizations.view', 'organizations.update',
      'users.view', 'users.create', 'users.update', 'users.suspend',
      'subscriptions.view',
      'invoices.view', 'invoices.download',
      'payments.view',
      'usage.view',
      'notifications.view',
      'support.view', 'support.create', 'support.update',
      'settings.view'
    ]
  },
  {
    name: 'Organization Admin',
    slug: 'org_admin',
    description: 'Tenant organization administrator with isolated access to company data and team.',
    is_system: true,
    permissions: [
      'dashboard.view',
      'organizations.view', 'organizations.update',
      'users.view', 'users.create', 'users.update', 'users.suspend',
      'subscriptions.view',
      'invoices.view', 'invoices.download',
      'payments.view',
      'usage.view',
      'notifications.view',
      'support.view', 'support.create', 'support.update',
      'settings.view'
    ]
  }
];

async function seedRBAC() {
  console.log('🔄 Checking & Seeding RBAC Schema in superadmin_db...');

  // 1. Create RBAC tables
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_system BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id SERIAL PRIMARY KEY,
      module VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      code VARCHAR(150) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
    CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
  `);

  // 2. Seed all permissions idempotently
  for (const perm of PERMISSIONS_LIST) {
    await query(`
      INSERT INTO permissions (module, action, code, name, description)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (code) DO UPDATE
      SET module = EXCLUDED.module,
          action = EXCLUDED.action,
          name = EXCLUDED.name,
          description = EXCLUDED.description
    `, [perm.module, perm.action, perm.code, perm.name, perm.description]);
  }

  // 3. Seed 5 Default Roles & assign permissions
  for (const roleDef of DEFAULT_ROLES_CONFIG) {
    const roleInsertRes = await query(`
      INSERT INTO roles (name, slug, description, is_system, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system
      RETURNING id
    `, [roleDef.name, roleDef.slug, roleDef.description, roleDef.is_system]);

    const roleId = roleInsertRes.rows[0].id;

    // Fetch permission IDs for this role's permissions
    const permsRes = await query(`
      SELECT id FROM permissions WHERE code = ANY($1::varchar[])
    `, [roleDef.permissions]);

    for (const p of permsRes.rows) {
      await query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [roleId, p.id]);
    }
  }

  // 4. Map existing Super Admin platform users into user_roles
  const superAdminRole = await query("SELECT id FROM roles WHERE slug = 'super_admin'");
  if (superAdminRole.rows.length > 0) {
    const saRoleId = superAdminRole.rows[0].id;
    const superUsers = await query("SELECT id FROM users WHERE role_name = 'SUPER_ADMIN'");
    for (const u of superUsers.rows) {
      await query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [u.id, saRoleId]);
    }
  }

  console.log('✅ RBAC Roles & Permissions synchronized in superadmin_db!');
}

/**
 * Get all permissions grouped by module
 */
async function getAllPermissions() {
  const res = await query('SELECT * FROM permissions ORDER BY module ASC, id ASC');
  return res.rows;
}

/**
 * Get all roles with counts of permissions and assigned users
 */
async function getRoles() {
  const res = await query(`
    SELECT 
      r.id,
      r.name,
      r.slug,
      r.description,
      r.is_system,
      r.is_active,
      r.created_at,
      r.updated_at,
      COUNT(DISTINCT rp.permission_id)::int AS permission_count,
      COUNT(DISTINCT ur.user_id)::int AS user_count
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.id ASC
  `);
  return res.rows;
}

/**
 * Get single role with its permissions list
 */
async function getRoleById(roleId) {
  const roleRes = await query('SELECT * FROM roles WHERE id = $1', [roleId]);
  if (roleRes.rows.length === 0) return null;

  const role = roleRes.rows[0];

  const permsRes = await query(`
    SELECT p.id, p.module, p.action, p.code, p.name, p.description
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = $1
    ORDER BY p.module ASC, p.id ASC
  `, [roleId]);

  const usersRes = await query(`
    SELECT u.id, u.name, u.email, u.is_active
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role_id = $1
  `, [roleId]);

  return {
    ...role,
    permissions: permsRes.rows,
    permissionCodes: permsRes.rows.map(p => p.code),
    users: usersRes.rows
  };
}

/**
 * Create a custom role
 */
async function createRole({ name, slug, description, permissionCodes = [] }, actorUser = {}) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Role name is required');

  const generatedSlug = (slug || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/_+/g, '_').toLowerCase();

  const insertRes = await query(`
    INSERT INTO roles (name, slug, description, is_system, is_active)
    VALUES ($1, $2, $3, false, true)
    RETURNING *
  `, [cleanName, generatedSlug, description || '']);

  const newRole = insertRes.rows[0];

  if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
    const permsRes = await query('SELECT id FROM permissions WHERE code = ANY($1::varchar[])', [permissionCodes]);
    for (const p of permsRes.rows) {
      await query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [newRole.id, p.id]);
    }
  }

  // Audit Log
  await query(`
    INSERT INTO audit_logs (user_id, user_name, action, module, details)
    VALUES ($1, $2, 'ROLE_CREATE', 'ROLES', $3)
  `, [actorUser.id || null, actorUser.name || 'System', `Created custom role: ${cleanName} (${generatedSlug}) with ${permissionCodes.length} permissions`]);

  return getRoleById(newRole.id);
}

/**
 * Update a role
 */
async function updateRole(roleId, { name, description, is_active, permissionCodes }, actorUser = {}) {
  const roleRes = await query('SELECT * FROM roles WHERE id = $1', [roleId]);
  if (roleRes.rows.length === 0) throw new Error('Role not found');

  const role = roleRes.rows[0];

  // Prevent modifying slug of system roles or removing Super Admin's full privileges
  let updatedName = role.name;
  if (!role.is_system && name) {
    updatedName = name.trim();
  }

  await query(`
    UPDATE roles
    SET name = $1,
        description = $2,
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [updatedName, description !== undefined ? description : role.description, is_active !== undefined ? is_active : role.is_active, roleId]);

  // If role is super_admin, it must always keep all permissions
  if (role.slug === 'super_admin') {
    // Re-verify all permissions assigned
    const allPerms = await query('SELECT id FROM permissions');
    for (const p of allPerms.rows) {
      await query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [roleId, p.id]);
    }
  } else if (Array.isArray(permissionCodes)) {
    // Replace role permissions
    await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    if (permissionCodes.length > 0) {
      const permsRes = await query('SELECT id FROM permissions WHERE code = ANY($1::varchar[])', [permissionCodes]);
      for (const p of permsRes.rows) {
        await query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [roleId, p.id]);
      }
    }
  }

  // Audit Log
  await query(`
    INSERT INTO audit_logs (user_id, user_name, action, module, details)
    VALUES ($1, $2, 'ROLE_UPDATE', 'ROLES', $3)
  `, [actorUser.id || null, actorUser.name || 'System', `Updated role: ${role.name} (${role.slug})`]);

  return getRoleById(roleId);
}

/**
 * Delete a role
 */
async function deleteRole(roleId, actorUser = {}) {
  const roleRes = await query('SELECT * FROM roles WHERE id = $1', [roleId]);
  if (roleRes.rows.length === 0) throw new Error('Role not found');

  const role = roleRes.rows[0];
  if (role.is_system) {
    throw new Error(`Cannot delete system role '${role.name}'. System default roles are protected.`);
  }

  await query('DELETE FROM roles WHERE id = $1', [roleId]);

  // Audit Log
  await query(`
    INSERT INTO audit_logs (user_id, user_name, action, module, details)
    VALUES ($1, $2, 'ROLE_DELETE', 'ROLES', $3)
  `, [actorUser.id || null, actorUser.name || 'System', `Deleted custom role: ${role.name} (${role.slug})`]);

  return true;
}

/**
 * Get user assigned roles
 */
async function getUserRoles(userId) {
  const res = await query(`
    SELECT r.id, r.name, r.slug, r.description, r.is_system
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 AND r.is_active = true
    ORDER BY r.is_system DESC, r.name ASC
  `, [userId]);
  return res.rows;
}

/**
 * Get user effective permissions
 */
async function getUserPermissions(userId) {
  const roles = await getUserRoles(userId);
  const isSuperAdmin = roles.some(r => r.slug === 'super_admin');

  if (isSuperAdmin) {
    const allPerms = await query('SELECT code FROM permissions');
    const codes = allPerms.rows.map(p => p.code);
    return ['*', ...codes];
  }

  const res = await query(`
    SELECT DISTINCT p.code
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 AND r.is_active = true
  `, [userId]);

  return res.rows.map(r => r.code);
}

/**
 * Count active users who have the Super Admin role
 */
async function countActiveSuperAdmins() {
  const res = await query(`
    SELECT COUNT(DISTINCT u.id)::int as count
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.slug = 'super_admin' AND u.is_active = true
  `);
  return res.rows[0]?.count || 0;
}

/**
 * Assign roles to a user
 */
async function assignUserRoles(userId, roleIds = [], actorUser = {}) {
  // Check if target user is currently an active super admin
  const currentRoles = await getUserRoles(userId);
  const isCurrentlySuperAdmin = currentRoles.some(r => r.slug === 'super_admin');

  // Check if new roles contain super_admin
  const newRolesRes = await query('SELECT slug, name FROM roles WHERE id = ANY($1::int[])', [roleIds]);
  const willBeSuperAdmin = newRolesRes.rows.some(r => r.slug === 'super_admin');

  if (isCurrentlySuperAdmin && !willBeSuperAdmin) {
    const activeCount = await countActiveSuperAdmins();
    if (activeCount <= 1) {
      throw new Error('Protection Alert: Cannot remove Super Admin role from the last active Super Admin account.');
    }
  }

  // Clear current roles and assign new ones
  await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

  for (const roleId of roleIds) {
    await query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, roleId]);
  }

  // Update primary role_name / role_display_name on users table for backwards compatibility
  const primaryRole = newRolesRes.rows[0];
  if (primaryRole) {
    await query(`
      UPDATE users
      SET role_name = $1,
          role_display_name = $2
      WHERE id = $3
    `, [primaryRole.slug.toUpperCase(), primaryRole.name, userId]);
  }

  // Audit Log
  const userRes = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
  const targetName = userRes.rows[0]?.name || `User #${userId}`;
  const roleNames = newRolesRes.rows.map(r => r.name).join(', ');

  await query(`
    INSERT INTO audit_logs (user_id, user_name, action, module, details)
    VALUES ($1, $2, 'USER_ROLES_ASSIGN', 'ROLES', $3)
  `, [actorUser.id || null, actorUser.name || 'System', `Assigned roles [${roleNames}] to user: ${targetName}`]);

  return getUserRoles(userId);
}

module.exports = {
  PERMISSIONS_LIST,
  DEFAULT_ROLES_CONFIG,
  seedRBAC,
  getAllPermissions,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getUserRoles,
  getUserPermissions,
  countActiveSuperAdmins,
  assignUserRoles
};
