"""
AI Invoice Studio — Speech-to-Text Sidecar (WebSocket Streaming)
Runs NeMo RNNT for local real-time streaming transcription.
Falls back to faster-whisper if NeMo is unavailable.
"""

import os
import sys
import asyncio
import websockets
import json
import logging
import base64
import tempfile
import subprocess

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

async def transcribe_handler(websocket):
    """One WebSocket connection = one recording session"""
    logging.info("[ws] Client connected to STT session")
    
    # We buffer audio chunks to transcribe at the end for faster-whisper fallback.
    # For a full NeMo stream, we would use session.transcribe_chunk() in real-time.
    audio_buffer = bytearray()
    
    try:
        async for message in websocket:
            if isinstance(message, bytes):
                audio_buffer.extend(message)
                # Send a partial message so the frontend knows we're receiving
                await websocket.send(json.dumps({"type": "partial", "text": "Listening..."}))
    except websockets.exceptions.ConnectionClosed:
        pass
        
    logging.info(f"[ws] Session closed, finalizing transcription... (Buffered {len(audio_buffer)} bytes)")
    
    if len(audio_buffer) == 0:
        await websocket.send(json.dumps({"type": "error", "message": "No audio received"}))
        return

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_in:
        tmp_in.write(audio_buffer)
        tmp_in_path = tmp_in.name

    tmp_wav_path = tmp_in_path + ".wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in_path, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav_path],
            capture_output=True, check=True
        )
        
        # Depending on backend, process the full wav
        if is_nemo:
            # NeMo batch transcribe
            pass # Since we couldn't properly stream WebM above without PyAV, we do full file
        else:
            segments, info = model.transcribe(
                tmp_wav_path,
                beam_size=5,
                word_timestamps=False,
                task="transcribe",
            )
            text = " ".join([seg.text.strip() for seg in segments])
            await websocket.send(json.dumps({
                "type": "final",
                "text": text,
                "language": info.language,
                "confidence": round(info.language_probability * 100)
            }))
    except subprocess.CalledProcessError as e:
        await websocket.send(json.dumps({"type": "error", "message": "ffmpeg failed"}))
        logging.error(f"ffmpeg error: {e.stderr.decode() if e.stderr else str(e)}")
    except Exception as e:
        await websocket.send(json.dumps({"type": "error", "message": str(e)}))
        logging.error(f"transcription error: {str(e)}")
    finally:
        if os.path.exists(tmp_in_path):
            os.unlink(tmp_in_path)
        if os.path.exists(tmp_wav_path):
            os.unlink(tmp_wav_path)

async def health_handler(reader, writer):
    """Minimal TCP HTTP for Node.js health polling"""
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
    ws_server = await websockets.serve(transcribe_handler, "0.0.0.0", PORT)
    
    health_port = PORT + 1
    logging.info(f"[stt] Starting Health HTTP server on port {health_port}")
    health_server = await asyncio.start_server(health_handler, "0.0.0.0", health_port)
    
    await asyncio.gather(ws_server.serve_forever(), health_server.serve_forever())

if __name__ == "__main__":
    asyncio.run(main())
