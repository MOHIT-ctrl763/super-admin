const fs = require('fs');

const target = 'D:\\crm\\CRM backend\\src\\leads\\lead-controller.js';
let content = fs.readFileSync(target, 'utf8');

// 1. In getLeads: apply company_id filter
const targetPos = content.indexOf('// Valid sort columns');
if (targetPos !== -1 && !content.includes('l.company_id::text = $')) {
  const insertIndex = content.lastIndexOf('const whereClause = conditions.length', targetPos);
  const tenantIsolationSnippet = `
        // Strict Multi-Tenant Isolation
        const callerCompanyId = req.company_id || req.user?.company_id || req.user?.companyId;
        if (req.role !== 'super_admin' || callerCompanyId) {
            if (callerCompanyId) {
                conditions.push(\`l.company_id::text = \$\${idx}\`);
                values.push(String(callerCompanyId));
                idx++;
            }
        }
`;
  content = content.slice(0, insertIndex) + tenantIsolationSnippet + '\n        ' + content.slice(insertIndex);
}

// 2. In createLead: insert company_id
const oldInsertLeads = `        const result = await connectDB.query(
            \`INSERT INTO leads (
        name, company, phone, email, source, stage, priority,
        assigned, industry, value, score, score_factors, tags, notes,
        project_id, custom_fields, extra_fields,
        last_activity, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW(),NOW())
      RETURNING *\`,
            [
                name.trim(),
                company?.trim() || '',
                phone?.trim() || '',
                email?.trim() ? email.trim().toLowerCase() : '',
                source || 'Manual',
                stage || 'New Inquiry',
                priority || 'Medium',
                finalAssigned,
                industry || null,
                value || '₹0',
                computedScore ?? 50,
                JSON.stringify(computedFactors || []),
                JSON.stringify(tags || []),
                notes || null,
                finalProjectId || null,
                JSON.stringify(finalCustomFields),
                JSON.stringify(finalExtraFields),
            ]
        );`;

const newInsertLeads = `        const callerCompId = req.body.companyId || req.body.company_id || req.company_id || req.user?.company_id || null;
        const result = await connectDB.query(
            \`INSERT INTO leads (
        name, company, phone, email, source, stage, priority,
        assigned, industry, value, score, score_factors, tags, notes,
        project_id, custom_fields, extra_fields, company_id,
        last_activity, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW(),NOW())
      RETURNING *\`,
            [
                name.trim(),
                company?.trim() || '',
                phone?.trim() || '',
                email?.trim() ? email.trim().toLowerCase() : '',
                source || 'Manual',
                stage || 'New Inquiry',
                priority || 'Medium',
                finalAssigned,
                industry || null,
                value || '₹0',
                computedScore ?? 50,
                JSON.stringify(computedFactors || []),
                JSON.stringify(tags || []),
                notes || null,
                finalProjectId || null,
                JSON.stringify(finalCustomFields),
                JSON.stringify(finalExtraFields),
                callerCompId ? String(callerCompId) : null,
            ]
        );`;

if (content.includes('INSERT INTO leads (')) {
  // Replace SQL insert
  content = content.replace(
    /INSERT INTO leads \([\s\S]*?RETURNING \*\`,[\s\S]*?JSON\.stringify\(finalExtraFields\),?\s*\]\s*\);/,
    `INSERT INTO leads (
        name, company, phone, email, source, stage, priority,
        assigned, industry, value, score, score_factors, tags, notes,
        project_id, custom_fields, extra_fields, company_id,
        last_activity, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW(),NOW())
      RETURNING *\`,
            [
                name.trim(),
                company?.trim() || '',
                phone?.trim() || '',
                email?.trim() ? email.trim().toLowerCase() : '',
                source || 'Manual',
                stage || 'New Inquiry',
                priority || 'Medium',
                finalAssigned,
                industry || null,
                value || '₹0',
                computedScore ?? 50,
                JSON.stringify(computedFactors || []),
                JSON.stringify(tags || []),
                notes || null,
                finalProjectId || null,
                JSON.stringify(finalCustomFields),
                JSON.stringify(finalExtraFields),
                (req.body.companyId || req.body.company_id || req.company_id || req.user?.company_id || null) ? String(req.body.companyId || req.body.company_id || req.company_id || req.user?.company_id) : null,
            ]
        );`
  );
}

// 3. In getLeadById: verify company ownership
content = content.replace(
  `        const result = await connectDB.query(
            \`SELECT l.*, p.name AS project_name, p.color AS project_color
             FROM leads l
             LEFT JOIN projects p ON (l.project_id = p.id::text OR l.project_id = p.name)
             WHERE l.id::text = $1::text\`,
            [String(id)]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Lead not found' });`,
  `        const result = await connectDB.query(
            \`SELECT l.*, p.name AS project_name, p.color AS project_color
             FROM leads l
             LEFT JOIN projects p ON (l.project_id = p.id::text OR l.project_id = p.name)
             WHERE l.id::text = $1::text\`,
            [String(id)]
        );
        if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Lead not found' });
        const callerCompId = req.company_id || req.user?.company_id;
        if (req.role !== 'super_admin' && callerCompId && result.rows[0].company_id) {
            if (String(result.rows[0].company_id) !== String(callerCompId)) {
                return res.status(403).json({ success: false, message: 'Forbidden: Access to another company lead denied' });
            }
        }`
);

// 4. In updateLead: verify company ownership
content = content.replace(
  `        const oldLead = existing.rows[0];`,
  `        const oldLead = existing.rows[0];
        const callerCompId = req.company_id || req.user?.company_id;
        if (req.role !== 'super_admin' && callerCompId && oldLead.company_id) {
            if (String(oldLead.company_id) !== String(callerCompId)) {
                return res.status(403).json({ success: false, message: 'Forbidden: Cannot update lead from another company' });
            }
        }`
);

// 5. In deleteLead: verify company ownership
content = content.replace(
  `        const oldLead = existing.rows[0];`,
  `        const oldLead = existing.rows[0];
        const callerCompId = req.company_id || req.user?.company_id;
        if (req.role !== 'super_admin' && callerCompId && oldLead.company_id) {
            if (String(oldLead.company_id) !== String(callerCompId)) {
                return res.status(403).json({ success: false, message: 'Forbidden: Cannot delete lead from another company' });
            }
        }`
);

fs.writeFileSync(target, content, 'utf8');
console.log('✓ Successfully patched D:\\crm\\CRM backend\\src\\leads\\lead-controller.js');
