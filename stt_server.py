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
    server.run(
        host="0.0.0.0",
        port=PORT,
        backend="faster_whisper",
        faster_whisper_custom_model_path=MODEL_PATH,
        device=DEVICE,
        compute_type=COMPUTE,
        # VAD configuration
        vad_parameters={
            "onset": 0.5,         # VAD sensitivity (0-1, lower = more sensitive)
            "min_speech_duration_ms": 250,
            "min_silence_duration_ms": 600,  # pause length to end a segment
        },
        language=None,            # auto-detect
        task="transcribe",
        max_connection_time=300,  # 5-minute max session
        no_voice_activity_chunks=10,  # send final after 10 silent chunks
    )

# Start WhisperLive in its own daemon thread
wl_thread = threading.Thread(target=run_whisperlive, daemon=True)
wl_thread.start()
logging.info(f"WhisperLive STT server started on port {PORT}")
logging.info(f"Model: {MODEL_PATH} | Device: {DEVICE} | Compute: {COMPUTE}")


# ── Health HTTP server (port+1) for Node.js startup polling ──
import asyncio

async def health_handler(reader, writer):
    body = json.dumps({
        "status": "ok",
        "backend": "whisper-live",
        "model": MODEL_PATH,
        "device": DEVICE,
    }).encode()
    response = (
        b"HTTP/1.1 200 OK\r\n"
        b"Content-Type: application/json\r\n"
        b"Connection: close\r\n"
        + f"Content-Length: {len(body)}\r\n\r\n".encode()
        + body
    )
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
