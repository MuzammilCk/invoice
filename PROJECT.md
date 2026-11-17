# PROJECT.md — Single Source of Truth: Voice-to-Invoice

This document is the authoritative product and architectural specification for **Voice-to-Invoice**. It overrides any legacy documentation. Historical enterprise material has been archived under tag `archive/enterprise-v1`.

---

## 1. Product Context

**Voice-to-Invoice** is a focused utility built for **ONE** user: the owner's father, who runs a small sound and electronics business in Kerala, India.

He creates invoices by speaking, one section at a time, and confirming each section.

### Data Model

#### A. Per-Invoice Data (Spoken by user)
Only three pieces of data are spoken:
1. **Recipient** ("Billed to"): Customer name and address lines.
2. **Items**: A table of rows, where each row contains:
   - Item description
   - Price (in INR)
3. **Date**: Defaults to today; spoken only to override.

*Note*: The invoice has **NO** quantity, tax, discount, shipping, or due-date fields. Invoices print in **English only**.

#### B. Business Profile (Set once in Settings, never spoken)
Configured once and stored locally:
- Business name
- Address lines
- Phone numbers
- Footer text

#### C. Financial Conventions
- **Currency**: INR (Indian Rupee, ₹).
- **Formatting**: Indian digit grouping (e.g. `1,25,000.00`).
- **Precision**: Totals are strictly computed in application code using `Decimal` (`decimal.js`), **never** by an LLM.
- **GST / Tax**: Do not add tax or GST unless explicitly decided.

---

## 2. Voice Flow (Planned Implementation)

A deterministic, step-by-step sequential flow:
1. **Recipient**: User speaks the recipient name and address -> STT transcribes -> LLM normalizes to JSON -> user confirms or redoes.
2. **Date**: Prompted; user confirms today's date or speaks override date.
3. **Items Loop**: User speaks items (description and price) -> normalized to JSON rows -> user confirms, adds more, or modifies.
4. **Review & PDF**: Summary displayed -> totals calculated via `Decimal` -> final PDF rendered via ReportLab.

---

## 3. Working Decisions (Locked)

- **Invoice Design**: Selected by the owner's father from the 5 candidate ReportLab scripts preserved in `design/candidates/design-1.py` through `design-5.py`.
- **Single PDF Renderer**: ReportLab (Python) is the single PDF renderer. The live preview in the app will be the real generated PDF.
- **Pluggable STT Interface**: Speech-to-text sits behind a single standard interface (`stt_server.py` is parked as reference); final vendor chosen via real-recording bake-off.
- **No Complex Enterprise Features**: No multi-tenant auth, no Supabase cloud sync, no email sending, no OCR receipt imports, no recurring cron schedules.

---

## 4. Open Decisions (To be decided by Owner)

1. **Design Selection**: Which of the 5 candidate designs (`design-1.py` to `design-5.py`) is chosen.
2. **STT Vendor**: Which speech-to-text vendor/model performs best in the bake-off on real audio recordings (Malayalam and Indian English sound equipment terminology).
3. **LLM Provider**: Which local or API LLM provider to standardize on for transcript normalization.
4. **GST & Quantity Need**: Whether GST calculation or explicit quantity columns are required in the future. (Kept out for now.)
5. **Authentication**: Whether any login is needed (likely a simple PIN at most for local protection).
