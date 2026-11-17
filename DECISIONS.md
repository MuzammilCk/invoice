# DECISIONS.md — Architecture & Product Decisions

> **Superseded Notice**: The prior enterprise SaaS architecture (Supabase sync, multi-currency, JWT auth, OCR receipts, Nodemailer dispatch, 20-template gallery, Puppeteer PDF) has been decommissioned and archived. Full historical enterprise code is preserved at git tag:
> `archive/enterprise-v1`

---

## 1. Working Decisions (Locked)

| Decision | Context & Rationale | Status |
|---|---|---|
| **Python ReportLab for PDF** | High-fidelity, deterministic PDF generation without heavy headless Chromium / Puppeteer dependencies. The 5 candidate scripts are in `design/candidates/design-1.py` ... `design-5.py`. Live preview will display the generated PDF directly. | Locked |
| **Deterministic Voice Flow** | Voice input operates as a stepped confirmation workflow (Recipient -> Date -> Items -> Review). At each step, STT transcribes, LLM normalizes into structured JSON, and the user confirms or edits. | Locked |
| **Code-Calculated Financials** | LLMs are never used for arithmetic. Subtotals and grand totals are calculated in code with `Decimal` (`decimal.js` on frontend, Python `decimal` on backend). | Locked |
| **INR & Indian Numbering** | Exclusively Indian Rupee formatting with Indian digit grouping (e.g. `₹ 1,25,000.00`) and English-language invoice output. | Locked |
| **Simplified Data Model** | No quantity, tax, discount, shipping, or due-date fields. Items are simply `{ description, price }`. | Locked |
| **Pluggable STT Sidecar** | The STT service runs as a sidecar process behind a WebSocket interface. `stt_server.py` is parked as reference until vendor selection. | Locked |

---

## 2. Open Decisions (Pending Owner Choice)

These decisions must not be decided autonomously; they are pending owner/user determination:

1. **Candidate Design Selection**
   - Candidate 1: Clean ink & neutral single-page layout (`design/candidates/design-1.py`)
   - Candidate 2: Poppins-based modern layout with leader lines (`design/candidates/design-2.py`)
   - Candidate 3: Helvetica/DejaVu mono charcoal accent layout (`design/candidates/design-3.py`)
   - Candidate 4: Josefin Sans antique gold / emerald-black luxury layout (`design/candidates/design-4.py`)
   - Candidate 5: Minimal geometric layout (`design/candidates/design-5.py`)
   - *Owner's father will inspect sample outputs and pick one.*

2. **STT Vendor & Model Selection**
   - Undecided. A bake-off will be run on real recordings containing Malayalam, English, and local sound/electronics terminology.
   - Candidates include Whisper (faster-whisper large-v3-turbo), NeMo IndicConformer (AI4Bharat), and commercial cloud STT APIs.

3. **LLM Provider**
   - The normalization step requires an LLM returning structured JSON. Currently compatible with any OpenAI-standard endpoint (local Ollama/vLLM/llama.cpp or hosted APIs). Final provider/model to be selected based on speed and local machine capabilities.

4. **GST / Tax & Quantity Fields**
   - Currently excluded per specification. Pending business determination whether GST compliance / HSN codes or item quantities are legally required for his transactions.

5. **Authentication & Access Control**
   - Full JWT/Supabase auth has been removed. Decision pending whether a lightweight PIN or local lock screen is needed to prevent unintended device access.
