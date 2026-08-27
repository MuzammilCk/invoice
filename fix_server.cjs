const fs = require('fs');

let content = fs.readFileSync('d:/projects/invoice/server.ts', 'utf8');

// 1. Remove weaker validate route
const weakerValidateRegex = /\/\/ ── Validation Types ──[\s\S]*?handleApiError\(error, res, 'validate'\);\s*\}\s*\}\);/g;
content = content.replace(weakerValidateRegex, '');

// 2. Move shared routes
const sharedRoutesRegex = /(\/\/ ── Route: View Shared Invoice \(public, no auth\) ──[\s\S]*?\/\/ ── B-08 \/ M-08: Route: Mark Shared Invoice as Paid \(Razorpay stub\) ──[\s\S]*?handleApiError\(error, res, 'shared-mark-paid'\);\s*\}\s*\}\);)/g;

const match = content.match(sharedRoutesRegex);
if (match) {
    const sharedRoutesBlock = match[0];
    content = content.replace(sharedRoutesRegex, '');
    
    // Insert before requireAuth
    const insertPoint = '// Apply auth to all subsequent routes\n  v1.use(requireAuth);';
    content = content.replace(insertPoint, sharedRoutesBlock + '\n\n  ' + insertPoint);
}

fs.writeFileSync('d:/projects/invoice/server.ts', content);
console.log('Fixed server.ts');
