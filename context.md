# AI Invoice Studio — Context Document
## Full Project Context for Agentic AI Implementation

> **Purpose:** This document provides complete context so that any agentic AI or developer working on this codebase has zero ambiguity about what the project is, what it does, and what the migration entails.  
> **Version:** 2.0  
> **Date:** June 2026

---

## 1. What Is This Project?

**AI Invoice Studio** is an enterprise-grade, AI-powered billing and invoicing platform built with:
- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS v4 + Zustand (state management)
- **Backend:** Express.js (server.ts) serving both the Vite SPA and AI API routes
- **AI:** Currently Google Gemini 2.5 Flash (cloud API) — being migrated to local OSS models

The application allows users to:
1. **Create invoices** via natural language text prompts ("Add 2 hours design consulting at $150/hr")
2. **Dictate invoice items** via voice recording (speech-to-invoice)
3. **Polish invoice notes** with AI rewriting for professional tone
4. **Audit invoices** for compliance issues (missing fields, invalid values)
5. **Export invoices** to PDF
6. **Manage multiple invoices** with full undo/redo history

---

## 2. Current Architecture (BEFORE Migration)

```
Browser (React SPA)
  │
  ├── POST /api/v1/generate-invoice    → server.ts → Google Gemini 2.5 Flash API
  ├── POST /api/v1/audio-to-invoice    → server.ts → Google Gemini 2.5 Flash API (multimodal)
  └── POST /api/v1/rewrite             → server.ts → Google Gemini 2.5 Flash API
```

**Key problems with current architecture:**
- **Cost:** Every AI operation costs money (per-token billing)
- **Privacy:** All invoice data (including PII) is sent to Google's servers
- **Availability:** Requires internet connection; rate-limited by Google
- **API Key Risk:** Leaked keys = unauthorized billing; key rotation overhead
- **Language support:** Limited by Gemini's training data for Indic languages
- **Vendor lock-in:** `@google/genai` SDK is Google-specific

---

## 3. Target Architecture (AFTER Migration)

```
Browser (React SPA) — UNCHANGED
  │
  ├── POST /api/v1/generate-invoice    → server.ts → Ollama (qwen3:8b) on localhost:11434
  ├── POST /api/v1/audio-to-invoice    → server.ts → STT Sidecar (localhost:5050) → Ollama
  └── POST /api/v1/rewrite             → server.ts → Ollama (qwen3:8b) on localhost:11434

Local Services:
  ├── Ollama (systemd service, port 11434) — qwen3:8b model
  └── stt_server.py (Python Flask sidecar, port 5050) — faster-whisper large-v3-turbo
```

---

## 4. File Inventory (Complete)

### 4.1 Backend

| File | Role | Migration Impact |
|---|---|---|
| `server.ts` | Express server, all AI routes, Vite middleware | 🔴 HEAVY — Replace all Gemini calls |
| `package.json` | Dependencies | 🟡 MINOR — Remove @google/genai, add openai |
| `.env` / `.env.example` | Configuration | 🟡 MINOR — Remove GEMINI_API_KEY, add OLLAMA vars |
| `stt_server.py` | 🆕 Python STT microservice | 🟢 NEW FILE |
| `requirements.txt` | 🆕 Python dependencies | 🟢 NEW FILE |

### 4.2 Frontend (All UNCHANGED by migration)

| File | Role |
|---|---|
| `src/App.tsx` | Router, layout, page routing |
| `src/main.tsx` | React entry point |
| `src/types.ts` | TypeScript interfaces (Invoice, InvoiceItem, etc.) |
| `src/store/useStore.ts` | Zustand store with localStorage persistence + undo/redo |
| `src/lib/calculations.ts` | Financial math — **Decimal.js** (subtotal, tax, discount, total) |
| `src/lib/templates.ts` | Invoice template definitions |
| `src/lib/utils.ts` | ID generation, formatting utilities |
| `src/components/AIAssistantSidebar.tsx` | AI prompt UI, audio recording, Zod validation |
| `src/components/EditableInvoice.tsx` | Live-edit invoice canvas |
| `src/components/InvoicePreview.tsx` | Print/export preview |
| `src/components/SortableInvoiceTable.tsx` | Drag-and-drop line items table |
| `src/components/SidebarNav.tsx` | Navigation sidebar |
| `src/pages/Dashboard.tsx` | Invoice list, AI creation modal |
| `src/pages/Editor.tsx` | Invoice editor, PDF export |
| `src/pages/Settings.tsx` | Business profile and app defaults |
| `src/pages/Clients.tsx` | Client directory extracted from invoices |
| `src/pages/Templates.tsx` | Template gallery with live previews |
| `src/pages/Onboarding.tsx` | First-run 3-step wizard |
| `src/pages/SharedInvoice.tsx` | Public read-only invoice view |

