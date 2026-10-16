const { query } = require('../db/database');

exports.globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: {
          organizations: [],
          users: [],
          plans: []
        }
      });
    }

    const isSuperAdmin = req.user?.isSuperAdmin === true;
    const orgId = req.user?.organization_id || 0;
    const compId = req.user?.crm_company_id || '0';

    // 1. Search Organizations
    let orgsQuery = `
      SELECT id, name, slug, email, status, plan_name 
      FROM organizations 
      WHERE (name ILIKE $1 OR slug ILIKE $1 OR email ILIKE $1 OR owner_name ILIKE $1)
    `;
    const orgsParams = [searchTerm];
    if (!isSuperAdmin) {
      orgsQuery += ` AND id = $2`;
      orgsParams.push(orgId);
    }
    orgsQuery += ` ORDER BY id DESC LIMIT 5`;
    const orgsRes = await query(orgsQuery, orgsParams);

    // 2. Search Users
    let usersQuery = `
      SELECT id, name, email, role_name, is_active, organization_id
      FROM users 
      WHERE (name ILIKE $1 OR email ILIKE $1)
    `;
    const usersParams = [searchTerm];
    if (!isSuperAdmin) {
      usersQuery += ` AND (organization_id = $2 OR crm_company_id = $3)`;
      usersParams.push(orgId, compId);
    }
    usersQuery += ` ORDER BY id DESC LIMIT 5`;
    const usersRes = await query(usersQuery, usersParams);

    // 3. Search Plans
    const plansRes = await query(`
      SELECT id, name, slug, price_monthly, price_yearly, is_active
      FROM saas_plans 
      WHERE name ILIKE $1 OR slug ILIKE $1
      ORDER BY id DESC LIMIT 5
    `, [searchTerm]);

    return res.json({
      success: true,
      data: {
        organizations: orgsRes.rows,
        users: usersRes.rows,
        plans: plansRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
