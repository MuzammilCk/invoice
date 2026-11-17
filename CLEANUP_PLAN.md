# CLEANUP_PLAN.md — Voice-to-Invoice v2 Foundation
> **Status: AWAITING OWNER APPROVAL — do not execute Phase 2 until approved.**
> Generated: 2026-11-17 · Repo HEAD: `a2ec6d1`

---

## 0 — Safety (Phase 0, pre-work before any changes)

| Step | Command | Purpose |
|---|---|---|
| 0.1 | Verify `git status` is clean | Confirmed clean at HEAD `a2ec6d1` ✅ |
| 0.2 | `git tag archive/enterprise-v1` | Permanent snapshot of old product — everything removed in Phase 2 is recoverable from this tag |
| 0.3 | `git checkout -b reset/v2-foundation` | All Phase 2–4 work lands on this branch |

---

## 1 — File / Folder Inventory (Phase 1 — READ-ONLY)

### 1.1 Top-level files

| File / Folder | Classification | Reason |
|---|---|---|
| `src/` | KEEP (trimmed) | Frontend — see §1.3 for per-file breakdown |
| `db/` | REMOVE | Contains only `schema.sql` for Supabase/PostgreSQL — the new product has no database |
| `server.ts` | TRIM | 2,805-line enterprise server; replace with ~80-line health+static-serve stub (see §1.5) |
| `package.json` | TRIM | Name is `react-example` (placeholder); many deps become unused after removals (see §1.6) |
| `package-lock.json` | KEEP | Regenerates automatically after dep removals; keep until then |
| `index.html` | KEEP | Vite entrypoint, unchanged |
| `vite.config.ts` | KEEP | Standard Vite + React config, no enterprise-specific logic |
| `tsconfig.json` | KEEP | Standard TypeScript config |
| `stt_server.py` | KEEP (parked) | STT sidecar — vendor undecided; park as reference, do not delete until STT bake-off |
| `requirements.txt` | KEEP (parked) | Python deps for stt_server.py — same reason |
| `.env.example` | TRIM | Strip Supabase, JWT, Groq, Puppeteer, Nodemailer vars; keep PORT, LLM_HOST, LLM_MODEL, STT_PORT |
| `.gitignore` | TRIM | Add `*.pdf`, `generated/`, `design/candidates/` outputs; already has `models/`, `__pycache__/` |
| `design.txt` | **NOT FOUND** | The prompt references this file but it does not exist in the repo. **Action: ask owner where the 5 candidate reportlab design scripts are.** Until located, the split into `design/candidates/design-1.py … design-5.py` cannot be performed. |
| `metadata.json` | REMOVE | Describes "AI Invoice Studio — Enterprise-grade…" — stale AI Studio metadata for the old product; not imported by any source file |
| `fix.cjs` | REMOVE | One-off patch script — not imported by any source file |
| `fix.js` | REMOVE | One-off patch script — not imported by any source file |
| `fix2.cjs` | REMOVE | One-off patch script — not imported by any source file |
| `fix_server.cjs` | REMOVE | One-off patch script — not imported by any source file |
| `fix_usestore.cjs` | REMOVE | One-off patch script — not imported by any source file |
| `run_fix.cjs` | REMOVE | One-off patch runner — not imported by any source file |
| `run_fix2.cjs` | REMOVE | One-off patch runner — not imported by any source file |
| `SPECIFICATION.md` | REMOVE | Stale enterprise spec; superseded by prompt §1–3 and new PROJECT.md |
| `context.md` | REMOVE | Stale planning doc for old product |
| `architecture.md` | REMOVE | Stale architecture doc for old product |
| `build.md` | REMOVE | Stale build notes for old product |
| `decision.md` | REMOVE | Stale decisions for old product |
| `audit.md` | REMOVE | Stale audit of old product |
| `new_audit.md` | REMOVE | Stale audit of old product |
| `deep.md` | REMOVE | Stale deep-dive doc for old product |
| `deep-research-report.md` | REMOVE | Stale research doc for old product |
| `diff.md` | REMOVE | Stale diff/changelog for old product |
| `fix-01-critical-security-infrastructure.md` | REMOVE | Enterprise fix plan doc — no longer relevant |
| `fix-02-financial-integrity-decimal-migration.md` | REMOVE | Enterprise fix plan doc |
| `fix-03-pdf-export-system-rebuild.md` | REMOVE | Enterprise fix plan doc |
| `fix-04-ai-pipeline-ux-intelligence.md` | REMOVE | Enterprise fix plan doc |
| `fix-05-state-persistence-architecture.md` | REMOVE | Enterprise fix plan doc |
| `fix-06-ui-ux-modernization-redesign.md` | REMOVE | Enterprise fix plan doc |
| `fix-07-intelligence-ceiling-features.md` | REMOVE | Enterprise fix plan doc |
| `setup.md` | REMOVE | Stale enterprise setup guide |
| `setup.txt` | REMOVE | Stale enterprise setup notes |
| `colab_training_manual.md` | REMOVE | ML fine-tuning manual — no fine-tuning in new product |
| `AI_Invoice.ipynb` | REMOVE | Jupyter notebook for ML fine-tuning — not imported by any file |
| `AI_Invoice_GGUF_Conversion.ipynb` | REMOVE | Jupyter notebook for GGUF model conversion — not imported |
| `AI_Invoice_updated_free_drive_workflow.ipynb` | REMOVE | Jupyter notebook for Colab workflow — not imported |
| `colab_llamafactory_config.yaml` | REMOVE | LlamaFactory fine-tune config — not imported |
| `invoice_schema_dataset.jsonl` | REMOVE | ML training dataset — not imported |
| `generated_invoice_dataset_200.jsonl` | REMOVE | ML generated dataset — not imported |

