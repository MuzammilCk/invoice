# Fix 01 — Critical Security Infrastructure

> **Priority:** 🔴 CRITICAL — Must be implemented FIRST  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 45 minutes  
> **Dependencies:** None — this is the foundation layer

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| C-02 | Zero Real Authentication — All AI Endpoints Fully Public | 🔴 Critical |
| C-07 | `new Function()` in NumberExpressionInput — RCE Risk | 🔴 Critical |
| C-09 | Full PII Invoice JSON Sent to AI on Every Request | 🔴 Critical |
| H-07 | Compliance Audit Is Frontend Toast — No Server Enforcement | 🟠 High |
| H-11 | Triplicated Retry Logic — DRY Violation | 🟠 High |
| H-12 | No Request Body Size Limit — OOM DoS Vector | 🟠 High |
| H-13 | Error Messages Leak Internal Stack Traces | 🟠 High |

## Prerequisites

- None. This file is the foundation for all subsequent fixes.

## Dependencies to Install

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

---

## Implementation

### 1. `server.ts` — Authentication Layer

**Change Type:** MODIFY  
**Culprit Location:** `requireAuth()` at lines 44–54

#### Current Code (BEFORE)

```typescript
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!API_SECRET) {
    return next(); // ← In dev mode, auth is completely skipped
  }
  const key = req.headers['x-api-key'] as string | undefined;
  if (key !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

#### Proposed Code (AFTER)

```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ── JWT Configuration ──
const JWT_SECRET = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-do-not-use-in-production');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

// ── In-memory user store (migrate to Supabase in Fix-05) ──
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

const users: Map<string, StoredUser> = new Map();

// Seed a default admin user in dev mode
if (process.env.NODE_ENV !== 'production') {
  const devUserId = randomUUID();
  users.set(devUserId, {
    id: devUserId,
    email: 'admin@invoicestudio.local',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: 'Dev Admin',
    createdAt: new Date().toISOString(),
  });
  console.log(`[auth] Dev user seeded: admin@invoicestudio.local / admin123`);
}

// ── JWT Token Helpers ──
function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ sub: userId, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

function verifyToken(token: string, expectedType: 'access' | 'refresh'): { sub: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; type: string };
    if (payload.type !== expectedType) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

// ── Upgraded requireAuth middleware ──
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Dev mode with no JWT_SECRET configured and no API_SECRET: skip auth
  if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET && !API_SECRET) {
    (req as any).userId = 'dev-user';
    return next();
  }

  // Strategy 1: Bearer token (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token, 'access');
    if (payload) {
      (req as any).userId = payload.sub;
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Strategy 2: API key (backward compat for self-hosted)
  if (API_SECRET) {
    const key = req.headers['x-api-key'] as string | undefined;
    if (key === API_SECRET) {
      (req as any).userId = 'api-key-user';
      return next();
    }
  }

  return res.status(401).json({ error: 'Authentication required. Provide a Bearer token or X-API-Key header.' });
}
```

**Rationale:** Dual-strategy auth allows both JWT (for web app users) and API key (for self-hosted/CLI integrations). In dev mode with no secrets configured, auth is bypassed to preserve DX. Production enforces JWT_SECRET.

---

### 2. `server.ts` — Auth Routes

**Change Type:** ADD — Insert into v1 router BEFORE `requireAuth` middleware  
**Location:** After line 280 (`const v1 = express.Router()`)

```typescript
// ── Auth Rate Limiter (stricter than general) ──
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 auth attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait.' },
});

// ── Auth Routes (public — no requireAuth) ──
v1.post('/auth/register', authRateLimiter, async (req, res): Promise<void> => {
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

    // Check duplicate email
    const existing = Array.from(users.values()).find(u => u.email === email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);

    users.set(userId, {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name?.trim() || email.split('@')[0],
      createdAt: new Date().toISOString(),
    });

    const tokens = generateTokens(userId);
    res.status(201).json({
      user: { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0] },
      ...tokens,
    });
  } catch (error) {
    handleApiError(error, res, 'auth/register');
  }
});

v1.post('/auth/login', authRateLimiter, async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = Array.from(users.values()).find(u => u.email === email.toLowerCase());
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
});

v1.post('/auth/refresh', authRateLimiter, async (req, res): Promise<void> => {
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

    const user = users.get(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    const tokens = generateTokens(user.id);
    res.json(tokens);
  } catch (error) {
    handleApiError(error, res, 'auth/refresh');
  }
});

