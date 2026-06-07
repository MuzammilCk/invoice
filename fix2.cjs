const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. VITE Guard
const viteGuard = `// ── Issue 1: Structured JSON Logging ──
const log = {
    info: (msg: string, meta?: object) =>
        console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg, ...meta })),
    warn: (msg: string, meta?: object) =>
        console.warn(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', msg, ...meta })),
    error: (msg: string, meta?: object) =>
        console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg, ...meta })),
};

// ── Issue 9: VITE_ Prefix Guard ──
const LEAKED_KEYS = ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_JWT_SECRET', 'VITE_API_SECRET'];
for (const key of LEAKED_KEYS) {
    if (process.env[key]) {
        log.error('Leaked VITE variable', { key });
        process.exit(1);
    }
}

// ── Issue 1.1: Dynamic PORT from environment ──`;
content = content.replace(/\/\/ ── Issue 1\.1: Dynamic PORT from environment ──/, viteGuard);

// 2. Puppeteer Path
const puppeteerOld = `    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      args: [`;
const puppeteerNew = `    const chromePath = process.env.CHROME_PATH ?? (
        process.platform === 'win32'
            ? 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe'
            : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/chromium-browser'
    );
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [`;
content = content.replace(puppeteerOld, puppeteerNew);

// 3. WebSocket Rate Limits & Heartbeat
const wsOld = `  // ── WebSocket STT Proxy ──
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/stt' });

  wss.on('connection', (browserWs, req) => {
    // ── Auth: verify JWT from query param ?token=<accessToken> ──`;
const wsNew = `  // ── WebSocket STT Proxy ──
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/stt' });

  const MAX_WS_CONNECTIONS = 50;
  let activeWsConnections = 0;
  const WS_PING_INTERVAL = 25_000;
  const userWsSessions = new Map<string, number>();
  const MAX_SESSIONS_PER_USER = 2;

  wss.on('connection', (browserWs, req) => {
    if (activeWsConnections >= MAX_WS_CONNECTIONS) {
      browserWs.close(1013, 'Server capacity reached');
      return;
    }
    activeWsConnections++;

    let isAlive = true;
    browserWs.on('pong', () => { isAlive = true; });
    const pingInterval = setInterval(() => {
        if (!isAlive) { browserWs.terminate(); return; }
        isAlive = false;
        browserWs.ping();
    }, WS_PING_INTERVAL);

    browserWs.on('close', () => {
      activeWsConnections--;
      clearInterval(pingInterval);
    });

    // ── Auth: verify JWT from query param ?token=<accessToken> ──`;
content = content.replace(wsOld, wsNew);

const wsSessionOld = `    if (!isDevMode) {
      if (!token) {
        browserWs.close(4001, 'Authentication required');
        return;
      }
      const payload = verifyToken(token, 'access');
      if (!payload) {
        browserWs.close(4003, 'Invalid or expired token');
        return;
      }
      log.info('Authenticated session', { userId: payload.sub });
    }`;
const wsSessionNew = `    if (!isDevMode) {
      if (!token) {
        browserWs.close(4001, 'Authentication required');
        return;
      }
      const payload = verifyToken(token, 'access');
      if (!payload) {
        browserWs.close(4003, 'Invalid or expired token');
        return;
      }

      const userId = payload.sub;
      const current = userWsSessions.get(userId) ?? 0;
      if (current >= MAX_SESSIONS_PER_USER) {
          browserWs.close(4029, 'Session limit reached');
          return;
      }
      userWsSessions.set(userId, current + 1);
      browserWs.on('close', () => {
          const n = userWsSessions.get(userId) ?? 1;
          if (n <= 1) userWsSessions.delete(userId);
          else userWsSessions.set(userId, n - 1);
      });

      log.info('Authenticated session', { userId });
    }`;
content = content.replace(wsSessionOld, wsSessionNew);

// 4. supabaseAdmin fix
content = content.replace(/if \(supabase\)/g, 'if (supabaseAdmin)');
content = content.replace(/await supabase/g, 'await supabaseAdmin');

// 5. LLM Timeout Constant
content = content.replace(
  "const LLM_API_KEY = process.env.LLM_API_KEY ?? 'local-no-key-needed';",
  "const LLM_API_KEY = process.env.LLM_API_KEY ?? 'local-no-key-needed';\nconst LLM_TIMEOUT_MS = 60_000;"
);

fs.writeFileSync('server.ts', content);
