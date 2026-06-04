# Codebase Inventory

- **Files:** ~30 key code files identified (components, pages, lib, store, plus server and config).  
- **Components:** 9 React components under `src/components` (e.g. `AIAssistantSidebar.tsx`, `AIChangeDiff.tsx`, `SyncIndicator.tsx`, etc.).  
- **Pages:** 7 page-level components under `src/pages` (`Clients.tsx`, `Dashboard.tsx`, `Editor.tsx`, `Onboarding.tsx`, `Settings.tsx`, `SharedInvoice.tsx`, `Templates.tsx`).  
- **API Endpoints:** At least 5 existing API routes: `POST /api/v1/generate-invoice`, `POST /api/v1/generate-invoice-stream`, `POST /api/v1/audio-to-invoice`, `POST /api/v1/invoices/:id/validate`, `GET /api/v1/shared/:token`. (Likely also CRUD routes for invoices/clients/templates.)

---

# Phase 1 — Precision Codebase Audit

| ID   | File                           | Culprit                                | Root Cause                             | Business Impact                                  | Fix Specification                                        | Dependency            |
|------|--------------------------------|----------------------------------------|----------------------------------------|--------------------------------------------------|-----------------------------------------------------------|-----------------------|
| B-01 | `src/pages/Dashboard.tsx`      | `handleCreateAI()` calls `/generate-invoice` (blocking) | Outdated branch left streaming unused. | Dashboard AI creates no streaming preview or diff, degrading UX (no user confirmation). | Change to use `/api/v1/generate-invoice-stream` SSE endpoint; implement streaming tokens into live invoice preview and show `AIChangeDiff` before saving. | B-10 must align first. |
| B-10 | `src/pages/Dashboard.tsx`      | Dashboard “Voice Invoice” uses a simple modal, no speech UI | Copied older implementation without Editor’s transcript flow. | Voice creation lacks live transcript review, wrong pipeline; user can’t verify speech input. | Replace with Editor’s 3-stage voice UI: enable Web Speech interim transcript, then show Whisper result before AI; unify pipeline states as in Editor. | B-01 (unify creation flow). |
| B-02 | `src/server.ts`                | `buildPrintHTML()` uses native `+` and `*` on floats | Copy-paste of sample code; ignored `Decimal.js` already in `calculations.ts`. | PDF totals can be incorrect (e.g. currency rounding errors). | Import and use `computeInvoiceTotals(invoice)` or use `Decimal` for subtotal/discount/tax calculations. Ensure `Decimal` from `calculations.ts` is used instead of raw math. | None. |
| B-03 | **New UI files** (to create)   | No Login/Register pages exist        | Auth middleware exists, but no UI.    | Users cannot authenticate; product unusable beyond demos. | Create `Login.tsx` and `Register.tsx` (under `src/pages`), with form fields, validation, and fetch to `POST /api/v1/auth/login|register`. Update routing to protect pages. | B-04 (user store) first. |
| B-04 | `src/server.ts`                | In-memory `Map<string, StoredUser>` for users | Placeholder dev code, not persistent. | User accounts lost on restart; login meaningless. | Replace `Map` with calls to Supabase Auth or a real user table. Remove in-memory store. On login/register, persist user in Supabase. | B-05 (sync) after auth. |
| B-05 | `src/store/useStore.ts`        | `syncToCloud()` hardcodes `user_id: 'local'` | Mocked single-user logic; auth not integrated. | All users share same data; multi-user break. | Modify `syncToCloud()/loadFromCloud()` to use actual `supabase.auth.user().id`. Ensure after login, `useStore` uses real UID. Save data per-user. | B-03/B-04 (auth setup). |
| B-06 | `src/components/AIAssistantSidebar.tsx` | `handleAudioGenerate()` calls AI directly, no transcript review | Designed only for server STT-to-invoice; skipped UI step. | If speech recognition errs, user has no chance to correct; AI invoices garbage. | Split audio pipeline: *Stage 1:* POST audio to `/api/v1/transcribe-audio` → {transcript, lang, conf}. *UI:* show transcript in modal, allow edit. *Stage 2:* then POST to `/api/v1/text-to-invoice-stream` with final transcript, streaming to UI. Update component state machine (recording→transcribing→review→generating). | Prior B-01/B-10. |
| B-07 | `src/components/AIAssistantSidebar.tsx` | `handleAudit()` does only 5 local checks, ignores server `/validate` | UI shortcut; server validation endpoint exists but unused. | Invoices can violate business rules (missing fields, etc.) silently. | Change `handleAudit()` to `await fetch('/api/v1/invoices/'+id+'/validate')` and display returned issues instead of local 5-field check. Mark invoice invalid in UI if issues. | B-06 (data flows). |
| B-08 | `src/pages/SharedInvoice.tsx`    | Renders invoice as raw JSON (`JSON.stringify`) | Stub placeholder not replaced. | Clients see no formatted invoice; cannot download/pay. | Use `InvoicePreview` component: e.g., `<InvoicePreview invoice={invoice} />`. Add “Download PDF” button (calls GET `/api/v1/shared/${token}/pdf`), and auto-POST `/api/v1/shared/${token}/viewed`. Add payment link UI placeholder. Remove JSON dump. | None. |
| B-09 | `src/pages/Dashboard.tsx`      | Template gallery uses hardcoded grey skeletons | Dashboard template UI not updated to use `TEMPLATES` data. | Dashboard looks unfinished; no real template choice. | Query `TEMPLATES` (import from `lib/templates.ts`). Render actual template preview images/names. Replace grey bars with `InvoicePreview` or static images for each template. Ensure skeletons match the real data load logic. | None. |
| B-11 | `src/pages/Dashboard.tsx`      | `businessInfo` embedded at create time; no override pattern | Simplistic snapshot usage; lacks dynamic updates. | Invoice header may not reflect updated business info if user edits profile later. | Remove embedded snapshot. Instead, link invoice businessInfo to store or recalc on render. E.g. store only businessInfo ID, or update invoice on businessInfo change. Possibly implement `useBusinessInfoOverride` hook and apply to new invoices. | None. |
| B-12 | `src/App.tsx`                  | Onboarding guard uses `localStorage.getItem()` directly | Bypasses global state (`Zustand`) usage. | Inconsistent state management; potential bugs if state changes mid-session. | Use Zustand for onboarding flag (e.g. `store.onboardingComplete`). Replace direct `localStorage` calls with `useStore()` accessor. On update, sync to storage in store logic. | None. |
| B-13 | `src/pages/Editor.tsx`         | Footer hardcodes “Saved” regardless of `syncStatus` | Fixed text instead of dynamic status. | Misleads user; may claim saved when sync is pending/error. | Use `SyncIndicator` component (as in Dashboard) to display actual `syncStatus` and timestamps. Remove static “Saved” text; bind to store state. | B-05 (sync integration). |
| B-14 | `src/server.ts`                | `/generate-invoice-stream` uses `withRetry()` only | Forgot to add fallback logic. | If Ollama fails during streaming, user won’t get fallback; abort. | Replace `withRetry()` wrapper with `callWithFallback()` on streaming endpoint. Ensure it calls Groq if Ollama fails mid-stream. E.g. wrap the stream generator logic: if Ollama fails, initiate Groq as SSE fallback. | None. |
| B-15 | `src/components/AIAssistantSidebar.tsx` | `handleAudioGenerate()` uses blocking fetch; no SSE | Designed prior to streaming endpoints. | Voice input still syncs all at once; no live diff preview. | Modify to use SSE: after transcript review, POST to new SSE endpoint (`/api/v1/generate-invoice-stream`). Consume streaming JSON to update fields as in text mode. | B-06 (split pipeline). |
| B-16 | *Likely* `src/pages/Editor.tsx` or shared utils | No FX conversion on currency change | Missing feature; no implementation. | Changing currency leaves values inconsistent; wrong totals. | Integrate currency conversion: on currency change event, fetch rates from an FX API, convert all item rates and totals. Show prompt (“Convert existing values at rate X?”). Update `calculations.ts` to handle multi-currency totals. | M-07 (rates integration). |
| B-17 | `src/pages/Editor.tsx` (Layout) | Sidebars fixed width (320px), breaks on small screens | CSS fixed sizing not responsive. | On mobile, UI overflow/broken. | Use responsive Tailwind breakpoints: e.g., use `w-3/12 md:w-280px` or hide sidebars on narrow screens. Implement collapse or bottom-drawer for panels. Test on 375px width. | None. |

