-- ════════════════════════════════════════════════
-- AI Invoice Studio — Supabase Schema
-- Version: 1.0 — June 2026
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════

-- ── Enable UUID generation ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Custom types ──
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'sent', 'viewed', 'partially-paid', 'paid', 'overdue', 'disputed', 'in-review', 'approved', 'cancelled', 'void');
CREATE TYPE audit_action AS ENUM ('created', 'updated', 'deleted', 'exported', 'shared', 'status_changed');
CREATE TYPE share_access AS ENUM ('view', 'comment', 'edit');
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually');

-- ════════════════════════════════════════════════
-- USERS (mirrors Supabase Auth or standalone JWT)
-- ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
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
  cron_expression TEXT,
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
