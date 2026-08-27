const fs = require('fs');

let serverContent = fs.readFileSync('d:/projects/invoice/server.ts', 'utf8');

// 1. Imports
serverContent = serverContent.replace(
  "import express from 'express';",
  "import express from 'express';\nimport cookieParser from 'cookie-parser';"
);

// 2. Middleware & CORS
serverContent = serverContent.replace(
  /  app\.use\(\n    cors\(\{\n      origin: \(origin, callback\) => \{[\s\S]*?\n      \},\n      methods:/g,
  "  app.use(cookieParser());\n  app.use(\n    cors({\n      origin: (origin, callback) => {\n        const isAllowed = !origin || origin.startsWith('chrome-extension://') || allowedOrigins.includes(origin);\n        if (isAllowed) {\n          callback(null, true);\n        } else {\n          callback(new Error(`Origin ${origin} not allowed by CORS`));\n        }\n      },\n      credentials: true,\n      methods:"
);

// 3. JWT Expiration
serverContent = serverContent.replace(
  "const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';",
  "const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';"
);

// 4. requireAuth
serverContent = serverContent.replace(
  "  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;",
  "  let token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;\n  if (!token && req.cookies && req.cookies.accessToken) {\n    token = req.cookies.accessToken;\n  }"
);

// 5. /auth/register
serverContent = serverContent.replace(
  /      res\.status\(201\)\.json\(\{ user, \.\.\.tokens \}\);/g,
  "      res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });\n      res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });\n      res.status(201).json({ user, ...tokens });"
);

// 6. /auth/login
serverContent = serverContent.replace(
  /      res\.json\(\{ user, \.\.\.tokens \}\);/g,
  "      res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });\n      res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });\n      res.json({ user, ...tokens });"
);

// 7. /auth/refresh
serverContent = serverContent.replace(
  /      const \{ refreshToken \} = req\.body;/g,
  "      const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);"
);
serverContent = serverContent.replace(
  /      res\.json\(tokens\);/g,
  "      res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });\n      res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });\n      res.json(tokens);"
);

// 8. /sync/push logic for deletions
serverContent = serverContent.replace(
  "const { invoices } = req.body;",
  "const { invoices, deletedInvoiceIds } = req.body;"
);
serverContent = serverContent.replace(
  /      if \(\!Array\.isArray\(invoices\)\) {/g,
  "      if (deletedInvoiceIds && deletedInvoiceIds.length > 0) {\n        for (const id of deletedInvoiceIds) {\n          await supabaseAdmin.from('invoices').delete().eq('id', id).eq('user_id', userId);\n        }\n      }\n      if (!Array.isArray(invoices)) {"
);

// 9. CHROME_PATH update
serverContent = serverContent.replace(
  /    const CHROME_PATH = process\.env\.CHROME_PATH \?\? \([\s\S]*?    \);/g,
  "    const CHROME_PATH = process.env.CHROME_PATH || (\n      process.platform === 'win32'\n        ? 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'\n        : process.platform === 'darwin'\n        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'\n        : '/usr/bin/google-chrome-stable'\n    );"
);

// 10. PII Regex update
serverContent = serverContent.replace(
  /  sanitized = sanitized\.replace\(\/\(\?:\\\+\?\\d\{1,3\}\[-.\\s\]\?\)\?\\\(\?\\d\{2,4\}\\\)\?\[-.\\s\]\?\\d\{3,4\}\[-.\\s\]\?\\d\{3,4\}\/g, '\[PHONE_REDACTED\]'\);/g,
  "  sanitized = sanitized.replace(/(?:phone|tel|mobile|cell|mob)[\\s:]*(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{2,4}\\)?[-.\\s]?\\d{3,4}[-.\\s]?\\d{3,4}/gi, '[PHONE_REDACTED]');"
);
serverContent = serverContent.replace(
  /  sanitized = sanitized\.replace\(\/\\b\\d\{2,3\}\[-]\?\\d\{2,3\}\[-]\?\\d\{4\}\\b\/g, '\[TAXID_REDACTED\]'\);\n/g,
  ""
);

// 11. Share Token Store replacement
// In /invoices/:id/share:
serverContent = serverContent.replace(
  /      if \(supabaseAdmin\) \{[\s\S]*?      \} else \{[\s\S]*?      \}/g,
  "      if (supabaseAdmin) {\n        await supabaseAdmin.from('share_tokens').insert({\n          invoice_id: invoiceId,\n          user_id: (req as any).userId,\n          token,\n          access_level: accessLevel,\n          expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),\n          is_active: true,\n          view_count: 0\n        });\n      }"
);

// In GET /shared/:token
serverContent = serverContent.replace(
  /      const shareData = shareTokenStore\.get\(token\);/g,
  "      let shareData;\n      if (supabaseAdmin) {\n        const { data, error } = await supabaseAdmin.from('share_tokens').select('*, invoices (*, invoice_items (*))').eq('token', token).single();\n        if (data) {\n          shareData = {\n            ...data,\n            isActive: data.is_active,\n            expiresAt: data.expires_at,\n            accessLevel: data.access_level,\n            viewCount: data.view_count,\n            invoice: {\n              id: data.invoices.id,\n              invoiceNumber: data.invoices.invoice_number,\n              title: data.invoices.title,\n              status: data.invoices.status,\n              currency: data.invoices.currency,\n              taxRate: parseFloat(data.invoices.tax_rate),\n              discountRate: parseFloat(data.invoices.discount_rate),\n              discountType: data.invoices.discount_type,\n              shipping: parseFloat(data.invoices.shipping),\n              issueDate: data.invoices.issue_date,\n              dueDate: data.invoices.due_date,\n              notes: data.invoices.notes,\n              templateId: data.invoices.template_id,\n              themeColor: data.invoices.theme_color,\n              businessInfo: { name: data.invoices.business_name, address: data.invoices.business_address, taxId: data.invoices.business_tax_id },\n              customerInfo: { name: data.invoices.customer_name, email: data.invoices.customer_email, address: data.invoices.customer_address },\n              displaySettings: data.invoices.display_settings,\n              items: (data.invoices.invoice_items || []).sort((a,b)=>a.sort_order-b.sort_order).map(i => ({ id: i.id, description: i.description, quantity: parseFloat(i.quantity), rate: parseFloat(i.rate) }))\n            }\n          };\n        }\n      }"
);

// In POST /shared/:token/view
serverContent = serverContent.replace(
  /      const shareData = shareTokenStore\.get\(token\);\n      if \(shareData && shareData\.isActive\) \{\n        shareData\.viewCount = \(shareData\.viewCount \|\| 0\) \+ 1;\n        shareData\.lastViewedAt = new Date\(\)\.toISOString\(\);\n      \}/g,
  "      if (supabaseAdmin) {\n        const { data } = await supabaseAdmin.from('share_tokens').select('view_count, is_active').eq('token', token).single();\n        if (data && data.is_active) {\n          await supabaseAdmin.from('share_tokens').update({ view_count: data.view_count + 1 }).eq('token', token);\n        }\n      }"
);

// In POST /shared/:token/pay
serverContent = serverContent.replace(
  /      const shareData = shareTokenStore\.get\(token\);/g,
  "      let shareData;\n      if (supabaseAdmin) {\n        const { data } = await supabaseAdmin.from('share_tokens').select('*, invoices (*)').eq('token', token).single();\n        if (data) shareData = { isActive: data.is_active, invoice: { id: data.invoice_id } };\n      }"
);

// In GET /shared/:token/pdf
serverContent = serverContent.replace(
  /      const shareData = shareTokenStore\.get\(token\);/g,
  "      let shareData;\n      if (supabaseAdmin) {\n        const { data } = await supabaseAdmin.from('share_tokens').select('*, invoices (*, invoice_items (*))').eq('token', token).single();\n        if (data) {\n          shareData = {\n            isActive: data.is_active,\n            expiresAt: data.expires_at,\n            invoice: {\n              id: data.invoices.id,\n              invoiceNumber: data.invoices.invoice_number,\n              title: data.invoices.title,\n              status: data.invoices.status,\n              currency: data.invoices.currency,\n              taxRate: parseFloat(data.invoices.tax_rate),\n              discountRate: parseFloat(data.invoices.discount_rate),\n              discountType: data.invoices.discount_type,\n              shipping: parseFloat(data.invoices.shipping),\n              issueDate: data.invoices.issue_date,\n              dueDate: data.invoices.due_date,\n              notes: data.invoices.notes,\n              templateId: data.invoices.template_id,\n              themeColor: data.invoices.theme_color,\n              businessInfo: { name: data.invoices.business_name, address: data.invoices.business_address, taxId: data.invoices.business_tax_id },\n              customerInfo: { name: data.invoices.customer_name, email: data.invoices.customer_email, address: data.invoices.customer_address },\n              displaySettings: data.invoices.display_settings,\n              items: (data.invoices.invoice_items || []).sort((a,b)=>a.sort_order-b.sort_order).map(i => ({ id: i.id, description: i.description, quantity: parseFloat(i.quantity), rate: parseFloat(i.rate) }))\n            }\n          };\n        }\n      }"
);

// In POST /shared/:token/mark-paid
serverContent = serverContent.replace(
  /      const shareData = shareTokenStore\.get\(token\);/g,
  "      let shareData;\n      if (supabaseAdmin) {\n        const { data } = await supabaseAdmin.from('share_tokens').select('*').eq('token', token).single();\n        if (data) shareData = { isActive: data.is_active };\n      }"
);
serverContent = serverContent.replace(
  /      shareData\.markedPaidAt = new Date\(\)\.toISOString\(\);\n      shareData\.paymentStatus = 'paid';\n\n      res\.json\(\{/g,
  "      res.json({"
);

fs.writeFileSync('d:/projects/invoice/server.ts', serverContent);

// Fix apiClient.ts
let apiContent = fs.readFileSync('d:/projects/invoice/src/lib/apiClient.ts', 'utf8');

apiContent = apiContent.replace(
  "  const { accessToken, refreshToken, updateTokens, clearAuth } = useStore.getState();",
  "  const { updateTokens, clearAuth } = useStore.getState();"
);
apiContent = apiContent.replace(
  "  if (accessToken && !headers.has('Authorization')) {\n    headers.set('Authorization', `Bearer ${accessToken}`);\n  }",
  ""
);
apiContent = apiContent.replace(
  "  const config = {\n    ...options,\n    headers,\n  };",
  "  const config: RequestInit = {\n    ...options,\n    headers,\n    credentials: 'include',\n  };"
);
apiContent = apiContent.replace(
  /        body: JSON\.stringify\(\{ refreshToken \}\),/g,
  "        body: JSON.stringify({}),\n        credentials: 'include',"
);

fs.writeFileSync('d:/projects/invoice/src/lib/apiClient.ts', apiContent);

console.log('Fixed server.ts and apiClient.ts');
