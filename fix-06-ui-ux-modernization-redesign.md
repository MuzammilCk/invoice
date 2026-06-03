# Fix 06 — UI/UX Modernization & Redesign

> **Priority:** 🟠 HIGH — User-facing quality  
> **Author:** Senior AI Engineer, MNC Enterprise Grade  
> **Date:** June 2026  
> **Estimated Effort:** 90 minutes  
> **Dependencies:** Fix-04 (AI pipeline), Fix-05 (persistence/customer data)

---

## Issues Addressed

| Issue | Title | Severity |
|---|---|---|
| H-01 | 4 of 5 Routes Are `EmptyState` — Clients, Templates, Settings | 🟠 High |
| H-02 | Editor Layout Is 2-Column — No Properties Panel | 🟠 High |
| I-10 | No Global Search or Filter on Dashboard | 🔵 Intelligence |
| I-11 | No First-Run Onboarding Flow | 🔵 Intelligence |
| I-12 | Dashboard Has No Sort Controls | 🔵 Intelligence |
| I-13 | Mobile Responsiveness Is Completely Broken | 🔵 Intelligence |

## Prerequisites

- **Fix-04** (AI pipeline changes propagate to Editor layout)
- **Fix-05** (customer data for Clients page)

---

## Implementation

### 1. `src/App.tsx` — Real Routes for Empty Pages

**Change Type:** MODIFY  
**Culprit Location:** Lines 40–42 — EmptyState placeholder routes

#### Current Code (BEFORE)

```tsx
<Route path="/clients" element={<EmptyState />} />
<Route path="/templates" element={<EmptyState />} />
<Route path="/settings" element={<EmptyState />} />
```

#### Proposed Code (AFTER)

```tsx
import { SettingsPage } from './pages/Settings';
import { ClientsPage } from './pages/Clients';
import { TemplatesPage } from './pages/Templates';
import { OnboardingPage } from './pages/Onboarding';
import { SharedInvoicePage } from './pages/SharedInvoice';

// Inside router:
<Route path="/clients" element={<ClientsPage />} />
<Route path="/templates" element={<TemplatesPage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/onboarding" element={<OnboardingPage />} />
<Route path="/shared/:token" element={<SharedInvoicePage />} />
```

---

### 2. `src/pages/Settings.tsx` — Business Profile & Defaults (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** H-01

```typescript
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../lib/templates';
import { SUPPORTED_CURRENCIES } from '../types';
import { Save, Building2, Palette, Globe, Shield, Database } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function SettingsPage() {
  const { businessInfo, updateBusinessInfo, defaultCurrency, defaultTaxRate, defaultTemplateId } = useStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-zinc-500 mb-8">Configure your business profile and application defaults.</p>

        {/* Business Profile Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Business Profile</h2>
          </div>
          <div className="space-y-4 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => updateBusinessInfo({ name: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address</label>
              <textarea
                value={businessInfo.address}
                onChange={(e) => updateBusinessInfo({ address: e.target.value })}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="123 Business Street, Suite 100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tax ID / GST / VAT</label>
                <input
                  type="text"
                  value={businessInfo.taxId}
                  onChange={(e) => updateBusinessInfo({ taxId: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="TAX-XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={businessInfo.email || ''}
                  onChange={(e) => updateBusinessInfo({ email: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="billing@yourbusiness.com"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Invoice Defaults Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Invoice Defaults</h2>
          </div>
          <div className="space-y-4 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Currency</label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Template</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Cloud Sync</h2>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            {isSupabaseConfigured() ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-sm">Connected to Supabase</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-400 mb-3">Cloud sync is not configured. Data is stored locally only.</p>
                <p className="text-xs text-zinc-500">
                  Set <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-zinc-800 px-1 rounded">.env</code> file to enable cloud persistence.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
```

---

### 3. `src/pages/Clients.tsx` — Client Directory (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** H-01