v1.get('/auth/me', requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const user = users.get(userId);

  if (!user) {
    res.json({ id: userId, email: 'dev@local', name: 'Dev User' });
    return;
  }

  res.json({ id: user.id, email: user.email, name: user.name });
});
```

**Rationale:** `/auth/register` and `/auth/login` are public but rate-limited at 5/min. `/auth/me` requires auth. Refresh tokens allow seamless session extension without re-login.

---

### 3. `server.ts` — Server-Side Invoice Validation Endpoint

**Change Type:** ADD — Insert into v1 router after auth routes  
**Addresses:** H-07 (Compliance audit is frontend-only)

```typescript
// ── Validation Types ──
interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ── Route: Invoice Validation ──
v1.post('/invoices/:id/validate', requireAuth, async (req, res): Promise<void> => {
  try {
    const invoice = req.body.invoice;

    if (!invoice) {
      res.status(400).json({ error: 'Invoice data is required in request body.' });
      return;
    }

    const issues: ValidationIssue[] = [];

    // ── Required field checks ──
    if (!invoice.customerInfo?.name?.trim()) {
      issues.push({ code: 'MISSING_CLIENT_NAME', field: 'customerInfo.name', message: 'Client name is required for a valid invoice.', severity: 'error' });
    }

    if (!invoice.customerInfo?.email?.trim()) {
      issues.push({ code: 'MISSING_CLIENT_EMAIL', field: 'customerInfo.email', message: 'Client email is recommended for delivery and tracking.', severity: 'warning' });
    }

    if (!invoice.customerInfo?.address?.trim()) {
      issues.push({ code: 'MISSING_CLIENT_ADDRESS', field: 'customerInfo.address', message: 'Client address is recommended for compliance.', severity: 'warning' });
    }

    // ── Line item checks ──
    if (!invoice.items || invoice.items.length === 0) {
      issues.push({ code: 'NO_LINE_ITEMS', field: 'items', message: 'At least one line item is required.', severity: 'error' });
    } else {
      invoice.items.forEach((item: any, index: number) => {
        if (!item.description?.trim()) {
          issues.push({ code: 'EMPTY_ITEM_DESCRIPTION', field: `items[${index}].description`, message: `Line item ${index + 1} has no description.`, severity: 'error' });
        }
        if (item.quantity <= 0) {
          issues.push({ code: 'INVALID_QUANTITY', field: `items[${index}].quantity`, message: `Line item ${index + 1} has zero or negative quantity.`, severity: 'error' });
        }
        if (item.rate < 0) {
          issues.push({ code: 'NEGATIVE_RATE', field: `items[${index}].rate`, message: `Line item ${index + 1} has a negative rate.`, severity: 'error' });
        }
      });
    }

    // ── Business info checks ──
    if (!invoice.businessInfo?.name?.trim()) {
      issues.push({ code: 'MISSING_BUSINESS_NAME', field: 'businessInfo.name', message: 'Your business name is required.', severity: 'error' });
    }

    if (!invoice.businessInfo?.taxId?.trim()) {
      issues.push({ code: 'MISSING_TAX_ID', field: 'businessInfo.taxId', message: 'Tax ID is recommended for compliance.', severity: 'warning' });
    }

    // ── Date checks ──
    if (invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate);
      if (dueDate < new Date()) {
        issues.push({ code: 'DUE_DATE_PAST', field: 'dueDate', message: 'Due date is in the past.', severity: 'warning' });
      }
    }

    // ── Tax rate sanity ──
    if (invoice.taxRate > 50) {
      issues.push({ code: 'HIGH_TAX_RATE', field: 'taxRate', message: `Tax rate of ${invoice.taxRate}% is unusually high. Please verify.`, severity: 'warning' });
    }

    // ── Invoice number ──
    if (!invoice.invoiceNumber?.trim()) {
      issues.push({ code: 'MISSING_INVOICE_NUMBER', field: 'invoiceNumber', message: 'Invoice number is required for tracking.', severity: 'warning' });
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    res.json({
      valid: !hasErrors,
      issues,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length,
    });
  } catch (error) {
    handleApiError(error, res, 'validate');
  }
});
```

**Rationale:** Server-side validation produces typed `ValidationIssue[]` objects. The PDF export flow (Fix-03) will call this endpoint first and block export if `valid === false` for non-draft invoices. The frontend audit button now calls this instead of the local function.

---

### 4. `server.ts` — Typed `withRetry()` with Ollama Error Categories

**Change Type:** MODIFY  
**Culprit Location:** `withRetry()` at lines 71–92

#### Current Code (BEFORE)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        [503, 429].includes(err?.status) ||
        ['UNAVAILABLE', 'ECONNREFUSED', 'fetch failed'].some((s) => err?.message?.includes(s));
      if (!isRetryable || attempt === maxRetries - 1) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      console.warn(`[retry] Service unavailable, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

