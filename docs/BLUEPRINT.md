# Voice-to-Invoice: build blueprint

Version 1.0 · 18 November 2026 · For Muzammil and the coding agent. Status tags: LOCKED = decided. PROPOSED = recommended, confirm before building. OPEN = undecided, use the stated placeholder.

## 0. How to use this document

- This is the single source of truth. Where code, old docs or repo history disagree with it, this document wins. The old enterprise plan lives only in git tag `archive/enterprise-v1`.
- Build in the order of section 12. A milestone starts only after the previous one's acceptance criteria pass.
- Do not build anything listed in 1.3.
- Every feature ships with tests (section 11).
- For OPEN decisions: do not decide. Use the placeholder, put the choice behind an interface or config value, and list it in your report.
- An LLM never computes money, totals, layout or dates. Code does. LLMs only clean up text.
- Make small commits, one concern each. When a requirement is ambiguous, ask the owner instead of guessing.

## 1. Product

### 1.1 Summary

A mobile-first and desktop web app that lets one small-business owner create invoices by speaking. The app collects the invoice one field at a time (recipient, date, then each row column by column), shows what it heard and what it understood, and commits a value only after the user confirms it. A Python renderer produces the PDF. The first and only user is the owner's father, who dictates in a Malayalam and English mix.

### 1.2 Success criteria (measured during the pilot)

- Your father creates a correct invoice by voice without help.
- Median time for a 4-row invoice: under 3 minutes in week 1, under 2 minutes by week 4.
- At most 1 redo per field on average.
- Fewer than 10 percent of finalized invoices need a revised copy within 24 hours.

### 1.3 Non-goals (version 1)

GST or any tax lines, discounts, units, multiple users or roles, customer portal, sending email, recurring invoices, payments, inventory, multiple currencies, non-English PDFs, accounting export, native mobile apps, offline invoice creation.

## 2. Decisions

### 2.1 Locked

| Area | Decision |
| --- | --- |
| Users | One business, one workspace. Every table carries `workspace_id` (a single row for now) so scaling later is cheap. |
| Flow | Home, Design, Columns, Voice fill, Review, PDF. Design and Columns are remembered and skipped after first setup. |
| Columns | Chosen from a pool with rules. Version 1 enables No., Item, Qty, Rate, Amount. Rate is per piece. Amount = Qty x Rate, computed by code. No GST. |
| Fill | Recipient first, date defaults to today, then rows column by column. Every value is confirmed before it is committed. |
| Input split | Voice is for content. Taps are for structure (insert, delete, move rows). |
| STT | Sarvam Saaras v4 over REST with keyterms. The provider sits behind an adapter. |
| Control | Deterministic state machine. An LLM only normalizes text steps. Code does money, validation, matching and rendering. |
| Renderer | Python reportlab, fully data-driven. The same renderer makes the preview and the PDF. |
| Language | English PDF, amounts in INR. Spoken input may be Malayalam, English or mixed. |
| Revisions | Finalized invoices are immutable. A fix creates a revised copy. |
| Drafts | Autosaved after every confirmed command. |
| Design data | Nothing is hardcoded in a design. Business details, labels, rows and footer all come from data. |

### 2.2 Proposed

| Area | Proposal |
| --- | --- |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLite (WAL), SQLAlchemy, Alembic, rapidfuzz, reportlab, PyMuPDF, httpx. One language with the renderer. |
| Frontend | React, TypeScript, Vite, Tailwind (already in the repo), React Router, TanStack Query. Installable PWA. |
| Login | A single PIN hashed with argon2id, session cookie. |
| Hosting | One small VM in India (or a host with a persistent disk), Caddy for HTTPS, Docker. No serverless. HTTPS is required for microphone access. |
| Preview | Server-rendered PNG pages, not an inline PDF viewer (phone browsers handle inline PDFs badly). |
| Mic | Tap to start, tap to stop, with silence auto-stop as an assist. On desktop, hold Space. |
| Audio retention | Audio is kept only while 'Help improve voice' is on (on during the pilot) and deleted after 90 days. Transcripts and outcomes are always stored. |

### 2.3 Open

| Decision | Placeholder until decided | Blocks |
| --- | --- | --- |
| Your father's design pick | Reference skin = design 1 (simplest). The picked design is ported when known. | Pilot |
| LLM for the Normalizer | Rule-based cleanup behind a `Normalizer` interface. Pick by eval. | M3 |
| Hosting provider | Local Docker plus any one VM. | M0 deploy |
| 'Revised' mark on the customer's PDF | None. | Cosmetic |
| UI language | English, strings externalized. | Nothing |

## 3. Domain model

### 3.1 Number, money and text rules

- Money and quantities are Decimal, never float. JSON carries them as strings.
- Qty: greater than 0, up to 3 decimals, default 1, maximum 100000.
- Rate: greater than 0, up to 2 decimals, maximum 10000000.
- Amount = Qty x Rate rounded half up to 2 decimals. Total = sum of Amounts (or of Rates when the preset has no Qty and Amount).
- Display uses Indian digit grouping (12,34,567.50) with the symbol and format from settings (default ₹). If a skin's font lacks the glyph, fall back to 'Rs.'.
- Dates are stored as ISO 8601 and displayed like 10 November 2026 (configurable). Timezone Asia/Kolkata. The default is today.
- Text is trimmed with whitespace collapsed. Recipient up to 80 characters, item up to 120. The PDF uses Latin script only.

### 3.2 Entities

| Entity | Key fields |
| --- | --- |
| BusinessProfile | name, address\_lines (max 4), phones (max 3), footer, currency, date\_format, default\_preset\_id, pin\_hash, help\_improve\_voice |
| Preset | id, name, design\_id, columns (ordered ids), labels (overrides for billed\_to, date, total), archived |
| Invoice | id, status (draft, final, archived), revision\_of, rev, snapshot (design\_id, columns, labels and business profile at creation), billed\_to, date, rows (row\_id plus cells), total, pdf\_sha256, version, created\_at, finalized\_at |
| Customer | id, display\_name, norm\_name, use\_count, last\_used\_at |
| ItemMemory | id, display\_name, norm\_name, use\_count, last\_used\_at, recent\_rates (last 10) |
| Alias | kind (customer or item), heard\_norm, target\_id (learned when a user corrects a proposal and confirms) |
| Command | id, invoice\_id, seq, type, args, source (voice, tap, undo, redo), idempotency\_key, created\_at |
| Turn | id, invoice\_id, step\_key, provider, mode, transcript\_raw, proposal, outcome (confirmed, redo, edited, abandoned), final\_value, stt\_ms, parse\_ms, audio\_path (nullable), created\_at |

Customer and ItemMemory update when an invoice is finalized. Memory is never built from drafts.

### 3.3 Column registry

