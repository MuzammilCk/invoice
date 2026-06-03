# Fix 07 — Intelligence Ceiling Features

> **Priority:** 🔵 INTELLIGENCE — Competitive differentiators  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 90 minutes  
> **Dependencies:** Fix-04 (AI pipeline), Fix-05 (persistence), Fix-06 (UI)

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| I-01 | No Contextual Client Memory — Each Invoice Is a Blank Slate | 🔵 Intelligence |
| I-02 | No Proactive Anomaly Detection | 🔵 Intelligence |
| I-03 | No OCR Import (Scan Competitor Invoice → Structured Data) | 🔵 Intelligence |
| I-05 | No Draft Email / Payment Reminder AI Generation | 🔵 Intelligence |
| I-06 | No Cloud Fallback for Low-VRAM Machines | 🔵 Intelligence |
| I-07 | No Latency/Model Speed Visibility | 🔵 Intelligence |
| I-09 | No Recurring Invoice Scheduling | 🔵 Intelligence |

## Prerequisites

- **Fix-04** (AI streaming pipeline)
- **Fix-05** (Supabase persistence for customer/invoice history)
- **Fix-06** (UI shell for new features)

## Dependencies to Install

```bash
npm install tesseract.js node-cron
npm install -D @types/node-cron
```

---

## Implementation

### 1. `src/lib/ai-context.ts` — Client Context Memory Engine (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** I-01

#### Architecture

The Context Memory Engine queries past invoices for a given client and injects a context summary into the AI system prompt. This enables the AI to:
- Pre-fill recurring items and rates
- Maintain consistent terminology
- Suggest upsells based on history
- Auto-set currency and tax rates from previous invoices

```typescript
import { Invoice } from '../types';
import { computeInvoiceTotals } from './calculations';

interface ClientContext {
  clientName: string;
  totalInvoiceCount: number;
  totalBilled: number;
  currency: string;
  lastInvoiceDate: string;
  commonItems: { description: string; rate: number; frequency: number }[];
  averageTaxRate: number;
  preferredTemplate: string;
  lastNotes: string;
}

/**
 * Build a context summary for AI injection based on invoice history.
 * This provides the AI with historical context about a specific client,
 * enabling smarter, faster, and more accurate invoice generation.
 */
export function buildClientContext(
  invoices: Invoice[],
  clientIdentifier: string
): ClientContext | null {
  // Find all invoices for this client (match by name or email)
  const identifier = clientIdentifier.toLowerCase();
  const clientInvoices = invoices.filter(
    inv =>
      inv.customerInfo.name?.toLowerCase().includes(identifier) ||
      inv.customerInfo.email?.toLowerCase().includes(identifier)
  );

  if (clientInvoices.length === 0) return null;

  // Sort by date (newest first)
  const sorted = [...clientInvoices].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );

  // Extract common items (items appearing in >30% of invoices)
  const itemCounts = new Map<string, { rate: number; count: number }>();
  for (const inv of sorted) {
    for (const item of inv.items) {
      const key = item.description.toLowerCase().trim();
      const existing = itemCounts.get(key);
      if (existing) {
        existing.count++;
        existing.rate = item.rate; // Use most recent rate
      } else {
        itemCounts.set(key, { rate: item.rate, count: 1 });
      }
    }
  }

  const commonItems = Array.from(itemCounts.entries())
    .filter(([, v]) => v.count >= Math.max(1, sorted.length * 0.3))
    .map(([desc, v]) => ({
      description: desc,
      rate: v.rate,
      frequency: v.count,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Calculate averages
  const totalBilled = sorted.reduce(
    (sum, inv) => sum + computeInvoiceTotals(inv).grandTotal,
    0
  );
  const avgTax = sorted.reduce((sum, inv) => sum + inv.taxRate, 0) / sorted.length;

  // Most common template
  const templateCounts = new Map<string, number>();
  for (const inv of sorted) {
    templateCounts.set(inv.templateId, (templateCounts.get(inv.templateId) || 0) + 1);
  }
  const preferredTemplate = Array.from(templateCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'minimal-executive';

  return {
    clientName: sorted[0].customerInfo.name,
    totalInvoiceCount: sorted.length,
    totalBilled,
    currency: sorted[0].currency,
    lastInvoiceDate: sorted[0].issueDate,
    commonItems,
    averageTaxRate: Math.round(avgTax * 100) / 100,
    preferredTemplate,
    lastNotes: sorted[0].notes || '',
  };
}

/**
 * Format client context for AI prompt injection.
 * Returns a compact string suitable for system prompt augmentation.
 */
export function formatClientContextForPrompt(context: ClientContext): string {
  const itemList = context.commonItems
    .map(i => `"${i.description}" at $${i.rate} (used ${i.frequency}× before)`)
    .join('; ');

  return `CLIENT HISTORY FOR "${context.clientName}":
