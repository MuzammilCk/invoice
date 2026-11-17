import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { OpenAI } from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Structured JSON Logger ──
const log = {
  info: (msg: string, meta?: object) =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg, ...meta })),
  warn: (msg: string, meta?: object) =>
    console.warn(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', msg, ...meta })),
  error: (msg: string, meta?: object) =>
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg, ...meta })),
};

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const LLM_HOST = process.env.LLM_HOST ?? 'http://127.0.0.1:11434';
const LLM_MODEL = process.env.LLM_MODEL ?? 'invoice-qwen2.5-1.5b-q8_0';
const LLM_API_KEY = process.env.LLM_API_KEY ?? 'local-no-key-needed';
const LLM_TIMEOUT_MS = 60_000;
const STT_PORT = process.env.STT_PORT ?? '5050';

const llm = new OpenAI({
  baseURL: `${LLM_HOST}/v1`,
  apiKey: LLM_API_KEY,
});

// ── Minimal Invoice JSON Schema for LLM normalization ──
const invoiceSchema = {
  type: 'object',
  properties: {
    recipient: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: { type: 'string' },
      },
      required: ['name'],
    },
    date: { type: 'string', description: 'YYYY-MM-DD if explicitly mentioned' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          price: { type: 'number', description: 'Price in INR' },
        },
        required: ['description', 'price'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['items'],
};

const invoiceSystemInstruction = `You are a voice-to-invoice assistant for a sound/electronics business in Kerala, India.
Convert spoken invoice transcriptions into structured JSON.
Per-invoice spoken fields:
- Recipient ("Billed to": name, address)
- Items: list of items with description and price in INR
- Date: YYYY-MM-DD only if explicitly spoken to override today
Do not compute totals (totals are computed in code).
Do not add tax, GST, discount, or quantity fields.
Return valid JSON matching the schema.`;

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // ── STT Sidecar Lifecycle ──
  let sttProcess: ChildProcess | null = null;

  function startSTTSidecar(): void {
    const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
    log.info('Starting STT sidecar', { command: pythonCmd, port: STT_PORT });

    sttProcess = spawn(pythonCmd, ['stt_server.py'], {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: {
        ...process.env,
        STT_PORT,
        WHISPER_MODEL: process.env.WHISPER_MODEL ?? 'models/large-v3-turbo',
      },
    });

    sttProcess.on('error', (err) => {
      log.error('Failed to start STT sidecar process', { error: err.message });
    });

    sttProcess.stdout?.on('data', (d) => log.info('STT sidecar', { data: d.toString().trim() }));
    sttProcess.on('exit', (code) => {
      log.warn('STT sidecar exited', { code });
      setTimeout(startSTTSidecar, 3000);
    });
  }

  startSTTSidecar();

  // ── API Routes ──

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/v1/capabilities', async (_req, res) => {
    let llmOnline = false;
    try {
      await fetch(`${LLM_HOST}/v1/models`, { signal: AbortSignal.timeout(3000) });
      llmOnline = true;
    } catch {}

    res.json({
      llm: { online: llmOnline, host: LLM_HOST, model: LLM_MODEL },
      stt: { port: STT_PORT },
    });
  });

  // Core Voice Normalization Route (SSE streaming)
  app.post('/api/v1/text-to-invoice-from-transcript', async (req, res): Promise<void> => {
    try {
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        res.status(400).json({ error: 'Transcript is required and must be a string' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent('status', { stage: 'generating' });

      const stream = await llm.chat.completions.create({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: invoiceSystemInstruction },
          { role: 'user', content: `Spoken transcript:\n${transcript}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'invoice', schema: invoiceSchema },
        } as any,
        temperature: 0.1,
        stream: true,
      }, { signal: AbortSignal.timeout(LLM_TIMEOUT_MS) });

      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullContent += delta;
        }
      }

      sendEvent('status', { stage: 'parsing' });

      try {
        const parsed = JSON.parse(fullContent);
        sendEvent('result', parsed);
      } catch {
        sendEvent('error', { error: 'Failed to parse invoice structure from model output.' });
      }

      res.end();
    } catch (err: any) {
      if (res.headersSent) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Generation failed' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: err.message || 'Internal error' });
      }
    }
  });

  // PDF Generation placeholder — to be wired to chosen reportlab design script
  app.post('/api/v1/generate-pdf', (_req, res) => {
    res.status(501).json({
      error: 'PDF generation pending design selection. Five candidate designs are in design/candidates/.',
    });
  });

  // ── WebSocket STT Proxy ──
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/stt' });

  wss.on('connection', (browserWs) => {
    const sidecarWs = new WsClient(`ws://127.0.0.1:${STT_PORT}`);
    const sessionUid = randomUUID();

    sidecarWs.on('open', () => {
      sidecarWs.send(JSON.stringify({
        uid: sessionUid,
        language: null,
        task: 'transcribe',
        model: 'large-v3-turbo',
        use_vad: true,
        audio_format: 'int16',
        sample_rate: 16000,
      }));
    });

    browserWs.on('message', (data, isBinary) => {
      if (sidecarWs.readyState === WsClient.OPEN) {
        if (isBinary) {
          sidecarWs.send(data, { binary: true });
        } else {
          try {
            const parsed = JSON.parse(data.toString());
            if (parsed.eof) sidecarWs.send(JSON.stringify({ eof: 1 }));
          } catch {}
        }
      }
    });

    let accumulatedText = '';

    sidecarWs.on('message', (data) => {
      if (browserWs.readyState !== browserWs.OPEN) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.message === 'SERVER_READY') {
          browserWs.send(JSON.stringify({ type: 'stt_ready' }));
          return;
        }
        if (msg.segments && msg.segments.length > 0 && msg.message !== 'DISCONNECT') {
          const completedText = msg.segments.filter((s: any) => s.completed).map((s: any) => s.text.trim()).join(' ');
          const inProgressText = msg.segments.filter((s: any) => !s.completed).map((s: any) => s.text.trim()).join(' ');
          accumulatedText = completedText;
          const displayText = [completedText, inProgressText].filter(Boolean).join(' ');
          browserWs.send(JSON.stringify({ type: 'partial', text: displayText.trim() }));
          return;
        }
        if (msg.message === 'DISCONNECT') {
          const finalText = (msg.segments || []).map((s: any) => s.text.trim()).join(' ').trim();
          browserWs.send(JSON.stringify({
            type: 'final',
            text: finalText || accumulatedText,
            language: msg.language || 'en',
            confidence: Math.round((msg.language_probability || 0.9) * 100),
          }));
          browserWs.close(1000, 'Session complete');
          return;
        }
      } catch {
        browserWs.send(data);
      }
    });

    browserWs.on('close', () => {
      if (sidecarWs.readyState !== WsClient.CLOSED) sidecarWs.close();
    });

    sidecarWs.on('close', () => {
      if (browserWs.readyState === browserWs.OPEN) browserWs.close();
    });

    sidecarWs.on('error', (err) => {
      log.error('STT Sidecar WS error', { error: (err as any).message });
      if (browserWs.readyState === browserWs.OPEN) {
        browserWs.send(JSON.stringify({ type: 'error', message: 'STT sidecar unavailable' }));
      }
    });
  });

  // ── Vite integration for dev, static serving for prod ──
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    log.info('Server running', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });

  const shutdown = (signal: string) => {
    log.info('Shutdown initiated', { signal });
    if (sttProcess) {
      sttProcess.removeAllListeners('exit');
      sttProcess.kill('SIGTERM');
    }
    server.close(() => {
      wss.close(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
