"""
AI Invoice Studio — Speech-to-Text Sidecar
Runs faster-whisper for local audio transcription.
Started as a child process by server.ts.
"""

import os
import sys
import base64
import tempfile
import subprocess
import numpy as np
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

app = Flask(__name__)

# ── Configuration ──
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
COMPUTE_TYPE = os.environ.get("STT_COMPUTE_TYPE", "int8")
DEVICE = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
PORT = int(os.environ.get("STT_PORT", "5050"))

# ── Load model at startup (one-time cost) ──
print(f"[stt] Loading {MODEL_SIZE} on {DEVICE} with {COMPUTE_TYPE}...", flush=True)
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print(f"[stt] Model loaded successfully.", flush=True)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_SIZE, "device": DEVICE})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        data = request.get_json()
        audio_b64 = data.get("audio_b64")
        mime_type = data.get("mime_type", "audio/webm")
        language = data.get("language")  # Optional ISO 639-1 code

        if not audio_b64:
            return jsonify({"error": "audio_b64 is required"}), 400

        # 1. Decode base64 audio to temp file
        audio_bytes = base64.b64decode(audio_b64)
        ext = mime_type.split("/")[-1].split(";")[0]  # webm, ogg, mp4, mpeg
        
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp_in:
            tmp_in.write(audio_bytes)
            tmp_in_path = tmp_in.name

        # 2. Convert to 16kHz mono WAV via ffmpeg
        tmp_wav_path = tmp_in_path + ".wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in_path, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav_path],
            capture_output=True, check=True
        )

        # 3. Transcribe with faster-whisper
        segments, info = model.transcribe(
            tmp_wav_path,
            language=language,
            beam_size=5,
            word_timestamps=False,
            task="transcribe",
        )

        # 4. Collect all segment texts
        text = " ".join([seg.text.strip() for seg in segments])

        # 5. Cleanup temp files
        os.unlink(tmp_in_path)
        os.unlink(tmp_wav_path)

        return jsonify({
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "duration_s": round(info.duration, 2),
        })

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "ffmpeg conversion failed", "details": e.stderr.decode()}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"[stt] Starting STT server on port {PORT}...", flush=True)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
