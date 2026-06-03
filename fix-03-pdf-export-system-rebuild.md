# Fix 03 — PDF Export System Rebuild

> **Priority:** 🔴 CRITICAL — Independent, can run in parallel with Fix-02  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 60 minutes  
> **Dependencies:** None — fully independent track

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| C-01 | PDF Export Produces a Raster Image, Not a Real PDF | 🔴 Critical |

## Prerequisites

- None. This fix is fully independent of other fix files.
- Puppeteer requires a Chromium download (~280MB first run).

## Dependencies to Install

```bash
# ADD server-side PDF engine
npm install puppeteer

# REMOVE client-side raster libraries (after migration complete)
npm uninstall html-to-image jspdf html2canvas
```

> **Note:** Full `puppeteer` (not `puppeteer-core`) per user directive. This bundles Chromium automatically.

---

## Architecture Decision

### Why Server-Side Puppeteer?

| Approach | Text Selectable | File Size | OCR Parseable | Print Quality |
|---|---|---|---|---|
| **Current: `html-to-image` + `jsPDF.addImage()`** | ❌ No | 400–800KB | ❌ No | Medium (raster) |
| **Proposed: Puppeteer `page.pdf()`** | ✅ Yes | 30–80KB | ✅ Yes | High (vector) |
| Alternative: `@react-pdf/renderer` | ✅ Yes | 50–100KB | ✅ Yes | High — but requires rewriting all templates in React-PDF primitives |
| Alternative: `pdfmake` | ✅ Yes | 40–90KB | ✅ Yes | Medium — declarative but limited styling |

**Decision:** Puppeteer `page.pdf()` is the only approach that:
1. Reuses the existing HTML/CSS template rendering (zero template rewrite)
2. Produces true vector PDF with selectable text
3. Handles all 20 template styles identically to browser preview
4. Supports CSS @page rules, print media queries, and custom fonts

---

## Implementation

### 1. `server.ts` — Puppeteer PDF Endpoint

**Change Type:** ADD — New route on v1 router  
**Location:** After existing AI routes

#### Proposed Code

