# AI Invoice Studio — Setup Guide

Welcome to the AI Invoice Studio! This guide provides the complete, exact steps to set up the project locally with all required dependencies.

## 1. System Requirements

Ensure you have the following installed:
- **Node.js** (v18 or higher): The JavaScript runtime used for the backend Express server and Vite frontend.
- **Python** (v3.10 or higher): Required for the Speech-to-Text (STT) WebSocket sidecar.
- **Ollama**: Required to run the local fine-tuned LLM. Download from [ollama.com](https://ollama.com/download).
- **CUDA Toolkit** (Optional but highly recommended): For GPU acceleration of the Whisper model via NVIDIA GPUs.

## 2. Frontend & Node.js Backend Setup

1. **Install Node modules:**
   Open a terminal in the root directory and run:
   ```bash
   npm install
   ```

2. **Key Node Dependencies:**
   - **Frameworks:** `react`, `express`, `vite`
   - **Database & Auth:** `@supabase/supabase-js`, `bcryptjs`, `jsonwebtoken`
   - **AI Integration:** `openai` (used for standard AI models and OpenAI-compatible endpoints)
   - **UI & Styling:** `tailwindcss`, `lucide-react`, `motion`

## 3. Speech-to-Text (STT) Python Sidecar Setup

The application features a real-time Speech-to-Text engine powered by `whisper-live`.

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

## 4. Local LLM Setup (Ollama)

We use Ollama to serve the custom fine-tuned model (`invoice-qwen2.5-1.5b-q8_0.gguf`).

1. Ensure Ollama is installed and running.
2. Ensure you have the `invoice-qwen2.5-1.5b-q8_0.gguf` file and `Modelfile_gguf` in your project root.
3. Open a terminal in the project root directory.
4. Build the custom model into Ollama:
   ```bash
   ollama create invoice-qwen2.5-1.5b-q8_0 -f Modelfile_gguf
   ```
5. Verify the model is available:
   ```bash
   ollama list
   ```

## 5. Environment Variables (`.env`)

Create a `.env` file in the root directory. Below is the complete required configuration (matching `.env.example`):

```env
# ── LOCAL AI CONFIGURATION ──
LLM_HOST="http://127.0.0.1:11434"
LLM_MODEL="invoice-qwen2.5-1.5b-q8_0"
LLM_API_KEY="not-needed-for-local"

STT_PORT=5050
# Path to your faster-whisper model
WHISPER_MODEL="D:/invoice/models/large-v3-turbo"
STT_COMPUTE_TYPE="int8"
PYTHON_CMD="" # Optional: specific python executable to run the STT sidecar

# ── SERVER CONFIGURATION ──
PORT=3000
NODE_ENV="development"
API_SECRET=""
ALLOWED_ORIGINS="http://localhost:3000"

# ── AUTHENTICATION ──
JWT_SECRET="your-secure-secret-here"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"

# ── SUPABASE (Required for auth) ──
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ── CLOUD FALLBACK (Optional) ──
GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
```

## 6. Running the Application

For a development environment with hot-reloading:

```bash
# Starts the Vite server, the Express API (via tsx), and auto-launches the Python STT sidecar.
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
- **Browser UI:** Captures audio and connects to the Node.js WebSocket.
- **Node.js API:** Acts as an authentication and routing proxy. It proxies `/ws/stt` directly to the Python sidecar.
- **Python STT Sidecar:** Listens on port `5050` (or `STT_PORT`). Receives audio chunks, performs VAD segmentation, decodes audio, transcribes with `faster-whisper`, and streams real-time text back.