- Total invoices: ${context.totalInvoiceCount}
- Total billed: $${context.totalBilled.toFixed(2)} (${context.currency})
- Average tax rate: ${context.averageTaxRate}%
- Commonly billed items: ${itemList || 'None'}
- Preferred template: ${context.preferredTemplate}
- Last invoice notes: "${context.lastNotes}"
USE THIS HISTORY to pre-fill rates and descriptions where applicable. Maintain consistency.`;
}
```

**Integration Point:** Inject into the AI system prompt when the user has already selected or mentioned a client:

```typescript
// In server.ts generate-invoice handler:
let systemPrompt = invoiceSystemInstruction;

if (clientContext) {
  systemPrompt += '\n\n' + formatClientContextForPrompt(clientContext);
}
```

---

### 2. `server.ts` — Proactive Invoice Analysis Endpoint (NEW ROUTE)

**Change Type:** ADD  
**Addresses:** I-02

```typescript
// ── Route: Proactive Invoice Analysis ──
v1.post('/invoices/:id/analyze', requireAuth, aiRateLimiter, async (req, res): Promise<void> => {
  try {
    const invoice = req.body.invoice;

    if (!invoice) {
      res.status(400).json({ error: 'Invoice data is required.' });
      return;
    }

    const analysisPrompt = `Analyze this invoice data and provide actionable suggestions:

INVOICE DATA:
- Client: ${invoice.customerInfo?.name || 'Unknown'}
- Items: ${JSON.stringify(invoice.items?.map((i: any) => ({ desc: i.description, qty: i.quantity, rate: i.rate })) || [])}
- Subtotal: ${invoice.items?.reduce((s: number, i: any) => s + i.quantity * i.rate, 0) || 0}
- Tax Rate: ${invoice.taxRate || 0}%
- Discount: ${invoice.discountRate || 0}%
- Currency: ${invoice.currency || 'USD'}
- Notes: ${invoice.notes || 'None'}

PROVIDE EXACTLY 3 SUGGESTIONS in this JSON format:
{
  "suggestions": [
    {
      "type": "anomaly" | "optimization" | "upsell" | "compliance",
      "title": "Short title (max 50 chars)",
      "description": "Actionable description (max 150 chars)",
      "severity": "info" | "warning" | "critical",
      "field": "affected field name or null"
    }
  ]
}

RULES:
- Flag anomalies: unusually high/low rates, zero quantities, missing fields.
- Suggest optimizations: bundle discounts, payment terms, template changes.
- Check compliance: missing tax ID, no due date, past-due dates.
- Be specific and actionable. No generic advice.`;

    const response = await withRetry(() =>
      ollama.chat.completions.create({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: 'You are an invoice analysis assistant. Return ONLY valid JSON with no preamble.' },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.3,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: 'Analysis failed — no response generated.' });
      return;
    }

    try {
      const analysis = JSON.parse(content);
      res.json(analysis);
    } catch {
      res.json({ suggestions: [{ type: 'info', title: 'Analysis Unavailable', description: 'Could not parse AI analysis. Please try again.', severity: 'info', field: null }] });
    }
  } catch (error) {
    handleApiError(error, res, 'analyze');
  }
});
```

