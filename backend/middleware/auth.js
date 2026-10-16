const jwt = require('jsonwebtoken');
const { getUserRoles, getUserPermissions } = require('../services/rbacService');

const JWT_SECRET = process.env.JWT_SECRET || 'superadmin_jwt_secret_standalone_9283749283472';

async function authenticateSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication session token required.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { query } = require('../db/database');

    // Fetch user details from database
    const userRes = await query(
      "SELECT id, name, email, role_name, role_display_name, is_active, organization_id, organization_name, crm_company_id FROM users WHERE id = $1",
      [decoded.id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or inactive.'
      });
    }

    const dbUser = userRes.rows[0];

    // Fetch user's assigned roles
    const roles = await getUserRoles(dbUser.id);
    const isSuperAdmin = roles.some(r => r.slug === 'super_admin') || dbUser.role_name === 'SUPER_ADMIN' || decoded.role === 'super_admin';
    const isPlatformUser = isSuperAdmin || !dbUser.organization_id || roles.some(r => ['super_admin', 'finance_role', 'finance_admin', 'support_role', 'support_admin', 'sales_role', 'sales_admin'].includes(r.slug)) || ['SUPER_ADMIN', 'FINANCE_ROLE', 'FINANCE', 'SUPPORT_ROLE', 'SUPPORT', 'SALES_ROLE', 'SALES'].includes(dbUser.role_name);

    let crmCompId = dbUser.crm_company_id || decoded.crm_company_id || null;
    if (!crmCompId && (dbUser.organization_id || decoded.organization_id)) {
      try {
        const orgRes = await query("SELECT crm_company_id FROM organizations WHERE id = $1", [dbUser.organization_id || decoded.organization_id]);
        crmCompId = orgRes.rows[0]?.crm_company_id || null;
      } catch (e) {}
    }

    req.user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: isSuperAdmin ? 'super_admin' : (roles[0]?.slug || 'company_admin'),
      role_name: dbUser.role_name,
      role_display_name: dbUser.role_display_name || (roles[0]?.name || (isSuperAdmin ? 'Super Administrator' : 'Company Administrator')),
      organization_id: dbUser.organization_id || decoded.organization_id || null,
      organization_name: dbUser.organization_name || decoded.organization_name || null,
      crm_company_id: crmCompId,
      roles,
      isSuperAdmin,
      isPlatformUser
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.'
    });
  }
}

function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // Super Admin bypasses all individual permission checks
      if (req.user.isSuperAdmin) {
        return next();
      }

      const permissions = await getUserPermissions(req.user.id);
      if (permissions.includes('*') || permissions.includes(permissionCode)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have permission to perform this action (${permissionCode}).`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

function requireAnyPermission(permissionCodes = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      if (req.user.isSuperAdmin) {
        return next();
      }

      const permissions = await getUserPermissions(req.user.id);
      const hasAny = permissions.includes('*') || permissionCodes.some(p => permissions.includes(p));

      if (hasAny) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: You do not have any of the required permissions (${permissionCodes.join(', ')}).`
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = {
  authenticateSuperAdmin,
  requirePermission,
  requireAnyPermission,
  JWT_SECRET
};
