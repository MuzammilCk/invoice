# AI Invoice Studio — Implementation Plan
## Gemini API → Local OSS Migration

> **Author:** Senior AI Engineer  
> **Status:** Ready for execution  
> **Estimated Duration:** 2-3 hours (single developer)  
> **Date:** June 2026

---

## Phase 0: Prerequisites & Environment Setup (30 min)

### 0.1 Install Ollama
```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download/windows
winget install Ollama.Ollama
```

### 0.2 Pull the LLM Model
```bash
ollama pull qwen3:8b
# Verify: ~4.9GB download, should complete in 2-5 min on broadband
ollama run qwen3:8b "Hello, respond with a JSON object: {\"test\": true}"
# Expected: {"test": true}
```

### 0.3 Configure Ollama for Production
```bash
# Linux: Create systemd override
sudo systemctl edit ollama.service
```
Add:
```ini
[Service]
Environment="OLLAMA_NUM_PARALLEL=4"
Environment="OLLAMA_KV_CACHE_TYPE=q8_0"
Environment="OLLAMA_KEEP_ALIVE=-1"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
```
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 0.4 Install Python Dependencies
```bash
# Ensure Python 3.10+
python3 --version

# Install STT dependencies
pip install faster-whisper flask numpy

# Verify ffmpeg
ffmpeg -version
# If missing: sudo apt install ffmpeg (Linux) / brew install ffmpeg (macOS) / choco install ffmpeg (Windows)
```

### 0.5 Update Node Dependencies
```bash
cd d:\projects\invoice

# Remove Google Gemini SDK
npm uninstall @google/genai

# Install OpenAI SDK (for Ollama compatibility)
npm install openai
```

---

## Phase 1: Create STT Sidecar (stt_server.py) — NEW FILE (15 min)

### 1.1 Create `stt_server.py` in project root

This is a ~60-line Python Flask microservice that:
- Loads `faster-whisper` with `large-v3-turbo` model at startup
- Exposes `POST /transcribe` endpoint
- Accepts base64-encoded audio + optional language code
- Returns transcribed text + detected language
- Exposes `GET /health` for readiness checks

### 1.2 Create `requirements.txt` in project root

```
flask>=3.0
faster-whisper>=1.0
numpy>=1.26
```

### 1.3 Test STT sidecar independently
```bash
python3 stt_server.py
# In another terminal:
curl http://localhost:5050/health
# Expected: {"status": "ok", "model": "large-v3-turbo"}
```

---

## Phase 2: Refactor server.ts (45 min)

### 2.1 Replace imports
```diff
- import { GoogleGenAI, Type, Schema } from '@google/genai';
+ import { OpenAI } from 'openai';
+ import { spawn, ChildProcess } from 'child_process';
```

### 2.2 Replace Gemini client initialization
```diff
- const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
- if (!GEMINI_API_KEY) {
-   console.error('FATAL: GEMINI_API_KEY environment variable is not set.');
-   process.exit(1);
- }
- const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
+ const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
+ const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:8b';
+ const STT_PORT = process.env.STT_PORT ?? '5050';
+ 
+ const ollama = new OpenAI({
+   baseURL: `${OLLAMA_HOST}/v1`,
+   apiKey: 'ollama',
+ });
```

### 2.3 Add STT sidecar lifecycle management
- `startSTTSidecar()` function that spawns `python3 stt_server.py`
- Auto-restart on crash (3s delay)
- `waitForSTT()` health check polling (30s timeout)
- Kill on server shutdown (`SIGTERM`)

### 2.4 Convert invoice schema from Google format to JSON Schema
```diff
- const invoiceSchema = {
-   type: Type.OBJECT,
-   properties: {
-     customerInfo: { type: Type.OBJECT, ... },
-     items: { type: Type.ARRAY, items: { type: Type.OBJECT, ... } },
-     ...
-   },
- };
+ const invoiceSchema = {
+   type: 'object',
+   properties: {
+     customerInfo: { type: 'object', ... },
+     items: { type: 'array', items: { type: 'object', ... } },
+     ...
+   },
+ };
```

### 2.5 Extend system prompt with multilingual rules
Add rules 8-12 to `invoiceSystemInstruction` for:
- Multilingual input handling
- English-keyed JSON output enforcement
- Currency inference from language context
- Code-mixed input support
- Ambiguity defaults

### 2.6 Refactor `generate-invoice` route
```diff
- const response = await withGeminiRetry(() =>
-   ai.models.generateContent({
-     model: 'gemini-2.5-flash',
-     contents: sanitizedPrompt,
-     config: { systemInstruction, responseMimeType: 'application/json', responseSchema: invoiceSchema },
-   })
- );
- const generatedData = JSON.parse(response.text);
+ const response = await withRetry(() =>
+   ollama.chat.completions.create({
+     model: OLLAMA_MODEL,
+     messages: [
+       { role: 'system', content: invoiceSystemInstruction },
+       { role: 'user', content: sanitizedPrompt },
+     ],
+     response_format: { type: 'json_schema', json_schema: { name: 'invoice', schema: invoiceSchema } },
+     temperature: 0.1,
+   })
+ );
+ const generatedData = JSON.parse(response.choices[0].message.content!);
```