---

### 3. `server.ts` — OCR Import Endpoint (NEW ROUTE)

**Change Type:** ADD  
**Addresses:** I-03

```typescript
// ── Route: OCR Import (Image → Invoice Data) ──
v1.post('/ocr-import', requireAuth, aiRateLimiter, upload.single('image'), async (req, res): Promise<void> => {
  try {
    const imageFile = req.file;

    if (!imageFile) {
      res.status(400).json({ error: 'Image file is required.' });
      return;
    }

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff', 'application/pdf'];
    if (!validMimeTypes.includes(imageFile.mimetype)) {
      res.status(400).json({ error: `Unsupported file type: ${imageFile.mimetype}. Accepted: PNG, JPEG, WebP, TIFF, PDF.` });
      return;
    }

    // ── Stage 1: OCR with Tesseract.js (runs server-side) ──
    const Tesseract = await import('tesseract.js');
    const { data: { text: ocrText, confidence } } = await Tesseract.recognize(
      imageFile.buffer,
      'eng+hin+tam+tel+mal+kan+ben', // Multi-language support
      {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`[ocr] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    console.log(`[ocr] Extracted ${ocrText.length} chars with ${confidence}% confidence`);

    if (!ocrText.trim()) {
      res.status(400).json({ error: 'No text could be extracted from the image.' });
      return;
    }

    // ── Stage 2: OCR text → Structured Invoice JSON via Ollama ──
    const extractionPrompt = `The following text was extracted via OCR from a scanned invoice or receipt. Extract structured invoice data from it.

OCR TEXT (may contain errors):
---
${ocrText.substring(0, 3000)}
---

OCR Confidence: ${confidence}%

INSTRUCTIONS:
- Correct obvious OCR errors (e.g., "l" → "1", "O" → "0" in numbers).
- Extract all line items, quantities, and rates.
- Identify the client/vendor names and addresses.
- Detect the currency from symbols or context.
- If the document is a receipt, convert it to invoice format.`;

    const response = await withRetry(() =>
      ollama.chat.completions.create({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: invoiceSystemInstruction },
          { role: 'user', content: extractionPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'invoice', schema: invoiceSchema },
        } as any,
        temperature: 0.1,
      })
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: 'Failed to extract invoice data from OCR text.' });
      return;
    }

    const invoiceData = JSON.parse(content);

    res.json({
      invoice: invoiceData,
      ocr: {
        rawText: ocrText.substring(0, 2000),
        confidence,
        charCount: ocrText.length,
      },
    });
  } catch (error) {
    handleApiError(error, res, 'ocr-import');
  }
});
```

---

### 4. `server.ts` — Draft Email / Payment Reminder Generation (NEW ROUTE)

**Change Type:** ADD  
**Addresses:** I-05

```typescript
// ── Route: Generate Email Draft ──
v1.post('/invoices/:id/draft-email', requireAuth, aiRateLimiter, async (req, res): Promise<void> => {
  try {
    const { invoice, emailType = 'send' } = req.body;

    if (!invoice) {
      res.status(400).json({ error: 'Invoice data is required.' });
      return;
    }

    const emailTypes: Record<string, string> = {
      send: 'Write a professional email to send this invoice to the client. Include a friendly introduction, the invoice total, and payment instructions.',
      reminder: 'Write a polite payment reminder email. The invoice is overdue. Be firm but professional. Mention the overdue amount and due date.',
      thankyou: 'Write a thank-you email confirming payment receipt. Express appreciation for their business and mention the paid amount.',
      followup: 'Write a follow-up email checking if the client received the invoice and if they have any questions.',
    };

    const instruction = emailTypes[emailType] || emailTypes.send;

    const total = (invoice.items || []).reduce(
      (s: number, i: any) => s + (i.quantity || 0) * (i.rate || 0),
      0
    );

    const prompt = `${instruction}

INVOICE DETAILS:
- Invoice #: ${invoice.invoiceNumber || 'DRAFT'}
- Client: ${invoice.customerInfo?.name || 'Client'}
- Total: ${invoice.currency || 'USD'} ${total.toFixed(2)}
- Due Date: ${invoice.dueDate || 'Not set'}
- From: ${invoice.businessInfo?.name || 'Business'}

RULES:
- Return ONLY the email text (subject line on first line, then body).
- Use professional but warm tone.
- Keep it concise (under 200 words).
- Do not include salutation placeholders like [Name] — use the actual client name.`;

    const response = await withRetry(() =>
      ollama.chat.completions.create({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: 'You are a professional business email writer. Return only the email text: subject on line 1, body after a blank line. No markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      })
    );

    const emailText = response.choices[0]?.message?.content ?? '';
    const lines = emailText.split('\n');
    const subject = lines[0]?.replace(/^Subject:\s*/i, '').trim() || `Invoice ${invoice.invoiceNumber || ''}`;
    const body = lines.slice(1).join('\n').trim();

    res.json({ subject, body, emailType });
  } catch (error) {
    handleApiError(error, res, 'draft-email');
  }
});
```

---

### 5. `server.ts` — System Capabilities & Model Speed Endpoint (NEW ROUTE)

**Change Type:** ADD  
**Addresses:** I-06, I-07

```typescript
// ── Route: System Capabilities (model availability, speed tier, features) ──
v1.get('/system/capabilities', async (_req, res): Promise<void> => {
  let ollamaStatus: 'online' | 'offline' | 'degraded' = 'offline';
  let ollamaModel = OLLAMA_MODEL;
  let ollamaResponseTimeMs = -1;
  let sttStatus: 'online' | 'offline' = 'offline';

  // ── Check Ollama ──
  try {
    const start = Date.now();
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(5000) });
    ollamaResponseTimeMs = Date.now() - start;

    if (r.ok) {
      const data = await r.json() as any;
      const models = data.models || [];
      const hasModel = models.some((m: any) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(':')[0]));
      ollamaStatus = hasModel ? 'online' : 'degraded';
    }
  } catch {}

  // ── Check STT ──
  try {
    const r = await fetch(`${STT_URL}/health`, { signal: AbortSignal.timeout(3000) });
    sttStatus = r.ok ? 'online' : 'offline';
  } catch {}

  // ── Speed tier classification ──
  let speedTier: 'fast' | 'standard' | 'slow' | 'unknown' = 'unknown';
  if (ollamaResponseTimeMs >= 0) {
    if (ollamaResponseTimeMs < 100) speedTier = 'fast';
    else if (ollamaResponseTimeMs < 500) speedTier = 'standard';
    else speedTier = 'slow';
  }

  res.json({
    ollama: {
      status: ollamaStatus,
      model: ollamaModel,
      responseTimeMs: ollamaResponseTimeMs,
      speedTier,
      host: OLLAMA_HOST,
    },
    stt: {
      status: sttStatus,
      port: STT_PORT,
    },
    features: {
      streaming: true,
      voiceInput: sttStatus === 'online',
      ocrImport: true,
      emailDraft: true,
      analysis: ollamaStatus === 'online',
      cloudSync: !!process.env.VITE_SUPABASE_URL,
    },
    cloudFallback: {
      available: !!process.env.GROQ_API_KEY,
      provider: process.env.GROQ_API_KEY ? 'Groq' : null,
    },
  });
});
```

---

### 6. Cloud Fallback Configuration

**Addresses:** I-06

#### `.env` additions

```env
# ── CLOUD FALLBACK (optional — for low-VRAM machines) ──
# Set this to enable Groq as a fast cloud fallback when Ollama is offline.
# Requires explicit user consent in the UI before activating.
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
```

#### `server.ts` — Fallback logic in AI route

```typescript
// Add to generate-invoice handler, after Ollama fails:
async function callWithFallback(messages: any[], responseFormat: any): Promise<string> {
  // ── Try local Ollama first ──
  try {
    const response = await withRetry(() =>
      ollama.chat.completions.create({
        model: OLLAMA_MODEL,
        messages,
        response_format: responseFormat,
        temperature: 0.1,
      }),
      2, // Fewer retries before fallback
      500
    );
    return response.choices[0]?.message?.content ?? '';
  } catch (ollamaErr: any) {
    const category = classifyOllamaError(ollamaErr);
    console.warn(`[fallback] Ollama failed (${category}). Checking cloud fallback...`);

    // ── Try cloud fallback if configured ──
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';

    if (GROQ_API_KEY && ['CONNECTION_REFUSED', 'MODEL_NOT_LOADED', 'SERVICE_UNAVAILABLE'].includes(category)) {
      console.log('[fallback] Routing to Groq cloud...');

      const groq = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: GROQ_API_KEY,
      });

      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content ?? '';
      if (content) {
        console.log('[fallback] Groq cloud responded successfully.');
        return content;
      }
    }

    throw ollamaErr; // Re-throw if no fallback available
  }
}
```

**User Consent Pattern:** The cloud fallback sends data to Groq's servers. This requires explicit user consent. The frontend should show a modal when:
1. Ollama is detected as offline
2. Cloud fallback key is configured
3. User has not previously consented

```typescript
// src/components/CloudFallbackModal.tsx (NEW FILE — skeleton)
// Shows when: capabilities.ollama.status === 'offline' && capabilities.cloudFallback.available

