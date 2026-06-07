const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Logging replacement
// Replace console.* logs with log.* calls mapping arguments to msg and meta
content = content.replace(/console\.log\(\`\\n📧 \[dev-email\] To: \$\{to\}\`\);/g, "log.info('Dev email To', { to });");
content = content.replace(/console\.log\(\`📧 \[dev-email\] Subject: \$\{subject\}\`\);/g, "log.info('Dev email Subject', { subject });");
content = content.replace(/console\.log\(\`📧 \[dev-email\] Body: \$\{\(body \|\| ''\)\.substring\(0, 200\)\}\.\.\.\`\);/g, "log.info('Dev email Body', { bodyPreview: (body || '').substring(0, 200) });");
content = content.replace(/console\.log\(\`📧 \[dev-email\] PDF attached: \$\{\!\!pdfBuffer\} \(\$\{pdfBuffer \? pdfBuffer\.length : 0\} bytes\)\\n\`\);/g, "log.info('Dev email PDF', { attached: !!pdfBuffer, bytes: pdfBuffer ? pdfBuffer.length : 0 });");

content = content.replace(/console\.log\(\`\[startup\] Server running on http:\/\/localhost:\$\{PORT\}\`\);/g, "log.info('Server running', { port: PORT });");
content = content.replace(/console\.log\(\`\[startup\] WebSocket STT endpoint: ws:\/\/localhost:\$\{PORT\}\/ws\/stt\`\);/g, "log.info('WebSocket STT endpoint', { port: PORT });");
content = content.replace(/console\.log\(\`\[startup\] Environment: \$\{process\.env\.NODE_ENV \|\| 'development'\}\`\);/g, "log.info('Environment', { env: process.env.NODE_ENV || 'development' });");
content = content.replace(/console\.log\(\`\[startup\] API auth: \$\{API_SECRET \? 'ENABLED' : 'DISABLED \(no API_SECRET set\)'\}\`\);/g, "log.info('API auth', { enabled: !!API_SECRET });");
content = content.replace(/console\.log\(\`\[startup\] LLM: \$\{LLM_MODEL\} via \$\{LLM_HOST\}\`\);/g, "log.info('LLM Config', { model: LLM_MODEL, host: LLM_HOST });");
content = content.replace(/console\.log\(\`\[startup\] STT Sidecar: http:\/\/localhost:\$\{STT_PORT\}\`\);/g, "log.info('STT Sidecar configured', { port: STT_PORT });");

content = content.replace(/console\.log\('\[ws\/stt\] Sidecar connection established'\);/g, "log.info('Sidecar connection established');");
content = content.replace(/console\.log\(\`\[ws\/stt\] Authenticated session for user \$\{userId\}\`\);/g, "log.info('Authenticated session', { userId });");
content = content.replace(/console\.log\(\`\[ws\/stt\] Browser disconnected \(\$\{code\}\)\`\);/g, "log.info('Browser disconnected', { code });");
content = content.replace(/console\.error\('\[ws\/stt\] Browser WS error:', err\);/g, "log.error('Browser WS error', { error: err.message });");
content = content.replace(/console\.error\('\[ws\/stt\] Sidecar WS error:', err\);/g, "log.error('Sidecar WS error', { error: err.message });");

content = content.replace(/console\.log\(`\[shutdown\] Received \$\{signal\}\. Graceful shutdown\.\.\.`\);/g, "log.info('Graceful shutdown initiated', { signal });");
content = content.replace(/console\.log\('\[shutdown\] STT sidecar terminated\.'\);/g, "log.info('STT sidecar terminated');");
content = content.replace(/console\.log\('\[shutdown\] Puppeteer browser closed\.'\);/g, "log.info('Puppeteer browser closed');");
content = content.replace(/console\.log\('\[shutdown\] HTTP server closed\.'\);/g, "log.info('HTTP server closed');");
content = content.replace(/console\.log\('\[shutdown\] WebSocket server closed\.'\)/g, "log.info('WebSocket server closed')");
content = content.replace(/console\.error\('\[shutdown\] Forced exit after timeout\.'\);/g, "log.error('Forced exit after timeout');");

content = content.replace(/console\.error\(`FATAL: \$\{key\} must NOT have VITE_ prefix\. It would leak to the browser bundle\.\`\);/g, "log.error('Leaked VITE variable', { key });");
content = content.replace(/console\.error\(`FATAL: Invalid PORT value: "\$\{process\.env\.PORT\}"\`\);/g, "log.error('Invalid PORT value', { port: process.env.PORT });");
content = content.replace(/console\.warn\('\[supabase\] SUPABASE_SERVICE_ROLE_KEY not set\. Backend sync endpoints will fail\.'\);/g, "log.warn('SUPABASE_SERVICE_ROLE_KEY not set');");
content = content.replace(/console\.error\('FATAL: API_SECRET environment variable must be set in production to secure AI endpoints\.'\);/g, "log.error('API_SECRET not set in production');");
content = content.replace(/console\.error\('FATAL: JWT_SECRET must be set in production\.'\);/g, "log.error('JWT_SECRET not set in production');");
content = content.replace(/console\.log\(`\[auth\] Dev user seeded: admin@invoicestudio\.local \/ admin123\`\);/g, "log.info('Dev user seeded', { email: 'admin@invoicestudio.local' });");

content = content.replace(/console\.error\(`\[retry\] Final failure: \$\{typedError\.message\}\`\);/g, "log.error('Retry final failure', { message: typedError.message });");
content = content.replace(/console\.warn\(`\[retry\] \[\$\{category\}\] Retrying in \$\{delay\}ms \(attempt \$\{attempt \+ 1\}\/\$\{maxRetries\}\)\.\.\.\`\);/g, "log.warn('Retrying request', { category, delay, attempt: attempt + 1, maxRetries });");
content = content.replace(/console\.warn\(`\[fallback\] LLM failed \(\$\{category\}\)\. Checking cloud fallback\.\.\.\`\);/g, "log.warn('LLM failed, checking cloud fallback', { category });");
content = content.replace(/console\.log\('\[fallback\] Routing to Groq cloud\.\.\.'\);/g, "log.info('Routing to Groq cloud');");
content = content.replace(/console\.log\('\[fallback\] Groq cloud responded successfully\.'\);/g, "log.info('Groq cloud responded successfully');");

content = content.replace(/console\.error\(`\[\$\{requestId\}\] Error in \$\{context\}:`, err\);/g, "log.error('API Error', { requestId, context, error: err instanceof Error ? err.message : String(err) });");

content = content.replace(/console\.log\(`\[startup\] Starting STT sidecar using command: \$\{pythonCmd\}\.\.\.\`\);/g, "log.info('Starting STT sidecar', { command: pythonCmd });");
content = content.replace(/console\.error\(`\[stt\] Failed to start sidecar using '\$\{pythonCmd\}'\. Ensure python is installed and in your PATH\.\`\);/g, "log.error('Failed to start STT sidecar', { command: pythonCmd });");
content = content.replace(/console\.error\(err\);/g, "log.error('Error', { error: err instanceof Error ? err.message : String(err) });");
content = content.replace(/console\.log\('\[stt\]', d\.toString\(\)\.trim\(\)\)/g, "log.info('STT event', { event: d.toString().trim() })");
content = content.replace(/console\.error\('\[stt\]', d\.toString\(\)\.trim\(\)\)/g, "log.error('STT event', { event: d.toString().trim() })");
content = content.replace(/console\.error\(`\[stt\] Process exited with code \$\{code\}\. Restarting in 3s\.\.\.\`\);/g, "log.error('STT Process exited', { code });");

content = content.replace(/console\.log\('\[startup\] STT sidecar is ready\.'\);/g, "log.info('STT sidecar is ready');");
content = content.replace(/console\.log\(`\[startup\] Still waiting for STT sidecar \(downloading model\?\)\.\.\. \(\$\{Math\.round\(\(now - start\) \/ 1000\)\}s elapsed\)\`\);/g, "log.info('Still waiting for STT sidecar', { elapsedSecs: Math.round((now - start) / 1000) });");
content = content.replace(/console\.warn\('\[startup\] STT sidecar did not become ready within timeout \(60m\)\. Audio features may be unavailable\.'\);/g, "log.warn('STT sidecar timeout');");

content = content.replace(/console\.log\(`\[ocr\] Processing uploaded receipt: \$\{req\.file\.originalname\} \(\$\{req\.file\.size\} bytes\)\`\);/g, "log.info('Processing uploaded receipt', { originalname: req.file.originalname, size: req.file.size });");
content = content.replace(/console\.log\(`\[ocr progress\] \$\{m\.status\}: \$\{Math\.round\(m\.progress \* 100\)\}%`\)/g, "log.info('OCR Progress', { status: m.status, progress: Math.round(m.progress * 100) })");
content = content.replace(/console\.log\(`\[ocr\] Extracted text length: \$\{text\.length\}\`\);/g, "log.info('OCR Extracted text length', { length: text.length });");
content = content.replace(/console\.log\(`\[ocr\] Progress: \$\{Math\.round\(m\.progress \* 100\)\}%`\);/g, "log.info('OCR Progress', { progress: Math.round(m.progress * 100) });");
content = content.replace(/console\.log\(`\[ocr\] Extracted \$\{ocrText\.length\} chars with \$\{confidence\}% confidence`\);/g, "log.info('OCR Extracted chars', { length: ocrText.length, confidence });");
content = content.replace(/console\.log\(`\[recurring\] Generating invoice from template \$\{templateInvoiceId\}\`\);/g, "log.info('Recurring schedule trigger', { templateInvoiceId });");
content = content.replace(/console\.log\(`\[startup\] Loaded \$\{data\.length\} recurring schedules from Supabase\`\);/g, "log.info('Loaded recurring schedules', { count: data.length });");
content = content.replace(/console\.log\(`\[recurring\] Generating invoice from template \$\{schedule\.template_invoice_id\}\`\);/g, "log.info('Recurring schedule trigger', { templateInvoiceId: schedule.template_invoice_id });");
content = content.replace(/console\.warn\('\[email\] PDF generation failed, sending without attachment:', pdfErr\);/g, "log.warn('PDF generation failed', { error: pdfErr instanceof Error ? pdfErr.message : String(pdfErr) });");
content = content.replace(/console\.error\(`\[\$\{requestId\}\] PDF generation timed out after \$\{PDF_TIMEOUT_MS\}ms`\);/g, "log.error('PDF generation timed out', { requestId, timeoutMs: PDF_TIMEOUT_MS });");

// 2. LLM Timeout Replacements
content = content.replace(
  /llm\.chat\.completions\.create\(\{([\s\S]*?)\}\)/g,
  (match, inner) => {
    if (match.includes('signal: AbortSignal.timeout(LLM_TIMEOUT_MS)')) return match;
    return `llm.chat.completions.create({${inner}}, { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) })`;
  }
);
content = content.replace(
  /groq\.chat\.completions\.create\(\{([\s\S]*?)\}\)/g,
  (match, inner) => {
    if (match.includes('signal: AbortSignal.timeout(LLM_TIMEOUT_MS)')) return match;
    return `groq.chat.completions.create({${inner}}, { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) })`;
  }
);

// 3. User Auth Migration (Supabase)

// In server.ts, the "users" map is defined:
// const users: Map<string, StoredUser> = new Map();
// If we replace the auth routes, we don't need it. But let's leave it and just overwrite the routes.

const authRegisterRegex = /v1\.post\('\/auth\/register'[\s\S]*?handleApiError\(error, res, 'auth\/register'\);\s*\}\s*\}\);/;
const newAuthRegister = `v1.post('/auth/register', authRateLimiter, async (req, res): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters.' });
        return;
      }

      const userId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 12);

      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.from('users').insert({
          id: userId,
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          name: name?.trim() || email.split('@')[0],
          created_at: new Date().toISOString(),
        });

        if (error) {
            if (error.code === '23505') {
                res.status(409).json({ error: 'An account with this email already exists.' });
            } else {
                throw error;
            }
            return;
        }
      } else {
        // Fallback for dev mode
        users.set(userId, {
          id: userId,
          email: email.toLowerCase().trim(),
          passwordHash,
          name: name?.trim() || email.split('@')[0],
          createdAt: new Date().toISOString(),
        });
      }

      const tokens = generateTokens(userId);
      res.status(201).json({
        user: { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0] },
        ...tokens,
      });
    } catch (error) {
      handleApiError(error, res, 'auth/register');
    }
  });`;

content = content.replace(authRegisterRegex, newAuthRegister);

const authLoginRegex = /v1\.post\('\/auth\/login'[\s\S]*?handleApiError\(error, res, 'auth\/login'\);\s*\}\s*\}\);/;
const newAuthLogin = `v1.post('/auth/login', authRateLimiter, async (req, res): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      let user;
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from('users').select('*').eq('email', email.toLowerCase()).single();
        if (error || !data) {
          res.status(401).json({ error: 'Invalid email or password.' });
          return;
        }
        user = {
            id: data.id,
            email: data.email,
            passwordHash: data.password_hash,
            name: data.name
        };
      } else {
        user = Array.from(users.values()).find(u => u.email === email.toLowerCase());
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const tokens = generateTokens(user.id);
      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      });
    } catch (error) {
      handleApiError(error, res, 'auth/login');
    }
  });`;

content = content.replace(authLoginRegex, newAuthLogin);

const authRefreshRegex = /v1\.post\('\/auth\/refresh'[\s\S]*?handleApiError\(error, res, 'auth\/refresh'\);\s*\}\s*\}\);/;
const newAuthRefresh = `v1.post('/auth/refresh', authRateLimiter, async (req, res): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        res.status(400).json({ error: 'Refresh token is required.' });
        return;
      }

      const payload = verifyToken(refreshToken, 'refresh');
      if (!payload) {
        res.status(401).json({ error: 'Invalid or expired refresh token.' });
        return;
      }

      let exists = false;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('users').select('id').eq('id', payload.sub).single();
        exists = !!data;
      } else {
        exists = users.has(payload.sub);
      }

      if (!exists) {
        res.status(401).json({ error: 'User no longer exists.' });
        return;
      }

      const tokens = generateTokens(payload.sub);
      res.json(tokens);
    } catch (error) {
      handleApiError(error, res, 'auth/refresh');
    }
  });`;

content = content.replace(authRefreshRegex, newAuthRefresh);

const authMeRegex = /v1\.get\('\/auth\/me'[\s\S]*?res\.json\(\{ id: user\.id, email: user\.email, name: user\.name \}\);\s*\}\);/;
const newAuthMe = `v1.get('/auth/me', requireAuth, async (req, res): Promise<void> => {
    const userId = (req as any).userId;

    let user;
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
      if (data) user = data;
    } else {
      user = users.get(userId);
    }

    if (!user) {
      res.json({ id: userId, email: 'dev@local', name: 'Dev User' });
      return;
    }

    res.json({ id: user.id, email: user.email, name: user.name });
  });`;

content = content.replace(authMeRegex, newAuthMe);

fs.writeFileSync('server.ts', content);