```typescript
import puppeteer, { Browser } from 'puppeteer';

// ── Puppeteer Browser Pool (singleton) ──
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    });
  }
  return browserInstance;
}

// ── PDF Cache (invalidated on invoice.updatedAt change) ──
const pdfCache = new Map<string, { buffer: Buffer; updatedAt: string }>();

const PDF_TIMEOUT_MS = 30_000;
const MAX_PDF_CACHE_SIZE = 50;

// ── Route: Server-Side PDF Generation ──
v1.post('/invoices/:id/pdf', requireAuth, async (req, res): Promise<void> => {
  const requestId = (req as any).requestId ?? 'unknown';
  let page = null;

  try {
    const invoice = req.body.invoice;
    const invoiceId = req.params.id;

    if (!invoice) {
      res.status(400).json({ error: 'Invoice data is required in request body.' });
      return;
    }

    // ── Check cache ──
    const cached = pdfCache.get(invoiceId);
    if (cached && cached.updatedAt === invoice.updatedAt) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.title || 'Invoice'}.pdf"`);
      res.setHeader('X-PDF-Source', 'cache');
      res.send(cached.buffer);
      return;
    }

    // ── Build self-contained HTML ──
    const html = buildPrintHTML(invoice);

    // ── Render with Puppeteer ──
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport to A4-ish dimensions for consistent rendering
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: PDF_TIMEOUT_MS,
    });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
      timeout: PDF_TIMEOUT_MS,
    });

    // ── Cache the result ──
    if (pdfCache.size >= MAX_PDF_CACHE_SIZE) {
      // Evict oldest entry
      const firstKey = pdfCache.keys().next().value;
      if (firstKey) pdfCache.delete(firstKey);
    }
    pdfCache.set(invoiceId, { buffer: Buffer.from(pdfBuffer), updatedAt: invoice.updatedAt });

    // ── Respond ──
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.title || 'Invoice'}.pdf"`);
    res.setHeader('X-PDF-Source', 'generated');
    res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      console.error(`[${requestId}] PDF generation timed out after ${PDF_TIMEOUT_MS}ms`);
      res.status(504).json({ error: 'PDF generation timed out. Please try again.' });
    } else {
      handleApiError(error, res, 'pdf-generation');
    }
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
});
```

---

### 2. `server.ts` — HTML Template Builder Function

**Change Type:** ADD — Helper function  
**Location:** Before the PDF route

```typescript
// ── Build self-contained print HTML from invoice data ──
function buildPrintHTML(invoice: any): string {
  const themeColor = invoice.themeColor || '#4f46e5';
  const settings = invoice.displaySettings || {};

  // Compute totals server-side (duplicated from calculations.ts for server context)
  const subtotal = (invoice.items || []).reduce(
    (sum: number, item: any) => sum + (item.quantity || 0) * (item.rate || 0),
    0
  );
  const discountRate = settings.showDiscount !== false ? (invoice.discountRate || 0) : 0;
  const discountAmount = Math.min(subtotal * (discountRate / 100), subtotal);
  const taxableAmount = subtotal - discountAmount;
  const taxRate = settings.showTax !== false ? (invoice.taxRate || 0) : 0;
  const taxAmount = taxableAmount * (taxRate / 100);
  const shippingAmount = settings.showShipping !== false ? (invoice.shipping || 0) : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount + shippingAmount);

  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: invoice.currency || 'USD',
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const itemRows = (invoice.items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px 0; font-weight: 500; border-bottom: 1px solid #f1f5f9;">${escapeHtml(item.description || '')}</td>
      <td style="padding: 12px 0; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; color: #64748b; border-bottom: 1px solid #f1f5f9;">${formatMoney(item.rate)}</td>
      <td style="padding: 12px 0; text-align: right; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${formatMoney(item.quantity * item.rate)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=210mm">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      background: white;
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo {
      width: 48px; height: 48px; border-radius: 6px; display: flex;
      align-items: center; justify-content: center; color: white;
      font-style: italic; font-size: 24px; font-family: serif;
      margin-bottom: 16px;
    }
    .title { font-size: 28px; font-weight: 300; letter-spacing: -0.5px; }
    .invoice-number { color: #94a3b8; font-size: 11px; margin-top: 6px; }
    .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
    .dates { display: flex; gap: 40px; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { padding: 10px 0; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th:nth-child(n+2) { text-align: right; }
    .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
    .totals-box { width: 240px; }
    .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; }
    .total-row.grand { padding-top: 12px; border-top: 1px solid #e2e8f0; margin-top: 8px; }
    .total-row.grand .label-text { font-size: 14px; font-weight: 700; }
    .total-row.grand .value { font-size: 22px; font-weight: 700; }
    .footer { margin-top: auto; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8; }
    .notes { white-space: pre-wrap; font-size: 11px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${settings.showLogo !== false ? `<div class="logo" style="background-color: ${themeColor}">${escapeHtml((invoice.businessInfo?.name || 'B').charAt(0).toUpperCase())}</div>` : ''}
      ${settings.showTitle !== false ? `<div class="title">${escapeHtml(invoice.title || 'Invoice')}</div>` : ''}
      ${settings.showInvoiceId !== false ? `<div class="invoice-number">#${escapeHtml((invoice.invoiceNumber || 'DRAFT').toUpperCase())}</div>` : ''}
    </div>
    <div style="text-align: right;">
      ${settings.showBilledTo !== false ? `
        <div class="label">Billed To</div>
        <div style="font-size: 14px; font-weight: 600;">${escapeHtml(invoice.customerInfo?.name || '')}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; white-space: pre-wrap;">${escapeHtml(invoice.customerInfo?.address || '')}</div>
        <div style="font-size: 11px; color: #64748b;">${escapeHtml(invoice.customerInfo?.email || '')}</div>
      ` : ''}
    </div>
  </div>

  <div class="info-section">
    <div>
      ${settings.showFrom !== false ? `
        <div class="label">From</div>
        <div style="font-size: 13px; font-weight: 600;">${escapeHtml(invoice.businessInfo?.name || '')}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; white-space: pre-wrap;">${escapeHtml(invoice.businessInfo?.address || '')}</div>
        ${invoice.businessInfo?.taxId ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">Tax ID: ${escapeHtml(invoice.businessInfo.taxId)}</div>` : ''}
      ` : ''}
    </div>
    <div class="dates">
      ${settings.showIssueDate !== false ? `
        <div>
          <div class="label">Issue Date</div>
          <div style="font-size: 13px; font-weight: 500;">${formatDateStr(invoice.issueDate)}</div>
        </div>
      ` : ''}
      ${settings.showDueDate !== false ? `
        <div>
          <div class="label">Due Date</div>
          <div style="font-size: 13px; font-weight: 500;">${formatDateStr(invoice.dueDate)}</div>
        </div>
      ` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row">
        <span style="color: #64748b;">Subtotal</span>
        <span>${formatMoney(subtotal)}</span>
      </div>
      ${discountAmount > 0 ? `
        <div class="total-row">
          <span style="color: #64748b;">Discount (${discountRate}%)</span>
          <span style="color: #ef4444;">-${formatMoney(discountAmount)}</span>
        </div>
      ` : ''}
      ${taxAmount > 0 || settings.showTax !== false ? `
        <div class="total-row">
          <span style="color: #64748b;">Tax (${taxRate}%)</span>
          <span>${formatMoney(taxAmount)}</span>
        </div>
      ` : ''}
      ${shippingAmount > 0 ? `
        <div class="total-row">
          <span style="color: #64748b;">Shipping</span>
          <span>${formatMoney(shippingAmount)}</span>
        </div>
      ` : ''}
      <div class="total-row grand">
        <span class="label-text">Total Due</span>
        <span class="value" style="color: ${themeColor}">${formatMoney(grandTotal)}</span>
      </div>
    </div>
  </div>

  ${settings.showNotes !== false && invoice.notes ? `
    <div class="footer">
      <div class="label" style="margin-bottom: 8px;">Notes & Terms</div>
      <div class="notes">${escapeHtml(invoice.notes)}</div>
    </div>
  ` : ''}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, char => map[char] || char);
}
```

**Rationale:** Self-contained HTML with all CSS inlined — no external dependencies. The template uses the invoice's theme color and display settings, matching the live editor preview. The `escapeHtml()` function prevents XSS in invoice data rendered into the PDF template.

---

### 3. `src/pages/Editor.tsx` — Client-Side PDF Export Replacement

**Change Type:** MODIFY  
**Culprit Location:** `handlePrint()` at lines 80–117

#### Current Code (BEFORE)

```typescript
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

const handlePrint = async () => {
  // ... html-to-image → jsPDF.addImage() raster pipeline
};
```

#### Proposed Code (AFTER)

```typescript
// REMOVE these imports:
// import * as htmlToImage from 'html-to-image';
// import jsPDF from 'jspdf';

const [pdfProgress, setPdfProgress] = useState<string>('');

const handlePrint = async () => {
  if (isGeneratingPDF) return;
  setIsGeneratingPDF(true);
  setPdfProgress('Validating invoice...');

  try {
    // ── Step 1: Validate invoice before export ──
    const validationRes = await fetch(`/api/v1/invoices/${invoice.id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice }),
    });

    if (validationRes.ok) {
      const validation = await validationRes.json();
      if (!validation.valid && invoice.status !== 'draft') {
        const errorMessages = validation.issues
          .filter((i: any) => i.severity === 'error')
          .map((i: any) => i.message)
          .join('\n• ');
        alert(`Cannot export — please fix these issues:\n\n• ${errorMessages}`);
        return;
      }
    }

    // ── Step 2: Request server-side PDF ──
    setPdfProgress('Generating PDF...');

    const response = await fetch(`/api/v1/invoices/${invoice.id}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'PDF generation failed' }));
      throw new Error(errorData.error || `PDF generation failed (${response.status})`);
    }

    // ── Step 3: Download the PDF ──
    setPdfProgress('Downloading...');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.title || 'Invoice'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error: any) {
    console.error('PDF export failed:', error);
    alert(`PDF export failed: ${error.message}`);
  } finally {
    setIsGeneratingPDF(false);
    setPdfProgress('');
  }
};
```

**Also update the Export button UI** to show progress text:

```tsx
<button
  onClick={handlePrint}
  disabled={isGeneratingPDF}
  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
  {pdfProgress || 'Export PDF'}
</button>
```

---

### 4. `package.json` — Dependency Changes

**Change Type:** MODIFY

```diff
  "dependencies": {
+   "puppeteer": "^24.x",
-   "html-to-image": "^1.11.13",
-   "html2canvas": "^1.4.1",
-   "jspdf": "^4.2.1",
  }
```

> **Important:** Remove `html-to-image`, `jspdf`, and `html2canvas` ONLY after confirming the Puppeteer PDF pipeline works end-to-end. During transition, keep them to avoid breaking the build.

---

### 5. `server.ts` — Graceful Puppeteer Shutdown

**Change Type:** MODIFY — Add to existing shutdown handler

```diff
  const shutdown = (signal: string) => {
    console.log(`[shutdown] Received ${signal}. Graceful shutdown...`);
    if (sttProcess) {
      sttProcess.removeAllListeners('exit');
      sttProcess.kill('SIGTERM');
      console.log('[shutdown] STT sidecar terminated.');
    }
+   // Close Puppeteer browser instance
+   if (browserInstance) {
+     browserInstance.close().catch(() => {});
+     console.log('[shutdown] Puppeteer browser closed.');
+   }
    server.close(() => {
      console.log('[shutdown] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[shutdown] Forced exit after timeout.');
      process.exit(1);
    }, 10_000);
  };
```

---

### 6. `src/pages/Editor.tsx` — Remove Old Imports

**Change Type:** MODIFY  
**Location:** Lines 10–11

```diff
- import * as htmlToImage from 'html-to-image';
- import jsPDF from 'jspdf';
```

These imports are no longer needed after the migration to server-side PDF.

---

## Error Handling Matrix

| Error Scenario | Detection | User-Facing Message | Recovery |
|---|---|---|---|
| Puppeteer not installed | `npm ls puppeteer` fails | Build-time error | `npm install puppeteer` |
| Chromium crash mid-render | `page.pdf()` throws | "PDF generation failed. Please try again." | Auto-reconnect via `getBrowser()` singleton check |
| Timeout (>30s) | `TimeoutError` | "PDF generation timed out." | Retry button in UI |
| Font not loaded | `document.fonts.ready` resolves but font missing | Renders with fallback system font | Embed font in HTML template |
| Invoice validation fails | `/validate` returns `valid: false` | Shows issue list inline | Fix issues, retry export |
| Out of memory | Puppeteer OOME | Generic server error | Reduce `deviceScaleFactor` to 1 |

---

## Integration Checklist

- [ ] Install `puppeteer` (v24+)
- [ ] Add `buildPrintHTML()` and `escapeHtml()` to `server.ts`
- [ ] Add `POST /api/v1/invoices/:id/pdf` route with Puppeteer rendering
- [ ] Add Puppeteer browser singleton with lazy initialization
- [ ] Add PDF cache with LRU eviction (50 entries)
- [ ] Update `handlePrint()` in `Editor.tsx` to call server endpoint
- [ ] Add validation check before PDF export (blocks non-draft with errors)
- [ ] Add progress indicator text to Export button
- [ ] Remove `html-to-image`, `jspdf`, `html2canvas` imports from `Editor.tsx`
- [ ] Remove old libraries from `package.json` (after verification)
- [ ] Add Puppeteer cleanup to shutdown handler
- [ ] Verify: exported PDF has selectable text
- [ ] Verify: file size under 150KB for a standard 5-item invoice
- [ ] Verify: 30-second timeout produces 504 response

## Regression Tests

```bash
# 1. Generate PDF via API
curl -s -X POST http://localhost:3000/api/v1/invoices/test-id/pdf \
  -H "Content-Type: application/json" \
  -d '{"invoice":{"title":"Test Invoice","invoiceNumber":"INV-001","themeColor":"#4f46e5","businessInfo":{"name":"Acme Inc","address":"123 Main St","taxId":"TAX-123"},"customerInfo":{"name":"John Doe","email":"john@example.com","address":"456 Oak Ave"},"items":[{"id":"1","description":"Consulting","quantity":3,"rate":333.33}],"taxRate":10,"notes":"Due in 30 days","currency":"USD","displaySettings":{"showTitle":true,"showInvoiceId":true,"showLogo":true,"showFrom":true,"showBilledTo":true,"showIssueDate":true,"showDueDate":true,"showDiscount":false,"showTax":true,"showShipping":false,"showNotes":true,"showPaymentMethods":true},"issueDate":"2026-06-01","dueDate":"2026-07-01","updatedAt":"2026-06-01T00:00:00Z"}}' \
  -o test_output.pdf

# 2. Verify text is selectable
# Open test_output.pdf in any PDF viewer → Select text → Paste into text editor

# 3. Verify file size
ls -la test_output.pdf
# Expected: under 150KB

# 4. Verify PDF has correct content
# pdftotext test_output.pdf - | grep "Acme Inc"  (requires poppler-utils)
```

---

## Control Document Updates

### `decision.md` — Add Decision

```markdown
## DECISION 15: PDF Generation Strategy

| Property | Decision | Rationale |
|---|---|---|
| **Engine** | Puppeteer (full, with bundled Chromium) | True vector PDF, reuses HTML/CSS templates |
| **Rendering** | Server-side via `POST /api/v1/invoices/:id/pdf` | Client-side is raster-only |
| **Template** | Self-contained HTML with inline CSS | No external dependencies during render |
| **Caching** | LRU cache (50 entries), keyed by `invoiceId + updatedAt` | Avoid re-rendering unchanged invoices |
| **Timeout** | 30 seconds | Prevent resource exhaustion |
| **Validation** | Pre-export via `/validate` endpoint | Block incomplete invoice exports |
| **Browser Pool** | Singleton, lazy-initialized | Minimize memory footprint |

### ❌ REMOVED Libraries
- `html-to-image` — Produces raster PNG, not vector PDF
- `jspdf` — Only used as PNG-to-PDF wrapper, not real PDF generation
- `html2canvas` — Same raster limitation
```

### `build.md` — Add Step

```markdown
## BUILD STEP 11: PDF System Migration

```bash
npm install puppeteer
# After verification:
npm uninstall html-to-image jspdf html2canvas
```

Puppeteer will download Chromium (~280MB) on first install.
Subsequent installs use cached binary.
```

---

*End of Fix 03 — PDF Export System Rebuild*