---

### 1.2 `db/` contents

| File | Classification | Reason |
|---|---|---|
| `db/schema.sql` | REMOVE | Supabase/PostgreSQL schema for users, customers, shared_links, audit_log, recurring_schedules, fx_rates tables — all enterprise features; not referenced in any TS/TSX import |

---

### 1.3 `src/` files — per-file classification

#### `src/` root

| File | Classification | Reason |
|---|---|---|
| `src/main.tsx` | KEEP | Standard Vite entrypoint |
| `src/index.css` | KEEP | Global CSS; Tailwind base |
| `src/types.ts` | TRIM | Contains the new product's core types (`InvoiceItem`, `CustomerInfo`, `BusinessInfo`) but also enterprise-only fields: `InvoiceStatus` (12 statuses → trim to `draft`/`done`), `CurrencyCode` multi-currency list (trim to INR), `PaymentTerms`, `DiscountType`, `DisplaySettings` (many toggles for features being removed), `Invoice` fields `dueDate`, `taxRate`, `discountType`, `discountRate`, `discountLabel`, `shipping`, `templateId`, `themeColor`, `currency`, `paymentTerms`, `customPaymentTerms`. The new `Invoice` type needs only: `id`, `invoiceNumber`, `issueDate`, `recipient` (name + address), `items[]` (description + price), `notes`. **Trim aggressively; don't delete the file.** |
| `src/App.tsx` | TRIM | Routes to Login, Register, Onboarding, SharedInvoice, Clients, Templates — all REMOVE candidates. Keep only `Dashboard` (voice creation flow, later), `Editor` (trimmed), `Settings` (trimmed). Remove `AuthGuard` and onboarding redirect logic. |

#### `src/components/`

