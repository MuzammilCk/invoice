Open Question 1 — startStreamPCM Source Code
It's already in your audit. The invoice.txt you uploaded contains the complete function verbatim. The agent never read the source document it was planning from. Zero user input needed. Here it is, confirmed and ready to drop into src/lib/audio/streamPCM.ts:
typescriptexport async function startStreamPCM(
  ws: WebSocket,
  onAudioStream: (audioContext: AudioContext, processor: ScriptProcessorNode) => void,
  onError: (err: Error) => void
) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBuffer = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        pcmBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(pcmBuffer.buffer);
      }
    };

    onAudioStream(audioContext, processor);

    return () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach(track => track.stop());
      if (audioContext.state !== 'closed') audioContext.close();
    };
  } catch (err: any) {
    onError(err);
  }
}

Open Question 2 — Obsidian Color Hex Values
Also already in your audit. Again, agent missed it. Exact values from the source:
--color-obsidian-950: #07080a
--color-obsidian-900: #0c0e12
--color-obsidian-800: #12151c
--color-obsidian-700: #1a1f29
No inference needed. These are production values, not guesses.

Plan Verification — Gaps Found
The agent's plan is structurally correct but has 6 issues I'm upgrading now.
Gap 1 — Hallucinated line number. The backend plan references server.ts line 2643. The agent never saw server.ts. That number is fabricated. Removed. Implementation targets the sidecarWs.on('open') handler functionally, not by line number.
Gap 2 — No execution order. The plan lists phases in audit order (1 → 2 → 3 → 4) but the correct execution order for safe testing is Backend first, then Frontend. Fix the handshake before you stream PCM at it, otherwise your first test is against a misconfigured sidecar. Correct order: Phase 2 → Phase 1 → Phase 3 → Phase 4.
Gap 3 — sidecarWs.on('error') payload not specified. The plan says "emit a structured error to browserWs" but doesn't say what the structure looks like. The frontend state machine needs a contract to react to. Define it:
typescriptsidecarWs.on('error', (err) => {
  log.error('Sidecar WS error', err);
  if (browserWs.readyState === WebSocket.OPEN) {
    browserWs.send(JSON.stringify({
      type: 'error',
      code: 'SIDECAR_FAILURE',
      message: 'Speech recognition service unavailable'
    }));
  }
});
The frontend processing state handler must listen for type: 'error' messages and transition to idle immediately, alongside the 30-second timeout.
Gap 4 — ScriptProcessorNode deprecation not documented. The agent's plan has no mention of this. It must be in the plan as a known technical debt item, or a future developer will refactor it without understanding why it wasn't already using AudioWorklet. Add as a follow-up ticket.
Gap 5 — No typography specification. The plan says "remove skeuomorphic styles" but doesn't specify what replaces them in invoice tables. Without this, a developer will pick an arbitrary font. Specify: font-family: 'Inter', 'DM Sans', system-ui, sans-serif in all <table> and .line-item contexts.
Gap 6 — Missing bandwidth note. If this project ever scales past a handful of concurrent users, the raw PCM stream (32 KB/s per session) needs to be planned for. Not a blocker now, but must be documented.

Upgraded Full Implementation Plan

Execution Order
Phase 2 → Phase 1 → Phase 3 → Phase 4 → Phase 5
Backend handshake must be correct before frontend PCM streams against it. Phases 1 and 3 are coupled (same components) and executed together. Phase 4 (UI) is fully independent and can be parallelized.

Phase 1 — Frontend Audio Pipeline
Files: AIAssistantSidebar.tsx, Dashboard.tsx
Create src/lib/audio/streamPCM.ts with the exact startStreamPCM code above — no modifications needed.
In both components, remove all MediaRecorder usage from the STT recording path. MediaRecorder is permissible only for save-to-file flows. Replace the recording start logic with startStreamPCM. Store the teardown via useRef:
typescriptconst stopStreamRef = useRef<(() => void) | null>(null);

// On start:
stopStreamRef.current = await startStreamPCM(ws, (ctx, proc) => {
  // optional: store context if you need pause/resume later
}, (err) => {
  setRecordingState('idle');
  showToast('Microphone access failed: ' + err.message);
});

