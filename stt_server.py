"""
AI Invoice Studio — Speech-to-Text Sidecar (WebSocket Streaming)
In-memory audio decoding via PyAV — zero disk I/O, zero subprocess forks.
Falls back gracefully from NeMo → faster-whisper.
"""

import os
import sys
import io
import asyncio
import json
import logging

import av
import numpy as np
import websockets

# ── Configuration ──
PORT = int(os.environ.get("STT_PORT", "5050"))
COMPUTE_TYPE = os.environ.get("STT_COMPUTE_TYPE", "int8")
DEVICE = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
BACKEND = os.environ.get("STT_BACKEND", "auto")
MODEL_INFO = "unknown"

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# Windows asyncio policy fix
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

model = None
is_nemo = False

try:
    if BACKEND in ["auto", "nemo"]:
        import nemo.collections.asr as nemo_asr
        model_name = os.environ.get("NEMO_MODEL", "ai4bharat/indicConformer-multilingual")
        logging.info(f"[stt] Loading NeMo model {model_name}...")
        model = nemo_asr.models.EncDecRNNTBPEModel.from_pretrained(model_name)
        is_nemo = True
        BACKEND = "nemo"
        MODEL_INFO = model_name
    else:
        raise ImportError("Skipping NeMo as requested")
except Exception as e:
    logging.info(f"[stt] NeMo not loaded ({e}), falling back to faster-whisper")
    from faster_whisper import WhisperModel
    model_name = os.environ.get("WHISPER_MODEL", "D:/invoice/models/large-v3-turbo")
    logging.info(f"[stt] Loading Whisper model {model_name}...")
    model = WhisperModel(model_name, device=DEVICE, compute_type=COMPUTE_TYPE)
    is_nemo = False
    BACKEND = "whisper-live"
    MODEL_INFO = model_name


# ── In-Memory Audio Decoder (Plan 2) ──
def decode_audio_inmemory(audio_bytes: bytes) -> np.ndarray:
    """
    Decode any audio container (webm/opus, ogg, mp4, mpeg) from raw bytes
    into a 16 kHz mono float32 numpy array — no disk writes, no subprocess.

    Returns a float32 numpy array normalised to [-1.0, 1.0].
    """
    buf = io.BytesIO(audio_bytes)
    container = av.open(buf, format=None)  # auto-detect container

    resampler = av.AudioResampler(
        format='fltp',      # float planar — what faster-whisper expects
        layout='mono',
        rate=16000
    )

    chunks: list[np.ndarray] = []
    for frame in container.decode(audio=0):
        resampled = resampler.resample(frame)
        for r in resampled:
            chunks.append(r.to_ndarray().flatten())

    # Flush resampler (drains any buffered samples)
    for r in resampler.resample(None):
        chunks.append(r.to_ndarray().flatten())

    container.close()

    if not chunks:
        raise ValueError("No audio frames decoded from input bytes")

    return np.concatenate(chunks).astype(np.float32)


async def transcribe_handler(websocket):
    """One WebSocket connection = one recording session."""
    logging.info("[ws] Client connected to STT session")

    # Buffer incoming audio chunks (binary WebSocket frames)
    audio_buffer = bytearray()

    try:
        async for message in websocket:
            if isinstance(message, bytes):
                audio_buffer.extend(message)
                # Acknowledge receipt so the frontend knows we're listening
                await websocket.send(json.dumps({"type": "partial", "text": "Listening..."}))
    except websockets.exceptions.ConnectionClosed:
        pass

    logging.info(f"[ws] Session closed, finalizing transcription... (Buffered {len(audio_buffer)} bytes)")

    if len(audio_buffer) == 0:
        try:
            await websocket.send(json.dumps({"type": "error", "message": "No audio received"}))
        except websockets.exceptions.ConnectionClosed:
            pass
        return

    try:
        # ── In-memory decode: raw bytes → 16 kHz float32 numpy array ──
        audio_array = decode_audio_inmemory(bytes(audio_buffer))
        logging.info(f"[ws] Decoded {len(audio_array)} samples ({len(audio_array)/16000:.1f}s at 16 kHz)")

        # ── Transcribe using the numpy array directly — no file path needed ──
        segments, info = model.transcribe(
            audio_array,
            beam_size=5,
            word_timestamps=False,
            task="transcribe",
        )
        text = " ".join([seg.text.strip() for seg in segments])

        await websocket.send(json.dumps({
            "type": "final",
            "text": text,
            "language": info.language,
            "confidence": round(info.language_probability * 100),
        }))

    except av.error.InvalidDataError as e:
        logging.error(f"[ws] PyAV decode error: {e}")
        try:
            await websocket.send(json.dumps({"type": "error", "message": "Could not decode audio format"}))
        except websockets.exceptions.ConnectionClosed:
            pass
    except Exception as e:
        logging.error(f"[ws] Transcription error: {e}")
        try:
            await websocket.send(json.dumps({"type": "error", "message": str(e)}))
        except websockets.exceptions.ConnectionClosed:
            pass


async def health_handler(reader, writer):
    """Minimal TCP HTTP for Node.js health polling."""
    response_body = json.dumps({"status": "ok", "model": MODEL_INFO, "backend": BACKEND}).encode()
    response = (
        b"HTTP/1.1 200 OK\r\n"
        b"Content-Type: application/json\r\n"
        b"Connection: close\r\n"
        + f"Content-Length: {len(response_body)}\r\n\r\n".encode() + response_body
    )
    writer.write(response)
    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def main():
    logging.info(f"[stt] Starting WebSocket server on port {PORT}")
    logging.info(f"[stt] Audio decode: in-memory PyAV (av {av.__version__})")
    ws_server = await websockets.serve(transcribe_handler, "0.0.0.0", PORT)

    health_port = PORT + 1
    logging.info(f"[stt] Starting Health HTTP server on port {health_port}")
    health_server = await asyncio.start_server(health_handler, "0.0.0.0", health_port)

    await asyncio.gather(ws_server.serve_forever(), health_server.serve_forever())


if __name__ == "__main__":
    asyncio.run(main())