| File | Classification | Reason |
|---|---|---|
| `AIAssistantSidebar.tsx` | TRIM | Contains the STT/voice→invoice core concept, which IS the new product. However it currently owns full enterprise AI-generate flow, OCR, analysis, cloud fallback. Keep the component shell, voice/transcript UI, and `startStreamPCM` plumbing; strip OCR, analysis, cloud-fallback, JWT auth plumbing. This is a major rewrite of the file, but preserve it as the future voice-flow home. |
| `TranscriptReviewPanel.tsx` | KEEP | Self-contained, no enterprise deps; directly used by both Dashboard and AIAssistantSidebar for the STT confirm-or-redo step. Exactly the UI concept described in the voice flow. |
| `EditableInvoice.tsx` | TRIM | Core editable form — KEEP but remove `SortableInvoiceTable` dependency (drop drag-and-drop), remove displaySettings-gated sections (tax, discount, shipping, dueDate, logo, etc.). Simplify to: recipient, date, items (description + price only), notes. |
| `InvoicePreview.tsx` | TRIM | Static preview of invoice — KEEP but trim multi-template, multi-currency, tax/discount/shipping rendering to INR + single design only (pending design decision). |
| `SidebarNav.tsx` | TRIM | Navigation sidebar — keep but remove links to Clients, Templates, Shared, Auth pages. 64-line file, easy to trim. |
| `SortableInvoiceTable.tsx` | REMOVE | Drag-and-drop reorderable table with `@dnd-kit`, `expr-eval` formula evaluation — enterprise feature; not in new scope |
| `AIChangeDiff.tsx` | REMOVE | Shows a before/after diff of AI-suggested invoice changes — enterprise AI feature |
| `AISpeedBadge.tsx` | REMOVE | Shows LLM speed/model tier badge — enterprise AI feature |
| `AnalysisSuggestionCard.tsx` | REMOVE | Displays proactive AI analysis suggestions — enterprise AI feature (server route M-03 also removed) |
| `AuditLogDrawer.tsx` | REMOVE | Audit log side drawer — enterprise feature (Supabase-backed audit trail) |
| `CloudFallbackModal.tsx` | REMOVE | Modal to consent to cloud (Groq) fallback — enterprise cloud feature |
| `EmailCompositionModal.tsx` | REMOVE | Email invoice via Nodemailer — enterprise feature |
| `ProtectedRoute.tsx` | REMOVE | JWT auth-protected route wrapper — uses `useAuth` store; enterprise auth |
| `RecurringBillingModal.tsx` | REMOVE | Recurring billing scheduler UI — enterprise feature |
| `SyncIndicator.tsx` | REMOVE | Supabase cloud sync status indicator — enterprise feature; depends on `useStore.syncStatus` |

#### `src/lib/`

| File | Classification | Reason |
|---|---|---|
| `calculations.ts` | TRIM | KEEP the Decimal.js logic (critical for financial correctness) but trim the function signatures. Currently `calculateSubtotal` multiplies `quantity × rate` — with no quantity field, it becomes `price` only (sum of prices). `computeInvoiceTotals` currently computes discount/tax/shipping — trim to just `subtotal` (sum of item prices) = `grandTotal`. |
| `utils.ts` | TRIM | KEEP `cn()`, `generateId()`, `formatDate()`, `formatCurrency()`. The `formatCurrency` function currently defaults to USD and uses `en-US` locale — update default to `INR` and locale to `en-IN` for Indian digit grouping (e.g. 1,25,000.00). The Zod schema (`AIResponseSchema`) in this file is a large enterprise schema — move out to `ai-schemas.ts` ownership and simplify it. |
| `ai-schemas.ts` | TRIM | Currently exports `AIResponseSchema` (zod schema with templateId, currency, taxRate, shipping, discountRate, dueDate, paymentTerms fields) and `AIResponseType`. Trim to new minimal schema: `{ recipient: {name, address}, date?: string, items: [{description, price}] }`. Also remove `TEMPLATE_IDS`/`TEMPLATE_ID_LIST` import from templates. |
| `ai-context.ts` | REMOVE | Builds client history context for the enterprise AI ("what has this client been billed before"). No client history concept in new product. Imported only in `server.ts` and `AIAssistantSidebar.tsx` — both being trimmed. |
| `apiClient.ts` | REMOVE | JWT token refresh interceptor — enterprise auth plumbing. All `apiClient()` calls in trimmed files will switch to plain `fetch()`. |
| `supabase.ts` | REMOVE | Supabase client initialization — enterprise cloud sync. Imported in `useStore.ts` and `Settings.tsx`; both being trimmed. |
| `templates.ts` | REMOVE | 20-template gallery (`TEMPLATES` array) — enterprise feature. The new product uses one design chosen by the owner's father from `design/candidates/`. |
| `audio/streamPCM.ts` | KEEP | PCM audio streaming over WebSocket to STT sidecar — this IS the new product's voice input mechanism. No enterprise deps. |

#### `src/pages/`