// On stop:
stopStreamRef.current?.();
stopStreamRef.current = null;
ws.close(1000, 'Recording stopped'); // explicit close flushes final Whisper segment
The ws.close(1000, ...) call is not cosmetic — WhisperLive uses the WebSocket close signal to flush its VAD buffer and return the final transcript segment. Without this, the last 1-2 words of every dictation are silently dropped.

Phase 2 — Backend WebSocket Handshake
File: server.ts
In the sidecarWs.on('open') handler, update the config payload:
typescriptsidecarWs.send(JSON.stringify({
  uid: sessionUid,
  language: null,
  task: 'transcribe',
  model: 'large-v3-turbo',
  use_vad: true,
  audio_format: 'int16',   // NEW — tells sidecar to expect Int16 PCM
  sample_rate: 16000        // NEW — matches frontend downsample target
}));
Add the structured error emission (exact payload defined in Gap 3 above). Add the session cleanup in browserWs.on('close'):
typescriptbrowserWs.on('close', () => {
  if (sidecarWs.readyState !== WebSocket.CLOSED) {
    sidecarWs.close();
  }
});
Without this, a user closing the tab mid-dictation leaks an active sidecar connection and holds a Whisper inference slot indefinitely.

Phase 3 — WebSocket Lifecycle & State Machine
Files: AIAssistantSidebar.tsx, Dashboard.tsx
Define the state type explicitly — don't use ad-hoc string literals scattered through the component:
typescripttype RecordingState = 'idle' | 'recording' | 'processing' | 'complete';
Valid transitions: idle → recording → processing → complete → idle and any → idle (error/timeout path).
Add the timeout escape hatch when entering processing:
typescriptuseEffect(() => {
  if (recordingState !== 'processing') return;
  const timeout = setTimeout(() => {
    setRecordingState('idle');
    showToast('Transcription timed out. Please try again.');
  }, 30_000);
  return () => clearTimeout(timeout);
}, [recordingState]);
Add a ws.onmessage handler that checks for type: 'error' from the backend and transitions to idle immediately rather than waiting for the 30-second timeout.

Phase 4 — UI/UX Migration to Obsidian Glass
File: src/index.css
Add to :root:
css--color-obsidian-950: #07080a;
--color-obsidian-900: #0c0e12;
--color-obsidian-800: #12151c;
--color-obsidian-700: #1a1f29;
--color-accent-indigo: #6366f1;
--color-accent-cyan: #06b6d4;
--color-border-subtle: rgba(255, 255, 255, 0.06);
Apply the three utility classes from the audit (glass-panel, invoice-page-canvas, clean-invoice-input). In glass-panel, add the Safari prefix:
css.glass-panel {
  background: rgba(18, 21, 28, 0.7);
  -webkit-backdrop-filter: blur(16px); /* Safari 16+ */
  backdrop-filter: blur(16px);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}
Skeuomorphic purge checklist — grep and remove every instance of:

border-radius: 255px (shaky borders)
Any font-family with handwritten/serif fonts inside table, .line-item, or form contexts
border-style: groove, ridge, inset, outset

Typography replacement for all invoice tables and line-item rows:
csstable, .line-item, .invoice-field {
  font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
}

Phase 5 — Verification Checklist
Audio pipeline: Open DevTools → Network → WS filter. Start recording. Confirm rapid binary frames (not text frames). Stop recording. Confirm WebSocket closes with code 1000. Confirm final word of dictation is not truncated.
Handshake: In server logs, immediately after sidecar WS open, confirm audio_format: 'int16' and sample_rate: 16000 are present in the sent config. Confirm no unknown audio format errors in the whisper_live process stdout.
Lifecycle / leak test: Kill the backend process mid-dictation. UI must transition to idle with a toast within 30 seconds, not hang.
Tab-close leak test: Start a recording, close the tab without stopping. Check the server process — confirm no orphaned sidecar connection remains after tab close.
UI: Run Lighthouse on the dashboard. Accessibility score should improve due to higher contrast ratios. Manually test .glass-panel in Safari 16+ to confirm blur renders.