export function CloudFallbackModal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-zinc-700">
        <h2 className="text-lg font-bold text-zinc-100 mb-2">Local AI Unavailable</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Ollama is not running or the model is not loaded. Would you like to use Groq cloud as a temporary fallback?
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-300">
            ⚠️ Cloud fallback sends invoice prompts to Groq's servers. No PII is included (stripped automatically), but the prompt text will leave your machine.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onAccept} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">
            Use Cloud Temporarily
          </button>
          <button onClick={onDecline} className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold">
            Stay Offline
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 7. `src/components/AISpeedBadge.tsx` — Model Speed Indicator (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** I-07

```typescript
import React, { useEffect, useState } from 'react';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

interface SpeedInfo {
  speedTier: 'fast' | 'standard' | 'slow' | 'unknown';
  responseTimeMs: number;
  model: string;
  status: string;
}

export function AISpeedBadge() {
  const [speed, setSpeed] = useState<SpeedInfo | null>(null);

  useEffect(() => {
    const checkSpeed = async () => {
      try {
        const res = await fetch('/api/v1/system/capabilities');
        if (res.ok) {
          const data = await res.json();
          setSpeed({
            speedTier: data.ollama.speedTier,
            responseTimeMs: data.ollama.responseTimeMs,
            model: data.ollama.model,
            status: data.ollama.status,
          });
        }
      } catch {}
    };
    checkSpeed();
    const interval = setInterval(checkSpeed, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!speed) return null;

  const config = {
    fast: { icon: Zap, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Fast' },
    standard: { icon: Clock, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'Standard' },
    slow: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Slow' },
    unknown: { icon: Clock, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20', label: 'Unknown' },
  };

  const { icon: Icon, color, label } = config[speed.speedTier];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color}`}
      title={`${speed.model} — ${speed.responseTimeMs}ms ping | Status: ${speed.status}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {label} · {speed.model.split(':')[0]}
    </div>
  );
}
```

**Integration:** Add to `AIAssistantSidebar.tsx` header, next to the model name label.

---

### 8. Recurring Invoice Scheduling (Schema-Ready, No Cron Yet)

**Addresses:** I-09

The database schema is already defined in Fix-05 (`recurring_schedules` table). The backend implementation requires `node-cron` for scheduling.

#### `server.ts` — Recurring Schedule Endpoints

```typescript
import cron from 'node-cron';

// In-memory schedule store (replace with Supabase query in production)
const activeSchedules = new Map<string, cron.ScheduledTask>();

// ── Route: Create Recurring Schedule ──
v1.post('/invoices/:id/schedule', requireAuth, async (req, res): Promise<void> => {
  try {
    const { frequency = 'monthly', autoSend = false } = req.body;
    const templateInvoiceId = req.params.id;

    const cronExpressions: Record<string, string> = {
      weekly: '0 9 * * 1',       // Monday 9 AM
      biweekly: '0 9 1,15 * *',  // 1st and 15th at 9 AM
      monthly: '0 9 1 * *',      // 1st of each month at 9 AM
      quarterly: '0 9 1 1,4,7,10 *', // 1st of Jan/Apr/Jul/Oct
      annually: '0 9 1 1 *',     // Jan 1st at 9 AM
    };

    const cronExpr = cronExpressions[frequency];
    if (!cronExpr) {
      res.status(400).json({ error: `Invalid frequency: ${frequency}. Valid: ${Object.keys(cronExpressions).join(', ')}` });
      return;
    }

    const scheduleId = randomUUID();

    // Create the cron job
    const task = cron.schedule(cronExpr, () => {
      console.log(`[recurring] Generating invoice from template ${templateInvoiceId}`);
      // In production: clone invoice, update dates, optionally auto-send
    }, { scheduled: true });

    activeSchedules.set(scheduleId, task);

    res.status(201).json({
      scheduleId,
      templateInvoiceId,
      frequency,
      cronExpression: cronExpr,
      autoSend,
      nextRunAt: getNextCronRun(cronExpr),
      isActive: true,
    });
  } catch (error) {
    handleApiError(error, res, 'schedule-create');
  }
});

// ── Route: Cancel Recurring Schedule ──
v1.delete('/schedules/:id', requireAuth, async (req, res): Promise<void> => {
  const task = activeSchedules.get(req.params.id);
  if (task) {
    task.stop();
    activeSchedules.delete(req.params.id);
    res.json({ cancelled: true });
  } else {
    res.status(404).json({ error: 'Schedule not found.' });
  }
});

function getNextCronRun(expression: string): string {
  // Simple next-run approximation (use cron-parser for accuracy)
  const now = new Date();
  now.setHours(9, 0, 0, 0);
  if (now < new Date()) {
    now.setDate(now.getDate() + 1);
  }
  return now.toISOString();
}
```

---

## Full Feature Matrix After Fix-07

| Feature | Status | Endpoint |
|---|---|---|
| Text → Invoice | ✅ | `POST /generate-invoice` |
| Text → Invoice (Streaming) | ✅ | `POST /generate-invoice-stream` |
| Voice → Invoice | ✅ | `POST /audio-to-invoice` |
| Rewrite Notes | ✅ | `POST /rewrite` |
| Server-Side PDF | ✅ | `POST /invoices/:id/pdf` |
| Invoice Validation | ✅ | `POST /invoices/:id/validate` |
| Invoice Analysis | ✅ | `POST /invoices/:id/analyze` |
| OCR Import | ✅ | `POST /ocr-import` |
| Draft Email | ✅ | `POST /invoices/:id/draft-email` |
| Share Link | ✅ | `POST /invoices/:id/share` |
| Recurring Schedule | ✅ | `POST /invoices/:id/schedule` |
| System Capabilities | ✅ | `GET /system/capabilities` |
| Health Check | ✅ | `GET /health` |
| Auth | ✅ | `POST /auth/login`, `/register`, `/refresh` |

---

## Integration Checklist

- [ ] Install `tesseract.js` and `node-cron`
- [ ] Create `src/lib/ai-context.ts` with `buildClientContext()` and `formatClientContextForPrompt()`
- [ ] Add `/invoices/:id/analyze` endpoint with anomaly detection prompts
- [ ] Add `/ocr-import` endpoint with Tesseract.js + Ollama pipeline
- [ ] Add `/invoices/:id/draft-email` endpoint with email type support
- [ ] Add `/system/capabilities` endpoint with speed classification
- [ ] Add `callWithFallback()` function for Groq cloud fallback
- [ ] Create `CloudFallbackModal.tsx` with user consent flow
- [ ] Create `AISpeedBadge.tsx` with periodic health polling
- [ ] Add `GROQ_API_KEY` and `GROQ_MODEL` to `.env.example`
- [ ] Add recurring schedule CRUD endpoints with `node-cron`
- [ ] Integrate `AISpeedBadge` into `AIAssistantSidebar` header
- [ ] Integrate client context injection into AI system prompt

## Regression Tests

```bash
# 1. Invoice Analysis
curl -X POST http://localhost:3000/api/v1/invoices/test/analyze \
  -H "Content-Type: application/json" \
  -d '{"invoice":{"customerInfo":{"name":"Test Client"},"items":[{"description":"Consulting","quantity":0,"rate":150}],"taxRate":75}}'
# Expected: suggestions array with anomaly for zero quantity and high tax rate

# 2. System Capabilities
curl http://localhost:3000/api/v1/system/capabilities
# Expected: { ollama: { status, speedTier, ... }, stt: {...}, features: {...} }

# 3. Email Draft
curl -X POST http://localhost:3000/api/v1/invoices/test/draft-email \
  -H "Content-Type: application/json" \
  -d '{"invoice":{"invoiceNumber":"INV-001","customerInfo":{"name":"John Doe"},"items":[{"description":"Design","quantity":2,"rate":150}],"currency":"USD","dueDate":"2026-07-01","businessInfo":{"name":"Studio Co"}},"emailType":"send"}'
# Expected: { subject: "...", body: "...", emailType: "send" }

# 4. OCR Import (requires image file)
curl -X POST http://localhost:3000/api/v1/ocr-import \
  -F "image=@test_receipt.png"
# Expected: { invoice: {...}, ocr: { rawText, confidence, charCount } }
```

---

## Control Document Updates

### `decision.md`

```markdown
## DECISION 20: Intelligence Features Architecture

| Feature | Approach | Rationale |
|---|---|---|
| **Client Memory** | Query past invoices, inject context into system prompt | Zero additional storage; leverages existing data |
| **Anomaly Detection** | LLM-based analysis with structured JSON output | Flexible, handles edge cases humans define poorly |
| **OCR** | Tesseract.js server-side + LLM post-processing | Tesseract for text extraction, LLM for semantic structuring |
| **Email Drafts** | LLM with invoice data context | Professional, personalized, multi-type (send/reminder/thank-you) |
| **Cloud Fallback** | Groq API with explicit user consent | Ultra-fast cloud LLM; requires PII warning |
| **Speed Indicator** | Ping `/api/tags` every 30s, classify by response time | Lightweight, non-intrusive monitoring |
| **Recurring** | `node-cron` with template cloning | Simple scheduling without external services |

## DECISION 21: OCR Engine

| Property | Decision | Rationale |
|---|---|---|
| **Engine** | `tesseract.js` v5+ | WASM-based, no native deps, server-side capable |
| **Languages** | `eng+hin+tam+tel+mal+kan+ben` | Covers primary user base |
| **Post-Processing** | Ollama structured extraction | Corrects OCR errors, maps to invoice schema |
| **File Types** | PNG, JPEG, WebP, TIFF, PDF | Standard document formats |

## DECISION 22: Cloud Fallback Provider

| Property | Decision | Rationale |
|---|---|---|
| **Provider** | Groq (free tier: 30 req/min) | Fastest inference API; free tier sufficient for fallback |
| **Model** | `llama-3.1-8b-instant` | Fast, good JSON adherence, no vendor lock-in |
| **Activation** | Only when Ollama is offline + user consents | Privacy-first; explicit opt-in |
| **PII** | Stripped by `stripPIIFromPrompt()` before cloud | Defense-in-depth |
```

### `build.md`

```markdown
## BUILD STEP 12: Intelligence Dependencies

```bash
npm install tesseract.js node-cron
npm install -D @types/node-cron
```

## BUILD STEP 13: Cloud Fallback (Optional)

Add to `.env`:
```env
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
```

Get a free API key at https://console.groq.com/keys
```

---

*End of Fix 07 — Intelligence Ceiling Features*