| File | Classification | Reason |
|---|---|---|
| `Dashboard.tsx` | TRIM | 684-line page; currently a full invoice-list view + AI prompt + voice input. KEEP the voice/transcript flow and new-invoice creation. Remove: OCR import, cloud-fallback, 20-template picker, multi-AI prompt compose flow. This becomes the voice-creation landing page. |
| `Editor.tsx` | TRIM | 449-line invoice editor; core editing page. Remove: EmailCompositionModal, AuditLogDrawer, RecurringBillingModal, SyncIndicator, auth redirect to login (line 67+99), Puppeteer PDF route. Keep: EditableInvoice (trimmed), AI sidebar (trimmed). |
| `Settings.tsx` | TRIM | 197-line settings page. Remove: template gallery selector, Supabase status, multi-currency selector, auth/logout UI. Keep: business name, address, phone, footer text (the "set once" fields from prompt §1). |
| `Login.tsx` | REMOVE | Enterprise login page — open decision whether any auth is needed; park under `src/_enterprise/` or remove; see UNSURE note |
| `Register.tsx` | REMOVE | Enterprise registration page — same as above |
| `AuthScreens.tsx` | REMOVE | Combined auth screens component using `useAuth` store — enterprise auth |
| `Onboarding.tsx` | REMOVE | Multi-step onboarding wizard — enterprise feature; redirects to login |
| `SharedInvoice.tsx` | REMOVE | Public shared-invoice view page (token-based) — enterprise feature |
| `Clients.tsx` | REMOVE | CRM-style client list page — enterprise feature |
| `Templates.tsx` | REMOVE | 20-template gallery browser page — enterprise feature |

#### `src/store/`

| File | Classification | Reason |
|---|---|---|
| `useStore.ts` | TRIM | 286-line Zustand store. KEEP: `invoices[]`, `businessInfo`, `addInvoice`, `updateInvoice`, `deleteInvoice`, `updateBusinessInfo`, `setInvoices`, undo/redo. REMOVE: `authUser`, `isAuthenticated`, `accessToken`, `refreshToken`, `setAuth`, `updateTokens`, `clearAuth`, `syncStatus`, `lastSyncedAt`, `syncError`, `syncToCloud`, `loadFromCloud`, `setSyncStatus`, `onboardingComplete`, Supabase import, apiClient import, debounced sync. |
| `useAuth.ts` | REMOVE | Separate auth store for `AuthScreens` and `ProtectedRoute` — enterprise auth; nothing in trimmed codebase will import it |

#### `src/styles/`

| File | Classification | Reason |
|---|---|---|
| `src/styles/invoice-export.css` | KEEP | Print/PDF CSS — needed for the PDF generation flow |

---

### 1.4 `server.ts` — Route/Feature Summary (2,805 lines)

The current server is a large enterprise backend. Here is what it contains and what to do with each section:

