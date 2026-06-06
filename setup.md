# AI Invoice Studio — Setup Guide

Welcome to the AI Invoice Studio! This guide will walk you through the necessary tools, libraries, and steps required to set up the project locally.

## 1. System Requirements

Ensure you have the following installed on your operating system:
- **Node.js** (v18 or higher): The JavaScript runtime used for the backend Express server and Vite frontend.
- **Python** (v3.10 or higher): Required for the Speech-to-Text (STT) WebSocket sidecar.
- **CUDA Toolkit** (Optional but highly recommended): For GPU acceleration of the Whisper model via NVIDIA GPUs.

## 2. Frontend & Node.js Backend Setup

The primary application is a monolithic repository that serves both the Vite/React frontend and the Express.js API backend.

1. **Install Node modules:**
   Open a terminal in the root directory and run:
   ```bash
   npm install
   ```

2. **Key Node Dependencies:**
   - **Frameworks:** `react`, `react-dom`, `express`, `vite`
   - **Database & Auth:** `@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken`
   - **AI Integration:** `openai` (used for standard AI models and OpenAI-compatible endpoints)
   - **Security:** `helmet`, `cors`, `express-rate-limit`
   - **PDF Generation:** `puppeteer` (used to generate print-ready PDFs from invoices)
   - **UI & Styling:** `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `motion`

## 3. Speech-to-Text (STT) Python Sidecar Setup

The application features a real-time, low-latency Speech-to-Text engine powered by Whisper. This engine runs as an independent Python process, which communicates with the Node.js backend via WebSockets.

1. **Create a Python Virtual Environment (Recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Python Libraries:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Key Python Dependencies:**
   - **`whisper-live`**: The core real-time STT engine that handles Voice Activity Detection (VAD) via `silero_vad` and pushes partial/final transcripts instantly.
   - **`faster-whisper`**: A highly optimized Whisper inference engine (CTranslate2) used internally by WhisperLive.
   - **`websockets`**: Provides the async WebSocket server (`stt_server.py`) that the Node.js proxy talks to.
   - **`av` (PyAV)**: Used for high-performance, in-memory audio decoding without needing to save to disk or fork `ffmpeg` subprocesses.
   - **`numpy`**: Required for raw audio manipulation and processing.

## 4. Environment Variables (`.env`)

Create a `.env` file in the root directory. Below are the required and recommended configurations:

```env
# ── Server Config ──
PORT=3000
NODE_ENV=development

# ── Supabase / Auth ──
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

# ── LLM Config (Backend Agnostic) ──
LLM_HOST=http://127.0.0.1:8000
LLM_MODEL=qwen3-8b
LLM_API_KEY=local-no-key-needed

# ── STT Sidecar Config ──
STT_PORT=5050
WHISPER_MODEL=D:/invoice/models/large-v3-turbo
STT_COMPUTE_TYPE=int8
```

## 5. Running the Application

For a development environment with hot-reloading:

```bash
# Starts both the Vite server, the Express API, and auto-launches the Python STT sidecar.
npm run dev
```

For production deployment:

```bash
# Builds the frontend and backend bundles
npm run build

# Starts the compiled server
npm start
```

## Architecture Overview

- **Browser UI:** Captures audio in 250ms chunks via MediaRecorder and connects to the Node.js WebSocket.
- **Node.js API:** Acts as an authentication and routing proxy. It proxies `/ws/stt` directly to the Python sidecar and manages user endpoints (`/api/v1/...`).
- **Python STT Sidecar:** Listens on port 5050. Receives audio chunks, performs VAD segmentation, decodes audio with `av`, transcribes with `faster-whisper`, and streams real-time text back.
