# Fix 02 — Financial Integrity & Decimal Migration

> **Priority:** 🔴 CRITICAL — Must be implemented before Fix-04 and Fix-05  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 30 minutes  
> **Dependencies:** None — independent foundation layer

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| C-08 | Floating-Point Arithmetic for All Financial Values | 🔴 Critical |
| C-10 | Tax Calculation Discrepancy Between Edit and Preview | 🔴 Critical |
| H-06 | `currency` Field Has No Validation — RangeError Risk | 🟠 High |
| H-09 | `invoice.id` Used as Display Field — PK Corruption Risk | 🟠 High |
| H-14 | `discountContent` Field — Semantically Undefined | 🟠 High |

## Prerequisites

- None. This fix is independently executable.

## Dependencies to Install

```bash
npm install decimal.js
npm install -D @types/decimal.js
```

> **Note:** `decimal.js` v10+ ships its own TypeScript declarations. The `@types/decimal.js` package may not be needed — verify after install.

---

## Implementation

### 1. `src/lib/calculations.ts` — Decimal.js Migration

**Change Type:** REPLACE ENTIRE FILE  
**Culprit Location:** All calculation functions use native `number` (IEEE 754)

#### Current Code (BEFORE) — Critical Bug

```typescript
export const calculateSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  // ← 0.1 + 0.2 = 0.30000000000000004
};
```

**Symptom:** Invoice for 3 × $333.33 displays `$999.9900000000001`

#### Proposed Code (AFTER)

```typescript
import Decimal from 'decimal.js';
import { Invoice, InvoiceItem } from '../types';

// ── Configure Decimal.js for financial precision ──
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

// ── Base calculation functions (Decimal internally, number at boundaries) ──

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  const result = items.reduce(
    (sum, item) => sum.plus(new Decimal(item.quantity).times(new Decimal(item.rate))),
    new Decimal(0)
  );
  return result.toDecimalPlaces(2).toNumber();
};

export const calculateDiscount = (subtotal: number, discountRate: number = 0): number => {
  const sub = new Decimal(subtotal);
  const rate = new Decimal(discountRate).dividedBy(100);
  const discount = sub.times(rate);
  // Cap discount so it can never exceed subtotal
  return Decimal.min(discount, sub).toDecimalPlaces(2).toNumber();
};

export const calculateTax = (amountToTax: number, taxRate: number): number => {
  const amount = new Decimal(amountToTax);
  const rate = new Decimal(taxRate).dividedBy(100);
  return amount.times(rate).toDecimalPlaces(2).toNumber();
};

export const calculateTotal = (
  subtotal: number,
  tax: number,
  discount: number = 0,
  shipping: number = 0
): number => {
  const sub = new Decimal(subtotal);
  const disc = Decimal.min(new Decimal(discount), sub);
  const total = sub.minus(disc).plus(new Decimal(tax)).plus(new Decimal(shipping));
  return Decimal.max(total, new Decimal(0)).toDecimalPlaces(2).toNumber();
};

// ── Single source-of-truth calculation ──
// Used by EditableInvoice, InvoicePreview, AND Dashboard.

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

export function computeInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = calculateSubtotal(invoice.items);

  const settings = invoice.displaySettings;

  // Discount (only if showDiscount is enabled)
  const actualDiscountRate = settings?.showDiscount ? (invoice.discountRate || 0) : 0;
  const discountAmount = calculateDiscount(subtotal, actualDiscountRate);

  // Tax is applied AFTER discount (correct behavior)
  const taxableAmount = new Decimal(subtotal)
    .minus(new Decimal(discountAmount))
    .toDecimalPlaces(2)
    .toNumber();
  const actualTaxRate = settings?.showTax ? invoice.taxRate : 0;
  const taxAmount = calculateTax(taxableAmount, actualTaxRate);

  // Shipping
  const shippingAmount = settings?.showShipping ? (invoice.shipping || 0) : 0;

  // Grand total with floor at 0
  const grandTotal = calculateTotal(subtotal, taxAmount, discountAmount, shippingAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shippingAmount,
    grandTotal,
  };
}
```

**Rationale:** All intermediate multiplication and division happens in `Decimal` space. The `toDecimalPlaces(2).toNumber()` boundary conversion happens only at the final output step, ensuring all downstream consumers (formatCurrency, display, serialization) receive clean numbers. The `InvoiceTotals` interface retains `number` type for API compatibility — Decimal precision is enforced internally.

**Critical Math Verification:**
```
3 × $333.33:
  Decimal: new Decimal(3).times(new Decimal(333.33)) = Decimal(999.99)
  .toDecimalPlaces(2).toNumber() = 999.99 ✅

  Native JS: 3 * 333.33 = 999.9900000000001 ❌
```

---

### 2. `src/lib/utils.ts` — Currency Validation Guard

**Change Type:** MODIFY  
**Culprit Location:** `formatCurrency()` at lines 13–18

#### Current Code (BEFORE) — RangeError Risk

```typescript
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
  // ← 'XXXXX' throws RangeError: Invalid currency code
}
```

#### Proposed Code (AFTER)