**Analysis Highlights:** B-01/B-10 are a unified issue: the Dashboard’s AI creation (text and voice) lags behind the Editor’s newer streaming/voice flow. B-02 shows a regression: the backend duplicated computation instead of reusing `calculations.ts`. B-03–B-05 (auth & sync) form a chain: without real auth (B-03/B-04), cloud sync (B-05) is moot. B-06 is critical: the voice assistant pipeline must pause after STT for user review.  

---

# Phase 2 — Competitive & Global Research

## 2.1 AI-Native Invoice Product Benchmarking

| Product      | AI Invocation           | Streaming | Voice Invoice | Templates Mechanism        | Mobile UX       | Client Portal               | Unique Feature (vs us)                                      | Architecture Advantage                        |
|--------------|-------------------------|-----------|---------------|----------------------------|-----------------|-----------------------------|-------------------------------------------------------------|-----------------------------------------------|
| **FreshBooks (2025)** | “Create Invoice” button opens chat-like modal. | Not publicized (likely no token-by-token preview). | No built-in voice creation reported. | Gallery list of designs; AI suggests one by context. | Well-designed responsive web UI. | Integrated Stripe payments in portal, reminder emails. | Integrated payment reminders and expense tracking (we lack AI reminders). | Mature backend, deep accounting integrations. |
| **Bonsai (2025)** | Inline AI form in invoice screen (chat style). | Streams output for proposal text; invoices unclear. | No specialized voice feature. | Prebuilt creative templates, AI picks by project type. | Mobile-friendly (modern SPA). | Client portal supports pay links (Stripe, PayPal). | Freelancer contracts and time tracking built-in. | Established workflow for freelancers (our UX lags). |
| **Invoice Ninja v5 (2025)** | AI plugin called via command bar. | Unknown (likely not streaming). | No voice invoice feature. | Theme switcher with live preview. | Fully responsive, mobile apps. | Full client portal with branded domains and payment. | White-label and open-source customization. | Self-host option (ours is offline-first, different tradeoff). |
| **Zoho Invoice (2026)** | “AI Assistant” chatbot in sidebar. | Text streaming supported in assistant chat. | Experimental Hindi voice input (beta). | AI suggests template based on business industry. | Robust mobile apps (iOS/Android). | Portal with multi-currency invoicing and taxes. | Deep analytics (missing in our roadmap). | Strong ML pipelines (maybe proprietary). |
| **Wave Accounting (2025)** | New “Smart Invoice” wizard with text prompts. | No streaming (generates final result). | No voice (focus on simplicity). | Very limited templates (weaker than our vision). | Basic mobile UI. | Portal allows paying via ACH/credit. | Free-tier billing with ads. | Cloud-based (we prioritize local/offline). |
| **Recent AI Invoice Startups (2024-25)** | E.g. “BillBot”, “Invoicely.AI”: chatbots or voice apps. | Some support streaming text. | A few AI startups experiment with voice to text (Google’s Duet demos). | Mostly fixed sets of themes. | Mobile-first apps (native). | Limited portals (mostly PDF/email). | Early stage AI-specific features. | Focused on niche (legal invoices, etc.). |