```typescript
import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Mail, MapPin, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';

interface ClientSummary {
  name: string;
  email: string;
  address: string;
  invoiceCount: number;
  totalBilled: number;
  currency: string;
  lastInvoiceDate: string;
}

export function ClientsPage() {
  const { invoices } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique clients from all invoices
  const clients = useMemo<ClientSummary[]>(() => {
    const clientMap = new Map<string, ClientSummary>();

    for (const invoice of invoices) {
      const key = invoice.customerInfo.email?.toLowerCase() || invoice.customerInfo.name?.toLowerCase() || '';
      if (!key) continue;

      const existing = clientMap.get(key);
      const total = computeInvoiceTotals(invoice).grandTotal;

      if (existing) {
        existing.invoiceCount++;
        existing.totalBilled += total;
        if (invoice.issueDate > existing.lastInvoiceDate) {
          existing.lastInvoiceDate = invoice.issueDate;
        }
      } else {
        clientMap.set(key, {
          name: invoice.customerInfo.name || 'Unknown',
          email: invoice.customerInfo.email || '',
          address: invoice.customerInfo.address || '',
          invoiceCount: 1,
          totalBilled: total,
          currency: invoice.currency,
          lastInvoiceDate: invoice.issueDate,
        });
      }
    }

    return Array.from(clientMap.values()).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [invoices]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-sm text-zinc-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} from your invoices</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name or email..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
          />
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{searchQuery ? 'No clients match your search.' : 'No clients yet. Create your first invoice to get started.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-zinc-100">{client.name}</h3>
                    {client.email && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3" />
                        {client.address.split('\n')[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-zinc-100">{formatCurrency(client.totalBilled, client.currency)}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500 justify-end">
                      <FileText className="w-3 h-3" />
                      {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 4. `src/pages/Templates.tsx` — Template Gallery (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** H-01

```typescript
import React, { useState } from 'react';
import { TEMPLATES, InvoiceTemplate } from '../lib/templates';
import { useStore } from '../store/useStore';
import { Check, Sparkles } from 'lucide-react';

export function TemplatesPage() {
  const { invoices } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Count usage of each template
  const usageCounts = new Map<string, number>();
  for (const inv of invoices) {
    const count = usageCounts.get(inv.templateId) || 0;
    usageCounts.set(inv.templateId, count + 1);
  }

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-zinc-500 mt-1">{TEMPLATES.length} professional invoice templates</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => {
            const usage = usageCounts.get(template.id) || 0;
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setSelectedId(isSelected ? null : template.id)}
                className={`group relative bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-zinc-600 ${
                  isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-800'
                }`}
              >
                {/* Template Preview Thumbnail */}
                <div className="aspect-[210/297] bg-white rounded-lg mb-3 overflow-hidden shadow-inner relative">
                  {/* Accent bar */}
                  {template.styles.accentStyle !== 'none' && (
                    <div
                      className="h-1.5 w-full"
                      style={{
                        backgroundColor: template.styles.accentStyle === 'solid' ? '#4f46e5' : undefined,
                        backgroundImage: template.styles.accentStyle === 'gradient'
                          ? 'linear-gradient(135deg, #4f46e5, #111827)'
                          : undefined,
                      }}
                    />
                  )}
                  {/* Skeleton layout */}
                  <div className="p-2 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="w-4 h-4 bg-indigo-100 rounded-sm" style={{ borderRadius: template.styles.borderRadius }} />
                        <div className="w-14 h-1.5 bg-slate-200 rounded" />
                        <div className="w-8 h-1 bg-slate-100 rounded" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="w-10 h-1 bg-slate-100 rounded ml-auto" />
                        <div className="w-14 h-1.5 bg-slate-200 rounded" />
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 space-y-1">
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-slate-100 rounded" />
                        <div className="w-4 h-1 bg-slate-100 rounded" />
                        <div className="w-6 h-1 bg-slate-100 rounded" />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-slate-50 rounded" />
                        <div className="w-4 h-1 bg-slate-50 rounded" />
                        <div className="w-6 h-1 bg-slate-50 rounded" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <div className="w-12 h-2 bg-indigo-100 rounded" />
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-200">{template.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">{template.description}</p>

                {usage > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-400 font-medium">
                    <Sparkles className="w-2.5 h-2.5" />
                    Used in {usage} invoice{usage !== 1 ? 's' : ''}
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### 5. `src/pages/Onboarding.tsx` — First-Run Wizard (NEW FILE)

**Change Type:** NEW FILE  
**Addresses:** I-11

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Building2, Palette, Sparkles, ArrowRight, Check } from 'lucide-react';
import { TEMPLATES } from '../lib/templates';