```typescript
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../types';
import Decimal from 'decimal.js';

export function formatCurrency(amount: number | Decimal, currency: string = 'USD'): string {
  // Convert Decimal to number if needed
  const numericAmount = amount instanceof Decimal ? amount.toNumber() : amount;

  // Validate currency code against supported list
  const validCurrency: string = (SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
    ? currency
    : (() => {
        console.warn(`[formatCurrency] Invalid currency code "${currency}" — falling back to USD.`);
        return 'USD';
      })();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency,
    }).format(numericAmount);
  } catch (err) {
    // Final safety net for any Intl.NumberFormat edge case
    console.warn(`[formatCurrency] Intl.NumberFormat failed for "${validCurrency}":`, err);
    return `$${numericAmount.toFixed(2)}`;
  }
}
```

**Rationale:** Two-layer defense: (1) validate against `SUPPORTED_CURRENCIES` allowlist before calling `Intl.NumberFormat`, (2) catch any remaining `RangeError` with a plain-text fallback. The function now also accepts `Decimal` instances directly.

---

### 3. `src/types.ts` — Currency Field Type Update

**Change Type:** MODIFY  
**Culprit Location:** `Invoice.currency` at line 80

#### Current Code (BEFORE)

```typescript
currency: string; // Kept as string for backward compat; new invoices use CurrencyCode
```

#### Proposed Approach

```typescript
currency: CurrencyCode | string; // Accept CurrencyCode for new invoices; string for backward compat
```

> **Architecture Note:** We do NOT change this to strict `CurrencyCode` because existing invoices in localStorage may have arbitrary string values. The validation happens at the `formatCurrency()` boundary (see Section 2). The type union documents intent without breaking deserialization.

**Migration Helper for existing data:**

```typescript
// Add to src/lib/utils.ts or a new src/lib/migration.ts

import { SUPPORTED_CURRENCIES, CurrencyCode } from '../types';

export function migrateCurrencyField(currency: string): CurrencyCode {
  if ((SUPPORTED_CURRENCIES as readonly string[]).includes(currency)) {
    return currency as CurrencyCode;
  }
  console.warn(`[migration] Unknown currency "${currency}" found in stored invoice — defaulting to USD.`);
  return 'USD';
}
```

---

### 4. Verification: C-10 — Tax Calculation Consistency

**Status:** ✅ VERIFIED — Both components use centralized function

**EditableInvoice.tsx line 34:**
```typescript
const totals = computeInvoiceTotals(invoice);
```

**InvoicePreview.tsx line 13:**
```typescript
const totals = computeInvoiceTotals(invoice);
```

**Dashboard.tsx line 233:**
```typescript
{formatCurrency(computeInvoiceTotals(invoice).grandTotal, invoice.currency)}
```

**Inline tax calculation search:**
```bash
grep -n "taxRate / 100\|* invoice.taxRate\|taxRate \*" src/components/EditableInvoice.tsx src/components/InvoicePreview.tsx src/pages/Dashboard.tsx
# Expected: 0 results — all tax math is inside computeInvoiceTotals()
```

All three consumer files import and use `computeInvoiceTotals()` from `calculations.ts`. No inline reimplementation exists.

---

### 5. `src/pages/Dashboard.tsx` — Replace `invoice.id` with `invoiceNumber`

**Change Type:** MODIFY  
**Culprit Location:** Line 224

#### Current Code (BEFORE)

```tsx
<p className="text-xs text-zinc-500 font-mono mt-1">ID: {invoice.id}</p>
```

#### Proposed Code (AFTER)

```tsx
<p className="text-xs text-zinc-500 font-mono mt-1">#: {invoice.invoiceNumber}</p>
```

**Rationale:** The `id` field is an internal UUID primary key. The `invoiceNumber` field (e.g., `INV-LXR5Q`) is the user-facing display reference. Showing a UUID on a dashboard card is confusing and leaks internal system design.

---

### 6. `src/components/InvoicePreview.tsx` — Remove `invoice.id` Fallback

**Change Type:** MODIFY  
**Culprit Location:** Line 25

#### Current Code (BEFORE)

```tsx
<p className="text-slate-400 text-xs mt-1">#{(invoice.invoiceNumber || invoice.id).toUpperCase()}</p>
```

#### Proposed Code (AFTER)

```tsx
<p className="text-slate-400 text-xs mt-1">#{(invoice.invoiceNumber || 'DRAFT').toUpperCase()}</p>
```

**Rationale:** If `invoiceNumber` is somehow empty, showing a UUID as a fallback is worse than showing "DRAFT". The `invoiceNumber` is auto-generated at invoice creation time (`INV-${Date.now().toString(36).toUpperCase()}`), so this fallback should rarely trigger.

---

### 7. `src/pages/Editor.tsx` — Footer Display Fix

**Change Type:** MODIFY  
**Culprit Location:** Line 197

#### Current Code (BEFORE)

```tsx
<span className="text-zinc-500 hidden sm:inline">Project ID: {invoice.id}</span>
```

#### Proposed Code (AFTER)

```tsx
<span className="text-zinc-500 hidden sm:inline">Invoice: {invoice.invoiceNumber}</span>
```

---