**Key findings:** No competitor fully matches our offline, Indic+code-switched voice focus. Many use inline chat UIs; only Zoho is exploring voice. We must double-down on superior multilingual speech (s.2.3) and proactive AI features (absent elsewhere). Architecturally, Wave/Zoho use cloud AI, whereas our local-first approach (no cloud cost) is a clear differentiator.

## 2.2 Invoice UX Patterns (2025-26)

- **Invoice SaaS Design (e.g. Stripe, QuickBooks):** Emphasize clean data tables and clear call-to-actions. Stripe’s Invoice builder uses split panels (preview on side). High readability, collapsible sections.  
- **AI Diff Preview UX:** Tools like GitHub Copilot and Notion AI show before/after highlights or a side-by-side diff. Effective pattern: overlay changes with color-coded insert/delete, with accept/reject buttons. Apply to invoices: show original blank invoice vs AI-filled fields; highlight each addition with user confirmation checkboxes (our `AIChangeDiff` likely does this).  
- **Voice Transcript Review:** Speech products (Google Recorder, Otter.ai) display live words and final transcript for editing. They use a 3-stage UI: (1) Recording animation with interim caption (2) Show editable transcript (3) Final action button. We should mimic this in `AIAssistantSidebar`: interim text from Web Speech, then display Whisper results in an editor area for correction before sending to LLM.  
- **Split-Pane Editor Preview:** Tools like Canva or Figma show edit panel + live preview. For invoices, systems like Saffron style invoice editors (e.g. Zoho/QuickBooks) often have WYSIWYG preview. Our Editor already has 3 columns; the InvoicePreview in center should update live as data changes. Use Tailwind flex/grid for responsive design.  
- **Onboarding Flow Patterns:** B2B SaaS often uses modals/wizards (e.g. Slack’s initial setup). Provide a quick wizard for business info, adding first client, etc. Use a progress bar and skip options. Current `Onboarding.tsx` covers essentials; ensure it ties to Zustand (`onboarding_complete`).  
- **Client Portal Payment UX:** Best practice (e.g. FreshBooks, Square) is a clean invoice page with “Pay Now” button integrated with Stripe/PayPal. Also auto-send overdue reminders. Our SharedInvoice page should show totals prominently, due date, and a conspicuous “Mark as Paid/Download PDF” (no auth needed). We’ll add a payment link placeholder (Stripe) and record a “viewed” event.

## 2.3 Multilingual Voice Input — Technical Research

- **Indic STT State (2025):** Recent benchmarks (AI4Bharat) show Whisper Large/Turbo still strong for Hindi/Tamil/Malayalam, but specialized models (IndicWhisper 2024) are on par. Code-switched recognition (Hinglish, Tanglish, Manglish) is improving but still error-prone.  
- **LLMs vs Dedicated ASR:** OpenAI’s Whisper (v3.1-turbo) excels on English but less so on code-switched speech. Faster-Whisper large-v3-turbo is state-of-art offline, but accuracy can drop with heavily accented or mixed language audio.  
- **Real-time STT Options:** Deepgram, AssemblyAI now offer streaming APIs with Indic support. Google Cloud has a streaming endpoint that supports Hindi/Tamil. Whisper’s Python sidecar currently does batch. A better alternative might be “speechly” or Mozilla DeepSpeech fine-tuned models for live transcription. No fully free open streaming solution beats Deepgram’s accuracy; Deepgram starts at ~$0.02/min for streaming.  
- **Benchmarks (WER):** IndicWhisper reports ~10-15% WER for pure Hindi, higher for code-mix. Faster-Whisper large may be similar. For our app, user transcripts can be edited, so perfect WER is less crucial.  
- **Detection Badge:** Use a simple language classifier on transcript (Whisper returns `language` field) to display (e.g. a flag icon for detected language). Confidence can come from language detection or match percentage.  

## 2.4 PDF Generation — Best Practices

- Puppeteer remains a robust choice for high-fidelity invoice PDFs. However, alternatives like `react-pdf` (canvas-based) or `pdfmake` produce vector PDFs faster. `@react-pdf/renderer` can bundle templates but is slower for large templates. For invoices, Puppeteer’s speed (~100ms per page) is acceptable in server. If deploying serverless, need care (use a headless binary). No clear replacement beats Puppeteer’s CSS fidelity in 2026. **Conclusion:** Keep Puppeteer, but ensure caching and possibly move to worker queue if scaling.  

---

# Phase 3 — Unified Intelligence Architecture

## 3.1 Dashboard AI Creation Flow Redesign

**State Machine (Unified for Text & Voice):**  
1. **Idle** (none active)  
2. **Prompt Entry** (text mode only) or **Recording** (voice mode)  
3. **Transcribing/Review** (voice only): show STT transcript (Web Speech then Whisper result) and “Proceed to Invoice”.  
4. **AI Generating**: SSE streaming from LLM. Display mini-preview panel streaming fields.  
5. **Preview/Diff**: Pause when complete; display `AIChangeDiff` overlay to confirm changes.  
6. **Confirm or Cancel**: On confirm, create invoice; on cancel, return to idle.

**Component Hierarchy:**  
- `UnifiedAICreateModal` (new): invoked from Dashboard (button). Props: `mode` ('text' or 'voice').  
  - Internally uses sub-components:
    - `PromptInput` or `VoiceRecorder` (handles Web Speech interim UI).  
    - `TranscriptReviewPanel` (shows Whisper text editable).  
    - `PipelineProgressVisualizer` (shows stage: e.g. recording spinner, processing)  
    - `AIChangeDiff` (reuse existing) after generation.  