| Lines | Section / Route | Keep in v2? | Notes |
|---|---|---|---|
| 1–27 | Imports (express, fs, OpenAI, dotenv, multer, helmet, cors, cookieParser, rateLimit, jwt, ws, bcrypt, puppeteer, cron, supabase, ai-context, calculations) | PARTIAL | v2 needs only: express, fs, path, vite (dev), dotenv |
| 28–46 | Structured JSON logger | KEEP | Useful; small |
| 38–46 | VITE_ key leak guard | REMOVE | No VITE_ secrets in v2 |
| 47–53 | PORT validation | KEEP | Good practice |
| 54–67 | LLM client config (OpenAI, LLM_HOST, LLM_MODEL) | KEEP | v2 still calls local LLM for transcript normalization |
| 68–78 | Supabase admin client | REMOVE | No Supabase in v2 |
| 79–97 | API_SECRET + JWT config | REMOVE | No JWT auth in v2 |
| 99–122 | In-memory user store + `StoredUser` type | REMOVE | No users in v2 |
| 123–139 | JWT token helpers (sign/verify) | REMOVE | No JWT |
| 140–175 | `requireAuth` middleware | REMOVE | No auth |
| 176–189 | Multer upload config | UNSURE | Only used by OCR route (REMOVE) and STT upload; check if STT needs it once STT is finalized |
| 190–254 | LLM error types + retry utility | KEEP | v2 LLM calls benefit from retry |
| 255–303 | `callLLM` with cloud fallback (Groq) | TRIM | Keep local LLM call path; remove Groq cloud fallback |
| 304–348 | Prompt sanitization + centralized error handler | KEEP | Good practice |
| 350–441 | Puppeteer browser pool + Chrome detection | REMOVE | v2 uses reportlab (Python) for PDF, not Puppeteer |
| 443–448 | PDF cache | REMOVE | Tied to Puppeteer |
| 449–640 | `buildPrintHTML()` — 190-line HTML invoice renderer | REMOVE | v2 uses reportlab Python scripts |
| 641–697 | STT sidecar lifecycle (spawn `stt_server.py` as child process) | KEEP | Core v2 feature; keep exactly |
| 698–789 | Middleware setup (request ID, Helmet, CORS, body limits, rate limiting) | KEEP | Good practice |
| 790–860 | JSON schema + system prompt for LLM invoice generation | TRIM | Update schema to new minimal model (no tax, quantity, discount, shipping) |
| 862–1033 | **Auth routes** (`/api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me`, `/change-password`) | REMOVE | No auth in v2 |
| 1034–1151 | **Sync routes** (Supabase proxy: list/get/create/update/delete invoices, sync) | REMOVE | No cloud sync in v2 |
| 1152–1264 | **Invoice validation route** (`/api/v1/validate-invoice`) | REMOVE | Validates enterprise fields (tax, dueDate, invoiceNumber, shipping) no longer in model |
| 1265–1332 | **System capabilities route** (`/api/v1/capabilities`) | TRIM | Keep LLM + STT health checks; remove speed-tier classification |
| 1333–1414 | **Email route** (`/api/v1/send-email`) via Nodemailer | REMOVE | Enterprise feature |
| 1415–1522 | **Proactive analysis route** (`/api/v1/analyze-invoice`) + ML suggestions | REMOVE | Enterprise AI feature |
| 1523–1626 | **Recurring schedules** (cron, `node-cron`, Supabase) | REMOVE | Enterprise feature |
| 1627–1711 | **AI generate SSE route** (`/api/v1/generate-invoice` streaming) | REMOVE | Old generate flow; v2 voice flow uses different route |
| 1712–1823 | **AI generate (non-SSE)** (`/api/v1/generate-invoice` POST) | TRIM | Simplify to new minimal schema; this becomes the transcript-to-JSON normalization endpoint |
| 1824–1847 | **OCR extract route** (`/api/v1/extract-receipt-text`) via Tesseract.js | REMOVE | Enterprise feature |
| 1848–1923 | **Text-to-invoice from transcript SSE** (`/api/v1/text-to-invoice-from-transcript`) | KEEP | This IS the v2 core: STT transcript → LLM normalizes → JSON |
| 1924–2013 | **OCR import** (image → OCR → LLM) | REMOVE | Enterprise feature |
| 2014–2074 | **Email draft route** (`/api/v1/generate-email-draft`) | REMOVE | Enterprise feature |
| 2075–2152 | **Puppeteer PDF generation** (`/api/v1/generate-pdf`) | REMOVE | Replaced by reportlab (Python) |
| 2153–2187 | **AI rewrite route** (`/api/v1/rewrite`) | REMOVE | Enterprise AI feature |
| 2188–2222 | **Share link creation** (`/api/v1/share-invoice`) | REMOVE | Enterprise shared-invoice feature |
| 2223–2328 | **Shared invoice view/download** (public token routes) | REMOVE | Enterprise shared-invoice feature |
| 2301–2428 | **Payment/mark-paid routes** (Razorpay stub, shared invoice paid) | REMOVE | Enterprise feature |
| 2429–2510 | **Server-side validation route** (`/api/v1/validate`) (duplicate of §1152) | REMOVE | Redundant enterprise validation |
| 2511–2529 | **Audit log route** (`/api/v1/audit-logs/:invoiceId`) | REMOVE | Enterprise feature |
| 2530–2552 | **FX rates route** (`/api/v1/fx-rates`) | REMOVE | Multi-currency enterprise feature |
| 2553–2576 | Backward-compat redirects + static serving + graceful shutdown | KEEP (trim) | Keep static serving + graceful shutdown; remove old route redirects |
| 2577–2805 | **WebSocket STT proxy** (JWT auth, forward to Python sidecar) | TRIM | Keep the WebSocket proxy; remove JWT auth check on WebSocket (line 2600–2635) |

#### Proposed minimal server.ts replacement (~80–120 lines)

```
express + vite (dev mode)
→ PORT config + JSON logger
→ Helmet + CORS + body limits + rate limit
→ STT sidecar spawn (641–697, keep as-is)
→ callLLM() + retry (keep, strip Groq fallback)
→ POST /api/v1/text-to-invoice-from-transcript  ← KEEP, the core LLM normalization call
→ GET  /api/v1/capabilities                     ← KEEP, trimmed (LLM + STT health only)
→ GET  /api/v1/health                           ← ADD (simple health check)
→ POST /api/v1/generate-pdf                     ← NEW: calls Python reportlab script (placeholder until design chosen)
→ WebSocket proxy to STT sidecar (no JWT check)
→ Static serving (production)
→ Graceful shutdown
```

---

### 1.5 `design.txt` — Split Plan

