const fs = require('fs');

const target = 'D:\\crm\\CRM backend\\src\\admin\\admin-controller.js';
let content = fs.readFileSync(target, 'utf8');

// 1. In createUserByAdmin: ensure company_id is resolved accurately
content = content.replace(
  `    const isActive = status !== 'Inactive';
    const company_id = req.user?.company_id || null;`,
  `    const isActive = status !== 'Inactive';
    const company_id = req.body.companyId || req.body.company_id || req.company_id || req.user?.company_id || req.user?.companyId || null;`
);

// 2. In getAllUsers: apply company_id filter
const oldGetAllUsersStart = `    if (isActiveRaw === 'true' || isActiveRaw === 'false') {
      conditions.push(\`u.is_active = \${idx}\`);
      values.push(isActiveRaw === 'true');
      idx++;
    }

    const whereClause = conditions.length ? \`WHERE \${conditions.join(' AND ')}\` : '';`;

const newGetAllUsersStart = `    if (isActiveRaw === 'true' || isActiveRaw === 'false') {
      conditions.push(\`u.is_active = \${idx}\`);
      values.push(isActiveRaw === 'true');
      idx++;
    }

    // Tenant isolation: Company users ONLY see users from their own company
    const callerCompanyId = req.company_id || req.user?.company_id || req.user?.companyId;
    if (req.role !== 'super_admin' || callerCompanyId) {
      if (callerCompanyId) {
        conditions.push(\`u.company_id::text = \$\${idx}\`);
        values.push(String(callerCompanyId));
        idx++;
      }
    }

    const whereClause = conditions.length ? \`WHERE \${conditions.join(' AND ')}\` : '';`;

if (content.includes(oldGetAllUsersStart)) {
  content = content.replace(oldGetAllUsersStart, newGetAllUsersStart);
}

// 3. In getUserById: verify company ownership
const oldGetUserById = `    const permsMap = await fetchUserPermsMap([id]);
    return res.status(200).json({
      success: true,
      data: toUserDTO(result.rows[0], permsMap.get(id) ?? null),
    });`;

const newGetUserById = `    // Tenant isolation check
    const callerCompanyId = req.company_id || req.user?.company_id || req.user?.companyId;
    if (req.role !== 'super_admin' && callerCompanyId && result.rows[0].company_id) {
      if (String(result.rows[0].company_id) !== String(callerCompanyId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access to another company user denied' });
      }
    }

    const permsMap = await fetchUserPermsMap([id]);
    return res.status(200).json({
      success: true,
      data: toUserDTO(result.rows[0], permsMap.get(id) ?? null),
    });`;

if (content.includes(oldGetUserById)) {
  content = content.replace(oldGetUserById, newGetUserById);
}

// 4. In updateUserByAdmin: verify company ownership
content = content.replace(
  `    const existing = await connectDB.query(
      \`SELECT id, company_id FROM users WHERE id = $1\`,
      [id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }`,
  `    const existing = await connectDB.query(
      \`SELECT id, company_id FROM users WHERE id = $1\`,
      [id]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const callerCompanyId = req.company_id || req.user?.company_id;
    if (req.role !== 'super_admin' && callerCompanyId && existing.rows[0].company_id) {
      if (String(existing.rows[0].company_id) !== String(callerCompanyId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot update user from another company' });
      }
    }`
);

// 5. In deleteUserByAdmin: verify company ownership
content = content.replace(
  `export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;`,
  `export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await connectDB.query(\`SELECT id, company_id FROM users WHERE id = $1\`, [id]);
    if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    const callerCompanyId = req.company_id || req.user?.company_id;
    if (req.role !== 'super_admin' && callerCompanyId && existing.rows[0].company_id) {
      if (String(existing.rows[0].company_id) !== String(callerCompanyId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot delete user from another company' });
      }
    }`
);

fs.writeFileSync(target, content, 'utf8');
console.log('✓ Successfully patched D:\\crm\\CRM backend\\src\\admin\\admin-controller.js');
