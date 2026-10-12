"""
SPECTRA — AI Media Forensics Backend
FastAPI server that:
  - Serves the five existing HTML screens
  - Accepts image uploads and runs real inference
  - Uses Ateeqq/ai-vs-human-image-detector (HuggingFace)
  - Manages an in-memory job queue
  - Returns real classification results and downloadable reports
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import sys
import threading
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# FastAPI / Starlette
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

# Image handling
try:
    from PIL import Image, ExifTags, UnidentifiedImageError
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

ROOT = Path(__file__).parent.resolve()

# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------
JOBS: Dict[str, Dict[str, Any]] = {}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("spectra")

# ---------------------------------------------------------------------------
# Model loading (lazy, background thread)
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
            log.info("Loading model %s (first-run download may take a few minutes)...", MODEL_ID)
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

    ai_score = scores.get("ai", 0.0)
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

    # Avoid deceptive 100.0% / 0.0% collapse when unrounded float is not exactly 1 or 0
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
        "disclaimer": (
            "Model scores are raw classifier outputs from Ateeqq/ai-vs-human-image-detector, "
            "not calibrated probabilities of authenticity. Machine learning predictions "
            "can produce false positives or false negatives, and do not constitute independent "
            "legal proof of media manipulation. A confidence threshold of 70% is required "
            "for a directional verdict; scores between 30% and 70% are deemed Inconclusive."
        ),
    }


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _extract_exif(image: Image.Image) -> Dict[str, str]:
    exif_data: Dict[str, str] = {}
    try:
        if hasattr(image, "getexif"):
            exif = image.getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, str(tag_id))
                    if isinstance(value, bytes):
                        continue
                    exif_data[tag] = str(value)[:200]
        if hasattr(image, "_getexif"):
            raw_exif = image._getexif()
            if raw_exif:
                for tag_id, value in raw_exif.items():
                    tag = ExifTags.TAGS.get(tag_id, str(tag_id))
                    if isinstance(value, bytes):
                        continue
                    if tag not in exif_data:
                        exif_data[tag] = str(value)[:200]
    except Exception:
        pass
    return exif_data


def _process_job(job_id: str, image_bytes: bytes, original_filename: str) -> None:
    job = JOBS[job_id]
    try:
        job["status"] = "validating"
        log.info("[%s] Validating %s (%d bytes)", job_id, original_filename, len(image_bytes))

        try:
            raw_image = Image.open(io.BytesIO(image_bytes))
            raw_image.verify()
            raw_image = Image.open(io.BytesIO(image_bytes))
            fmt = raw_image.format
            width, height = raw_image.size
            exif = _extract_exif(raw_image)

            # Robust fallback for format detection if Pillow didn't populate format
            if not fmt:
                if image_bytes.startswith(b"\xff\xd8\xff"):
                    fmt = "JPEG"
                elif image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                    fmt = "PNG"
                elif len(image_bytes) >= 12 and image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
                    fmt = "WEBP"
                else:
                    ext = Path(original_filename).suffix.lstrip(".").upper()
                    fmt = ext if ext else "IMAGE"

            image = raw_image.convert("RGB")
        except (UnidentifiedImageError, Exception) as exc:
            raise ValueError(f"Cannot decode image: {exc}") from exc

        job["width"] = width
        job["height"] = height
        job["format"] = fmt
        job["filesize"] = len(image_bytes)
        job["filesize_display"] = f"{len(image_bytes)/(1024*1024):.2f} MB" if len(image_bytes) >= 1024*1024 else f"{len(image_bytes)/1024:.1f} KB"
        job["sha256"] = _sha256(image_bytes)
        job["exif"] = exif

        job["status"] = "classifying"
        log.info("[%s] Running classifier on %dx%d image...", job_id, width, height)

        result = _classify(image)
        job["result"] = result
        job["status"] = "complete"
        log.info("[%s] Done -> %s (AI:%.2f%% / Human:%.2f%%)", job_id, result["verdict"], result["ai_score"], result["human_score"])

    except Exception as exc:
        log.error("[%s] Failed: %s\n%s", job_id, exc, traceback.format_exc())
        job["status"] = "error"
        job["error"] = str(exc)
    finally:
        job["completed_at"] = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def _make_report(job: Dict[str, Any]) -> str:
    res = job.get("result", {})
    exif = job.get("exif", {})
    exif_block = "\n".join(f"  {k}: {v}" for k, v in exif.items()) if exif else "  (none extracted)"

    raw_block = ""
    for item in res.get("raw_labels", []):
        raw_block += f"\n  {item.get('label', '?'):<16} {item.get('score', 0) * 100:.2f} %"

    report = f"""{'=' * 72}
  SPECTRA — AI MEDIA FORENSICS  |  INVESTIGATION REPORT
{'=' * 72}

  Job ID          : {job.get('job_id', 'N/A')}
  Timestamp       : {job.get('created_at', 'N/A')}
  Completed At    : {job.get('completed_at', 'N/A')}
  Filename        : {job.get('filename', 'N/A')}
  Dimensions      : {job.get('width', '?')} x {job.get('height', '?')} px
  Format          : {job.get('format', 'N/A')}
  File Size       : {job.get('filesize_display', 'N/A')} ({job.get('filesize', 0):,} bytes)
  SHA-256         : {job.get('sha256', 'N/A')}