| Id | Label | Kind | Filled by | Width | Align | Version 1 |
| --- | --- | --- | --- | --- | --- | --- |
| no | No. | serial | auto | fixed, narrow | center | on |
| item | Item | text | voice | flexible, wraps | left | on |
| qty | Qty | number | voice, default 1 | fixed | right | on |
| unit | Unit | text | voice or default | fixed | left | off |
| rate | Rate | money | voice | fixed | right | on |
| discount | Disc % | percent | voice | fixed | right | off |
| tax | Tax % | percent | voice | fixed | right | off |
| amount | Amount | money | computed | fixed | right | on |

### 3.4 Preset rules (validated on the server and in the picker)

1. Item and Rate are required.
2. Qty and Amount come together: Amount requires Qty and Rate, and Qty requires Amount.
3. The total column is Amount if present, otherwise Rate.
4. At most 6 columns. Order follows the registry. Users toggle columns, they do not reorder them.
5. Columns marked off in version 1 stay hidden in the picker.
6. A draft's columns cannot change after its first row exists. The user starts a new invoice instead.

### 3.5 Lifecycle

- Draft: editable, autosaved, with its own command log.
- Final: created by Finalize. Data, snapshot and PDF are immutable. The PDF is stored by content hash.
- Revise (from Final): creates a new Draft with rev + 1 and `revision_of` set, copying the snapshot and rows. Finalizing it makes a new PDF. The original is never touched.
- Duplicate: creates a new, unrelated Draft with the same recipient and rows and today's date.
- Archive: hides a Final invoice from Recent. Nothing is deleted in version 1 except empty abandoned drafts after 30 days.
- Recent shows the latest revision of each chain with a badge such as Rev 2. Older revisions open from the invoice detail page. PDF file name: date, recipient slug, rev.

## 4. Screens

Global UI rules: one primary action per screen. Touch targets at least 44 px. Body text 16 px, step values 20 to 24 px. Sentence case, short copy, no 'please'. Errors say what happened and what to do. Layout is stacked on phones and split (flow on the left, live preview on the right) at 1024 px and wider.

### 4.1 Home

- Primary button: Create invoice.
- If a draft exists, a line above it: Continue, with the recipient and the number of items.
- Recent list (last 10): recipient, date, total, Rev badge. Tapping opens the invoice detail.
- Settings gear. An empty state invites the first invoice.

### 4.2 Design (first setup, or Change)

Thumbnails are rendered by the real renderer from sample data that lives in test fixtures, never in design code. One tap selects and continues. Afterwards it shows as a chip: Using Design X, Change.

### 4.3 Columns (first setup, or Change)

Toggles for the pool columns with one-line explanations. Rule messages appear inline (for example, Amount needs Qty and Rate). A live header preview updates. Saved as a preset together with the design, then remembered. Afterwards it shows as a chip listing the columns, with Change.

### 4.4 Voice fill

- Header: step name and progress. A strip shows the values confirmed so far.
- Step card: the prompt, what I heard (raw), what I understood (parsed), chips (New customer, Near match, Usual rate, Price outlier), and the number in words.
- Buttons: Confirm (primary), Redo, Edit (type).
- A large, thumb-reachable mic button, Type instead, and Back.
- Preview: a bottom sheet on phones, a side pane on desktop. Confirmed rows are solid, the current row is highlighted, upcoming rows are ghosted.
- Steps in order: Recipient, Date, then per row Item, Qty, Rate, then Add another or Done.

### 4.5 Review (also the edit mode)

- Live preview, recipient and date (tap to fix), an editable rows table, and the total.
- Row actions: Fix item, Fix qty, Fix rate (each opens the same step card for that one cell), Insert below, Move up, Move down, Delete (shows Row deleted with Undo; no confirmation dialogs).
- Add item at the end. Undo and Redo are always visible.
- Create PDF checks the draft is valid (at least one row, no empty cells) and shows what is missing.

### 4.6 PDF ready

Summary (recipient, total). Actions: Share (system share sheet, for WhatsApp), Download, Print, New invoice.

### 4.7 Invoice detail

PDF pages, with actions Revise, Duplicate, Share and Archive. A list of revisions.

### 4.8 Settings

Business profile (changes apply to future invoices only), design and columns, PIN, Help improve voice, export data, sign out.

### 4.9 First run

Business profile, Design, Columns, PIN, then Home. One sentence explains that voice clips are kept for 90 days to improve recognition and can be switched off. Target: under 3 minutes.

## 5. Guided fill engine

### 5.1 Steps (generated from the preset)

| Step | Prompt | Input | Shortcut | Checks |
| --- | --- | --- | --- | --- |
| Recipient | Who is the invoice for? | text | past customers as suggestions | length; match: exact, near or new |
| Date | Today, followed by the date? | date | today pre-filled, one tap | parse; warn if more than 45 days from today |
| Item | Item N? | text | none | match against ItemMemory |
| Qty | How many? | number | 1 pre-filled, one tap | greater than 0; warn above 100 |
| Rate | Price per piece for the item? | money | usual rate chip from history | greater than 0; warn if outside 0.2x to 5x of the recent median, or above 1,00,000 |
| More | Add another item or done? | buttons only | none | at least one row before Done |

The steps per row are the voice-filled columns of the preset in registry order. Auto and computed columns are skipped.

### 5.2 State machine

States: START, RECIPIENT, DATE, ROW(i).COLUMN(k), MORE, REVIEW, FINAL.

- Confirm advances. Back returns to the previous step with its value editable. Redo repeats the step.
- MORE: Add another goes to the first column of the next row. Done goes to REVIEW.
- From REVIEW, a fix or insert enters the relevant step with REVIEW as the return target.
- Leaving the app at any point keeps the draft. Reopening resumes at the first unconfirmed step.

### 5.3 Turn pipeline (one utterance)

1. Capture audio (6.2). 2. Upload to the turn endpoint with the step key. 3. STT with keyterms. 4. If the whole transcript is a voice command, handle it. 5. Parse or normalize by step kind. 6. Match against memory. 7. Run the checks. 8. Return a Proposal. 9. The card shows it. Nothing is committed until Confirm.

Latency budget: release to card within 2.5 s at p95, with two visible states, Listening and then Understanding.

### 5.4 Proposal object

| Field | Notes |
| --- | --- |
| step\_key | which step |
| raw\_transcript, language\_code | as returned by STT |
| value | typed per step (text, Decimal string, ISO date) |
| display | string for the card |
| words | the number in words (Indian numbering), for Qty and Rate |
| confidence | 0 to 1, affects presentation only |
| alternatives | up to 3 |
| matched\_id | customer or item id when matched |
| flags | NEW\_CUSTOMER, NEAR\_MATCH, PRICE\_OUTLIER, EXTRA\_NUMBER, LOW\_CONFIDENCE, EMPTY\_AUDIO, NOT\_UNDERSTOOD |
| needs\_clarification, clarification\_text | ask instead of guess |

Policy: nothing is ever auto-committed. Low confidence highlights the card and shows alternatives. If an item utterance also contains a number, show it as a chip offered at the next step, never committed early.

### 5.5 Voice commands

