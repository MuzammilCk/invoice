# Fix 05 — State Persistence Architecture

> **Priority:** 🔴 CRITICAL — Core data layer  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 75 minutes  
> **Dependencies:** Fix-01 (auth), Fix-02 (types/currency)

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| C-03 | Data Loss — localStorage Is the Only Persistence Layer | 🔴 Critical |
| H-05 | Zustand Store Has No Cloud Sync — Pure Browser State | 🟠 High |
| H-08 | `undo()` / `redo()` Not Bounded — Memory Overflow Risk | 🟠 High |
| H-10 | No Audit Trail — Zero Traceability for Changes | 🟠 High |
| I-08 | No Invoice Sharing (Read-Only Link) | 🔵 Intelligence |
| I-09 | No Recurring Invoice Scheduling | 🔵 Intelligence |

## Prerequisites

- **Fix-01** implemented (JWT auth for user-scoped data)
- **Fix-02** implemented (CurrencyCode type for schema)
- Supabase project created with connection string

## Dependencies to Install

```bash
npm install @supabase/supabase-js
```

---

## Architecture Decision

### Why Supabase?

| Dimension | localStorage (current) | Supabase (proposed) |
|---|---|---|
| **Capacity** | 5–10MB | Unlimited (PostgreSQL) |
| **Device Sync** | None | Real-time across devices |
| **Data Safety** | Lost on cache clear | Persistent, backed up |
| **Auth Integration** | None | Built-in (or JWT compat) |
| **Audit Trail** | None | `audit_logs` table with triggers |
| **Sharing** | Impossible | Share tokens + RLS |
| **Offline** | Always works | localStorage cache + sync on reconnect |

### Persistence Strategy: Hybrid (Local + Cloud)

```
User edits invoice → Zustand state update
                    ↓
         localStorage (instant) — debounce 2s — Supabase sync
                                                   ↓
                                          Real-time subscription
                                                   ↓
                                        Other devices get update
```

---

## Implementation

### 1. `db/schema.sql` — Complete Supabase Schema (NEW FILE)

**Change Type:** NEW FILE  
**Location:** `d:\projects\invoice\db\schema.sql`

```sql
-- ════════════════════════════════════════════════
-- AI Invoice Studio — Supabase Schema
-- Version: 1.0 — June 2026
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════

-- ── Enable UUID generation ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Custom types ──
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE audit_action AS ENUM ('created', 'updated', 'deleted', 'exported', 'shared', 'status_changed');
CREATE TYPE share_access AS ENUM ('view', 'comment', 'edit');
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually');

-- ════════════════════════════════════════════════
-- USERS (mirrors Supabase Auth or standalone JWT)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  business_name TEXT DEFAULT '',
  business_address TEXT DEFAULT '',
  business_tax_id TEXT DEFAULT '',
  default_currency TEXT DEFAULT 'USD',
  default_tax_rate NUMERIC(5,2) DEFAULT 0,
  default_template_id TEXT DEFAULT 'minimal-executive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════
-- CUSTOMERS (extracted from invoices for reuse)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

CREATE INDEX idx_customers_user_id ON customers(user_id);

-- ════════════════════════════════════════════════
-- INVOICES
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Display fields
  invoice_number TEXT NOT NULL,
  title TEXT DEFAULT 'Invoice',
  status invoice_status DEFAULT 'draft',

  -- Financial
  currency TEXT DEFAULT 'USD',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  discount_rate NUMERIC(5,2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  discount_label TEXT DEFAULT '',
  shipping NUMERIC(10,2) DEFAULT 0,

  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),

  -- Content
  notes TEXT DEFAULT '',
  template_id TEXT DEFAULT 'minimal-executive',
  theme_color TEXT DEFAULT '#4f46e5',

  -- Business info (snapshot at invoice creation time)
  business_name TEXT DEFAULT '',
  business_address TEXT DEFAULT '',
  business_tax_id TEXT DEFAULT '',

  -- Customer info (snapshot)
  customer_name TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',

  -- Display settings (JSON for flexibility)
  display_settings JSONB DEFAULT '{
    "showTitle": true, "showInvoiceId": true, "showLogo": true,
    "showFrom": true, "showBilledTo": true, "showIssueDate": true,
    "showDueDate": true, "showDiscount": true, "showTax": true,
    "showShipping": true, "showNotes": true, "showPaymentMethods": true
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  UNIQUE(user_id, invoice_number)
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════
-- INVOICE ITEMS (line items)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(10,4) NOT NULL DEFAULT 1,
  rate NUMERIC(12,4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ════════════════════════════════════════════════
-- AUDIT LOGS (H-10)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_invoice_id ON audit_logs(invoice_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ════════════════════════════════════════════════
-- SHARE TOKENS (I-08)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  access_level share_access DEFAULT 'view',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_invoice_id ON share_tokens(invoice_id);

-- ════════════════════════════════════════════════
-- RECURRING SCHEDULES (I-09)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly',
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  auto_send BOOLEAN DEFAULT false,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_schedules_user_id ON recurring_schedules(user_id);
CREATE INDEX idx_recurring_schedules_next_run ON recurring_schedules(next_run_at) WHERE is_active = true;

-- ════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own ON users FOR ALL USING (id = auth.uid());
CREATE POLICY customers_own ON customers FOR ALL USING (user_id = auth.uid());
CREATE POLICY invoices_own ON invoices FOR ALL USING (user_id = auth.uid());
CREATE POLICY invoice_items_own ON invoice_items FOR ALL USING (
  invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
);
CREATE POLICY audit_logs_own ON audit_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY share_tokens_own ON share_tokens FOR ALL USING (user_id = auth.uid());
CREATE POLICY recurring_schedules_own ON recurring_schedules FOR ALL USING (user_id = auth.uid());

-- ════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create audit log on invoice changes
CREATE OR REPLACE FUNCTION log_invoice_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, invoice_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'created', '{}');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, invoice_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'updated', jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) ->> key IS DISTINCT FROM to_jsonb(OLD) ->> key
          AND key NOT IN ('updated_at')
      )
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_audit_trigger
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_invoice_change();
```

