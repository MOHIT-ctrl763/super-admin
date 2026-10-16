const fs = require('fs');

const target = 'D:\\crm\\CRM backend\\utils\\auth.js';
let content = fs.readFileSync(target, 'utf8');

// Patch generateAccessToken
content = content.replace(
  `export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      company_id: user.company_id,
      role: user.role,
    },`,
  `export const generateAccessToken = (user) => {
  const compId = user.company_id || user.companyId || null;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      company_id: compId,
      companyId: compId,
      role: user.role,
    },`
);

// Patch generateRefreshToken
content = content.replace(
  `export const generateRefreshToken = (user) => {
  return jwt.sign(
    {

      id: user.id,
      email: user.email,
      company_id: user.company_id,
      role: user.role,
    },`,
  `export const generateRefreshToken = (user) => {
  const compId = user.company_id || user.companyId || null;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      company_id: compId,
      companyId: compId,
      role: user.role,
    },`
);

// Patch authenticate middleware to also attach company_id
content = content.replace(
  `    req.user = {
      id: decoded.id,
      companyId: decoded.companyId,
      role: decoded.role,
    };`,
  `    const compId = decoded.company_id || decoded.companyId || null;
    req.user = {
      id: decoded.id,
      companyId: compId,
      company_id: compId,
      role: decoded.role,
    };
    req.company_id = compId;`
);

fs.writeFileSync(target, content, 'utf8');
console.log('✓ Successfully patched D:\\crm\\CRM backend\\utils\\auth.js');
