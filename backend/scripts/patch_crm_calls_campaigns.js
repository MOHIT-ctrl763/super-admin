const fs = require('fs');

// Patch calls-controller.js
const cTarget = 'D:\\crm\\CRM backend\\src\\calls\\calls-controller.js';
let cContent = fs.readFileSync(cTarget, 'utf8');

if (!cContent.includes('callerCompId')) {
  cContent = cContent.replace(
    `export const getCalls = async (req, res) => {
  try {
    const { leadId, lead_id, agent, search, type, status, limit = 50, offset = 0 } = req.query;
    const targetLeadId = leadId || lead_id;

    let query = \`SELECT * FROM public.calls WHERE 1=1\`;
    const params = [];
    let idx = 1;`,
    `export const getCalls = async (req, res) => {
  try {
    const { leadId, lead_id, agent, search, type, status, limit = 50, offset = 0 } = req.query;
    const targetLeadId = leadId || lead_id;
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;

    let query = \`SELECT * FROM public.calls WHERE 1=1\`;
    const params = [];
    let idx = 1;

    if (req.role !== 'super_admin' || callerCompId) {
      if (callerCompId) {
        query += \` AND company_id::text = $\${idx}\`;
        params.push(String(callerCompId));
        idx++;
      }
    }`
  );

  fs.writeFileSync(cTarget, cContent, 'utf8');
  console.log('✓ Successfully patched calls-controller.js');
}

// Patch campaigns-controller.js
const campTarget = 'D:\\crm\\CRM backend\\src\\campaigns\\campaigns-controller.js';
let campContent = fs.readFileSync(campTarget, 'utf8');

if (!campContent.includes('callerCompId')) {
  campContent = campContent.replace(
    `export const getCampaigns = async (req, res) => {
  try {
    await ensureSeedCampaigns();

    const { rows: campaigns } = await connectDB.query(
      \`SELECT * FROM public.campaigns ORDER BY created_at DESC\`
    );`,
    `export const getCampaigns = async (req, res) => {
  try {
    await ensureSeedCampaigns();
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;
    const campQuery = (req.role !== 'super_admin' || callerCompId) && callerCompId
      ? \`SELECT * FROM public.campaigns WHERE company_id::text = $1 ORDER BY created_at DESC\`
      : \`SELECT * FROM public.campaigns ORDER BY created_at DESC\`;
    const campParams = (req.role !== 'super_admin' || callerCompId) && callerCompId ? [String(callerCompId)] : [];

    const { rows: campaigns } = await connectDB.query(campQuery, campParams);`
  );

  fs.writeFileSync(campTarget, campContent, 'utf8');
  console.log('✓ Successfully patched campaigns-controller.js');
}