#### Proposed Code (AFTER)

```typescript
// ── Typed error categories for Ollama-specific failures ──
type OllamaErrorCategory =
  | 'CONNECTION_REFUSED'    // Ollama not running
  | 'MODEL_NOT_LOADED'     // Model not pulled yet
  | 'RATE_LIMITED'          // Too many concurrent requests
  | 'SERVICE_UNAVAILABLE'  // Temporary overload
  | 'TIMEOUT'              // Request took too long
  | 'UNKNOWN';             // Unclassified

interface TypedRetryError {
  category: OllamaErrorCategory;
  message: string;
  attempt: number;
  maxRetries: number;
  originalError: unknown;
}

function classifyOllamaError(err: any): OllamaErrorCategory {
  const msg = err?.message ?? '';
  const code = err?.code ?? '';
  const status = err?.status ?? 0;

  if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('not loaded'))) return 'MODEL_NOT_LOADED';
  if (status === 429 || msg.includes('rate limit')) return 'RATE_LIMITED';
  if (status === 503 || msg.includes('UNAVAILABLE') || msg.includes('fetch failed')) return 'SERVICE_UNAVAILABLE';
  if (code === 'ETIMEDOUT' || msg.includes('timeout') || msg.includes('TIMEOUT')) return 'TIMEOUT';
  return 'UNKNOWN';
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const category = classifyOllamaError(err);
      const isRetryable = ['CONNECTION_REFUSED', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'TIMEOUT'].includes(category);

      if (!isRetryable || attempt === maxRetries - 1) {
        const typedError: TypedRetryError = {
          category,
          message: `[${category}] ${err?.message ?? 'Unknown error'} (after ${attempt + 1} attempt(s))`,
          attempt: attempt + 1,
          maxRetries,
          originalError: err,
        };
        console.error(`[retry] Final failure: ${typedError.message}`);
        throw typedError;
      }

      const delay = baseDelayMs * 2 ** attempt;
      console.warn(`[retry] [${category}] Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

**Rationale:** Typed error categories let the frontend and `handleApiError()` surface actionable messages: "Ollama is not running" vs "Model not loaded — run `ollama pull qwen3:8b`" vs "Rate limited — try again in a moment."

---

### 5. `server.ts` — Server-Side PII Sanitization (Defense-in-Depth)

**Change Type:** MODIFY  
**Culprit Location:** `sanitizePrompt()` at lines 95–100  
**Addresses:** C-09

#### Proposed Addition (after existing `sanitizePrompt`)

```typescript
// ── Defense-in-depth: Strip PII patterns from prompt before Ollama ──
function stripPIIFromPrompt(prompt: string): string {
  let sanitized = prompt;

  // Strip email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

  // Strip phone numbers (international formats)
  sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[PHONE_REDACTED]');

  // Strip common tax ID patterns (SSN, EIN, PAN, GST, etc.)
  sanitized = sanitized.replace(/\b\d{2,3}[-]?\d{2,3}[-]?\d{4}\b/g, '[TAXID_REDACTED]');
  sanitized = sanitized.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN_REDACTED]');
  sanitized = sanitized.replace(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]{2}\b/g, '[GST_REDACTED]');

  return sanitized;
}
```

**Integration Point:** Call `stripPIIFromPrompt()` in all three route handlers AFTER `sanitizePrompt()` and BEFORE passing to Ollama:

```diff
- const sanitizedPrompt = sanitizePrompt(prompt);
+ const sanitizedPrompt = stripPIIFromPrompt(sanitizePrompt(prompt));
```

---

### 6. `server.ts` — CORS Regex Support