Recognized only when they are the whole utterance, by lexicon match with no LLM: ok or yes (Confirm), back, redo or again, done. The lexicon includes Malayalam equivalents collected during the bake-off. Everything else is content. Structural changes (insert, delete, move) are never voice commands.

### 5.6 Command layer

| Command | Args | Inverse |
| --- | --- | --- |
| SetRecipient | text, customer\_id (optional) | SetRecipient with the previous value |
| SetDate | date | SetDate with the previous value |
| AddRow | index (optional), cells | DeleteRow |
| SetCell | row\_id, column\_id, value | SetCell with the previous value |
| MoveRow | row\_id, to\_index | MoveRow back to the previous index |
| DeleteRow | row\_id | AddRow with the saved cells at the saved index |

Rules: commands are applied only on the server. Each has an idempotency key, and the client sends expected\_version. Rows have stable UUIDs. Validation is shared. Undo and redo are linear over the last 50 commands and survive reopening. Every command is logged with its source (voice, tap, undo, redo).

### 5.7 Errors

- STT failure or timeout: keep the step and say 'Couldn't hear that. Try again or type.' After 3 failures, lead with typing.
- Empty or silent audio: 'Didn't catch that.'
- Mic denied: show how to enable it and switch to typing.
- Offline: show a banner. The confirm retries automatically with the same idempotency key.
- Unparseable number: show a numeric keypad.
- Ambiguous recipient: choose between chips.
- Every step supports typing through the same checks (numeric keypad for Qty and Rate).

## 6. Perception services

### 6.1 STT adapter

`transcribe(audio, field_kind, keyterms, language_hint)` returns text, language\_code, latency\_ms and provider\_meta. Providers: sarvam (default), whisper (baseline for the bake-off), others pluggable. Config per field\_kind: provider, model, mode.

Initial config: model `saaras:v4`, language auto-detect, mode `codemix` for Recipient and Item, mode `transcribe` for Qty, Rate and Date. Keyterms (maximum 50, REST only): top customers for the Recipient step and top items for the Item step, ranked by recency and frequency, none for numeric steps. The bake-off sets the final per-field modes.

### 6.2 Audio capture