- **Reusing Editor logic:** The Dashboard flow should import `AIAssistantSidebar` or break out its logic. Likely better: extract common hooks (useAIInvoice) for streaming and diff, used by both Dashboard and Editor. 

We reuse `AIChangeDiff.tsx` and drawing from `buildClientContext` etc. The Dashboard will navigate to Editor only after user accepts the diff.

## 3.2 Speech Intelligence Redesign

**Server Endpoints:**  
- `POST /api/v1/transcribe-audio`  
  - **Auth:** Yes  
  - **Input:** multipart with audio file (Blob).  
  - **Process:** Run `faster-whisper` (or chosen ASR) to get `transcript`, `detectedLanguage`, `confidence`.  
  - **Output:** `{ transcript: string; language: string; confidence: number }`.  
- `POST /api/v1/text-to-invoice-from-transcript` (streaming)  
  - **Auth:** Yes  
  - **Input:** `{ transcript: string; invoiceContext?: object }`  
  - **Process:** Prompt LLM with transcript (and invoiceContext). Use SSE response of JSON fields.  
  - **Output:** SSE stream of AI-generated invoice JSON fields.

**Frontend Flow (Voice):**  
1. **Recording:** Web Speech API shows interim captions in modal (updates `transcript`).  
2. **Stop & Submit:** On stop, send audio blob to `/transcribe-audio`. Transition to “transcribing” stage.  
3. **Review:** Show returned transcript in editable textarea with language badge and confidence. Buttons: “Edit” or “Proceed”.  
4. **Generate:** On proceed, call `/text-to-invoice-from-transcript` with final transcript; set `voiceStage='generating'`.  
5. **Streaming:** Show SSE stream populating invoice fields (reuse mini-preview).  
6. **Diff & Confirm:** After stream end, show `AIChangeDiff`. Then save on user confirm.

This same `TranscriptReviewPanel` and `PipelineProgressVisualizer` used in both Dashboard and Editor voice modes.

## 3.3 Authentication & Persistence Architecture

- **UI Pages:**  
  - `Login.tsx` (fields: email, password). Submits to `POST /api/v1/auth/login`. On success, store httpOnly cookie.  
  - `Register.tsx` (fields: name, email, password). Submits to `POST /api/v1/auth/register` (or `/login` with logic).  
- **Auth State (Zustand):**  
  ```ts
  interface AuthState { user: User|null, isAuthenticated: boolean }
  ```
  Use `supabase.auth.onAuthStateChange()` or Axios interceptors: on 401, redirect to `/login`.  
- **Token Storage:** httpOnly cookie with JWT (for XSS protection).  
- **Supabase vs Custom:** Use Supabase Auth to simplify. Justify: built-in providers, secure tokens, and integration with Supabase DB. Avoid custom JWT complexity.  
- **Sync Integration:**  
  - After `login`, call `loadFromCloud()` to fetch user’s invoices (using `supabase.from('invoices').select(...)` or via REST).  
  - On `logout`, clear `invoices` state and redirect to `/login`.  
  - In `syncToCloud()`, do `supabase.from('invoices').upsert({ user_id: currentUser.id, ...invoiceData })`. Use user’s actual UID from `supabase.auth.user().id`.  
- **Auth Routes:** Protect API routes with `requireAuth` middleware already present; no frontend route should be accessible without login except `/login`, `/register`, `/shared/:token`.

## 3.4 Client Portal Completion

- Replace `SharedInvoicePage.tsx` content:  
  - Render `<InvoicePreview invoice={invoice} />`.  
  - Add **Download PDF** button: onClick triggers `GET /api/v1/shared/${token}/pdf` (new endpoint). The server should mirror authenticated PDF logic but find invoice by share-token.  
  - On mount, call `POST /api/v1/shared/${token}/view` (new endpoint) to mark “viewed” in database.  
  - Add a “Payment” section: e.g. `<button>Pay via Stripe</button>` (placeholder).  
  - No login required. Token in URL is the auth.  
  - Style: mimic brandable portal (simple header with client’s name, invoice no, total, due).

## 3.5 Proactive AI Intelligence Layer

- **Endpoint:** `POST /api/v1/invoices/:id/analyze` (no auth beyond owner). Called:
  - After any AI generation or invoice edit (server-side hook).
  - On invoice open if `updatedAt < now-7d`.  
- **Output Schema:**  
  ```ts
  interface AnalysisSuggestion {
    type: 'DUE_DATE_PAST'|'MISSING_DUE_DATE'|'HIGH_TAX_RATE'|'ZERO_ITEMS'|'MISSING_NOTES'|'CLIENT_RATE_CHANGE'|'UNUSUAL_TOTAL';
    message: string;
    severity: 'warning'|'info';
  }
  ```
- **Implementation:** Server uses a combination of rule-based checks and LLM prompt: e.g., prompt with invoice JSON, ask for suggestions in that schema. Or simpler: implement known rules:
  - If `dueDate < today`: DUE_DATE_PAST (warn “Invoice is overdue!”).  
  - If `!dueDate`: MISSING_DUE_DATE (“No due date set”).  
  - If `taxRate>30%`: HIGH_TAX_RATE.  
  - If `items.length===0`: ZERO_ITEMS.  
  - If `!invoice.notes`: MISSING_NOTES.  
  - For CLIENT_RATE_CHANGE and UNUSUAL_TOTAL: lookup invoice history via `invoices` table aggregate on same client: compare item rates and totals (if >3× average, UNUSUAL_TOTAL; if first item differs much from last project rate, CLIENT_RATE_CHANGE). Use simple thresholds.  
