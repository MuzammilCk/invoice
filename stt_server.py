"""
AI Invoice Studio — Speech-to-Text Sidecar (WhisperLive Streaming)
True real-time streaming via VAD-based chunking with faster-whisper.
Produces genuine partial transcripts as the user speaks.
Started as a child process by server.ts.
"""

import os
import sys
import json
import asyncio
import logging
import threading

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "ts": self.formatTime(record),
            "level": record.levelname,
            "msg": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.root.handlers = [handler]
logging.root.setLevel(logging.INFO)

# Windows asyncio fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

PORT       = int(os.environ.get("STT_PORT", "5050"))
DEVICE     = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
MODEL_PATH = os.environ.get("WHISPER_MODEL", "D:/invoice/models/large-v3-turbo")
COMPUTE    = os.environ.get("STT_COMPUTE_TYPE", "int8")


# ── WhisperLive server runs in a background thread ──
from whisper_live.server import TranscriptionServer

def run_whisperlive():
    """
    TranscriptionServer handles:
      - WebSocket accept/reject
      - silero_vad VAD segmentation (250ms input → 1-3s VAD windows)
      - faster-whisper transcription per VAD segment
      - Pushing partial + final results back to the client
    """
    server = TranscriptionServer()
    # Whisper-live 0.9.0 requires custom paths to have a '/' or be an existing local folder.
    # For standard models (e.g. 'large-v3-turbo'), we pass None and let the client request it.
    custom_model_path = MODEL_PATH if ("/" in MODEL_PATH or os.path.exists(MODEL_PATH)) else None

    server.run(
        host="0.0.0.0",
        port=PORT,
        backend="faster_whisper",
        faster_whisper_custom_model_path=custom_model_path,
        max_connection_time=300,  # 5-minute max session
    )

def monitor_thread():
    global wl_thread
    while True:
        wl_thread.join()
        logging.error("WhisperLive thread died. Restarting...")
        wl_thread = threading.Thread(target=run_whisperlive, daemon=True)
        wl_thread.start()

# Start WhisperLive in its own daemon thread
wl_thread = threading.Thread(target=run_whisperlive, daemon=True)
wl_thread.start()
logging.info(f"WhisperLive STT server started on port {PORT}")
logging.info(f"Model: {MODEL_PATH} | Device: {DEVICE} | Compute: {COMPUTE}")

monitor = threading.Thread(target=monitor_thread, daemon=True)
monitor.start()


# ── Health HTTP server (port+1) for Node.js startup polling ──
import asyncio

async def health_handler(reader, writer):
    # Probe the WhisperLive WebSocket port
    stt_alive = False
    try:
        probe_reader, probe_writer = await asyncio.wait_for(
            asyncio.open_connection('127.0.0.1', PORT), timeout=1.0
        )
        probe_writer.close()
        await probe_writer.wait_closed()
        stt_alive = True
    except Exception:
        stt_alive = False

    status_code = "200 OK" if stt_alive else "503 Service Unavailable"
    body = json.dumps({
        "status": "ok" if stt_alive else "starting",
        "backend": "whisper-live",
        "model": MODEL_PATH,
        "stt_port": PORT,
        "stt_alive": stt_alive,
    }).encode()
    response = (
        f"HTTP/1.1 {status_code}\r\nContent-Type: application/json\r\nConnection: close\r\n"
        f"Content-Length: {len(body)}\r\n\r\n"
    ).encode() + body
    writer.write(response)
    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def main():
    health_port = PORT + 1
    health_srv = await asyncio.start_server(health_handler, "0.0.0.0", health_port)
    logging.info(f"Health HTTP server on port {health_port}")
    await health_srv.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