Browser MediaRecorder with echo cancellation and noise suppression on, mono, clips from 0.4 to 15 s (the provider's REST limit is 30 s). Drop silent clips. Show a live level meter. Upload limit 2 MB. HTTPS only.

### 6.3 Normalizer (text steps only)

Used for Recipient and Item after rules and matching cannot decide. Input: the raw transcript (which may mix scripts), candidate matches and the step kind. Output: strict JSON with value, alternatives, flags and needs\_clarification. Rules: output English in Latin script; transliterate Malayalam-script words phonetically or translate common item words; proper nouns stay as heard unless matched to memory; never add words that were not spoken; never output prices or quantities; temperature 0; 4 s timeout, then fall back to the cleaned transcript. Casing: Title Case, except all-caps tokens of 4 letters or fewer.

### 6.4 Matching

Normalize (lowercase, strip punctuation and spaces), check Alias first, then fuzzy-match (rapidfuzz token set). Initial thresholds, tuned by eval: 95 or above is a match, 80 to 94 asks 'Did you mean', below 80 is new. The matched display name wins over the heard spelling.

### 6.5 Number parsing (no LLM)

Pipeline: strip commas, ₹, Rs and rupees from digits; English number words including hundred, thousand, lakh and crore, and forms like fifteen hundred or one and a half thousand; 1.5k style; fractions for Qty (half, quarter, one and a half); Malayalam number words from a table built and tested during the bake-off. Ambiguous input returns alternatives with needs\_clarification. The result is a Decimal plus words. It is covered by a unit-test table of cases that grows with every real miss.

### 6.6 Bake-off protocol (required before M3 sign-off)

Dataset: about 40 recordings from your father on his own phone with shop noise: 10 recipients, 20 item phrases and 10 numbers including tricky ones, each with ground truth in `eval/stt/cases.jsonl`. Candidates: Saaras v4 in each mode, ElevenLabs Scribe v2, Gemini, and Whisper large-v3-turbo as the baseline. Metric: field-level exact match after the full pipeline (normalize and match); WER is secondary. First-attempt targets: Recipient 90 percent, Item 85, Qty 95, Rate 95. Rule: choose the best provider and mode per field kind. If none reaches the target, improve suggestions and UX before switching provider. Run with `python -m eval.stt run`.

## 7. Rendering service

### 7.1 Contract

`render(model, design_id)` returns pdf\_bytes and page\_count. It is pure and deterministic (reportlab invariant mode, fixed metadata). The server formats money and dates once, shared with the UI, and the renderer only places text. `previews(pdf_bytes, dpi=110)` returns PNG pages via PyMuPDF.

### 7.2 Render model

| Field | Notes |
| --- | --- |
| business | name, lines, phones |
| date\_display, billed\_to | strings |
| labels | billed\_to, date, total |
| columns | id, label, kind, align |
| rows | cell display strings by column id |
| total\_display, footer, currency | strings |

### 7.3 Layout engine (shared by all skins)

- Fixed columns take the larger of the header width and the widest cell, plus a minimum, clamped. The Item column takes the remaining width and wraps by measured text width.
- Row height comes from the wrapped lines. Numbers are right-aligned.
- A page breaks when a row would cross the skin's lower limit. The header repeats on every page. The total block must not be orphaned: if it does not fit, carry the last row to the next page with it.
- Very long words hard-break. Limits: 200 rows, 10 pages.

### 7.4 Skin interface

Fonts, colors, spacing tokens, header, table header, row decoration, totals block and footer. The skin owns the business-name treatment with fit rules: shrink to a minimum size, then wrap to at most 2 lines, then ellipsis. Wordmark skins split on the first space unless settings provide wordmark lines.

### 7.5 Port plan for the existing five scripts

Remove the module-level data (BUSINESS\_NAME, NAME\_1 and NAME\_2, BUSINESS\_LINES, DATE, BILL\_TO, ITEMS, FOOTER, OUT, FONT\_DIR), the per-script column x positions and the literal labels. Move shared helpers (spaced text, money formatting) into the engine. Keep colors, fonts and spacing as skin tokens. Port the reference skin first, then your father's pick. Unported designs stay in `design/candidates/`. Design lock: when your father picks, freeze that skin. Its tokens and golden baselines are approved, and later visual changes need explicit approval.

### 7.6 Fonts

Bundle licensed TTFs per skin (OFL fonts) in `renderer/fonts/`. Verify glyph coverage for ₹ and Latin at build time.

### 7.7 Golden tests

Matrix: column setups \[No, Item, Rate\], \[Item, Rate\] and \[No, Item, Qty, Rate, Amount\], against sizes of 1, 8 and 40 rows. Stress cases: a very long business name, a long wrapping item, a long recipient, a large amount (1,23,45,678.50) and a decimal qty. Compare rasterized pages to approved baselines (pixel difference under 0.1 percent) and assert the extracted text for totals. Baselines change only by explicit approval.

### 7.8 Preview

Re-render after every committed command (debounced 150 ms, stale renders cancelled), p95 under 500 ms. Pages are served as PNGs. The PDF is for download and sharing.

## 8. Backend

### 8.1 API

| Method and path | Purpose |
| --- | --- |
| POST /auth/login, POST /auth/logout, GET /me | PIN session |
| GET and PUT /settings | Business profile and flags |
| GET /designs, GET /columns | Designs with sample preview URLs, and the column registry |
| GET, POST and PUT /presets | Design plus columns |
| POST /invoices | Create a draft from a preset |
| GET /invoices, GET /invoices/{id} | List (status, cursor) and detail |
| POST /invoices/{id}/commands | Apply a command (type, args, idempotency\_key, expected\_version) |
| POST /invoices/{id}/undo, POST /invoices/{id}/redo | History |
| POST /invoices/{id}/turn | Multipart audio plus step\_key, returns a Proposal |
| POST /invoices/{id}/typed-turn | Typed text plus step\_key, same pipeline without STT |
| GET /invoices/{id}/preview | PNG preview pages for the current version |
| POST /invoices/{id}/finalize | Validate, render, store the PDF, update memory |
| GET /invoices/{id}/pdf | The PDF |
| POST /invoices/{id}/revise, /duplicate, /archive | Lifecycle |
| GET /memory/customers, GET /memory/items | Search by q, for typed autocomplete |
| GET /export | Zip of data and PDFs |
| GET /health | Liveness |

### 8.2 Conventions

- JSON everywhere. Decimals as strings. ISO dates. Errors carry code, message and field.
- A command returns the new draft state and a preview version. A version conflict returns 409 with the current state.
- Audio upload limit 2 MB. Rate limits: turn 30 per minute; 5 failed PIN attempts lock login for 10 minutes.

### 8.3 Storage and backups

SQLite file with WAL. Files (PDFs, previews, optional audio) live under `data/files/`, named by content hash. Alembic migrations. A nightly consistent backup (`sqlite3 .backup`) plus a copy to off-box storage; keep 14 daily and 8 weekly. A restore drill is done once before the pilot and written down.

### 8.4 Security

HTTPS only. PIN with argon2id. HttpOnly, Secure, SameSite cookie. API keys only on the server. Strict CORS. Pydantic validation on every input. Logs never include audio, and transcripts only at debug level. Dependency audit in CI. All provider calls go through one module with timeouts and one retry, then fail fast.

## 9. Frontend

### 9.1 Structure

Routes: `/`, `/setup`, `/login`, `/new/design`, `/new/columns`, `/invoice/:id/fill`, `/invoice/:id/review`, `/invoice/:id/done`, `/invoice/:id`, `/settings`. The server is the source of truth. TanStack Query holds the draft with optimistic updates on commands. A small store holds ephemeral state (mic, current card). Types are generated from the API schema.

### 9.2 Key components

StepCard, MicButton (idle, requesting, recording, uploading, understanding, error), LevelMeter, Chips, NumberWords, InvoiceTable with RowActionSheet, PreviewPane and PreviewSheet (PNG pages, pinch zoom), DesignPicker, ColumnPicker, RecentList, UndoSnackbar, ErrorBanner.

### 9.3 Behaviour

Focus moves to Confirm after every turn. Desktop shortcuts: hold Space to talk, Enter to confirm, Esc to redo, Backspace to go back, Ctrl+Z and Ctrl+Y for undo and redo. Respect reduced motion. Screen reader labels on every control. Contrast AA.

### 9.4 PWA and offline

Manifest and icons, installable, service worker for the app shell only. No offline invoicing in version 1: an offline banner appears, and a confirm retries automatically when the connection returns.

### 9.5 Sharing

Web Share API with the PDF file on phones, falling back to download. Desktop offers download and print.

### 9.6 Copy

Sentence case, short, verb-first buttons (Confirm, Redo, Edit, Create PDF). All strings live in one file so a Malayalam version can be added later.

## 10. Observability and pilot reporting

Every turn is stored as a Turn record. A weekly report command prints: invoices finalized, median time to finish, redo rate per step, top corrections (new aliases), revised-copy rate, and the five worst STT cases with audio (if retained). Every correction and miss is added to `eval/` as a new case.

## 11. Testing

| Layer | What | Tooling |
| --- | --- | --- |
| Unit | Parsers, money, matching, validators, preset rules, calculations (property-based), command layer, state machine | pytest, Hypothesis, Vitest |
| Contract | API schemas and generated TypeScript types | OpenAPI |
| Golden | Renderer matrix (7.7) | pytest, PyMuPDF |
| STT eval | Recorded audio through the full pipeline | `eval/stt`, mocks in CI, real providers on demand |
| End to end | Happy path, fix a row, insert a row, revise a copy, resume a draft, mic denied, offline | Playwright with a fake audio device |
| Pilot | A 10-scenario script run with your father | Manual |

CI on every pull request: lint, type check, unit, golden, end-to-end smoke.

## 12. Milestones

| Milestone | Deliverables | Done when |
| --- | --- | --- |
| M0 Foundation | Repo layout (web, api, renderer, eval, docs), CI, FastAPI and SQLite skeleton, PIN login, HTTPS deploy, backup job | Deployed on HTTPS, login works, CI green, restore drill passed |
| M1 Renderer | Data-driven engine, reference skin, preview PNGs, golden matrix | Matrix passes, no module-level data constants remain in ported code, p95 render under 500 ms |
| M2 Invoice core, no voice | Registry, presets, pickers, drafts, commands with undo and redo, typed guided fill, Review with fix tools, finalize, revise, Recent, share | End-to-end happy and fix flows pass, killing the app mid-draft loses nothing, a revision leaves the original byte-identical. Your father can already use it by typing |
| M3 Voice | STT adapter and Sarvam, turn endpoint, parsers, Normalizer, matching, memory and aliases, bake-off harness and dataset | Bake-off report exists, targets in 6.6 are met or the gap is documented, latency budget met |
| M4 Polish | Usual-rate shortcut, Qty default, number words, silence auto-stop, desktop shortcuts, PWA install, duplicate, your father's design ported, optional spoken read-back | Your father completes 3 real invoices unaided |
| M5 Pilot | Two weeks of real use, weekly reports, fixes, growing the eval set | Success criteria in 1.2 are met |

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Malayalam and English mix is misheard | Keyterms from history, per-field modes chosen by the bake-off, aliases, always-confirm UX |
| Numbers are misheard | Code parser, number in words, history outlier checks, Review as a second gate |
| Column by column feels slow | Auto-armed mic, Qty default of 1, usual-rate shortcut, measure time per invoice, loosen based on data |
| STT or LLM outage | Typed input at every step, one retry, clear messages |
| Design drift | Golden tests, one renderer for preview and PDF |
| Scope creep | Non-goals list and milestone gates |
| Data loss | Autosave per command, nightly backups, restore drill |
| A wrong value is confirmed | Review screen with the real preview, revised copies |
| Mic blocked (permissions or no HTTPS) | HTTPS everywhere, a permission help screen, typing path |

## Appendix A. Eval case format

One JSON line per case: id, field\_kind, audio path, expected value, notes. The dataset grows from real corrections made during the pilot.

## 14. Build architecture: vertical slices

Sections 14 to 18 are the process layer. Sections 0 to 13 describe the product. The product is built one slice at a time, and an agent working on a slice reads only that slice's control files plus the blueprint sections they point to.

### 14.1 What a slice is

A slice is one user-visible capability built end to end: UI, API, data and tests. It has its own scoped brief (control files), can be built and verified without touching any other slice, and ends in something the owner can demo. Horizontal layers (all the database, then all the API, then all the screens) are avoided on purpose.

### 14.2 Rules that keep slices independent

1. Contracts first. Slices talk only through the contracts in `contracts/`: Render Model (7.2), Column registry and Preset (3.3, 3.4), Command layer (5.6), Proposal (5.4) and the API schemas (8.1). Each contract is a Pydantic model with a generated TypeScript type.
2. Fakes before dependencies. Every contract ships with a fake (FakeRenderer, FakeStt, a fixed clock). A slice whose dependency is not done builds and tests against the fake. Integration tests switch to the real one when it lands.
3. Own your data. A slice owns its tables, migrations, endpoints and UI folder. Others use its service interface, never its tables.
4. No sideways imports. A slice imports only `contracts/` and the public entry point of the slices it depends on.
5. Scope fence. Changed files must be inside the slice's Owns list. Anything else needs a change request (18.7).
6. Done means frozen. When a slice is DONE, its contracts are frozen with a recorded version. Behavior changes go through a change request.
7. Typed before voice. The product is usable by typing after S07. Voice is added on top of a working flow (S09), not woven through every slice.

### 14.3 Dependency map

| Slice | Depends on |
| --- | --- |
| S00 Foundation | none |
| S01 Renderer engine | none |
| S02 Perception kernel | none |
| S03 Starting UI | S00, S01 |
| S04 Invoice core | S00, S01, S03 |
| S05 Typed guided fill | S02, S03, S04 |
| S06 Review and fix tools | S04, S05 |
| S07 Finish and library | S04, S06 |
| S08 STT bake-off | S02 |
| S09 Voice fill | S05, S08 |
| S10 Polish and pilot | all |

Build order: S00, S01, S02, S03, S04, S05, S06, S07, then S08, S09, S10. Recording your father's voice samples for S08 can happen at any time and does not block S00 to S07.

## 15. Slice catalog

Each entry lists the goal, the blueprint sections it refers to (BP), what it owns, what it depends on, what it provides, what is not in it, a demo, and the done condition.

### S00 Foundation

- Goal: a deployed, secured, empty app. Login by PIN reaches an empty Home.
- BP: 2.2, 8.2 to 8.4, 9.1, 12 (M0).
- Owns: repo layout (`apps/web`, `services/api`, `renderer/`, `eval/`, `contracts/`, `docs/`), CI, FastAPI skeleton (health, auth, error format), SQLite and Alembic base, the workspace row, web shell (router, generated API client, login page, empty Home), Docker and Caddy deploy, backup job and restore drill.
- Provides: auth session, DB session helper, error format, generated API client pipeline, an empty `contracts/` package.
- Not in it: any invoice, design or voice feature.
- Demo: open the deployed HTTPS URL on a phone, enter the PIN, see the empty Home. Restore the database from a backup.
- Done when: the M0 acceptance in section 12 passes.

### S01 Renderer engine

- Goal: any valid Render Model becomes a correct PDF and PNG previews, with no hardcoded data.
- BP: 7.1 to 7.8, 3.1 (formatting).
- Owns: `renderer/` (layout engine, reference skin = design 1, fonts, fixtures, golden tests) and a CLI: `python -m renderer render sample.json`.
- Depends on: nothing.
- Provides: `render()`, `previews()`, the RenderModel contract, FakeRenderer.
- Not in it: API endpoints, UI, the other four designs.
- Demo: run the CLI on three sample files (the three column setups in 7.7) and open the PDFs. The golden matrix passes.
- Done when: the golden matrix passes, no module-level data remains in ported code, p95 render time is under 500 ms.

### S02 Perception kernel

- Goal: a pure library that turns text into validated values: numbers, dates, matches, checks and Proposals.
- BP: 5.1 (checks), 5.4, 5.5, 6.3 to 6.5, 3.1.
- Owns: `services/api/app/perception/` (number parser, date parser, Normalizer interface with a rule-based implementation, matcher, checks, Proposal builder, voice-command lexicon) and its unit tests with case tables.
- Depends on: nothing.
- Provides: `parse_number`, `parse_date`, `match`, the checks, `build_proposal`, the Proposal contract, the Normalizer interface.
- Not in it: STT, HTTP endpoints, UI.
- Demo: run the case tables and read pass or fail per case. Feed 30 typed phrases through a small script.
- Done when: all parser and matcher case tables pass and the Decimal property tests pass.

### S03 Starting UI

- Goal: the owner opens the app, completes first-run setup and sees Home. Create invoice leads through Design and Columns, which are remembered afterwards.
- BP: 3.3, 3.4, 4.1 to 4.3, 4.8, 4.9, 8.1 (settings, designs, columns, presets).
- Owns: tables BusinessProfile and Preset; endpoints for settings, designs, columns and presets; web features `setup/`, `home/`, `presets/`; the column registry and rule validator shared by server and client.
- Depends on: S00, S01 (use FakeRenderer if S01 is not done).
- Provides: BusinessProfile, Preset, the registry and validator, DesignPicker, ColumnPicker, the `/new/*` routes ending in a create-draft stub.
- Not in it: drafts, filling, Recent contents.
- Demo: on a fresh database, run first-run setup (profile, design, columns, PIN), reach Home, see rule messages for invalid column combinations, and use both Change flows.
- Done when: the acceptance criteria in tests.md pass. They come from the 3.4 rules and screens 4.1 to 4.3.

### S04 Invoice core

- Goal: drafts, rows, totals, commands with undo and redo, finalize, revise, duplicate and archive, all through an API, with correct math and memory.
- BP: 3.1 to 3.5, 5.6, 8.1 (invoices, commands, undo, finalize, revise, duplicate, archive), 8.2, 12 (M2, server part).
- Owns: tables Invoice, Command, Customer, ItemMemory, Alias; the `app/invoices/` service; the endpoints; the calculation module.
- Depends on: S00, S01 (finalize renders), S03 (preset snapshot).
- Provides: the Command and Invoice contracts, the invoices service interface, the memory service (customer and item search).
- Not in it: any screens, voice.
- Demo: run `scripts/demo_s04.py`: create a draft, add rows, undo, finalize, fetch the PDF, revise, and confirm the original is byte-identical.
- Done when: lifecycle, command, idempotency and 409 conflict tests pass, the Decimal property tests pass, and a restart-safe autosave test passes.

### S05 Typed guided fill

- Goal: the guided flow works end to end by typing: recipient, date, the items loop with column steps, and the live preview.
- BP: 4.4, 5.1 to 5.4 (typed-turn), 5.7, 6.4, 7.8.
- Owns: web feature `fill/` (StepCard, step state machine UI, preview pane), the typed-turn and preview endpoints.
- Depends on: S02, S03, S04.
- Provides: StepCard and the step state machine (voice plugs in later), the typed-turn pipeline.
- Not in it: the mic, STT, Review.
- Demo: create an invoice by typing at phone size and at desktop size, watch the preview fill, kill the app midway and resume.
- Done when: the acceptance criteria and the end-to-end happy path pass.

### S06 Review and fix tools

- Goal: Review shows the real preview, any cell can be fixed, rows can be inserted, moved and deleted, and undo and redo work.
- BP: 4.5, 5.2 (return to REVIEW), 5.6.
- Owns: web feature `review/` (InvoiceTable, RowActionSheet, UndoSnackbar).
- Depends on: S04, S05.
- Provides: the Review route and the fix flows.
- Not in it: PDF creation UI, the library.
- Demo: from a 4-row draft, fix a price, insert a row between rows 2 and 3, delete a row and undo, move a row.
- Done when: end-to-end tests for fix, insert, move, delete and undo or redo pass.

### S07 Finish and library

- Goal: Create PDF, the PDF ready screen (share, download, print), the Recent list and Continue draft on Home, and the invoice detail with Revise, Duplicate and Archive.
- BP: 3.5, 4.1 (Recent, Continue), 4.6, 4.7, 9.5.
- Owns: web features `done/` and `library/`, and the Home wiring.
- Depends on: S04, S06.
- Provides: the complete typed product. Your father can use it by typing from here.
- Demo: create and finalize an invoice, share it to WhatsApp from a phone, revise a copy, see the Rev 2 badge, and confirm the original is unchanged.
- Done when: the M2 acceptance in section 12 passes.

### S08 STT bake-off

- Goal: evidence for which provider and mode to use per field.
- BP: 6.1, 6.6, 10, Appendix A.
- Owns: the `eval/` harness, the case file format, the report generator, and your recordings.
- Depends on: S02 (the pipeline used for scoring).
- Provides: the bake-off report, the recommended per-field provider and mode config, seeds for the Malayalam number table and the voice-command lexicon.
- Not in it: any app integration.
- Demo: run `python -m eval.stt run` and open the report.
- Done when: the report exists and evaluates the targets in 6.6.

### S09 Voice fill

- Goal: voice drives the same fill flow.
- BP: 4.4, 5.3, 5.5, 5.7, 6.1, 6.2.
- Owns: the STT adapter module, the turn endpoint, the Turn table, the web mic feature (MicButton, LevelMeter, capture), voice-command handling, the usual-rate and Qty-default shortcuts, number words.
- Depends on: S05, S08 (use FakeStt for tests).
- Provides: voice-enabled steps.
- Demo: create an invoice entirely by voice, then trigger each error state (mic denied, silence, offline).
- Done when: the acceptance criteria, the latency budget in 5.3 and the end-to-end test with a fake audio device pass.

### S10 Polish and pilot

- Goal: ready for your father's real use.
- BP: 9.3, 9.4, 10, 12 (M4, M5), 7.5 (design port), 8.3 (restore drill).
- Owns: PWA install, keyboard shortcuts, the offline banner, optional spoken read-back, the picked design's skin, the weekly report command, backup verification.
- Depends on: all slices.
- Demo: your father completes 3 real invoices unaided.
- Done when: the M4 acceptance in section 12 passes.

## 16. Control files and repo layout

```
docs/
  BLUEPRINT.md            source of truth, never edited by the agent
  STATE.md                slice board, frozen contract versions, OPEN decisions
  BACKLOG.md              ideas and deferred work, never built inside a slice
  agent/
    OPERATING_RULES.md
    prompts/              1-plan-slice.md, 2-build-slice.md, 3-verify-slice.md,
                          4-close-slice.md, 5-change-request.md
    templates/            context.md, build.md, tests.md, status.md
  slices/
    S03/                  context.md, build.md, tests.md, status.md, review.md
  changes/                CR-001-short-name.md
contracts/                models, generated TypeScript types, fakes
AGENTS.md, CLAUDE.md      point to docs/agent/OPERATING_RULES.md
```

Per slice, the control files are:

- context.md: the scoped brief. Goal, blueprint pointers, distilled rules, Owns, dependencies and fakes, Provides, Not in this slice, relevant decisions.
- build.md: the ordered task list with tests first, owner stop points and a completion checklist.
- tests.md: acceptance criteria, the test matrix, edge cases and the demo script.
- status.md: the living log. State, task checklist with evidence, decisions, deviations, questions and, at close, the Handoff for later slices.
- review.md: written by the verifier. Verdict, evidence, defects.

## 17. Slice workflow

### 17.1 States

NOT\_STARTED, PLANNED (control files written), APPROVED (you approved the plan), BUILDING, READY\_FOR\_VERIFY, VERIFIED or VERIFIED\_WITH\_FIXES (review done), DONE (closed and merged), BLOCKED (a change request is open). Exactly one slice is BUILDING at a time.

### 17.2 The loop for one slice

| Phase | Prompt | Session | Your action |
| --- | --- | --- | --- |
| Plan | 1-plan-slice.md | new | Read the plan review and control files, answer questions, say Approved |
| Build | 2-build-slice.md | new, or resume | Review at the stop points |
| Verify | 3-verify-slice.md | fresh, ideally a different model or tool | Read review.md |
| Fix | 2-build-slice.md with MODE=FIX, then verify again | new | None |
| Close | 4-close-slice.md | new | Say Close it |

### 17.3 What you type

- Once, to set up: `Read docs/BLUEPRINT.md section 18.2 and execute it.`
- Plan: `Run docs/agent/prompts/1-plan-slice.md with SLICE_ID=S03.`
- Build: `Run docs/agent/prompts/2-build-slice.md with SLICE_ID=S03.` Add MODE=RESUME after an interruption.
- Verify: `Run docs/agent/prompts/3-verify-slice.md with SLICE_ID=S03.`
- Close: `Run docs/agent/prompts/4-close-slice.md with SLICE_ID=S03.`

### 17.4 Habits that make it work

- One active slice. A new idea goes to `docs/BACKLOG.md`, never into the current slice.
- A new session for each phase keeps the context clean. Verification never runs in the session that built the code.
- If the agent is unsure, the answer is a change request or a question with a default, never a quiet guess.
- The starting UI (Home, first run, Design, Columns) is S03. S00 comes first because it gives S03 a place to live.

## 18. Agent prompt pack

Each block below is the exact text of one file under `docs/agent/`. The agent needs nothing from any chat. Prompt 0 creates the files, and prompts 1 to 5 are then run per slice.

### 18.1 Operating rules (docs/agent/OPERATING\_RULES.md)

```
# Operating rules (always on)

You build this product one slice at a time. The blueprint (docs/BLUEPRINT.md) is the source of truth. The owner is the final authority.

## Authority order
1. The owner's current message. 2. The blueprint. 3. The active slice's control files. 4. Existing code.
When a lower level conflicts with a higher one, stop and raise a change request (docs/agent/prompts/5-change-request.md). Never deviate silently.

## Reading discipline
Read only: these rules, docs/STATE.md, the active slice's control files, the blueprint sections its context.md lists, the contracts it uses, and the Handoff section of dependency slices. Do not open or edit other slices' control files.

## Scope fence
Edit only paths in the slice's Owns list, plus the contracts/ files the slice provides. Anything else needs a change request. Trivial formatting fixes are fine.

## Contracts and independence
Slices talk only through contracts/ (Render Model, Column registry, Preset, Command, Proposal, API schemas). Use the fake for any contract whose slice is not DONE. No deep imports across slices. Only the owning slice changes its tables.

## Engineering standards
- Tests first for logic. Every task ends with lint, type check and tests green.
- Small commits named Sxx/Tn: summary. Work on a slice branch, never on main. Never force-push or rewrite history.
- Money and quantities are Decimal. No hardcoded business data. Secrets only in environment variables.
- An LLM never computes money, totals, dates or layout.
- No TODO without an entry in status.md. No dead code.
- UI covers empty, loading, error and offline states, 44 px touch targets, labels and focus order, and works at 360, 768 and 1280 px widths.

## Honesty
Never say a task is done or working without a command result to quote. Mark untested work UNTESTED. Do not invent API or library behavior; check the docs or the installed source. If you are blocked or unsure, say so and stop.

## Safety
No destructive commands (deleting outside the slice, dropping the database, history rewrites) without the owner's confirmation. Never edit docs/BLUEPRINT.md. Propose changes through a change request.

## Communication
Short reports: what changed, evidence, what is next, questions. At most 3 questions at a time, each with a recommended default.

## Definition of done (every slice)
Acceptance criteria pass, checks are green, the demo script works, status.md is current, only in-scope files changed, and contracts are unchanged or approved by a change request.
```

### 18.2 Prompt 0: Bootstrap (run once)

```
# Bootstrap the build system (run once)

You are setting up the process layer of this repository. Do not write product code.

Read docs/BLUEPRINT.md sections 14 to 18 in full.

Do this:
1. Create docs/agent/OPERATING_RULES.md with the text from section 18.1, exactly.
2. Create docs/agent/prompts/1-plan-slice.md, 2-build-slice.md, 3-verify-slice.md, 4-close-slice.md and 5-change-request.md with the texts from sections 18.3 to 18.7, exactly.
3. Create docs/agent/templates/context.md, build.md, tests.md and status.md from section 18.8.
4. Create docs/STATE.md: a table with one row per slice S00 to S10 (title, depends on, status NOT_STARTED, branch, tag, last verified); a Contracts section (empty); and a Decisions section listing the OPEN items from blueprint 2.3 with their placeholders.
5. Create docs/slices/S00 to S10, each with a .gitkeep, plus docs/changes/.gitkeep and docs/BACKLOG.md (header only).
6. Create AGENTS.md and CLAUDE.md at the repo root containing: Read docs/agent/OPERATING_RULES.md before doing anything. Follow the prompt the owner points you to. The blueprint is docs/BLUEPRINT.md.
7. Make one commit: chore: bootstrap build system.

Rules: copy the rules and prompt texts exactly, without paraphrasing and without the code fence markers. Do not modify docs/BLUEPRINT.md. If any target file already exists, stop and ask.
Finish by printing the created tree and confirming nothing else changed.
```

### 18.3 Prompt 1: Plan a slice (docs/agent/prompts/1-plan-slice.md)

```
# Plan a slice

Input: SLICE_ID (for example S03), given by the owner in the message that runs this file.

You are a staff engineer writing the build plan for ONE slice. You write control files only. You write no product code in this phase.

## Read, and nothing else
1. docs/agent/OPERATING_RULES.md
2. docs/STATE.md
3. The catalog entry for SLICE_ID in docs/BLUEPRINT.md section 15, and every blueprint section that entry references
4. contracts/ for the contracts this slice consumes or provides
5. For each dependency slice that is DONE: the Handoff section of its status.md
Do not open other slices' control files or unrelated blueprint sections.

## Steps
1. Check prerequisites. For each dependency, STATE.md must say DONE. Otherwise list the fake you will plan against.
2. Look at the repo as it is now. List the files that already exist under this slice's Owns paths and any drift from the blueprint. If existing code overlaps the slice, say whether to adopt, adapt or replace it, as a question with a default. Do not fix anything yet.
3. Distil the requirements. Pull out the exact rules, field names, limits, copy strings and edge cases this slice needs, each with a section pointer such as (BP 5.1). Do not copy whole sections.
4. Write docs/slices/SLICE_ID/context.md, build.md, tests.md and status.md from docs/agent/templates/.
   - build.md: tasks small enough to finish, test and commit in one sitting. Riskiest or least certain work first. Each task has an id, goal, files to touch (inside Owns only), tests to write first, steps and a done check. Add owner stop points, for example after the UI skeleton and before wiring real services.
   - tests.md: numbered acceptance criteria in Given, When, Then form; a matrix mapping each criterion to unit, integration or end-to-end tests; the fakes needed; the edge cases from the blueprint; and a demo script the owner can follow, with the expected result of every step.
   - status.md: state PLANNED, the task list mirrored as unchecked boxes, and empty Decisions, Deviations and Questions logs.
5. Set this slice's row in docs/STATE.md to PLANNED.
6. Self-check before finishing:
   - every acceptance criterion traces to a blueprint section
   - every requirement in the referenced sections is either covered or listed under Not in this slice
   - no task touches a path outside Owns
   - no OPEN decision was decided; each one uses its placeholder
   - context.md fits about 150 lines and build.md about 200
7. Commit: SLICE_ID/plan: control files.

## Output
A plan review of at most 15 lines: scope in and out, the number of tasks, the top 3 risks, and up to 3 questions, each with your recommended default. Then STOP and wait for the owner's approval. When the owner approves, set the state to APPROVED.

## Rules
Ambiguity is a question, never a guess. Never edit docs/BLUEPRINT.md. Never write product code in this phase.
```

### 18.4 Prompt 2: Build a slice (docs/agent/prompts/2-build-slice.md)

```
# Build a slice

Input: SLICE_ID. Optional MODE: BUILD (default), RESUME or FIX.

You are a senior engineer building ONE slice with full effort. Nothing outside this slice exists for you.

## Preconditions
STATE.md and status.md must say APPROVED or BUILDING (for FIX: VERIFIED_WITH_FIXES). Otherwise stop and tell the owner.

## Read, and nothing else
OPERATING_RULES.md, STATE.md, this slice's four control files, the blueprint sections listed in context.md, and the contracts and dependency handoffs listed in context.md.

## Setup
- Use the branch slice/SLICE_ID-name. Create it if missing. Never work on main.
- Run the full checks (lint, type check, existing tests) and record the baseline in status.md. If the baseline is red, stop and report. Do not build on a red base.
- RESUME: re-run the slice tests, then continue from the first unchecked task.
- FIX: read review.md and fix only the listed defects, in severity order, each with a test that fails first.

## Loop, for each task in build.md
1. Announce the task in one line.
2. Re-read only the blueprint pointers this task cites.
3. Write the tests first. For logic, unit tests. For UI, the component or end-to-end test that describes the behavior. Run them and see them fail for the right reason.
4. Implement the smallest change that passes. No extras, no refactors elsewhere, no while-I-am-here changes.
5. Run lint, type check, the slice's tests, then the whole suite. Fix until green. Quote the commands and results in status.md.
6. Review your own diff: scope fence (changed files inside Owns), no hardcoded business data, Decimal for money, contract adherence, error handling, dead code, secrets. For UI also check the states in blueprint section 4 (empty, loading, error, offline), 44 px targets, labels, focus order, and the 360, 768 and 1280 px widths.
7. Commit as SLICE_ID/Tn: summary. Update status.md: tick the task and add the evidence, decisions, deviations and questions.
8. If the task is an owner stop point, post a summary and wait.

## Stop and raise a change request (prompt 5) when
a contract must change; the blueprint is ambiguous, contradictory or infeasible; an OPEN decision blocks you; a dependency is missing and has no fake; or a test is flaky and you cannot explain why. Do not work around any of these.

## Finish
Run the entire slice test set and the demo script from tests.md, step by step. Set the state to READY_FOR_VERIFY and report: tasks done, evidence, deviations and known gaps. You never declare the slice done. Verification does.

## Honesty
Never say done or working without a command result to quote. Mark anything untested as UNTESTED. Do not invent library behavior; check the installed version's docs or source.
```

### 18.5 Prompt 3: Verify a slice (docs/agent/prompts/3-verify-slice.md)

```
# Verify a slice

Input: SLICE_ID. Run this in a fresh session, never in the session that built the code.

You are a skeptical, independent reviewer. You did not write this code. Do not trust status.md. Verify.

## Read
OPERATING_RULES.md, STATE.md, the slice's control files, the blueprint sections listed in context.md, contracts/, and the git diff of the slice branch against main.

## Checks
1. Scope: list the changed files. Every one must be inside Owns or be a contracts/ file the slice provides. Anything else is a defect.
2. Run lint, type check and the full test suite yourself. Record the exact result summaries.
3. Acceptance: for each criterion in tests.md, find the test or run the manual step that proves it. Mark it PASS, FAIL or UNVERIFIED, with evidence.
4. Run the demo script literally, step by step, and compare with the expected results.
5. Hunt for: hardcoded business data, float money, an LLM doing arithmetic, dates or layout, missing empty, loading, error or offline states, accessibility gaps, contract drift (diff contracts/ against the version recorded in STATE.md), secrets, leftover TODOs, dead code, swallowed errors, unvalidated input.
6. Blueprint cross-check: every requirement in the referenced sections is implemented or explicitly out of scope. List the gaps.
7. Budgets: where the slice has latency or render-time budgets, measure them.

## Output: docs/slices/SLICE_ID/review.md
Verdict: PASS, PASS WITH FIXES or FAIL. An acceptance table with evidence. A defect list with severity (blocker, major, minor), file and line, and a suggested fix. UNVERIFIED items. Risks for later slices.

## Rules
Do not fix code in this phase. Do not soften findings. If you cannot verify something, write UNVERIFIED and never assume a pass. Set the state to VERIFIED, VERIFIED_WITH_FIXES, or BUILDING on FAIL.
```

### 18.6 Prompt 4: Close a slice (docs/agent/prompts/4-close-slice.md)

```
# Close a slice

Input: SLICE_ID. Run only after the owner says to close it and review.md says PASS.

1. Confirm the working tree is clean and the full test suite is green. Quote the result.
2. Write the Handoff section in status.md for future slices: what this slice provides (public contracts, endpoints, modules, route names), how to use each with a short example, environment variables, known limits and deferred items. Write it for a reader who sees only this section.
3. Freeze contracts: record each provided contract's version and content hash in docs/STATE.md under Contracts.
4. Move deferred items and ideas to docs/BACKLOG.md. Do not build them.
5. Update the slice row in STATE.md: DONE, date, tag name. Tag the branch tip SLICE_ID-done and merge to main the way the owner specifies (default: squash merge with the message SLICE_ID: title).
6. Suggest the next slice: one whose dependencies are now all DONE, with the reason.

Output: a short closing report with the commit and tag, the frozen contracts and the next suggested slice. Never edit docs/BLUEPRINT.md.
```

### 18.7 Prompt 5: Change request (docs/agent/prompts/5-change-request.md)

```
# Raise a change request

Use this when the blueprint, a contract or a decision blocks you. Stop coding first.

Write docs/changes/CR-NNN-short-name.md, using the next free number:
- Slice and task where it happened
- The problem, in two sentences
- Evidence: blueprint section pointers, file and line, command output
- Options: 2 or 3, each with trade-offs
- Your recommendation and why
- Impact: contracts, other slices, tests, and the blueprint sections that would change
- Meanwhile: what you did or did not do (never a silent workaround)

Then tell the owner in 5 lines or fewer and wait. Set the slice state to BLOCKED in STATE.md.

After the owner decides: record the decision in the CR file and apply only what was approved. If the blueprint must change, propose the exact replacement text and let the owner apply it. List the slices whose status.md needs a note. Set STATE.md back to its previous state.
```

### 18.8 Control file templates (docs/agent/templates/)

context.md

- Goal in one sentence, and who benefits
- Blueprint refs (BP x.y list)
- Distilled requirements: exact rules, fields, limits and copy strings, each with a section pointer
- Owns: paths, tables, endpoints, routes
- Depends on, and the fakes to use
- Provides: contracts and public entry points
- Not in this slice: an explicit list
- Decisions: locked items that matter here, and OPEN items with their placeholders
- Risks and unknowns

build.md

- Branch name and the baseline commands (lint, type check, test, end to end)
- Tasks T1 to Tn, each with Goal, Files (inside Owns), Tests first, Steps, Done check, Stop point (yes or no)
- Order rationale (riskiest first)
- Completion checklist

tests.md

- Acceptance criteria AC1 to ACn in Given, When, Then form, with BP pointers
- Test matrix: each AC mapped to test files and level
- Fakes and fixtures
- Edge cases and error states
- Performance budgets, if any
- Demo script: numbered steps, each with an expected result

status.md

- State line: NOT\_STARTED, PLANNED, APPROVED, BUILDING, READY\_FOR\_VERIFY, VERIFIED, VERIFIED\_WITH\_FIXES, DONE or BLOCKED
- Baseline results
- Task checklist with commit hashes and evidence
- Decisions log, Deviations log, Questions log
- Handoff, filled at close: provides, usage examples, environment variables, limits, deferred items