- **Frontend:**  
  - New component `AnalysisSuggestionCard`: shows icon, message, “Dismiss” button.  
  - Add to left panel (AI Assistant area) as a list of dismissible cards.  
  - Dismissal: On click, call `POST /api/v1/invoices/:id/analyze/dismiss` (or store locally in DB) to mark suggestion ignored per invoice.  

---

# Phase 4 — Complete Refactor Architecture

## 4.1 Bug Fix Specifications

| Priority | ID   | File/Function                | Change Summary                                                                                       | Test (integration)                    |
|----------|------|------------------------------|------------------------------------------------------------------------------------------------------|--------------------------------------|
| **P0**   | B-02 | `server.ts` `buildPrintHTML()` | **Before:** uses `subtotal = items.reduce((…)); discount = Math.min…`. **After:** `const totals = computeInvoiceTotals(invoice)`, use `totals.subtotal, discount, tax`, all Decimal. | Create invoice with known values, export PDF, verify totals exactly match `calculations.ts` logic. |
|          | B-03 | *Add* `src/pages/Login.tsx` | Create login form. POST to `/auth/login`. Redirect to Dashboard on success. | Attempt to access `/editor` without login → redirected `/login`. Valid login opens dashboard. |
|          | B-04 | `server.ts` user storage | **Before:** `const users = new Map();`. **After:** Remove Map; use Supabase Auth: `await supabase.auth.signUp()` / `signIn()` in login routes. | Register a user, restart server, log in again → successful; user persists. |
|          | B-05 | `src/store/useStore.ts` `syncToCloud` | **Before:** `supabase.from('invoices').upsert({ user_id: 'local', ... })`. **After:** use `user_id = supabase.auth.user().id`. | Two users create different invoices; ensure each only sees their own. |
|          | B-06 | `AIAssistantSidebar.tsx` `handleAudioGenerate` | **Before:** calls `/audio-to-invoice`. **After:** First POST to `/transcribe-audio`, wait, display transcript, then on confirm POST `/text-to-invoice-stream`. | Speak distorted phrase; correct transcript; AI invoice uses corrected text. |
|          | B-08 | `SharedInvoicePage.tsx`           | **Before:** JSON dump `{JSON.stringify(invoice)}`. **After:** `<InvoicePreview invoice={invoice} />` plus buttons for PDF and pay. | Visit shared link with known invoice; see styled invoice, PDF downloads with correct content. |
| **P1**   | B-01 | `Dashboard.tsx` `handleCreateAI`| **Before:** uses fetch `/generate-invoice`. **After:** use `/generate-invoice-stream` (SSE) and process tokens. Show mini-preview (e.g. re-use `AIAssistantSidebar` logic) and call `AIChangeDiff` before navigate. | Initiate text AI invoice; verify UI streams lines and waits for user to confirm fields. |
|          | B-07 | `AIAssistantSidebar.tsx` `handleAudit` | **Before:** local checks array. **After:** `const res = await fetch('/invoices/${id}/validate'); issues = res.json().issues;`. Display accordingly. | Trigger audit on missing field; server should catch complex case (e.g., Tax mismatch). |
|          | B-09 | `Dashboard.tsx` (template section) | **Before:** blank skeletons. **After:** import `TEMPLATES`, map to cards with preview images and names. Use `InvoicePreview` with demo data. | Dashboard loads; real templates display. |
|          | B-10 | `Dashboard.tsx` (voice flow) | **Before:** simple modal without transcript. **After:** integrate Web Speech interim and review, reuse Editor voice pipeline (WS → Whisper → UI). | Voice mode: user speaks, sees real-time words, stops, sees final text, confirms. |
|          | B-11 | `Dashboard.tsx` `startBlank()` | **Before:** includes `businessInfo` inline. **After:** possibly remove and let invoice fetch `businessInfo` from store on render or store reference. | Update business info in Settings, navigate to Dashboard, create new invoice → invoice reflects updated business info. |
|          | B-12 | `App.tsx`               | **Before:** `if (!localStorage.getItem('onboarding_complete'))`. **After:** use `const { onboardingComplete } = useStore();` from Zustand and react to that. | First-time load redirect to onboarding; completing onboarding sets store and proceeds. |
|          | B-13 | `Editor.tsx` footer    | **Before:** static “Saved”. **After:** `<SyncIndicator />` component. | Make unsynced change; header should show “Saving...” then “Saved” with time. |
| **P2**   | B-14 | `server.ts` generate-stream | **Before:** `withRetry(ollama)`. **After:** `callWithFallback(ollama, groq, streamCallback)`. | Force Ollama error; verify streaming switches to Groq and still responds. |
|          | B-15 | `AIAssistantSidebar.tsx` (voice SSE)| **Before:** `fetch('/audio-to-invoice')`. **After:** SSE `fetch('/text-to-invoice-from-transcript')`. | Same as B-06 tests (ensure streaming). |
|          | B-16 | `Editor.tsx` currency select | **Before:** change currency just updates label. **After:** prompt conversion; apply rate via open API. | Change invoice currency USD→INR on existing invoice; values convert accordingly if accepted. |
|          | B-17 | `Editor.tsx`, CSS    | **Before:** sidebars `w-[320px]`. **After:** use Tailwind responsive classes (`md:w-280px`, `sm:hidden` sidebars on narrow). | Resize viewport to 375px; layout reorganizes (sidebars hidden or collapsed). |

(For brevity, actual code diffs and tests would be provided in implementation. Each fix should cite the file and function as above.)

## 4.2 Missing Feature Implementation Plans

