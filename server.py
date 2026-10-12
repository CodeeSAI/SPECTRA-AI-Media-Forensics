"""
SPECTRA — AI Media Forensics Backend API
FastAPI server that:
  - Accepts image uploads and runs real inference
  - Uses Ateeqq/ai-vs-human-image-detector (HuggingFace)
  - Returns real classification results
"""

from __future__ import annotations

import io
import logging
import os
import sys
import threading
from typing import Any, Dict, List, Optional

# FastAPI / Starlette
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Image handling
try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    print("ERROR: Pillow is not installed. Run: pip install pillow", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_ID = "Ateeqq/ai-vs-human-image-detector"
CONFIDENCE_THRESHOLD = 0.70   # below this -> Inconclusive
MAX_UPLOAD_BYTES = 20 * 1024 * 1024   # 20 MB
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("spectra")

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
_model_lock = threading.Lock()
_pipeline = None
_model_error: Optional[str] = None


def _load_model() -> None:
    global _pipeline, _model_error
    with _model_lock:
        if _pipeline is not None or _model_error is not None:
            return
        try:
            log.info("Loading model %s...", MODEL_ID)
            from transformers import pipeline as hf_pipeline
            _pipeline = hf_pipeline(
                "image-classification",
                model=MODEL_ID,
                device=-1,   # CPU
            )
            log.info("Model loaded successfully.")
        except Exception as exc:
            _model_error = f"{type(exc).__name__}: {exc}"
            log.error("Model failed to load: %s", _model_error)


def get_pipeline():
    if _pipeline is None and _model_error is None:
        _load_model()
    if _model_error:
        raise RuntimeError(f"Model unavailable: {_model_error}")
    return _pipeline


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------

def _classify(image: Image.Image) -> Dict[str, Any]:
    pipe = get_pipeline()
    raw: List[Dict] = pipe(image)

    scores: Dict[str, float] = {}
    for item in raw:
        label = item["label"].strip().lower()
        if label in ("ai", "artificial", "ai-generated", "fake"):
            scores["ai"] = item["score"]
        elif label in ("hum", "human", "human-created", "real"):
            scores["human"] = item["score"]
        else:
            scores[label] = item["score"]

    ai_score_raw = scores.get("ai", 0.0)
    human_score_raw = scores.get("human", 1.0 - ai_score_raw)

    if ai_score_raw >= CONFIDENCE_THRESHOLD:
        verdict = "AI-Generated"
    elif human_score_raw >= CONFIDENCE_THRESHOLD:
        verdict = "Human-Created"
    else:
        verdict = "Inconclusive"

    ai_pct = ai_score_raw * 100.0
    human_pct = human_score_raw * 100.0

    # Avoid deceptive 100.0% / 0.0% collapse
    if 0.0 < ai_pct < 0.05:
        ai_score = 0.01
        human_score = 99.99
    elif 0.0 < human_pct < 0.05:
        human_score = 0.01
        ai_score = 99.99
    else:
        ai_score = round(ai_pct, 1)
        human_score = round(100.0 - ai_score, 1)

    return {
        "verdict": verdict,
        "ai_score": ai_score,
        "human_score": human_score,
        "raw_scores": {
            "ai": ai_score_raw,
            "human": human_score_raw,
        },
        "raw_labels": raw,
        "threshold_used": CONFIDENCE_THRESHOLD,
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="SPECTRA AI Media Forensics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    model_status = (
        "loaded" if _pipeline else
        ("error" if _model_error else "loading")
    )
    return {
        "status": "ok",
        "model": MODEL_ID,
        "model_status": model_status,
        "model_error": _model_error,
    }


@app.post("/api/classify")
async def classify_media(file: UploadFile = File(...)):
    image_bytes = await file.read()

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large. Maximum {MAX_UPLOAD_BYTES // 1024 // 1024} MB.")

    fname = file.filename or "upload"
    ext = os.path.splitext(fname)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}")

    try:
        raw_image = Image.open(io.BytesIO(image_bytes))
        raw_image.verify()
        raw_image = Image.open(io.BytesIO(image_bytes))
        image = raw_image.convert("RGB")
    except (UnidentifiedImageError, Exception) as exc:
        raise HTTPException(422, f"Cannot decode image: {exc}")

    try:
        result = _classify(image)
    except Exception as exc:
        log.error("Classification failure: %s", exc)
        raise HTTPException(503, f"Inference engine unavailable: {exc}")

    return JSONResponse({"status": "ok", "result": result})


@app.on_event("startup")
async def startup_event():
    log.info("SPECTRA API server starting. Triggering background model load...")
    t = threading.Thread(target=_load_model, daemon=True)
    t.start()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False, log_level="info")