**`design.txt` does not exist in this repository.** The prompt states this file contains 5 candidate reportlab Python scripts. It was not committed. Options:
1. Owner provides / commits the file, then it is split mechanically into `design/candidates/design-1.py` through `design-5.py` with no content changes.
2. If the scripts are elsewhere (local only, shared link, etc.), the owner should add them to the repo in Phase 2.

**Action required: owner must supply design.txt or the 5 individual design scripts.**

---

### 1.6 npm Dependencies — Removal Candidates

After the removals above, the following packages have **zero remaining imports** in `src/` or `server.ts`:

| Package | Currently used by | Zero-import after? | Action |
|---|---|---|---|
| `@dnd-kit/core` | `SortableInvoiceTable.tsx` (REMOVE) | ✅ | REMOVE |
| `@dnd-kit/sortable` | `SortableInvoiceTable.tsx` (REMOVE) | ✅ | REMOVE |
| `@dnd-kit/utilities` | `SortableInvoiceTable.tsx` (REMOVE) | ✅ | REMOVE |
| `@supabase/supabase-js` | `supabase.ts` (REMOVE), `server.ts` (REMOVE) | ✅ | REMOVE |
| `@tanstack/react-table` | Not found in any import — appears unused already | ✅ | REMOVE |
| `bcryptjs` / `@types/bcryptjs` | `server.ts` auth routes (REMOVE) | ✅ | REMOVE |
| `cookie-parser` / `@types/cookie-parser` | `server.ts` auth (REMOVE) | ✅ | REMOVE |
| `cron-parser` | `server.ts` recurring schedules (REMOVE) | ✅ | REMOVE |
| `expr-eval` | `SortableInvoiceTable.tsx` (REMOVE) | ✅ | REMOVE |
| `jsonwebtoken` / `@types/jsonwebtoken` | `server.ts` auth (REMOVE) | ✅ | REMOVE |
| `node-cron` / `@types/node-cron` | `server.ts` recurring schedules (REMOVE) | ✅ | REMOVE |
| `nodemailer` / `@types/nodemailer` | `server.ts` email route (REMOVE) | ✅ | REMOVE |
| `puppeteer` | `server.ts` PDF route (REMOVE) | ✅ | REMOVE |
| `tesseract.js` | `server.ts` OCR route (REMOVE) | ✅ | REMOVE |
| `motion` | `TranscriptReviewPanel`, `Dashboard`, `Editor`, `Clients`, `Login`, `Register`, `AIChangeDiff`, `AnalysisSuggestionCard`, `AuditLogDrawer`, `EditableInvoice`, `EmailCompositionModal`, `RecurringBillingModal` — many REMOVE; also used in KEEP/TRIM files | UNSURE | Grep after removals; likely stays because EditableInvoice (TRIM, KEEP) uses it |
| `react-textarea-autosize` | `EditableInvoice.tsx` (TRIM, KEEP), `SortableInvoiceTable.tsx` (REMOVE) | UNSURE | Stays if EditableInvoice retains it after trim |
| `multer` / `@types/multer` | `server.ts` OCR + STT upload | UNSURE | May be needed for STT audio file upload endpoint; check after STT finalization |

**Packages confirmed KEEP (still imported after all removals):**

| Package | Remaining users |
|---|---|
| `react`, `react-dom` | Entire frontend |
| `react-router-dom` | `App.tsx`, `Dashboard.tsx`, `Editor.tsx`, page components |
| `zustand` | `useStore.ts` |
| `zod` | `ai-schemas.ts` (trimmed), `Dashboard.tsx`, `Editor.tsx` |
| `decimal.js` | `calculations.ts`, `utils.ts` |
| `clsx`, `tailwind-merge` | `utils.ts` (`cn()`) |
| `lucide-react` | Multiple pages/components |
| `openai` | `server.ts` (LLM client) |
| `express` | `server.ts` |
| `dotenv` | `server.ts` |
| `cors` | `server.ts` |
| `helmet` | `server.ts` |
| `express-rate-limit` | `server.ts` |
| `ws` / `@types/ws` | `server.ts` (WebSocket STT proxy) |
| `uuid` | `server.ts` (request ID) |
| `vite`, `@vitejs/plugin-react` | Build |
| `tailwindcss`, `@tailwindcss/vite`, `autoprefixer` | Build |
| `typescript`, `tsx`, `esbuild` | Build |
| `@types/node`, `@types/react`, `@types/react-dom` | Types |
| `@types/express`, `@types/cors`, `@types/uuid`, `@types/ws` | Types for server.ts |