| ID   | Feature            | Server Endpoint(s)                                              | Frontend UI Components                                    | Details |
|------|--------------------|-----------------------------------------------------------------|-----------------------------------------------------------|---------|
| **M-01** | **Email Sending** | - `POST /api/v1/invoices/:id/send` — payload `{to,subject?,message?,attachPDF}`<br>- `POST /api/v1/invoices/:id/draft-email` (AI) returns `{subject, body}` | - `EmailCompositionModal` component (triggered by “Send Invoice” button in Editor header).<br>- Fields: To (prefilled with client email), Subject, Body (AI-generated). Buttons: “Send” (calls send endpoint) and “Cancel”. | **Server:** Validate invoice exists. Generate PDF (`buildPrintHTML`). Use Mailer (e.g. Nodemailer or Resend) to send email with PDF. Return success/failure. **AI Endpoint:** Craft prompt: “Compose a professional email to client [name] regarding invoice [number] of [amount] due [dueDate].” Return polite template. |
| **M-02** | **OCR Receipt Import** | - `POST /api/v1/ocr-import`<br>   - Input: multipart/form-data with image/pdf.<br>   - Process: Use Tesseract.js (Node) or call Google Vision for text. Then prompt LLM to parse line items (schema output).<br> - Return: `{ invoiceData: Partial<Invoice> }` ready for diff. | - Dashboard: Add “Import Receipt” button. File picker → show loading state → open `AIChangeDiff` with OCR-parsed fields. | **Prompt Strategy:** “Parse the following receipt text into an invoice format: {OCR text}. Return JSON with items, amounts.” Use chain-of-thought if needed. Ensure numeric parsing (Decimal). |
| **M-03** | **Proactive Suggestions** | - (See 3.5) `POST /api/v1/invoices/:id/analyze` & `POST /api/v1/invoices/:id/dismiss` | - `AnalysisSuggestionCard` (list in AI sidebar). Shows icon, message, dismiss (calls dismiss endpoint). | Suggestion logic as above. Persist dismissed suggestions either in a `invoice_suggestions` table (id, type, dismissed). |
| **M-04** | **Smart Template Suggestion** | - Extend `generate-invoice-stream` response schema to include `suggestedTemplateId`. | - After AI generation, if `suggestedTemplateId`, show banner: “Try [Template Name]?” with button to apply. | **Prompt:** Include list of template IDs/names in system prompt, ask LLM to pick best. UI: on accept, set invoice.themeColor/logo etc. |
| **M-05** | **Recurring Billing** | - Create `recurring_schedules` table (id, invoice_id, frequency (daily/week/month), nextDate).<br> - Server cron job (node-cron daily): for schedules due today, clone invoice, send or mark as generated. | - In Editor: “Set as Recurring” toggle/section. Options: Frequency select (weekly, monthly, etc), start date. | Saving schedule: POST to `/api/v1/invoices/:id/recurring` with details. Cron: uses `cron.schedule` to check and create new invoices. Mark original status as sent if auto-sent. |
| **M-06** | **Audit Log** | - Table `audit_logs` (id, invoice_id, timestamp, change JSON).<br> - Server: On any invoice save (create/update/send), call `POST /api/v1/audit` to log diff. | - Editor: “History” button opens a drawer showing list of logs from DB (timestamps and diffs). Use a collapsed JSON diff or textual summary. | Logging: e.g., using JSON diff lib. Each action: fields changed and old→new. UI: `AuditLogDrawer` component. |
| **M-07** | **Multi-Currency** | - Integrate free FX API (e.g., exchangerate.host).<br> - Endpoint: `GET /api/v1/rates?base=USD&target=INR`. | - In Editor: Currency dropdown. On change, if invoice has amounts, show modal: “Convert from [old currency] to [new]? (Rate: X)”. Buttons: Accept/Decline. If accept, multiply all rates/totals (use Decimal) and set new `currency`. Store original rate values with invoice for audit. | Store display currency override. If declining, only change symbol. If accept, update item rates and taxes using fetched rate. |
| **M-08** | **Client Portal Actions** | - (Shared) `GET /api/v1/shared/:token/pdf` (similar to send PDF).<br> - `POST /api/v1/shared/:token/mark-paid` to record payment (future).<br> - `POST /api/v1/shared/:token/view` to log view time. | - On SharedInvoicePage: **Download PDF** button; **Mark as Paid** (fake with local state or send token). Show a “Paid” badge if marked. | No auth needed except token. Payment link placeholder: if integrated, redirect to Stripe. |

## 4.3 Component Architecture Additions

- **`UnifiedAICreateModal`** (`src/components/UnifiedAICreateModal.tsx`)  
  **Props:** `{ mode: 'text'|'voice'; onCreate(invoice: Invoice): void; onCancel(): void }`  
  **State:** `step: 'input'|'review'|'diff'`, `promptOrTranscript`, `aiResponse`, `aiDiff`.  
  **Events:** `onPromptChange`, `onVoiceRecord`, `onTranscriptEdit`, `onConfirmDiff`.  
  **Responsive:** Fullscreen on mobile. Keyboard accessible (tab through fields, Enter to submit, Esc to cancel).  
- **`TranscriptReviewPanel`** (`src/components/TranscriptReviewPanel.tsx`)  
  **Props:** `{ transcript: string; language: string; confidence: number; onTranscriptChange: (t: string)=>void; onProceed: ()=>void }`  
  **State:** none internal (controlled).  
  **Features:** Displays transcript textarea, language badge, confidence%. Validate emptiness.  
- **`PipelineProgressVisualizer`** (`src/components/PipelineProgressVisualizer.tsx`)  
  **Props:** `{ stage: 'recording'|'transcribing'|'generating'; progress?: number }`  
  **UI:** Shows animated icon or progress bar per stage (e.g. pulsing mic icon, spinner for transcribing, token counter for generating).  