### 4.3 Configuration

| File | Role |
|---|---|
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript compiler options |
| `index.html` | HTML entry point |
| `SPECIFICATION.md` | Product specification |
| `audit.md` | Original enterprise audit report |
| `new_audit.md` | Ollama migration audit notes |

---

## 5. API Contract (Unchanged)

The frontend communicates with the backend via these 3 endpoints. **The request/response schema does NOT change during migration** — only the backend implementation changes.

### 5.1 POST /api/v1/generate-invoice

```json
// Request
{ "prompt": "string (max 2000 chars)" }

// Response (200 OK)
{
  "customerInfo": { "name": "", "email": "", "address": "" },
  "items": [{ "description": "string", "quantity": number, "rate": number }],
  "taxRate": number,
  "notes": "string"
}
```

### 5.2 POST /api/v1/audio-to-invoice

```
// Request: multipart/form-data
audio: <webm/ogg/mp4 file, max 10MB>
prompt: "string"

// Response: Same as generate-invoice
```

### 5.3 POST /api/v1/rewrite

```json
// Request
{ "text": "string", "context": "string" }

// Response
{ "text": "string (rewritten)" }
```

---

## 6. Current Gemini API Calls in server.ts

### 6.1 generate-invoice (line 225-247)
```typescript
const response = await withGeminiRetry(() =>
  ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: sanitizedPrompt,
    config: {
      systemInstruction: invoiceSystemInstruction,
      responseMimeType: 'application/json',
      responseSchema: invoiceSchema,
    },
  })
);
```

### 6.2 audio-to-invoice (line 262-280)
```typescript
const response = await withGeminiRetry(() =>
  ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      { inlineData: { data: audioFile.buffer.toString('base64'), mimeType: audioFile.mimetype || 'audio/webm' } },
      prompt,
    ],
    config: {
      systemInstruction: invoiceSystemInstruction,
      responseMimeType: 'application/json',
      responseSchema: invoiceSchema,
    },
  })
);
```

### 6.3 rewrite (line 309-314)
```typescript
const response = await withGeminiRetry(() =>
  ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })
);
```

---

## 7. Key Architectural Constraints

1. **Frontend is UNTOUCHED** — The React SPA and all components remain exactly as-is. Only `server.ts` changes.
2. **API contract is PRESERVED** — Same request/response JSON shapes. The frontend Zod validation (`AIResponseSchema`) must still pass.
3. **Invoice schema is FIXED** — The `invoiceSchema` object used for structured output must be converted from Google's `Type.OBJECT` format to OpenAI-compatible JSON Schema format.
4. **Security middleware is PRESERVED** — helmet, cors, rate limiting, requireAuth, sanitizePrompt all remain.
5. **No Docker** — The deployment target is bare-metal or VM. Ollama runs as a systemd service; STT runs as a Python child process.
6. **Multilingual from day one** — The system must handle Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, and 90+ more languages natively.

---

## 8. Why This Migration Matters

| Dimension | Before (Gemini API) | After (Local OSS) |
|---|---|---|
| **Cost per inference** | ~$0.001–$0.01/call | $0.00 |
| **Privacy** | PII sent to Google | 100% on-premise |
| **Latency** | 200ms–2s (network dependent) | 50ms–1.5s (local) |
| **Availability** | Requires internet | Works offline |
| **Rate limits** | Google-imposed | Self-managed |
| **API key management** | Rotation, leakage risk | None needed |
| **Multilingual** | Good (Gemini) | Excellent (Qwen3 119 langs) |
| **Fine-tuning** | Not possible (cloud API) | Full LoRA support |
| **Vendor lock-in** | Google SDK | OpenAI-compatible (portable) |

## 9. Authentication Architecture

The application uses a dual-strategy authentication system:
- **JWT Tokens:** For web application users. `POST /auth/login` → access + refresh tokens.
- **API Keys:** For self-hosted/CLI deployments. `X-API-Key` header with `API_SECRET` env var.

In development with no `JWT_SECRET` configured, auth is bypassed for DX.
In production, `JWT_SECRET` is required or the server exits.

---

*End of Context Document*
