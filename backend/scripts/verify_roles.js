const { query } = require('../db/database');
const bcrypt = require('bcryptjs');

async function main() {
  const hash = bcrypt.hashSync('123456', 10);
  await query('UPDATE users SET password = $1 WHERE email = $2', [hash, 'mohitpoewal12@gmail.com']);
  console.log('✅ Super Admin password synced to 123456');

  // Verify all 4 roles
  const users = [
    { email: 'mohitpoewal12@gmail.com', pass: '123456', role: 'Super Admin' },
    { email: 'sales@saasplatform.com', pass: '123456', role: 'Sales Person' },
    { email: 'support@saasplatform.com', pass: '123456', role: 'Support Person' },
    { email: 'finance@saasplatform.com', pass: '123456', role: 'Finance Person' },
  ];

  for (const u of users) {
    try {
      const res = await fetch('http://localhost:5000/api/super-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.pass })
      });
      const data = await res.json();
      if (!data.success) {
        console.error(`❌ Login failed for ${u.role}:`, data.message);
        continue;
      }
      const token = data.data.token;
      const user = data.data.user;
      console.log(`\n==============================================`);
      console.log(`✅ [${u.role.toUpperCase()}] Logged In:`);
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role} | Display: ${user.roleDisplayName}`);
      console.log(`   Platform User: ${user.isPlatformUser} | SuperAdmin: ${user.isSuperAdmin}`);
      console.log(`   Permissions (${user.permissions.length}):`, user.permissions.filter(p => p.startsWith('crm.')).join(', '));

      // 1. Check Dashboard Stats with CRM Integration Hub
      const dashRes = await fetch('http://localhost:5000/api/super-admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dashData = await dashRes.json();
      if (dashData.success) {
        console.log(`   📊 Dashboard Connected CRM Hub:`);
        console.log(`      Status: ${dashData.data.crm.status} | Total Companies: ${dashData.data.crm.totalCompanies}`);
        console.log(`      Leads: ${dashData.data.crm.totalLeads} | Hot Leads: ${dashData.data.crm.hotLeads}`);
        console.log(`      Quotes: ${dashData.data.crm.totalQuotations} (₹${dashData.data.crm.quotationValue.toLocaleString()})`);
        console.log(`      Active Chats: ${dashData.data.crm.activeChats} | Calls: ${dashData.data.crm.totalCalls}`);
      } else {
        console.log(`   ⚠️ Dashboard call:`, dashData.message);
      }

      // 2. Check CRM Status
      const crmStatus = await (await fetch('http://localhost:5000/api/super-admin/crm/status', {
        headers: { Authorization: `Bearer ${token}` }
      })).json();
      console.log(`   🔌 CRM Status: ${crmStatus.data?.message} (Latency: ${crmStatus.data?.latencyMs}ms)`);

      // 3. Check Role Specific Modules
      const leadsRes = await (await fetch('http://localhost:5000/api/super-admin/crm/leads', {
        headers: { Authorization: `Bearer ${token}` }
      })).json();
      console.log(`   🎯 Leads Module Access: ${leadsRes.success ? `SUCCESS (${leadsRes.data?.total || leadsRes.data?.items?.length || 0} leads)` : `DENIED: ${leadsRes.message}`}`);

      const quotesRes = await (await fetch('http://localhost:5000/api/super-admin/crm/quotations', {
        headers: { Authorization: `Bearer ${token}` }
      })).json();
      console.log(`   💼 Quotations Module Access: ${quotesRes.success ? `SUCCESS (${quotesRes.data?.total || quotesRes.data?.items?.length || 0} quotes)` : `DENIED: ${quotesRes.message}`}`);

      const waRes = await (await fetch('http://localhost:5000/api/super-admin/crm/whatsapp/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })).json();
      console.log(`   💬 WhatsApp Module Access: ${waRes.success ? `SUCCESS (${waRes.data?.activeChats || 0} active chats)` : `DENIED: ${waRes.message}`}`);
    } catch (e) {
      console.error(`❌ Error verifying ${u.role}:`, e.message);
    }
  }

  process.exit(0);
}

main();