---

### 2. `src/lib/supabase.ts` — Supabase Client (NEW FILE)

**Change Type:** NEW FILE

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not set. Cloud sync disabled.');
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
```

---

### 3. `src/store/useStore.ts` — Cloud Sync Integration

**Change Type:** MODIFY (extensive)  
**Culprit Location:** Entire store definition

#### Key Additions

```typescript
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ── New state properties ──
interface StoreState {
  // ... existing state ...

  // Sync state
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  syncError: string | null;

  // Actions
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  setSyncStatus: (status: StoreState['syncStatus']) => void;
}

// ── Debounced sync helper ──
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSync(syncFn: () => Promise<void>, delayMs = 2000) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await syncFn();
    } catch (err) {
      console.error('[sync] Debounced sync failed:', err);
    }
  }, delayMs);
}
```

#### Proposed `syncToCloud` Action

```typescript
syncToCloud: async () => {
  if (!isSupabaseConfigured() || !supabase) {
    set({ syncStatus: 'offline' });
    return;
  }

  set({ syncStatus: 'syncing' });

  try {
    const state = get();
    const invoices = state.invoices;

    // Upsert each invoice
    for (const invoice of invoices) {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .upsert({
          id: invoice.id,
          user_id: (state as any).userId || 'local',
          invoice_number: invoice.invoiceNumber,
          title: invoice.title || 'Invoice',
          status: invoice.status || 'draft',
          currency: invoice.currency,
          tax_rate: invoice.taxRate,
          discount_rate: invoice.discountRate || 0,
          discount_type: invoice.discountType || 'percentage',
          shipping: invoice.shipping || 0,
          issue_date: invoice.issueDate,
          due_date: invoice.dueDate,
          notes: invoice.notes,
          template_id: invoice.templateId,
          theme_color: invoice.themeColor,
          business_name: invoice.businessInfo.name,
          business_address: invoice.businessInfo.address,
          business_tax_id: invoice.businessInfo.taxId,
          customer_name: invoice.customerInfo.name,
          customer_email: invoice.customerInfo.email,
          customer_address: invoice.customerInfo.address,
          display_settings: invoice.displaySettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (invoiceError) throw invoiceError;

      // Upsert line items (delete-and-reinsert for simplicity)
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (invoice.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoice.items.map((item, index) => ({
            id: item.id,
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            sort_order: index,
          })));

        if (itemsError) throw itemsError;
      }
    }

    set({
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
    });
  } catch (err: any) {
    console.error('[sync] Cloud sync failed:', err);
    set({
      syncStatus: 'error',
      syncError: err.message || 'Sync failed',
    });
  }
},
```

#### Proposed `loadFromCloud` Action

```typescript
loadFromCloud: async () => {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    set({ syncStatus: 'syncing' });

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (invoices && invoices.length > 0) {
      const mapped = invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        title: inv.title,
        status: inv.status,
        currency: inv.currency,
        taxRate: parseFloat(inv.tax_rate),
        discountRate: parseFloat(inv.discount_rate),
        discountType: inv.discount_type,
        shipping: parseFloat(inv.shipping),
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        notes: inv.notes,
        templateId: inv.template_id,
        themeColor: inv.theme_color,
        businessInfo: {
          name: inv.business_name,
          address: inv.business_address,
          taxId: inv.business_tax_id,
        },
        customerInfo: {
          name: inv.customer_name,
          email: inv.customer_email,
          address: inv.customer_address,
        },
        displaySettings: inv.display_settings,
        items: (inv.invoice_items || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
          })),
        updatedAt: inv.updated_at,
        createdAt: inv.created_at,
      }));

      set({
        invoices: mapped,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error('[sync] Load from cloud failed:', err);
    set({ syncStatus: 'error', syncError: err.message });
  }
},
```

#### Trigger Sync on Every Invoice Mutation

```typescript
// Modify existing updateInvoice action:
updateInvoice: (id, updates) => {
  // ... existing update logic ...
  set({ invoices: newInvoices });

  // Trigger debounced cloud sync
  debouncedSync(() => get().syncToCloud());
},

