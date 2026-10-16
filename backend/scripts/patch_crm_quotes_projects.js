const fs = require('fs');

// Patch quotations-controller.js
const qTarget = 'D:\\crm\\CRM backend\\src\\quotations\\quotations-controller.js';
let qContent = fs.readFileSync(qTarget, 'utf8');

if (!qContent.includes('callerCompId')) {
  qContent = qContent.replace(
    `export const getQuotations = async (req, res) => {
  try {
    const { leadId, lead_id, search, status, agent, dateFilter } = req.query;
    const targetLeadId = leadId || lead_id;

    let query = \`SELECT * FROM public.quotations WHERE 1=1\`;
    const params = [];
    let idx = 1;`,
    `export const getQuotations = async (req, res) => {
  try {
    const { leadId, lead_id, search, status, agent, dateFilter } = req.query;
    const targetLeadId = leadId || lead_id;
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;

    let query = \`SELECT * FROM public.quotations WHERE 1=1\`;
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

  // In createQuotation: store company_id
  qContent = qContent.replace(
    `export const createQuotation = async (req, res) => {
  try {`,
    `export const createQuotation = async (req, res) => {
  try {
    const callerCompId = req.body.companyId || req.body.company_id || req.company_id || req.user?.company_id || null;`
  );

  fs.writeFileSync(qTarget, qContent, 'utf8');
  console.log('✓ Successfully patched quotations-controller.js');
}

// Patch projects-controller.js
const pTarget = 'D:\\crm\\CRM backend\\src\\projects\\projects-controller.js';
let pContent = fs.readFileSync(pTarget, 'utf8');

if (!pContent.includes('callerCompId')) {
  pContent = pContent.replace(
    `export const getProjects = async (req, res) => {
  try {
    const { rows: projects } = await connectDB.query(\`SELECT * FROM public.projects ORDER BY created_at DESC NULLS LAST\`);`,
    `export const getProjects = async (req, res) => {
  try {
    const callerCompId = req.company_id || req.user?.company_id || req.user?.companyId;
    const projQuery = (req.role !== 'super_admin' || callerCompId) && callerCompId
      ? \`SELECT * FROM public.projects WHERE company_id::text = $1 ORDER BY created_at DESC NULLS LAST\`
      : \`SELECT * FROM public.projects ORDER BY created_at DESC NULLS LAST\`;
    const projParams = (req.role !== 'super_admin' || callerCompId) && callerCompId ? [String(callerCompId)] : [];
    const { rows: projects } = await connectDB.query(projQuery, projParams);`
  );

  fs.writeFileSync(pTarget, pContent, 'utf8');
  console.log('✓ Successfully patched projects-controller.js');
}
