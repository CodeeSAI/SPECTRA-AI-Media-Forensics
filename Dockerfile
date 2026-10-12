# ==============================================================================
# SPECTRA AI Media Forensics — Inference Service Dockerfile
# Optimized for Google Cloud Run (CPU execution, single worker, pre-cached model)
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    TRANSFORMERS_CACHE=/app/cache/huggingface \
    HF_HOME=/app/cache/huggingface

WORKDIR /app

# Install minimal OS dependencies for network operations & health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY requirements.txt /app/requirements.txt

# Install CPU-optimized PyTorch first (drastically reduces image size compared to CUDA wheels)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch>=2.2.0 torchvision>=0.17.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Pre-cache the Hugging Face model weights during image build to eliminate cold-start download latency
RUN python -c 'from transformers import pipeline; pipeline("image-classification", model="Ateeqq/ai-vs-human-image-detector", device=-1)'

# Copy application code and screens
COPY server.py /app/server.py
COPY analysis_in_progress_scientific_forensics_globe/ /app/analysis_in_progress_scientific_forensics_globe/
COPY analysis_results/ /app/analysis_results/
COPY analyze_media/ /app/analyze_media/
COPY investigation_overview/ /app/investigation_overview/
COPY investigation_reports/ /app/investigation_reports/

# Cloud Run container contract: expose port 8080 and run single worker process
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Single worker initially to avoid loading duplicate copies of PyTorch model weights into RAM
CMD exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1