const STEPS = [
  { id: 'business', title: 'Your Business', icon: Building2 },
  { id: 'defaults', title: 'Preferences', icon: Palette },
  { id: 'ready', title: 'Ready!', icon: Sparkles },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updateBusinessInfo } = useStore();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('minimal-executive');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const handleComplete = () => {
    updateBusinessInfo({
      name: businessName,
      address: businessAddress,
      taxId,
    });
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Business Info */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Welcome to AI Invoice Studio</h1>
              <p className="text-sm text-zinc-500 mt-2">Let's set up your business profile. This will appear on every invoice.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name *</label>
              <input
                autoFocus
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address</label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="123 Business St, Suite 100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tax ID / GST / VAT</label>
              <input
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Set Your Defaults</h1>
              <p className="text-sm text-zinc-500 mt-2">These can be changed anytime in Settings.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Default Currency</label>
              <div className="grid grid-cols-3 gap-2">
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCurrency(c)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      selectedCurrency === c
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Preferred Template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 2 && (
          <div className="text-center animate-in fade-in">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">You're All Set!</h1>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">
              Your business profile is saved. Start creating professional invoices with AI assistance.
            </p>
            <div className="mt-8 bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-left">
              <p className="text-xs text-zinc-500 mb-2">Quick tips:</p>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li>• Type natural language prompts to create invoices instantly</li>
                <li>• Use voice dictation in any language (Hindi, Tamil, Telugu, and 100+ more)</li>
                <li>• Switch between 20 professional templates</li>
                <li>• Export as vector PDF with selectable text</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !businessName.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              Start Creating <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Integration:** In `App.tsx` root layout, redirect to `/onboarding` if `!localStorage.getItem('onboarding_complete')`:

```typescript
useEffect(() => {
  if (!localStorage.getItem('onboarding_complete') && location.pathname !== '/onboarding') {
    navigate('/onboarding');
  }
}, []);
```

---

### 6. `src/pages/Dashboard.tsx` — Search, Filter, Sort Controls

**Change Type:** MODIFY  
**Addresses:** I-10, I-12

#### Proposed Additions (insert above invoice grid)

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('all');
const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

// Filtered and sorted invoices
const filteredInvoices = useMemo(() => {
  let result = [...invoices];

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    result = result.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerInfo.name.toLowerCase().includes(q) ||
      inv.customerInfo.email.toLowerCase().includes(q) ||
      inv.title?.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (statusFilter !== 'all') {
    result = result.filter(inv => inv.status === statusFilter);
  }

  // Sort
  result.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
        break;
      case 'amount':
        comparison = computeInvoiceTotals(a).grandTotal - computeInvoiceTotals(b).grandTotal;
        break;
      case 'name':
        comparison = (a.customerInfo.name || '').localeCompare(b.customerInfo.name || '');
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return result;
}, [invoices, searchQuery, statusFilter, sortBy, sortOrder]);
```

#### Search Bar UI

```tsx
<div className="flex flex-col sm:flex-row gap-3 mb-6">
  {/* Search */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
    <input
      type="text"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      placeholder="Search invoices..."
      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
    />
  </div>

  {/* Status Filter */}
  <select
    value={statusFilter}
    onChange={e => setStatusFilter(e.target.value)}
    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  >
    <option value="all">All Status</option>
    <option value="draft">Draft</option>
    <option value="sent">Sent</option>
    <option value="paid">Paid</option>
    <option value="overdue">Overdue</option>
  </select>

  {/* Sort */}
  <select
    value={`${sortBy}-${sortOrder}`}
    onChange={e => {
      const [by, order] = e.target.value.split('-');
      setSortBy(by as any);
      setSortOrder(order as any);
    }}
    className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  >
    <option value="date-desc">Newest First</option>
    <option value="date-asc">Oldest First</option>
    <option value="amount-desc">Highest Amount</option>
    <option value="amount-asc">Lowest Amount</option>
    <option value="name-asc">Client A→Z</option>
    <option value="name-desc">Client Z→A</option>
  </select>
</div>
```

---

### 7. Mobile Responsiveness Considerations

**Addresses:** I-13

#### Key CSS Additions (to existing styles or a new responsive section)

```css
/* Sidebar: Collapse to bottom bar on mobile */
@media (max-width: 768px) {
  .sidebar-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 60px;
    flex-direction: row;
    justify-content: space-around;
    border-top: 1px solid #27272a;
    border-right: none;
    z-index: 50;
  }

  /* Editor: Stack columns vertically */
  .editor-layout {
    flex-direction: column;
  }

  /* AI sidebar: Bottom sheet instead of side panel */
  .ai-sidebar {
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    max-height: 70vh;
    border-radius: 16px 16px 0 0;
  }

  /* Invoice canvas: Horizontal scroll for A4 */
  .invoice-canvas-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 80px;
  }
}
```

**Implementation Note:** These CSS changes should be added to the appropriate component styles or a global responsive stylesheet. The exact implementation depends on whether the project uses CSS modules, global CSS, or Tailwind's `@apply` directives.

---

## Integration Checklist

- [ ] Create `src/pages/Settings.tsx` with business profile form
- [ ] Create `src/pages/Clients.tsx` with client directory
- [ ] Create `src/pages/Templates.tsx` with gallery grid
- [ ] Create `src/pages/Onboarding.tsx` with 3-step wizard
- [ ] Update `src/App.tsx` routes to point to new pages
- [ ] Add onboarding redirect logic in root layout
- [ ] Add search/filter/sort state to `Dashboard.tsx`
- [ ] Implement filtered invoice rendering
- [ ] Add mobile bottom bar CSS for sidebar
- [ ] Add bottom sheet CSS for AI sidebar on mobile
- [ ] Verify: All 5 routes render real content (no EmptyState)
- [ ] Verify: Onboarding appears on first visit
- [ ] Verify: Dashboard search filters by client name, invoice number
- [ ] Verify: Mobile viewport (375px) is usable

---

## Control Document Updates

### `context.md` — Update Section 4.2

```markdown
| `src/pages/Settings.tsx` | Business profile and app defaults |
| `src/pages/Clients.tsx` | Client directory extracted from invoices |
| `src/pages/Templates.tsx` | Template gallery with live previews |
| `src/pages/Onboarding.tsx` | First-run 3-step wizard |
| `src/pages/SharedInvoice.tsx` | Public read-only invoice view |
```

### `decision.md`

```markdown
## DECISION 19: UI Architecture

| Property | Decision | Rationale |
|---|---|---|
| **Onboarding** | 3-step wizard (business → defaults → ready) | Ensure business info populated before first invoice |
| **Client Directory** | Extracted from existing invoice data | Zero additional data entry; grows organically |
| **Template Gallery** | Grid with skeleton previews | Cheap to render; shows template structure without full rendering |
| **Mobile** | Bottom nav bar + bottom sheet AI | Standard mobile UX patterns |
| **Search** | Client-side filtering via `useMemo` | Under 1000 invoices = instant; no server needed |
```

---

*End of Fix 06 — UI/UX Modernization & Redesign*