### 8. Verification: H-14 — `discountContent` Removed

**Status:** ✅ VERIFIED — Field does not exist in codebase

```bash
grep -rn "discountContent" src/
# Expected output:
# src/types.ts:73:  discountType?: DiscountType;   // Issue 2.3: Replaced discountContent
#
# This is a COMMENT referencing the replacement — not a field definition or usage.
```

The `Invoice` interface at `src/types.ts` lines 73–75 uses:
```typescript
discountType?: DiscountType;   // Issue 2.3: Replaced discountContent
discountRate?: number;
discountLabel?: string;        // Issue 2.3: Optional display label
```

No component reads or writes `discountContent`. Confirmed clean.

---

## Integration Checklist

- [ ] Install `decimal.js` (v10+)
- [ ] Replace entire `src/lib/calculations.ts` with Decimal-based implementation
- [ ] Update `formatCurrency()` in `src/lib/utils.ts` with validation guard and `Decimal` support
- [ ] Update `Invoice.currency` type annotation in `src/types.ts`
- [ ] Dashboard.tsx line 224: `ID: {invoice.id}` → `#: {invoice.invoiceNumber}`
- [ ] InvoicePreview.tsx line 25: Remove `invoice.id` fallback → use `'DRAFT'`
- [ ] Editor.tsx line 197: `Project ID: {invoice.id}` → `Invoice: {invoice.invoiceNumber}`
- [ ] Verify: `grep -rn "discountContent" src/` returns only comments
- [ ] Verify: `3 × 333.33 = 999.99` (not `999.9900000000001`)
- [ ] Verify: `formatCurrency(100, 'INVALID')` → `$100.00` with console warning
- [ ] Verify: No inline `taxRate / 100` in EditableInvoice, InvoicePreview, or Dashboard

## Regression Tests

```typescript
// ── Manual verification in browser console ──

// Test 1: Decimal precision
import { calculateSubtotal } from './lib/calculations';
const items = [
  { id: '1', description: 'A', quantity: 3, rate: 333.33 },
];
console.assert(calculateSubtotal(items) === 999.99, 'FAIL: 3×333.33 should be exactly 999.99');

// Test 2: Edge case — 0.1 + 0.2
const items2 = [
  { id: '1', description: 'A', quantity: 1, rate: 0.1 },
  { id: '2', description: 'B', quantity: 1, rate: 0.2 },
];
console.assert(calculateSubtotal(items2) === 0.3, 'FAIL: 0.1+0.2 should be exactly 0.3');

// Test 3: Currency fallback
import { formatCurrency } from './lib/utils';
const result = formatCurrency(100, 'XXXXX');
console.assert(result === '$100.00', 'FAIL: Invalid currency should fallback to USD');

// Test 4: Decimal input to formatCurrency
import Decimal from 'decimal.js';
const dec = new Decimal('999.99');
console.assert(formatCurrency(dec, 'USD') === '$999.99', 'FAIL: Decimal input not supported');
```

---

## Control Document Updates

### `context.md` — Update Section 4.2

```markdown
| `src/lib/calculations.ts` | Financial math — **Decimal.js** (subtotal, tax, discount, total) |
```

### `decision.md` — Add Decision

```markdown
## DECISION 14: Financial Arithmetic Library

| Property | Decision | Rationale |
|---|---|---|
| **Library** | `decimal.js` v10+ | Arbitrary-precision decimal arithmetic |
| **Precision** | 20 significant digits | Exceeds any currency requirement |
| **Rounding** | `ROUND_HALF_UP` | Standard banker's rounding |
| **Boundary** | `toDecimalPlaces(2).toNumber()` at output | Keep API compatibility (number type) |
| **Interface** | `InvoiceTotals` uses `number` | Decimal is internal implementation detail |

### ❌ REJECTED ALTERNATIVES

| Alternative | Why Rejected |
|---|---|
| `big.js` | Smaller API surface, but `decimal.js` has better TS support and is more battle-tested |
| `dinero.js` | Over-engineered for our use case; adds money-specific concepts we don't need |
| Native `BigInt` | Cannot represent decimals; would require integer-cents representation throughout |
| `toFixed(2)` | String-based, doesn't fix intermediate calculation errors |
```

### `build.md` — Add Step

```markdown
## BUILD STEP 10: Install Decimal.js

```bash
npm install decimal.js
```

No additional configuration required. Decimal.js ships with TypeScript declarations.
```

### `diff.md` — Add Section

```markdown
## 9. Financial Integrity — Decimal Migration

### Files Modified
- `src/lib/calculations.ts` — ALL functions migrated to Decimal.js internals
- `src/lib/utils.ts` — `formatCurrency()` now validates currency codes, accepts `Decimal|number`
- `src/types.ts` — `currency` field type annotation updated
- `src/pages/Dashboard.tsx` — `invoice.id` → `invoice.invoiceNumber` display
- `src/components/InvoicePreview.tsx` — Remove `invoice.id` fallback
- `src/pages/Editor.tsx` — Footer display uses `invoiceNumber`

### Dependencies Added
- `decimal.js` ^10.x
```

---

*End of Fix 02 — Financial Integrity & Decimal Migration*
