const fs = require('fs');
const path = require('path');

const target = 'D:\\crm\\CRM backend\\middlewares\\verifyToken.middleware.js';
let content = fs.readFileSync(target, 'utf8');

console.log('Original verifyToken snippet:');
console.log(content.substring(content.indexOf('req.company_id'), content.indexOf('next();') + 10));

if (!content.includes('decoded.companyId')) {
  content = content.replace(
    'req.company_id = decoded.company_id; // convenience',
    'req.company_id = decoded.company_id || decoded.companyId || null; // convenience\n    if (req.user) req.user.company_id = req.company_id;'
  );
  fs.writeFileSync(target, content, 'utf8');
  console.log('✓ Successfully patched verifyToken.middleware.js');
} else {
  console.log('Already patched.');
}