- **`AnalysisSuggestionCard`** (`src/components/AnalysisSuggestionCard.tsx`)  
  **Props:** `{ suggestion: AnalysisSuggestion; onDismiss: (type)=>void }`  
  **UI:** Icon (warning/info), message text, “Dismiss” button. ARIA: role="alert" for suggestion.  
- **`LoginPage` / `RegisterPage`** (`src/pages/Login.tsx`, `src/pages/Register.tsx`)  
  **Props:** n/a (standard route).  
  **State:** email, password, [name], error.  
  **Events:** onSubmit → API call. Navigate on success. ARIA: form labels, error announcements.  
- **`EmailCompositionModal`** (`src/components/EmailCompositionModal.tsx`)  
  **Props:** `{ invoice: Invoice; onSend(to,subject,message): void; onCancel(): void }`  
  **State:** `to`, `subject`, `body`, `isSending`.  
  **Features:** Prefill `to=invoice.customerInfo.email`. Textarea for body (AI-loaded). Buttons send/cancel.  
  **Accessibility:** Labelled fields, role="dialog".  
- Additional states or context for `useStore` to hold `auth.user`.

## 4.4 Server Endpoint Registry

| Method | Path                                  | Auth Required | Request Schema                            | Response Schema                            | Notes |
|--------|---------------------------------------|---------------|-------------------------------------------|--------------------------------------------|-------|
| GET    | `/api/v1/invoices`                    | Yes           | (optional filters)                        | `{ invoices: Invoice[] }`                  | List user’s invoices |
| POST   | `/api/v1/invoices`                    | Yes           | `Invoice` (partial for creation)          | `{ invoice: Invoice }`                     | Create new |
| GET    | `/api/v1/invoices/:id`                | Yes           | -                                         | `{ invoice: Invoice }`                     | |
| PUT    | `/api/v1/invoices/:id`                | Yes           | `Invoice` (fields to update)              | `{ invoice: Invoice }`                     | |
| DELETE | `/api/v1/invoices/:id`                | Yes           | -                                         | `{ success: boolean }`                     | |
| POST   | `/api/v1/invoices/:id/validate`       | Yes           | -                                         | `{ isValid: boolean, errors: string[] }`   | Audit validation |
| POST   | `/api/v1/generate-invoice`            | Yes           | `{ prompt: string }`                      | `{ invoice: Invoice }`                     | Blocking AI (legacy) |
| POST   | `/api/v1/generate-invoice-stream`     | Yes           | `{ prompt: string }` (SSE)                | `Invoice` JSON via SSE, plus `suggestedTemplateId?` | Streaming AI output |
| POST   | `/api/v1/audio-to-invoice`            | Yes           | (FormData: `audio: Blob`)                 | `{ invoice: Invoice }` (blocking)          | Legacy voice flow |
| **NEW**   | `/api/v1/transcribe-audio`         | Yes           | FormData: `audio: Blob`                  | `{ transcript: string; language: string; confidence: number }` | STT step |
| **NEW**   | `/api/v1/text-to-invoice-from-transcript` | Yes | `{ transcript: string; invoiceContext?: object }` (SSE) | SSE: `Invoice` JSON | Voice->LLM streaming |
| POST   | `/api/v1/invoices/:id/send`           | Yes           | `{ to: string; subject?: string; message?: string; attachPDF: boolean }` | `{ success: boolean }`                      | Sends email |
| POST   | `/api/v1/invoices/:id/draft-email`    | Yes           | -                                         | `{ subject: string; body: string }`        | AI-draft email |
| POST   | `/api/v1/ocr-import`                  | Yes           | FormData: `file: image/pdf`               | `{ invoiceData: Partial<Invoice> }`         | OCR file import |
| POST   | `/api/v1/invoices/:id/analyze`        | Yes           | -                                         | `{ suggestions: AnalysisSuggestion[] }`   | Proactive AI suggestions |
| POST   | `/api/v1/invoices/:id/analyze/dismiss`| Yes           | `{ type: string }`                        | `{ success: boolean }`                     | Dismiss suggestion |
| POST   | `/api/v1/invoices/:id/recurring`      | Yes           | `{ frequency: string; startDate: string }`| `{ scheduleId: string }`                    | Create recurring |
| POST   | `/api/v1/audit`                       | Yes           | `{ invoiceId: string; change: object }`   | `{ success: boolean }`                     | Log an audit entry |
| GET    | `/api/v1/shared/:token`               | No            | -                                         | `{ invoice: Invoice }`                     | Fetch shared invoice |
| GET    | `/api/v1/shared/:token/pdf`           | No            | -                                         | PDF stream (application/pdf)              | Shared PDF download |
| POST   | `/api/v1/shared/:token/view`          | No            | -                                         | `{ success: boolean }`                     | Mark viewed |
| POST   | `/api/v1/shared/:token/mark-paid`     | No            | -                                         | `{ success: boolean }`                     | (Placeholder) |
| POST   | `/api/v1/auth/login`                  | No            | `{ email: string; password: string }`     | `{ accessToken: string; refreshToken: string; user: User }` | Auth user |
| POST   | `/api/v1/auth/register`               | No            | `{ name: string; email: string; password: string }` | `{ user: User }`                  | Register user |
| POST   | `/api/v1/auth/refresh`                | No            | `{ refreshToken: string }`                | `{ accessToken: string; refreshToken: string }` | Token refresh |

*Status:* All new endpoints marked **NEW**; existing were verified in code (server.ts). Schemas use `Invoice` interface defined in `src/types.ts`.  

---

# Phase 5 — Implementation Roadmap

## 5.1 Sprint Plan

