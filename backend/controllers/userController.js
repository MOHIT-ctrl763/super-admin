const bcrypt = require('bcryptjs');
const { query } = require('../db/database');
const rbacService = require('../services/rbacService');

exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = (req.query.search || '').trim();
    const organizationId = req.query.organizationId || 'ALL';
    const roleId = req.query.roleId || 'ALL';

    let sql = 'SELECT id, name, email, phone, role_name, role_display_name, is_active, organization_id, organization_name, last_login, created_at FROM users WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    let pIdx = 1;

    if (!req.user?.isSuperAdmin && req.user?.organization_id) {
      const orgId = req.user?.organization_id || 0;
      const compId = req.user?.crm_company_id || '0';
      const myId = req.user?.id || 0;
      sql += ` AND (organization_id = $${pIdx} OR crm_company_id = $${pIdx + 1} OR id = $${pIdx + 2})`;
      countSql += ` AND (organization_id = $${pIdx} OR crm_company_id = $${pIdx + 1} OR id = $${pIdx + 2})`;
      params.push(orgId, compId, myId);
      pIdx += 3;
    } else if (organizationId !== 'ALL') {
      if (organizationId === 'PLATFORM') {
        sql += ' AND organization_id IS NULL';
        countSql += ' AND organization_id IS NULL';
      } else {
        sql += ` AND organization_id = $${pIdx}`;
        countSql += ` AND organization_id = $${pIdx}`;
        params.push(parseInt(organizationId, 10));
        pIdx++;
      }
    }

    if (roleId !== 'ALL') {
      sql += ` AND (role_name = $${pIdx} OR id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.slug = $${pIdx} OR r.name = $${pIdx}))`;
      countSql += ` AND (role_name = $${pIdx} OR id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.slug = $${pIdx} OR r.name = $${pIdx}))`;
      params.push(roleId);
      pIdx++;
    }

    if (search) {
      sql += ` AND (name ILIKE $${pIdx} OR email ILIKE $${pIdx} OR phone ILIKE $${pIdx})`;
      countSql += ` AND (name ILIKE $${pIdx} OR email ILIKE $${pIdx} OR phone ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    sql += ` ORDER BY id DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const itemsRes = await query(sql, [...params, limit, (page - 1) * limit]);

    // Attach assigned roles and effective permissions to each user
    const usersWithRoles = await Promise.all(
      itemsRes.rows.map(async (u) => {
        const roles = await rbacService.getUserRoles(u.id);
        const perms = await rbacService.getUserPermissions(u.id);
        return {
          ...u,
          roles,
          roleIds: roles.map(r => r.id),
          permissions: perms,
          permissionCount: perms.includes('*') ? 'All (*)' : perms.length
        };
      })
    );

    // Fetch organizations and all system/custom roles for filters & modals
    const orgsRes = await query('SELECT id, name, slug, status FROM organizations ORDER BY name ASC');
    const allRoles = await rbacService.getRoles();

    return res.json({
      success: true,
      data: {
        items: usersWithRoles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        },
        filterOptions: {
          organizations: orgsRes.rows,
          roles: allRoles.map(r => ({
            id: r.slug,
            roleId: r.id,
            name: r.slug,
            display_name: r.name,
            is_system: r.is_system
          }))
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, roleName, roleId, roleIds, organizationId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP confirmation for email
    const verRes = await query(`
      SELECT id FROM saas_email_verifications
      WHERE email = $1 AND is_verified = TRUE
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);

    if (verRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Email ${cleanEmail} has not been verified with OTP yet. Please complete verification before provisioning.`
      });
    }

    const assignedRole = roleName || (typeof roleId === 'string' ? roleId : null) || (organizationId ? 'ORG_ADMIN' : 'SUPER_ADMIN');
    const isPlatformRole = ['SUPER_ADMIN', 'FINANCE_ROLE', 'SUPPORT_ROLE', 'SALES_ROLE', 'super_admin', 'finance_role', 'support_role', 'sales_role', 'finance_admin', 'support_admin', 'sales_admin'].includes(assignedRole);

    let orgName = null;
    let finalOrgId = isPlatformRole ? null : (organizationId ? parseInt(organizationId, 10) : null);
    if (finalOrgId) {
      const orgRes = await query('SELECT name FROM organizations WHERE id = $1', [finalOrgId]);
      if (orgRes.rows.length > 0) orgName = orgRes.rows[0].name;
    }

    let roleDisplay = 'Organization Admin';
    if (assignedRole === 'SUPER_ADMIN' || assignedRole === 'super_admin') roleDisplay = 'Super Administrator';
    else if (assignedRole === 'FINANCE_ROLE' || assignedRole === 'finance_role' || assignedRole === 'finance_admin') roleDisplay = 'Finance Role';
    else if (assignedRole === 'SUPPORT_ROLE' || assignedRole === 'support_role' || assignedRole === 'support_admin') roleDisplay = 'Support Role';
    else if (assignedRole === 'SALES_ROLE' || assignedRole === 'sales_role' || assignedRole === 'sales_admin') roleDisplay = 'Sales Role';
    else if (assignedRole === 'ORG_ADMIN' || assignedRole === 'COMPANY_ADMIN') roleDisplay = 'Organization Admin';
    else if (assignedRole === 'ORG_MEMBER') roleDisplay = 'Organization Member';
    else roleDisplay = assignedRole;

    const hash = bcrypt.hashSync(password, 10);
    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits without letters or special characters.' });
      }
    }
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';

    const result = await query(`
      INSERT INTO users (name, email, password, phone, role_name, role_display_name, is_active, organization_id, organization_name, crm_company_id)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, NULL)
      RETURNING id, name, email, role_name, role_display_name, organization_name
    `, [name, cleanEmail, hash, cleanPhone, assignedRole, roleDisplay, finalOrgId, orgName]);

    const newUser = result.rows[0];

    // Assign RBAC roles if provided or default platform role
    let targetRoleIds = Array.isArray(roleIds) ? roleIds : [];
    if (targetRoleIds.length === 0 && !finalOrgId) {
      // Find matching role in roles table
      const matchedRole = await query(`
        SELECT id FROM roles 
        WHERE slug = $1 OR slug = $2 OR name ILIKE $3 OR slug ILIKE $4
        LIMIT 1
      `, [assignedRole.toLowerCase(), assignedRole.toLowerCase().replace(/_role$/, '_admin'), assignedRole, `%${assignedRole}%`]);
      if (matchedRole.rows.length > 0) {
        targetRoleIds = [matchedRole.rows[0].id];
      }
    }

    if (targetRoleIds.length > 0) {
      await rbacService.assignUserRoles(newUser.id, targetRoleIds, req.user || {});
    }

    if (organizationId) {
      await query('UPDATE organizations SET users_count = (SELECT COUNT(*) FROM users WHERE organization_id = $1) WHERE id = $1', [organizationId]);
    }

    // Audit Log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'USER_CREATE', 'USERS', $3)
    `, [req.user?.id || null, req.user?.name || 'System', `Created user account: ${name} (${cleanEmail})`]);

    return res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, email, phone, roleName, roleId, roleIds, organizationId } = req.body;

    const assignedRole = roleName || (typeof roleId === 'string' ? roleId : null) || (organizationId ? 'ORG_ADMIN' : 'SUPER_ADMIN');
    const isPlatformRole = ['SUPER_ADMIN', 'FINANCE_ROLE', 'SUPPORT_ROLE', 'SALES_ROLE', 'super_admin', 'finance_role', 'support_role', 'sales_role', 'finance_admin', 'support_admin', 'sales_admin'].includes(assignedRole);

    let orgName = null;
    let finalOrgId = isPlatformRole ? null : (organizationId ? parseInt(organizationId, 10) : null);
    if (finalOrgId) {
      const orgRes = await query('SELECT name FROM organizations WHERE id = $1', [finalOrgId]);
      if (orgRes.rows.length > 0) orgName = orgRes.rows[0].name;
    }

    let roleDisplay = 'Organization Admin';
    if (assignedRole === 'SUPER_ADMIN' || assignedRole === 'super_admin') roleDisplay = 'Super Administrator';
    else if (assignedRole === 'FINANCE_ROLE' || assignedRole === 'finance_role' || assignedRole === 'finance_admin') roleDisplay = 'Finance Role';
    else if (assignedRole === 'SUPPORT_ROLE' || assignedRole === 'support_role' || assignedRole === 'support_admin') roleDisplay = 'Support Role';
    else if (assignedRole === 'SALES_ROLE' || assignedRole === 'sales_role' || assignedRole === 'sales_admin') roleDisplay = 'Sales Role';
    else if (assignedRole === 'ORG_ADMIN' || assignedRole === 'COMPANY_ADMIN') roleDisplay = 'Organization Admin';
    else if (assignedRole === 'ORG_MEMBER') roleDisplay = 'Organization Member';
    else roleDisplay = assignedRole;

    if (phone) {
      const numericPhone = String(phone).replace(/\D/g, '');
      if (numericPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits without letters or special characters.' });
      }
    }
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';

    await query(`
      UPDATE users
      SET name = $1, email = $2, phone = $3, role_name = $4, role_display_name = $5, organization_id = $6, organization_name = $7,
          crm_company_id = (CASE WHEN $6::int IS NULL THEN NULL ELSE crm_company_id END)
      WHERE id = $8
    `, [name, email, cleanPhone, assignedRole, roleDisplay, finalOrgId, orgName, userId]);

    // Handle RBAC roles assignment if roleIds provided
    if (Array.isArray(roleIds)) {
      await rbacService.assignUserRoles(userId, roleIds, req.user || {});
    }

    // Audit Log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'USER_UPDATE', 'USERS', $3)
    `, [req.user?.id || null, req.user?.name || 'System', `Updated user: ${name} (ID: ${userId})`]);

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const userRes = await query('SELECT id, name, is_active FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const currentStatus = userRes.rows[0].is_active;
    const newStatus = !currentStatus;

    // Protection check: Cannot deactivate the last active Super Admin
    if (currentStatus === true && newStatus === false) {
      const userRoles = await rbacService.getUserRoles(userId);
      const isSuperAdmin = userRoles.some(r => r.slug === 'super_admin');
      if (isSuperAdmin) {
        const activeCount = await rbacService.countActiveSuperAdmins();
        if (activeCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Protection Alert: Cannot suspend the last active Super Administrator account.'
          });
        }
      }
    }

    await query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, userId]);

    // Audit Log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, $3, 'USERS', $4)
    `, [req.user?.id || null, req.user?.name || 'System', newStatus ? 'USER_ACTIVATE' : 'USER_SUSPEND', `${newStatus ? 'Activated' : 'Suspended'} user ${userRes.rows[0].name} (ID: ${userId})`]);

    return res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'}`, data: { isActive: newStatus } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: 'New password is required' });

    const hash = bcrypt.hashSync(newPassword, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hash, userId]);

    // Audit Log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'USER_PASSWORD_RESET', 'USERS', $3)
    `, [req.user?.id || null, req.user?.name || 'System', `Reset password for user ID: ${userId}`]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    // Protection check: Cannot delete the last active Super Admin
    const userRoles = await rbacService.getUserRoles(userId);
    const isSuperAdmin = userRoles.some(r => r.slug === 'super_admin');
    if (isSuperAdmin) {
      const activeCount = await rbacService.countActiveSuperAdmins();
      if (activeCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Protection Alert: Cannot delete the last active Super Administrator account.'
        });
      }
    }

    const uRes = await query('SELECT name, email, organization_id FROM users WHERE id = $1', [userId]);
    if (uRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = uRes.rows[0];
    await query('DELETE FROM users WHERE id = $1', [userId]);

    if (user.organization_id) {
      await query('UPDATE organizations SET users_count = (SELECT COUNT(*) FROM users WHERE organization_id = $1) WHERE id = $1', [user.organization_id]);
    }

    // Audit Log
    await query(`
      INSERT INTO audit_logs (user_id, user_name, action, module, details)
      VALUES ($1, $2, 'USER_DELETE', 'USERS', $3)
    `, [req.user?.id || null, req.user?.name || 'System', `Deleted user account: ${user.name} (${user.email})`]);

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