---

### 1.7 Environment Variables — Removal Candidates

| Variable | Used by | Action |
|---|---|---|
| `VITE_SUPABASE_URL` | `supabase.ts` (REMOVE), `server.ts` (REMOVE) | REMOVE from `.env.example` |
| `VITE_SUPABASE_ANON_KEY` | `supabase.ts` (REMOVE) | REMOVE |
| `SUPABASE_SERVICE_ROLE_KEY` | `server.ts` (REMOVE) | REMOVE |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `server.ts` auth (REMOVE) | REMOVE |
| `API_SECRET` | `server.ts` auth (REMOVE) | REMOVE |
| `ALLOWED_ORIGINS` | `server.ts` CORS | UNSURE — keep if CORS config is kept, else remove |
| `GROQ_API_KEY`, `GROQ_MODEL` | `server.ts` cloud fallback (REMOVE) | REMOVE |
| `CHROME_PATH` | `server.ts` Puppeteer (REMOVE) | REMOVE |
| `NEMO_MODEL`, `NEMO_CACHE_DIR` | `stt_server.py` (KEEP/parked) | UNSURE — keep parked for reference alongside stt_server.py; note as "not currently used" |
| **KEEP** | | |
| `PORT` | `server.ts` | KEEP |
| `NODE_ENV` | `server.ts` | KEEP |
| `LLM_HOST` | `server.ts` | KEEP |
| `LLM_MODEL` | `server.ts` | KEEP |
| `LLM_API_KEY` | `server.ts` | KEEP |
| `STT_PORT` | `server.ts`, `stt_server.py` | KEEP |
| `WHISPER_MODEL` | `stt_server.py` (parked) | KEEP (parked) |
| `STT_COMPUTE_TYPE` | `stt_server.py` (parked) | KEEP (parked) |
| `PYTHON_CMD` | `server.ts` STT sidecar spawn | KEEP |
| `STT_BACKEND` | `.env.example` | UNSURE — not seen in current `stt_server.py`; grep confirmed not referenced. Mark KEEP (parked) alongside stt_server if it refers to future NeMo/whisper selection |

---

## 2 — UNSURE Items (do not act on these without owner input)

| # | Item | Why unsure |
|---|---|---|
| U1 | `design.txt` / 5 reportlab scripts | File does not exist in the repo. Owner must supply it. |
| U2 | `motion` (Framer Motion) | Still imported in TRIM-ed files (EditableInvoice, Dashboard, Editor). Will be used unless those files have all animated elements removed. Grep after Phase 2. |
| U3 | `react-textarea-autosize` | Still imported in `EditableInvoice.tsx` (TRIM, KEEP). Whether it stays depends on how much of the form is rewritten. |
| U4 | `multer` | Currently used by OCR (REMOVE) and potentially by an STT file-upload path. Check once STT approach is decided. |
| U5 | `STT_BACKEND` env var | Present in `.env.example`, not referenced in current `stt_server.py`. May be a planned switch between NeMo and faster-whisper. Keep or remove pending STT bake-off. |
| U6 | `ALLOWED_ORIGINS` | Currently used in server.ts CORS. Will be used in the new server too — likely KEEP but noting it. |
| U7 | `Login.tsx` / `Register.tsx` | Prompt says "whether any login is needed" is an open decision (§3). These should be parked, not deleted, until decided. Proposal: move to `src/_enterprise/` |
| U8 | `InvoicePreview.tsx` | Renders invoice using the 20-template system (CSS-only). After design decision, this will be replaced by the real PDF preview (reportlab output). But the component is used in `Editor.tsx` for the live view. It stays temporarily until reportlab PDF live preview is wired. |
| U9 | `AIAssistantSidebar.tsx` | Heavily trimmed but the component structure changes significantly. Treated as TRIM not REMOVE, but confirm scope: should trimmed sidebar keep its file name or be renamed to `VoicePanel.tsx`? |
| U10 | `metadata.json` | Describes this project to AI Studio ("AI Invoice Studio — Enterprise-grade…"). Not imported by any code. If this project is still hosted in AI Studio, the file may need to be updated not deleted. Owner should confirm. |

---

## 3 — Open Decisions (from prompt §3 — never decide these ourselves)