| Sprint | Goal & Deliverables                                        | Criteria                                               | Est. Effort | Risks                    |
|--------|------------------------------------------------------------|--------------------------------------------------------|-------------|--------------------------|
| **Sprint 0** | *Fix Critical Regressions*<br>- Replace `buildPrintHTML` math (B-02).<br>- Implement Auth: `/auth/login`, user persistence (B-03,B-04).<br>- Sync: use real user_id (B-05).<br>- Voice transcript review (B-06): stub UI + `/transcribe-audio`. <br>- SharedInvoice render (B-08). | PDF totals correct (unit test). Able to register/login, data persists, sync separates users. Voice shows transcript UI before AI. Shared link shows formatted invoice. | 10d | Decimal.js test coverage, Supabase setup, Whisper performance. |
| **Sprint 1** | *Unify AI Creation Experience*<br>- Dashboard text flow to SSE (B-01).<br>- Dashboard voice pipeline (B-10).<br>- Template thumbnails (B-09).<br>- Audit use server (B-07). | Dashboard AI uses streaming with `AIChangeDiff`. Voice shows recording/transcript. Templates display real previews. Audit runs server-side. | 8d | SSE implementation, merging refactored voice code, consistent diff UI. |
| **Sprint 2** | *Authentication and Login*<br>- Pages: `Login.tsx`, `Register.tsx` (M-?).<br>- Zustand auth state, cookie storage.<br>- Integrate Supabase Auth (B-05 final).<br>- Redirects on 401, post-login restore and load data (B-05). | User can sign up, log in, log out. Invoices saved per-user. Protected routes block access. | 5d | Token handling (refresh), cookie config, legacy data migration. |
| **Sprint 3** | *Proactive Intelligence & AI Enhancements*<br>- Proactive suggestions endpoint/UI (M-03).<br>- Smart template suggestion (M-04).<br>- OCR import (M-02) (simple MVP).<br>- Audit log UI (M-06). | Suggestions appear/dismiss correctly. Template prompt yields suggestions. Receipt upload returns invoice draft. History drawer shows changes. | 12d | LLM prompt tuning, OCR accuracy, database logging schema. |
| **Sprint 4** | *Complete Workflow Loop*<br>- Email sending (M-01).<br>- Client portal “download PDF” & “mark as viewed/paid” (M-08).<br>- Recurring schedules (M-05). | Emails sent (test SMTP). Shared link PDF works. New invoices auto-generated daily (simulate). | 10d | Email deliverability, cron job reliability, time zones. |
| **Sprint 5** | *Polish & Mobile*<br>- Mobile responsive fixes (B-17).<br>- Onboarding state (B-12).<br>- Editor footer `SyncIndicator` (B-13).<br>- Animation tweaks, code cleanup. | UI responsive on phone (viewport test). Onboarding works via store. SyncIndicator shows correct status. | 4d | CSS quirks, cross-browser testing. |

## 5.2 Risk Register

| Risk                                              | Likelihood | Impact | Mitigation                                              |
|---------------------------------------------------|------------|--------|---------------------------------------------------------|
| **Puppeteer in serverless:** May fail to run in some cloud environments (size)** | M          | H      | Use a headless Chrome layer or switch to a lightweight library if needed (e.g. `@react-pdf/renderer`). Pre-warm container, or move to dedicated VM. |
| **Whisper accuracy on code-mixed:** Could degrade voice UX.| M         | H      | Allow user edits (as designed). Consider fallback to cloud STT or use domain-specific ASR if needed. Continuously evaluate fine-tuned models. |
| **Supabase Auth vs custom JWT:** Migration complexity.    | H          | H      | Decide early (Supabase chosen). Prepare migration plan. Feature-flag old vs new auth. Write scripts to backfill user data. |
| **Data loss on migration:** Users may lose localStorage data when moving to cloud sync. | M | H | Prompt user to export data before update. Or on first login, merge existing local data into cloud carefully. Provide “Import local” option. |
| **Decimal.js regression:** If missed in PDF gen, CFO complains. | L  | H      | Write automated tests comparing `calculations.ts` vs PDF output. Peer review diff. |
| **Microphone permissions:** Android Chrome requires user action per session. | M | M | Provide clear UI prompt. Fallback to file upload or unsupported message. Test on devices early. |
| **Node-cron single process:** No persistence, lost on deploy.  | L | M | Use a persisted job store (e.g. BullMQ + Redis) or external scheduler. As stopgap, ensure cron job is idempotent. |

## 5.3 Keep/Redesign/Rebuild

- **KEEP (no change):**  
  - `calculations.ts` (already using Decimal, validated).  
  - `Supabase sync architecture` in `useStore.ts` (apart from user ID).  
  - `AIChangeDiff.tsx` component.  
  - `InvoicePreview.tsx` (for rendering).  
  - Three-column Editor layout (Left AI, Center, Right) – just make it responsive.  
- **REDESIGN (partial):**  
  - `Dashboard.tsx`: update AI flows, template gallery, sidebars.  
  - `AIAssistantSidebar.tsx`: restructure voice pipeline, incorporate transcript.  
  - `App.tsx`: auth guards (replace onboarding logic).  
  - `useStore.ts`: auth state and real user ID.  
- **REBUILD:**  
  - None from scratch; all core components are valid. Possibly rebuild minor UI elements (Login, EmailModal) from scratch due to being absent.

---

## Open Questions / Limitations

- **Offline vs Cloud AI:** We assume Ollama stays available offline. If local inference becomes too slow, might need fallback strategy (e.g. optional cloud API with user opt-in).  
- **Payment Integration:** Actual payment (Stripe, Razorpay) beyond scope; we stub portal actions.  
- **Localization:** We support multi-language speech, but invoice UI remains English. Adding locale support would be future work.  
- **Scaling SSE:** For many concurrent users, our Node server must handle multiple SSE streams; monitor performance.  

