# Voice-to-Invoice

A lightweight, focused invoicing tool built for ONE user: the owner's father, who runs a small sound and electronics business in Kerala, India.

Instead of navigating complex forms, he creates invoices by speaking section by section (recipient, items table with descriptions and prices, and optional date override), confirming each section, and generating a clean PDF.

---

## Current Status

- **Foundation (v2)**: Repository cleaned and trimmed to the core Voice-to-Invoice scope.
- **Design candidates**: 5 candidate ReportLab designs split and preserved under `design/candidates/design-1.py` through `design-5.py`.
- **STT sidecar**: `stt_server.py` parked for reference until vendor bake-off.
- **Historical enterprise code**: Archived at git tag `archive/enterprise-v1`.

---

## How to Run

### Prerequisites

1. **Node.js** (v18+ recommended)
2. **Python 3.10+** (with ReportLab and STT dependencies if running sidecar)
3. Local OpenAI-compatible LLM (e.g. Ollama, vLLM, or llama.cpp)

### Setup

```bash
# Clone and checkout v2 foundation branch
git checkout reset/v2-foundation

# Install Node dependencies
npm install

# Copy environment variables
cp .env.example .env

# Optional: Install Python STT sidecar dependencies
pip install -r requirements.txt
```

### Development

```bash
# Start server (starts Express backend + Vite dev server)
npm run dev
```

App will be available at `http://localhost:3000`.

---

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand.
- **Backend**: Express + Vite middleware, WebSocket STT proxy, and local LLM normalization.
- **Math**: Totals computed with `decimal.js` (never by LLM). Currency is INR with Indian digit grouping (`1,25,000.00`).
- **PDF Generation**: ReportLab (Python) to generate final invoices from the chosen design candidate.
- **Sidecar**: Python WebSocket streaming STT service (`stt_server.py`).

See [PROJECT.md](file:///home/muzammilck/Projects/invoice/PROJECT.md) for product specification and [DECISIONS.md](file:///home/muzammilck/Projects/invoice/DECISIONS.md) for architectural and open decisions.