{'─' * 72}
  CLASSIFICATION RESULT
{'─' * 72}

  Verdict         : {res.get('verdict', 'N/A')}
  AI Score        : {res.get('ai_score', 'N/A')} %
  Human Score     : {res.get('human_score', 'N/A')} %
  Threshold Used  : {res.get('threshold_used', CONFIDENCE_THRESHOLD) * 100:.0f} %
  Model           : {MODEL_ID}

{'─' * 72}
  AVAILABLE EXIF METADATA
{'─' * 72}

{exif_block}

{'─' * 72}
  RAW MODEL OUTPUT
{'─' * 72}
{raw_block}

{'─' * 72}
  DISCLAIMER
{'─' * 72}

  {res.get('disclaimer', '')}

  Images are processed locally. No image content is transmitted to
  third-party services. Temporary upload data is discarded after processing.

{'=' * 72}
"""
    return report


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="SPECTRA AI Media Forensics", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API routes ──────────────────────────────────────────────────────────────

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
        "jobs_in_memory": len(JOBS),
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    image_bytes = await file.read()

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large. Maximum {MAX_UPLOAD_BYTES // 1024 // 1024} MB.")

    fname = file.filename or "upload"
    ext = Path(fname).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(415, f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXT))}")

    job_id = str(uuid.uuid4())
    fs_display = f"{len(image_bytes) / (1024 * 1024):.2f} MB" if len(image_bytes) >= 1024 * 1024 else f"{len(image_bytes) / 1024:.1f} KB"
    JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "filename": fname,
        "sha256": None,
        "width": None,
        "height": None,
        "format": None,
        "filesize": len(image_bytes),
        "filesize_display": fs_display,
        "exif": {},
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "_image_bytes": image_bytes,
    }

    t = threading.Thread(target=_process_job, args=(job_id, image_bytes, fname), daemon=True)
    t.start()

    return JSONResponse({"job_id": job_id, "status": "queued"}, status_code=202)


def _clean_job(j: Dict[str, Any]) -> Dict[str, Any]:
    d = dict(j)
    d.pop("_image_bytes", None)
    return d


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return JSONResponse(_clean_job(job))


@app.get("/api/jobs/{job_id}/image")
async def get_job_image(job_id: str):
    job = JOBS.get(job_id)
    if not job or "_image_bytes" not in job:
        raise HTTPException(404, "Image not found.")
    ext = Path(job["filename"]).suffix.lower()
    media_type = "image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "image/jpeg")
    return Response(content=job["_image_bytes"], media_type=media_type)


@app.get("/api/history")
async def history():
    completed = [
        _clean_job(j) for j in JOBS.values()
        if j["status"] in ("complete", "error")
    ]
    completed.sort(key=lambda x: x.get("completed_at") or "", reverse=True)

    # Summary stats
    stats = {
        "total": len(completed),
        "ai_generated": sum(1 for j in completed if (j.get("result") or {}).get("verdict") == "AI-Generated"),
        "human_created": sum(1 for j in completed if (j.get("result") or {}).get("verdict") == "Human-Created"),
        "inconclusive": sum(1 for j in completed if (j.get("result") or {}).get("verdict") == "Inconclusive"),
        "errors": sum(1 for j in completed if j["status"] == "error"),
    }
    return JSONResponse({"jobs": completed, "stats": stats})


@app.get("/api/reports/{job_id}")
async def download_report(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    if job["status"] != "complete":
        raise HTTPException(409, f"Job status is '{job['status']}', not complete.")

    report_text = _make_report(job)
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in Path(job["filename"]).stem)
    return PlainTextResponse(
        report_text,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="SPECTRA_{safe_name}_{job_id[:8]}.txt"'
        },
    )


# ── Screen routes & static file serving ────────────────────────────────────
SCREEN_MAP = {
    "/overview":  ROOT / "investigation_overview",
    "/analyze":   ROOT / "analyze_media",
    "/progress":  ROOT / "analysis_in_progress_scientific_forensics_globe",
    "/results":   ROOT / "analysis_results",
    "/reports":   ROOT / "investigation_reports",
}

for url_path, fs_path in SCREEN_MAP.items():
    if fs_path.exists():
        def _make_screen_handler(target_dir: Path):
            async def _screen_handler():
                code_file = target_dir / "code.html"
                if code_file.exists():
                    return FileResponse(code_file)
                index_file = target_dir / "index.html"
                if index_file.exists():
                    return FileResponse(index_file)
                raise HTTPException(404, "Screen file not found")
            return _screen_handler

        app.add_api_route(url_path, _make_screen_handler(fs_path), methods=["GET"])
        app.add_api_route(f"{url_path}/", _make_screen_handler(fs_path), methods=["GET"])

        app.mount(
            url_path,
            StaticFiles(directory=str(fs_path), html=True),
            name=url_path.lstrip("/"),
        )
    else:
        log.warning("Screen directory missing, skipping: %s", fs_path)


@app.get("/")
async def root():
    return RedirectResponse(url="/overview/")


# ── Startup: trigger background model load ──────────────────────────────────
@app.on_event("startup")
async def startup_event():
    log.info("SPECTRA server starting. Triggering background model load...")
    t = threading.Thread(target=_load_model, daemon=True)
    t.start()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