// Same pattern for: addInvoice, deleteInvoice
```

---

### 4. Verification: H-08 — Undo/Redo Bounded

**Status:** ✅ VERIFIED — Properly bounded

```typescript
// useStore.ts line 6:
const MAX_HISTORY_DEPTH = 50;

// useStore.ts lines 86-101: All 4 mutation actions (addInvoice, deleteInvoice,
// updateInvoice, setInvoice) call pushHistory() which enforces the limit:
const pushHistory = () => {
  const { invoices, historyIndex, history } = get();
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(invoices);
  // Enforce max depth
  if (newHistory.length > MAX_HISTORY_DEPTH) {
    newHistory.shift();
  }
  set({ history: newHistory, historyIndex: newHistory.length - 1 });
};
```

Confirmed: All 4 invoice mutation methods call `pushHistory()`, which slices at `MAX_HISTORY_DEPTH = 50`.

---

### 5. `src/components/SyncIndicator.tsx` — Auto-Save Status (NEW FILE)

**Change Type:** NEW FILE

```typescript
import React from 'react';
import { useStore } from '../store/useStore';
import { Cloud, CloudOff, AlertCircle, Check, Loader2 } from 'lucide-react';

export function SyncIndicator() {
  const { syncStatus, lastSyncedAt, syncError } = useStore();

  const statusConfig = {
    idle: { icon: Cloud, text: 'Local only', color: 'text-zinc-500' },
    syncing: { icon: Loader2, text: 'Saving...', color: 'text-indigo-400', animate: true },
    synced: { icon: Check, text: lastSyncedAt ? `Saved ${formatTimeAgo(lastSyncedAt)}` : 'Saved', color: 'text-emerald-400' },
    error: { icon: AlertCircle, text: syncError || 'Sync error', color: 'text-red-400' },
    offline: { icon: CloudOff, text: 'Offline', color: 'text-zinc-500' },
  };

  const config = statusConfig[syncStatus];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 ${config.color}`} title={syncError || ''}>
      <Icon className={`w-3.5 h-3.5 ${(config as any).animate ? 'animate-spin' : ''}`} />
      <span className="text-[10px] font-medium">{config.text}</span>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
```

**Integration:** Add to `Editor.tsx` header, next to the Export button.

---

### 6. `server.ts` — Share Token Endpoints

**Change Type:** ADD  
**Addresses:** I-08

```typescript
// ── Route: Create Share Link ──
v1.post('/invoices/:id/share', requireAuth, async (req, res): Promise<void> => {
  try {
    const invoiceId = req.params.id;
    const { accessLevel = 'view', expiresInDays = 30 } = req.body;

    const token = randomUUID().replace(/-/g, '').slice(0, 16);

    // Store in Supabase (or in-memory for local dev)
    const shareData = {
      invoiceId,
      token,
      accessLevel,
      expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      isActive: true,
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };

    // In production: insert into share_tokens table
    // For now: store in memory map
    shareTokenStore.set(token, shareData);

    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${token}`;

    res.json({
      token,
      url: shareUrl,
      expiresAt: shareData.expiresAt,
      accessLevel,
    });
  } catch (error) {
    handleApiError(error, res, 'share');
  }
});

