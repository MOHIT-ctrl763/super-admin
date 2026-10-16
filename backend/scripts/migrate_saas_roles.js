const { query } = require('../db/database');
const rbacService = require('../services/rbacService');

async function migrate() {
  console.log('🔄 Merging and cleaning up roles in superadmin_db...');

  // 1. Move any user_roles from old admin roles to new role IDs
  const pairs = [
    { oldSlug: 'finance_admin', newSlug: 'finance_role' },
    { oldSlug: 'support_admin', newSlug: 'support_role' },
    { oldSlug: 'sales_admin', newSlug: 'sales_role' }
  ];

  for (const { oldSlug, newSlug } of pairs) {
    const oldR = await query('SELECT id FROM roles WHERE slug = $1', [oldSlug]);
    const newR = await query('SELECT id FROM roles WHERE slug = $1', [newSlug]);
    if (oldR.rows.length > 0 && newR.rows.length > 0) {
      const oldId = oldR.rows[0].id;
      const newId = newR.rows[0].id;

      // Reassign users
      await query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT user_id, $1 FROM user_roles WHERE role_id = $2
        ON CONFLICT DO NOTHING
      `, [newId, oldId]);

      // Update user.role_name
      await query(`
        UPDATE users SET role_name = $1 WHERE role_name = $2
      `, [newSlug.toUpperCase(), oldSlug]);

      // Delete old role_permissions and old role
      await query('DELETE FROM role_permissions WHERE role_id = $1', [oldId]);
      await query('DELETE FROM user_roles WHERE role_id = $1', [oldId]);
      await query('DELETE FROM roles WHERE id = $1', [oldId]);
      console.log(`Merged ${oldSlug} into ${newSlug}`);
    }
  }

  // 2. Remove operations_admin
  const opRole = await query("SELECT id FROM roles WHERE slug = 'operations_admin'");
  if (opRole.rows.length > 0) {
    const opId = opRole.rows[0].id;
    await query('DELETE FROM role_permissions WHERE role_id = $1', [opId]);
    await query('DELETE FROM user_roles WHERE role_id = $1', [opId]);
    await query('DELETE FROM roles WHERE id = $1', [opId]);
    console.log('Removed operations_admin role.');
  }

  // 3. Re-sync permissions for all active roles
  await rbacService.seedRBAC();

  const r = await query('SELECT id, name, slug, description, is_system FROM roles ORDER BY id');
  console.log('\nFinal Roles in DB:');
  console.table(r.rows);
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