**Change Type:** MODIFY  
**Culprit Location:** CORS configuration at lines 207–216

#### Proposed Code (AFTER)

```typescript
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? `http://localhost:${PORT}`).split(',').map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(pattern => {
        if (pattern.includes('*')) {
          // Convert wildcard pattern to regex: *.example.com → .*\.example\.com
          const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return pattern === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
    maxAge: 600,
  })
);
```

**Rationale:** Regex support allows `ALLOWED_ORIGINS=*.invoicestudio.com,http://localhost:*` for multi-environment deployments.

---

### 7. `server.ts` — Separate Rate Limiters by Endpoint Type

**Change Type:** MODIFY  
**Culprit Location:** Rate limiter at lines 222–229

```typescript
// ── Tiered rate limiting ──
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 AI calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait before trying again.' },
});

const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 general API calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Apply general limiter to all v1 routes
v1.use(generalRateLimiter);

// Apply AI-specific limiter only to AI endpoints (after general)
v1.post('/generate-invoice', requireAuth, aiRateLimiter, /* handler */);
v1.post('/generate-invoice-stream', requireAuth, aiRateLimiter, /* handler */);
v1.post('/audio-to-invoice', requireAuth, aiRateLimiter, upload.single('audio'), /* handler */);
v1.post('/rewrite', requireAuth, aiRateLimiter, /* handler */);
```

---

### 8. Verification: C-07 — `new Function()` Confirmed Absent

**Status:** ✅ VERIFIED CLEAN

```bash
# Run in project root:
grep -r "new Function" src/
# Expected output: Only comments referencing the old pattern
# Line 11: "// Issue 5.1: Safe math expression parser (replaces new Function() / eval())"
# Line 20: "// Issue 5.1: Use expr-eval instead of new Function()"

grep -r "eval(" src/ --include="*.ts" --include="*.tsx"
# Expected output: Only comment on line 11 of SortableInvoiceTable.tsx
```

The `SortableInvoiceTable.tsx` at line 9 uses `import { Parser } from 'expr-eval'` and the `NumberExpressionInput` at line 21 uses an allowlist regex guard `/^[\d\.+\-\*\/\s\(\)]+$/` before calling `mathParser.evaluate()`. This is the correct pattern.

---

### 9. Verification: C-09 — `stripPII()` Called Before AI Prompt

**Status:** ✅ VERIFIED — Called in both handlers

- `AIAssistantSidebar.tsx` line 70: `const invoiceContext = stripPII(invoice);` — called before `fetch`
- `AIAssistantSidebar.tsx` line 160: `const invoiceContext = stripPII(invoice);` — called before audio `fetch`
- `stripPII()` at lines 30–42 correctly omits `customerInfo`, `businessInfo`, and `id`

**Enhancement needed (this fix):** Add server-side `stripPIIFromPrompt()` as defense-in-depth (see Section 5 above).

---

### 10. Verification: H-12 — Body Size Limits

**Status:** ✅ VERIFIED — Both limits applied

```typescript
// server.ts line 219-220
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
```

Multer at lines 57–68 has `fileSize: 10 * 1024 * 1024` (10MB) and `files: 1`.

**Regression test:** Send a 60KB JSON body → expect HTTP 413.

---

### 11. Verification: H-13 — Error Messages in Production

**Status:** ✅ VERIFIED — `handleApiError()` conditionally exposes details

```typescript
// server.ts lines 103-118
if (process.env.NODE_ENV === 'development') {
  res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error', requestId });
} else {
  res.status(500).json({ error: 'An internal error occurred. Please try again.', requestId });
}
```

**Regression test:** Set `NODE_ENV=production`, trigger an error → response must only contain generic message + `requestId`.

---

### 12. Verification: H-11 — No Duplicate Retry Logic

**Status:** ✅ VERIFIED — Single `withRetry()` function

```bash
grep -n "for (let attempt" server.ts
# Expected: Only 1 occurrence inside withRetry() body (line 77)

grep -n "baseDelayMs \* 2 \*\*" server.ts
# Expected: Only 1 occurrence inside withRetry() body (line 86)
```

All three route handlers use `withRetry(() => ollama.chat.completions.create(...))`.

---

## Integration Checklist