### 2.7 Refactor `audio-to-invoice` route (two-stage pipeline)
```
Stage 1: POST http://localhost:5050/transcribe
  Body: { audio_b64: <base64>, mime_type: <string>, language: null }
  Response: { text: "transcribed text", language: "hi" }

Stage 2: POST http://localhost:11434/v1/chat/completions
  Body: { model: "qwen3:8b", messages: [...], response_format: {...} }
  Response: { choices: [{ message: { content: "<invoice JSON>" } }] }
```

### 2.8 Refactor `rewrite` route
```diff
- const response = await withGeminiRetry(() =>
-   ai.models.generateContent({
-     model: 'gemini-2.5-flash',
-     contents: prompt,
-   })
- );
- res.json({ text: response?.text });
+ const response = await withRetry(() =>
+   ollama.chat.completions.create({
+     model: OLLAMA_MODEL,
+     messages: [
+       { role: 'system', content: 'You are a professional text editor...' },
+       { role: 'user', content: prompt },
+     ],
+     temperature: 0.3,
+   })
+ );
+ res.json({ text: response.choices[0].message.content });
```

### 2.9 Rename retry utility
```diff
- async function withGeminiRetry<T>(...) { ... }
+ async function withRetry<T>(...) { ... }
```
Update error detection for Ollama-specific errors (connection refused, model not loaded).

### 2.10 Add health check endpoint
```typescript
v1.get('/health', async (req, res) => {
  const ollamaOk = await checkOllama();
  const sttOk = await checkSTT();
  res.json({ status: ollamaOk && sttOk ? 'ok' : 'degraded', ollama: ollamaOk, stt: sttOk });
});
```

---

## Phase 3: Update Configuration Files (10 min)

### 3.1 Update `.env.example`
Remove `GEMINI_API_KEY`, add `OLLAMA_MODEL`, `OLLAMA_HOST`, `STT_PORT`, `WHISPER_MODEL`, `STT_COMPUTE_TYPE`.

### 3.2 Update `.env`
Remove the actual `GEMINI_API_KEY` value. Add local AI config defaults.

### 3.3 Update `package.json`
Verify `@google/genai` is removed and `openai` is added.

---

## Phase 4: Update Frontend Label (2 min)

### 4.1 `src/components/AIAssistantSidebar.tsx` (line 333)
```diff
- <span className="text-sm font-bold text-zinc-100">Gemini 2.5 Flash</span>
+ <span className="text-sm font-bold text-zinc-100">Local AI (Qwen3)</span>
```

Update the description text:
```diff
- "You can type or speak instructions to modify your invoice..."
+ "Powered by local AI. Type or speak in any language to modify your invoice."
```

---

## Phase 5: Integration Testing (30 min)

### 5.1 Start all services
```bash
# Terminal 1: Start Ollama (if not systemd)
ollama serve

# Terminal 2: Start the application (STT sidecar auto-starts)
npm run dev
```

### 5.2 Test matrix

| # | Test | Command/Action | Expected |
|---|---|---|---|
| 1 | Health check | `curl localhost:3000/api/v1/health` | `{ "status": "ok" }` |
| 2 | English text-to-invoice | Type prompt in AI sidebar | Invoice generated |
| 3 | Hindi text-to-invoice | Type Hindi prompt | Invoice generated with correct items |
| 4 | Tamil text-to-invoice | Type Tamil prompt | Invoice generated |
| 5 | Hinglish text-to-invoice | Type "3 ghante design 150/hr" | Invoice generated |
| 6 | Audio recording (English) | Use mic button | Transcribed + invoice generated |
| 7 | Audio recording (Hindi) | Speak Hindi | Transcribed + invoice generated |
| 8 | Notes rewrite | Click "Polish Notes" | Notes professionally rewritten |
| 9 | Audit | Click "Audit Compliance" | Issues detected correctly |
| 10 | Error handling | Stop Ollama, try generating | Graceful 503 error shown |

### 5.3 Performance verification
- Text-to-invoice: Should complete in <5s (GPU) or <20s (CPU)
- Audio-to-invoice: Should complete in <8s for 5s audio clip
- Rewrite: Should complete in <4s

---

## Phase 6: Cleanup & Documentation (10 min)

### 6.1 Remove dead code
- Delete any remaining Gemini-specific imports or references
- Remove `withGeminiRetry` if renamed to `withRetry`

### 6.2 Git commit strategy
```bash
git add -A
git commit -m "feat: migrate from Google Gemini API to local Ollama + faster-whisper

- Replace @google/genai with openai SDK (Ollama-compatible)
- Add Python STT sidecar (faster-whisper large-v3-turbo)
- Support 119 languages including all Indic languages
- Zero external API dependencies
- Zero cost per inference
- 100% air-gapped privacy

BREAKING: GEMINI_API_KEY no longer needed
REQUIRES: Ollama installed with qwen3:8b pulled
REQUIRES: Python 3.10+ with faster-whisper installed
REQUIRES: ffmpeg installed"
```

---

## Dependency Summary

```
BEFORE:
  Node: @google/genai ^2.4.0
  External: Google Gemini API (requires internet + API key)

AFTER:
  Node: openai ^4.x (replaces @google/genai)
  System: Ollama v0.9+ with qwen3:8b (~4.9GB)
  System: Python 3.10+ with faster-whisper, flask, numpy
  System: ffmpeg
  External: NONE (100% local)
```

---

*End of Implementation Plan*
