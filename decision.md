# AI Invoice Studio — Tech Stack Decision Log
## Frozen Decisions for Implementation

> **Purpose:** This document freezes ALL technology choices so that any agentic AI implementing the migration has zero room for hallucination about which models, libraries, versions, or approaches to use.  
> **Status:** 🔒 FROZEN — Do NOT deviate without explicit human approval  
> **Date:** June 2026

---

## DECISION 1: LLM Model Selection

| Property | Decision | Rationale |
|---|---|---|
| **Model** | `qwen3:8b` | Best JSON schema adherence of any sub-10B model; 119 language support including all Indic languages; Apache 2.0 license |
| **Quantization** | Q4_K_M (default Ollama pull) | ~5.2GB VRAM; best speed/quality tradeoff for production |
| **Context Window** | 32,768 tokens | More than sufficient for invoice prompts (typically <1000 tokens) |
| **Runtime** | Ollama v0.9+ | Native systemd service, OpenAI-compatible API, no Docker required |
| **Port** | 11434 | Ollama default; do NOT change |
| **Temperature** | 0.1 | Deterministic extraction; do NOT increase for invoice tasks |
| **Thinking Mode** | Disabled (`/no_think` or `enable_thinking: false`) | Non-thinking mode is faster and cleaner for structured extraction |
| **Fallback (low VRAM)** | `qwen3:4b` or `gemma3:4b` | Only if <4GB VRAM available |

### ❌ REJECTED ALTERNATIVES

| Model | Why Rejected |
|---|---|
| Llama 3.1:8b | Poor Indic language support; limited code-mixed (Hinglish) parsing |
| Mistral:7b | Weak structured JSON output; limited Indic language training data |
| Sarvam-2B | Too small for complex invoice prompts; no JSON schema mode; only 10 Indic languages |
| Phi-3:3.8b | Insufficient multilingual coverage; JSON adherence below Qwen3 |
| Gemma3:4b | Good alternative but weaker on code-mixed input than Qwen3; smaller context |
| Qwen2.5:7b | Predecessor; only 29 languages vs Qwen3's 119; weaker structured output |

---

## DECISION 2: STT (Speech-to-Text) Engine

| Property | Decision | Rationale |
|---|---|---|
| **Engine** | `faster-whisper` (CTranslate2) | 4× faster than vanilla Whisper; 50% less VRAM; same weights |
| **Model** | `large-v3-turbo` | 1.5B params; 8× faster than large-v3 full; within 1-3% WER |
| **Compute Type** | `int8` (default) | ~3.2GB VRAM; negligible accuracy loss vs fp16 |
| **Port** | 5050 | STT sidecar HTTP port |
| **Framework** | Flask (Python) | Minimal, ~50 lines; started as child process by Node.js |
| **Audio Preprocessing** | ffmpeg → 16kHz mono WAV | Required by Whisper; system dependency |
| **Language Detection** | Auto (first 30s of audio) | >95% accuracy on Indic; manual override supported via `language` param |
| **Beam Size** | 5 | Standard production quality |

### ❌ REJECTED ALTERNATIVES

| Alternative | Why Rejected |
|---|---|
| `@xenova/transformers` (Node.js ONNX) | 5-15% WER degradation on Indic; no beam search tuning; single-threaded; cannot swap to IndicWhisper |
| Whisper.cpp | Good but lacks faster-whisper's Python API flexibility; harder to integrate IndicWhisper fine-tunes |
| OpenAI Whisper (vanilla PyTorch) | 4× slower than faster-whisper; 2× more VRAM |
| whisper-small | Too inaccurate for Indic languages (>25% WER on Hindi) |
| Google Speech-to-Text API | Cloud dependency; defeats the purpose of local-first |

---

## DECISION 3: STT Fine-Tune Path (Future)

| Property | Decision |
|---|---|
| **Phase 1 (Now)** | Use base `large-v3-turbo` as-is |
| **Phase 2 (After 500 samples)** | Drop-in swap to `ai4bharat/indicwhisper-{lang}` for Hindi/Tamil/Telugu/Malayalam |
| **Phase 3 (Streaming)** | `ai4bharat/indic-conformer-600m-multilingual` for real-time word-by-word transcription |
| **Custom Fine-Tune Tool** | LoRA via Hugging Face PEFT on Whisper encoder; ~4GB VRAM, $5 A100 rental |

---

## DECISION 4: SDK & Communication Protocol

| Property | Decision | Rationale |
|---|---|---|
| **LLM Client SDK** | `openai` npm package (^4.x) | Ollama is OpenAI-compatible; drop-in; portable to any LLM server |
| **STT Communication** | HTTP REST (`POST /transcribe`) | Simple, debuggable, language-agnostic |
| **Audio Transport** | Base64-encoded in JSON body | Compatible with multer buffer → base64 conversion |
| **Schema Format** | OpenAI JSON Schema (not Google `Type.OBJECT`) | Required by Ollama's `response_format` |

### ❌ REJECTED ALTERNATIVES

| Alternative | Why Rejected |
|---|---|
| `@google/genai` SDK | Vendor lock-in; cannot talk to Ollama |
| gRPC for STT | Over-engineered for single-server deployment |
| Direct TCP socket | No need; HTTP is simpler and supports health checks |
| Ollama native JS client | Less portable than OpenAI SDK; same functionality |

---

## DECISION 5: System Architecture Pattern