1. **Which of the 5 reportlab designs is chosen** — owner's father picks after seeing all 5 candidates.
2. **Which STT vendor / model** — undecided; bake-off on real recordings (Malayalam / English invoice speech). `stt_server.py` is parked for reference.
3. **Which LLM provider** — undecided. Currently wired for any OpenAI-compatible local backend (Ollama, vLLM, llama.cpp).
4. **Whether GST / quantity fields are needed** — do not add.
5. **Whether any login is needed** — likely a simple PIN at most; Login.tsx and Register.tsx should be parked, not deleted, until this is resolved.

---

## 4 — Execution Plan: Phase 2 Commits (pending approval)

Each commit is one category. Order matters: docs first (safe, no type errors), then scripts, then ML, then frontend, then backend, then deps.

| Commit | Scope | Files changed |
|---|---|---|
| `chore: add archive tag and v2 branch` | Phase 0 | `git tag`, `git checkout -b` |
| `docs: remove stale planning and audit documents` | Stale docs | 20+ `.md` files at root |
| `chore: remove one-off patch scripts` | Scripts | `fix.cjs`, `fix.js`, `fix2.cjs`, `fix_server.cjs`, `fix_usestore.cjs`, `run_fix.cjs`, `run_fix2.cjs` |
| `chore: remove ML fine-tuning artifacts` | ML artifacts | 3 `.ipynb`, `colab_llamafactory_config.yaml`, `invoice_schema_dataset.jsonl`, `generated_invoice_dataset_200.jsonl`, `metadata.json` |
| `chore: remove database schema` | Database | `db/schema.sql`, `db/` directory |
| `feat: remove enterprise frontend components and pages` | Frontend REMOVE | `AuthScreens.tsx`, `AuditLogDrawer.tsx`, `CloudFallbackModal.tsx`, `EmailCompositionModal.tsx`, `ProtectedRoute.tsx`, `RecurringBillingModal.tsx`, `SortableInvoiceTable.tsx`, `SyncIndicator.tsx`, `AIChangeDiff.tsx`, `AISpeedBadge.tsx`, `AnalysisSuggestionCard.tsx`, `Login.tsx`, `Register.tsx`, `Onboarding.tsx`, `SharedInvoice.tsx`, `Clients.tsx`, `Templates.tsx`, `useAuth.ts`, `supabase.ts`, `ai-context.ts`, `apiClient.ts`, `templates.ts` · Run `npm run lint` + `npm run build`, fix broken imports |
| `feat: trim frontend to new product scope` | Frontend TRIM | `types.ts`, `App.tsx`, `useStore.ts`, `calculations.ts`, `utils.ts`, `ai-schemas.ts`, `AIAssistantSidebar.tsx`, `EditableInvoice.tsx`, `SidebarNav.tsx`, `Dashboard.tsx`, `Editor.tsx`, `Settings.tsx` · Run `npm run lint` + `npm run build` |
| `feat: replace server.ts with minimal v2 backend` | Backend | Rewrite `server.ts` to ~100-line stub keeping: STT sidecar spawn, `callLLM` + retry, `/text-to-invoice-from-transcript`, `/capabilities`, `/health`, WebSocket STT proxy (no JWT), static serving, graceful shutdown · Run `npm run lint` + `npm run build` |
| `chore: remove unused npm dependencies` | Deps | `npm uninstall` for all zero-import packages confirmed in §1.6 · Run `npm run lint` + `npm run build` |
| `chore: update .env.example and .gitignore` | Config | Strip removed env vars; add `*.pdf`, `generated/` to gitignore |

---

## 5 — Phase 3 Document Stubs (new files to create)

| File | Contents |
|---|---|
| `README.md` | What this is (voice-to-invoice for one user), how to run (`npm run dev` + `python stt_server.py`), current status ("Phase 2 cleanup in progress") |
| `PROJECT.md` | Single source of truth — prompt §1–3 verbatim + status of each open decision |
| `DECISIONS.md` | Working decisions (reportlab PDF, STT interface, Decimal math, INR only, English only) + open decisions + "superseded: old enterprise plan at tag `archive/enterprise-v1`" |

---

## 6 — Phase 4 Verification Checklist

- [ ] `npm run lint` (tsc --noEmit) passes with 0 errors
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` starts and app boots in browser
- [ ] Final file tree documented in report
- [ ] Removed dependencies listed
- [ ] UNSURE items listed with owner action required
- [ ] Open decisions §3 restated

---

*This plan is READ-ONLY. No files have been changed. Phase 2 begins only after the owner approves this document.*