// ── Route: View Shared Invoice (public, no auth) ──
v1.get('/shared/:token', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const shareData = shareTokenStore.get(token);

    if (!shareData) {
      res.status(404).json({ error: 'Share link not found or expired.' });
      return;
    }

    if (!shareData.isActive) {
      res.status(410).json({ error: 'Share link has been revoked.' });
      return;
    }

    if (new Date(shareData.expiresAt) < new Date()) {
      res.status(410).json({ error: 'Share link has expired.' });
      return;
    }

    // Increment view count
    shareData.viewCount++;

    res.json({
      invoice: shareData.invoice,
      accessLevel: shareData.accessLevel,
      viewCount: shareData.viewCount,
    });
  } catch (error) {
    handleApiError(error, res, 'shared-view');
  }
});

// In-memory share token store (replace with Supabase in production)
const shareTokenStore = new Map<string, any>();
```

---

### 7. `server.ts` — Audit Log API

**Change Type:** ADD  
**Addresses:** H-10

```typescript
// ── Route: Get Audit Logs for Invoice ──
v1.get('/invoices/:id/audit-log', requireAuth, async (req, res): Promise<void> => {
  try {
    const invoiceId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    // In production: query Supabase audit_logs table
    // For now: return empty array
    res.json({
      logs: [],
      total: 0,
      message: 'Audit logs require Supabase configuration. Set VITE_SUPABASE_URL.',
    });
  } catch (error) {
    handleApiError(error, res, 'audit-log');
  }
});
```

---

## Integration Checklist

- [ ] Install `@supabase/supabase-js`
- [ ] Create `db/schema.sql` and run in Supabase SQL Editor
- [ ] Create `src/lib/supabase.ts` client singleton
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
- [ ] Add `syncStatus`, `lastSyncedAt`, `syncError` state to Zustand store
- [ ] Implement `syncToCloud()` and `loadFromCloud()` actions
- [ ] Add debounced sync trigger to `updateInvoice`, `addInvoice`, `deleteInvoice`
- [ ] Create `SyncIndicator.tsx` component
- [ ] Add SyncIndicator to Editor header
- [ ] Add share token endpoints to `server.ts`
- [ ] Add audit log endpoint to `server.ts`
- [ ] Verify: H-08 — `MAX_HISTORY_DEPTH = 50` enforced in all 4 mutation actions
- [ ] Verify: localStorage still works when Supabase is not configured (graceful degradation)

## Regression Tests

```bash
# 1. Supabase not configured — app works normally
# (Unset VITE_SUPABASE_URL, reload app)
# Expected: syncStatus shows "Offline", all features work via localStorage

# 2. Share link generation
curl -X POST http://localhost:3000/api/v1/invoices/test-id/share \
  -H "Content-Type: application/json" \
  -d '{"accessLevel":"view","expiresInDays":7}'
# Expected: { token: "abc123...", url: "http://localhost:3000/shared/abc123...", ... }

# 3. Undo/redo boundary
# Create 60 invoices rapidly → undo 60 times
# Expected: undo stops at 50 (MAX_HISTORY_DEPTH)
```

---

## Control Document Updates

### `decision.md`

```markdown
## DECISION 17: Persistence Architecture

| Property | Decision | Rationale |
|---|---|---|
| **Cloud Provider** | Supabase (PostgreSQL + Auth + Realtime) | User directive; excellent DX |
| **Sync Strategy** | Hybrid (localStorage + debounced cloud sync) | Instant local writes + eventual cloud consistency |
| **Debounce Interval** | 2 seconds | Balance responsiveness and API rate |
| **Offline Mode** | Full functionality via localStorage | Cloud is enhancement, not requirement |
| **RLS** | Enabled on all tables | User data isolation |
| **Audit Trigger** | PostgreSQL trigger on invoice INSERT/UPDATE | Automatic, zero frontend code |
| **Share Tokens** | 16-char UUID fragment, 30-day default expiry | Secure, time-limited |

## DECISION 18: Schema Design Principles

| Principle | Implementation |
|---|---|
| **Soft Deletes** | `deleted_at` column, indexed WHERE NULL |
| **Snapshot Business Info** | Invoice stores business_name/address at creation time |
| **NUMERIC for Money** | `NUMERIC(12,4)` for rates, `NUMERIC(10,2)` for totals |
| **JSONB for Settings** | `display_settings` is flexible; no migration on new toggles |
```

---

*End of Fix 05 — State Persistence Architecture*