- [ ] Install `jsonwebtoken` and `bcryptjs` with type definitions
- [ ] Add `JWT_SECRET` and `JWT_EXPIRES_IN` to `.env` and `.env.example`
- [ ] Auth routes (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/me`) mounted BEFORE `requireAuth` middleware on v1 router
- [ ] `requireAuth` upgraded to dual-strategy (JWT + API key)
- [ ] `/invoices/:id/validate` endpoint returns `ValidationIssue[]`
- [ ] `withRetry()` returns typed `TypedRetryError` on final failure
- [ ] `stripPIIFromPrompt()` called in all 3 AI route handlers
- [ ] CORS supports regex patterns via `ALLOWED_ORIGINS`
- [ ] Auth rate limiter (5/min) separate from AI limiter (10/min) and general (60/min)
- [ ] Confirm `new Function()` has zero occurrences in `src/`
- [ ] Confirm `stripPII()` is called in both `handleGenerate()` and `handleAudioGenerate()`
- [ ] Confirm no catch block does `res.status(500).json({ error: error.message })` in production

## Regression Tests

```bash
# 1. Auth enforcement
curl -s http://localhost:3000/api/v1/generate-invoice \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}' \
  # Expected: 401 Unauthorized (when JWT_SECRET is set)

# 2. Login flow
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@invoicestudio.local","password":"admin123"}' \
  # Expected: { user: {...}, accessToken: "...", refreshToken: "..." }

# 3. Validation endpoint
curl -s -X POST http://localhost:3000/api/v1/invoices/test/validate \
  -H "Content-Type: application/json" \
  -d '{"invoice":{"customerInfo":{"name":"","email":"","address":""},"items":[]}}' \
  # Expected: { valid: false, issues: [...], errorCount: 3 }

# 4. Body size limit
python -c "print('{\"prompt\":\"' + 'x'*60000 + '\"}')" | \
  curl -s -X POST http://localhost:3000/api/v1/generate-invoice \
  -H "Content-Type: application/json" -d @- \
  # Expected: 413 Payload Too Large

# 5. Security grep checks
grep -r "new Function" src/   # Expected: 0 code occurrences
grep -r "Math.random" src/    # Expected: 0 code occurrences
grep -r "eval(" src/ --include="*.ts" --include="*.tsx"  # Expected: 0 code occurrences
```

---

## Control Document Updates

### `context.md` — Add Section

```markdown
## 9. Authentication Architecture

The application uses a dual-strategy authentication system:
- **JWT Tokens:** For web application users. `POST /auth/login` → access + refresh tokens.
- **API Keys:** For self-hosted/CLI deployments. `X-API-Key` header with `API_SECRET` env var.

In development with no `JWT_SECRET` configured, auth is bypassed for DX.
In production, `JWT_SECRET` is required or the server exits.
```

### `decision.md` — Add Decision

```markdown
## DECISION 13: Authentication Strategy

| Property | Decision | Rationale |
|---|---|---|
| **Primary Auth** | JWT (Bearer tokens) | Stateless, standard, works with SPA |
| **Secondary Auth** | API key (`X-API-Key`) | Backward compat, CLI/self-hosted |
| **Password Hashing** | bcryptjs (cost 12) | Industry standard, timing-safe |
| **Token Expiry** | Access: 24h, Refresh: 7d | Balance security/UX |
| **Dev Mode** | Auth skipped when no secrets set | Developer convenience |
```

### `diff.md` — Add Section

```markdown
## 8. Authentication System — NEW

### 8.1 Dependencies Added
- `jsonwebtoken` ^9.x — JWT sign/verify
- `bcryptjs` ^2.x — Password hashing

### 8.2 New Routes
- `POST /api/v1/auth/register` — Create user account
- `POST /api/v1/auth/login` — Authenticate and receive tokens
- `POST /api/v1/auth/refresh` — Exchange refresh token for new pair
- `GET /api/v1/auth/me` — Get current user profile
- `POST /api/v1/invoices/:id/validate` — Server-side invoice validation

### 8.3 Modified Middleware
- `requireAuth()` — Now supports JWT Bearer + API key dual strategy
- `withRetry()` — Returns typed `TypedRetryError` with Ollama error categories
```

### `build.md` — Add Step

```markdown
## BUILD STEP 9: Install Auth Dependencies

```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

Add to `.env`:
```env
JWT_SECRET="your-secure-secret-here"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
```
```

---

*End of Fix 01 — Critical Security Infrastructure*
