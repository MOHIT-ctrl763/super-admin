const fs = require('fs');

// Patch activities-controller.js
const actTarget = 'D:\\crm\\CRM backend\\src\\activities\\activities-controller.js';
let actContent = fs.readFileSync(actTarget, 'utf8');

if (!actContent.includes('callerCompId')) {
  actContent = actContent.replace(
    `export const getActivities = async (req, res) => {
  try {
    const { date, agent, type, lead_id, leadId, search, limit = 200, offset = 0 } = req.query;`,
    `export const getActivities = async (req, res) => {
  try {
    const { date, agent, type, lead_id, leadId, search, limit = 200, offset = 0 } = req.query;
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;`
  );

  // In activities select query, add condition
  actContent = actContent.replace(
    `    const { rows } = await connectDB.query(
      \`SELECT * FROM public.activities
       \${whereClause}
       ORDER BY timestamp DESC
       LIMIT $1 OFFSET $2\`,
      [Number(limit), Number(offset)]
    );`,
    `    // Enforce tenant boundary
    let finalWhere = whereClause;
    const qParams = [Number(limit), Number(offset)];
    if (req.role !== 'super_admin' || callerCompId) {
      if (callerCompId) {
        finalWhere = finalWhere ? \`\${finalWhere} AND company_id::text = $3\` : \`WHERE company_id::text = $3\`;
        qParams.push(String(callerCompId));
      }
    }

    const { rows } = await connectDB.query(
      \`SELECT * FROM public.activities
       \${finalWhere}
       ORDER BY timestamp DESC
       LIMIT $1 OFFSET $2\`,
      qParams
    );`
  );

  fs.writeFileSync(actTarget, actContent, 'utf8');
  console.log('✓ Successfully patched activities-controller.js');
}

// Patch reports-controller.js
const repTarget = 'D:\\crm\\CRM backend\\src\\reports\\reports-controller.js';
let repContent = fs.readFileSync(repTarget, 'utf8');

if (!repContent.includes('callerCompId')) {
  repContent = repContent.replace(
    `export const getReportsSummary = async (req, res) => {
  try {
    const leadsRes = await connectDB.query(\`SELECT COUNT(*) as total_leads, COUNT(*) FILTER (WHERE stage = 'Won') as won_leads FROM public.leads\`);
    const quotationsRes = await connectDB.query(\`SELECT COUNT(*) as total_quotes, SUM(total_amount) as revenue FROM public.quotations\`);
    const campaignsRes = await connectDB.query(\`SELECT COUNT(*) as total_campaigns FROM public.campaigns\`);
    const callsRes = await connectDB.query(\`SELECT COUNT(*) as total_calls FROM public.calls\`);`,
    `export const getReportsSummary = async (req, res) => {
  try {
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;
    const filterSql = (req.role !== 'super_admin' || callerCompId) && callerCompId ? \`WHERE company_id::text = $1\` : \`\`;
    const filterParams = (req.role !== 'super_admin' || callerCompId) && callerCompId ? [String(callerCompId)] : [];

    const leadsRes = await connectDB.query(\`SELECT COUNT(*) as total_leads, COUNT(*) FILTER (WHERE stage = 'Won') as won_leads FROM public.leads \${filterSql}\`, filterParams);
    const quotationsRes = await connectDB.query(\`SELECT COUNT(*) as total_quotes, SUM(total_amount) as revenue FROM public.quotations \${filterSql}\`, filterParams);
    const campaignsRes = await connectDB.query(\`SELECT COUNT(*) as total_campaigns FROM public.campaigns \${filterSql}\`, filterParams);
    const callsRes = await connectDB.query(\`SELECT COUNT(*) as total_calls FROM public.calls \${filterSql}\`, filterParams);`
  );

  fs.writeFileSync(repTarget, repContent, 'utf8');
  console.log('✓ Successfully patched reports-controller.js');
}