| Property | Decision | Rationale |
|---|---|---|
| **Deployment** | Bare-metal / VM (no Docker) | Lower latency, simpler ops, direct GPU access |
| **Ollama Lifecycle** | Systemd service (`systemctl`) | Auto-restart, VRAM management, production-grade |
| **STT Lifecycle** | Node.js child process (`spawn`) | Auto-restart on crash; tied to server.ts lifecycle |
| **Concurrency** | `OLLAMA_NUM_PARALLEL=4` | 4 concurrent LLM request slots |
| **Model Keep-Alive** | `OLLAMA_KEEP_ALIVE=-1` | Model stays in VRAM permanently; zero cold start |
| **KV Cache** | `OLLAMA_KV_CACHE_TYPE=q8_0` | 2× context capacity with minimal quality loss |

---

## DECISION 6: Structured Output Strategy

| Property | Decision | Rationale |
|---|---|---|
| **Method** | `response_format: { type: 'json_schema', json_schema: {...} }` | Ollama native constrained decoding; 99%+ parse rate |
| **Schema Source** | Converted from existing `invoiceSchema` | Reuse existing schema; just change `Type.OBJECT` → `"object"` |
| **Validation Layer** | Zod (frontend `AIResponseSchema.safeParse()`) | Already implemented; catch any LLM edge cases |
| **Retry on Parse Failure** | 1 retry with same prompt | LLM outputs are non-deterministic; second attempt usually succeeds |

---

## DECISION 7: Multilingual Strategy

| Property | Decision |
|---|---|
| **Input Languages** | All 119 Qwen3 languages (user can type in any language) |
| **Output Language** | Always English JSON keys (invoice schema is English-keyed) |
| **STT Languages** | All 99 Whisper languages (auto-detection + manual override) |
| **Code-Mixed** | Fully supported (Hinglish, Tanglish, Manglish, Benglish, Tenglish) |
| **Currency Inference** | INR default for Indic languages; USD for English; context-overridable |
| **System Prompt** | Extended with 5 multilingual rules (rules 8-12 in invoiceSystemInstruction) |

---

## DECISION 8: Node.js Dependencies

### KEEP (unchanged)
```
express ^4.x, multer ^2.x, helmet ^8.x, cors ^2.x, express-rate-limit ^8.x,
dotenv ^17.x, zod ^4.x, zustand ^5.x, react ^19.x, react-dom ^19.x,
react-router-dom ^7.x, @dnd-kit/core ^6.x, @dnd-kit/sortable ^10.x,
lucide-react ^0.x, motion ^12.x, clsx ^2.x, tailwind-merge ^3.x,
jspdf ^4.x, html-to-image ^1.x, html2canvas ^1.x, expr-eval ^2.x,
uuid ^14.x, @tailwindcss/vite ^4.x, @tanstack/react-table ^8.x
```

### ADD
```
openai ^4.x   — Ollama OpenAI-compatible client (replaces @google/genai)
```

### REMOVE
```
@google/genai ^2.4.0   — Google Gemini SDK (eliminated)
```

---

## DECISION 9: Python Dependencies (stt_server.py)

```
flask>=3.0
faster-whisper>=1.0
numpy>=1.26
```

### System Dependencies
```
ffmpeg          — apt-get install ffmpeg (or brew/choco)
python3>=3.10   — Required for faster-whisper
```

---

## DECISION 10: Files Changed

| File | Action | Scope |
|---|---|---|
| `server.ts` | 🔴 MODIFY | Replace ALL Gemini calls with Ollama + STT sidecar |
| `stt_server.py` | 🟢 CREATE | New Python Flask STT microservice (~60 lines) |
| `requirements.txt` | 🟢 CREATE | Python dependencies for STT sidecar |
| `package.json` | 🟡 MODIFY | Remove `@google/genai`, add `openai` |
| `.env.example` | 🟡 MODIFY | Remove GEMINI_API_KEY, add OLLAMA_MODEL, STT_PORT, WHISPER_MODEL |
| `.env` | 🟡 MODIFY | Update for local configuration |
| `src/components/AIAssistantSidebar.tsx` | 🟡 COSMETIC | Change label "Gemini 2.5 Flash" → "Local AI (Qwen3)" |
| **All other files** | ⚪ UNTOUCHED | Zero changes |

---

## DECISION 11: What NOT To Change

> 🚫 The following must NOT be modified during this migration:

1. **Frontend components** — No React component logic changes (except AIAssistantSidebar.tsx label)
2. **Zustand store** — No state management changes
3. **Calculations engine** — No financial math changes
4. **Types** — No TypeScript interface changes
5. **Templates** — No invoice template changes
6. **CSS/Styles** — No styling changes
7. **Vite config** — No build config changes
8. **Router** — No routing changes
9. **API contract** — Same request/response shapes
10. **Security middleware** — All existing guards preserved

---

## DECISION 12: Naming Conventions

| Item | Convention |
|---|---|
| Environment variables | `SCREAMING_SNAKE_CASE` (e.g., `OLLAMA_MODEL`) |
| Python file names | `snake_case.py` (e.g., `stt_server.py`) |
| Log prefixes | Bracketed tags: `[ollama]`, `[stt]`, `[startup]`, `[shutdown]` |
| API routes | `/api/v1/{resource}` (existing convention preserved) |
| Error responses | `{ error: string, requestId?: string }` |

---

*End of Decision Log — All decisions are FROZEN for implementation*
