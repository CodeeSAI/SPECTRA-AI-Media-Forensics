import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { imageSize } from 'image-size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load .env if present (zero external dependencies)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line && !line.startsWith('#')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim();
          const val = line.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SPECTRA] Notice: Could not read .env file:', err);
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const MODEL_ID = 'Ateeqq/ai-vs-human-image-detector';
const CONFIDENCE_THRESHOLD = 0.70; // 70% threshold required for directional verdict
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// In-memory job store
interface JobResult {
  verdict: 'AI-Generated' | 'Human-Created' | 'Inconclusive';
  ai_score: number;
  human_score: number;
  raw_scores: { ai: number; human: number };
  raw_labels: Array<{ label: string; score: number }>;
  threshold_used: number;
  disclaimer: string;
}

interface ForensicJob {
  job_id: string;
  status: 'queued' | 'validating' | 'classifying' | 'complete' | 'error';
  filename: string;
  mime_type?: string;
  sha256: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  filesize: number;
  filesize_display: string;
  exif: Record<string, string>;
  result: JobResult | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  _image_bytes?: Buffer;
}

const JOBS = new Map<string, ForensicJob>();

// Memory upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// Basic CORS & JSON
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// Helper: Extract basic EXIF from JPEG/TIFF/PNG
function extractBasicExif(buffer: Buffer): Record<string, string> {
  const tags: Record<string, string> = {};
  try {
    // Check for JPEG APP1 EXIF marker: 0xFF 0xE1
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 4) {
        if (buffer[offset] === 0xff) {
          const marker = buffer[offset + 1];
          if (marker === 0xe1) {
            // APP1 marker
            const len = buffer.readUInt16BE(offset + 2);
            const exifHeader = buffer.slice(offset + 4, offset + 10).toString('ascii');
            if (exifHeader.startsWith('Exif')) {
              tags['ExifStatus'] = 'APP1 Metadata Header Detected';
            }
            break;
          } else if (marker === 0xd9 || marker === 0xda) {
            break;
          } else {
            const len = buffer.readUInt16BE(offset + 2);
            offset += 2 + len;
          }
        } else {
          offset++;
        }
      }
    }
    // Check PNG text chunks
    if (buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      const str = buffer.toString('binary');
      if (str.includes('tEXt') || str.includes('iTXt')) {
        tags['PNGMetadata'] = 'Embedded chunk text detected';
      }
      if (str.includes('parameters') || str.includes('prompt')) {
        tags['GenerativeTag'] = 'AI Generation prompt parameter metadata detected in chunk';
      }
    }
  } catch {
    // Non-fatal metadata scan
  }
  return tags;
}

// Helper: Process forensic classification via primary PyTorch classifier
async function classifyImage(buffer: Buffer, filename: string, mimeType: string): Promise<JobResult> {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : undefined);

  // If the Python inference backend is not configured, report a truthful degraded/unavailable state
  if (!pythonBackendUrl) {
    throw new Error(
      `Inference service not configured: PYTHON_BACKEND_URL environment variable is not set. The primary Ateeqq/ai-vs-human-image-detector PyTorch classifier requires an active Python backend endpoint.`
    );
  }

  const baseUrl = pythonBackendUrl.replace(/\/$/, '');
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  let classifyRes: globalThis.Response;
  try {
    classifyRes = await fetch(`${baseUrl}/api/classify`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000), // 60s timeout
    });
  } catch (err: any) {
    console.warn('[SPECTRA] Python backend unreachable:', err?.message || err);
    throw new Error(
      `External Python inference service unreachable at ${baseUrl}: ${err.message || 'Connection refused'}. Verify that the Ateeqq/ai-vs-human-image-detector service is running.`
    );
  }

  if (classifyRes.ok) {
    const data = (await classifyRes.json()) as any;
    if (data.result) return data.result;
    throw new Error('Python inference service returned response missing result payload.');
  } else {
    let detailMsg = `HTTP ${classifyRes.status}`;
    try {
      const errJson = (await classifyRes.json()) as any;
      if (errJson.detail) detailMsg += ` - ${errJson.detail}`;
    } catch {
      // ignore
    }
    throw new Error(`Inference engine error (${detailMsg}) from provider: Ateeqq/ai-vs-human-image-detector`);
  }
}

// Background Job Worker
async function processJob(jobId: string, buffer: Buffer, filename: string, mimeType: string) {
  const job = JOBS.get(jobId);
  if (!job) return;

  try {
    job.status = 'validating';
    await new Promise((r) => setTimeout(r, 600)); // Visible step in UI

    let width: number | null = null;
    let height: number | null = null;
    let format = 'IMAGE';

    try {
      const dimensions = imageSize(new Uint8Array(buffer));
      width = dimensions.width || null;
      height = dimensions.height || null;
      format = (dimensions.type || 'IMAGE').toUpperCase();
    } catch {
      const ext = path.extname(filename).replace('.', '').toUpperCase();
      format = ext || 'IMAGE';
    }

    job.width = width;
    job.height = height;
    job.format = format;
    job.sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    job.exif = extractBasicExif(buffer);

    job.status = 'classifying';
    await new Promise((r) => setTimeout(r, 800)); // Visible step in UI

    const result = await classifyImage(buffer, filename, mimeType);
    job.result = result;
    job.status = 'complete';
  } catch (err: any) {
    console.error(`[${jobId}] Processing error:`, err);
    job.status = 'error';
    job.error = err.message || 'Error occurred during forensic examination.';
  } finally {
    job.completed_at = new Date().toISOString();
  }
}

function formatISTDate(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${datePart}, ${timePart} IST`;
  } catch {
    return isoString;
  }
}

// Helper: Build Investigation Report
function makeReport(job: ForensicJob): string {
  const res = job.result || ({} as any);
  const exif = job.exif || {};
  const exifBlock = Object.keys(exif).length > 0
    ? Object.entries(exif).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '  (none extracted)';

  let rawBlock = '';
  for (const item of res.raw_labels || []) {
    rawBlock += `\n  ${(item.label || '?').padEnd(16)} ${(item.score * 100).toFixed(2)} %`;
  }

  const defaultDisclaimer =
    'Model scores are statistical classifier estimates from ' + MODEL_ID + ', ' +
    'not calibrated probabilities or conclusive forensic proof of authentic origin. ' +
    'Machine learning vision classifiers have documented domain-shift limitations and can produce ' +
    'false positives (e.g. classifying authentic human studio portraits as synthetic) or false negatives. ' +
    'A confidence threshold of 70% indicates a directional statistical hypothesis only; scores between 30% and 70% ' +
    'are deemed Inconclusive. The SHA-256 digest validates file bitstream integrity against modification ' +
    'post-upload, but does not certify image origin or author identity. Conclusive forensic determination requires ' +
    'sensor noise analysis (PRNU) and cryptographic provenance verification.';

  return `${'='.repeat(72)}
  SPECTRA — AI MEDIA FORENSICS  |  INVESTIGATION REPORT
${'='.repeat(72)}

  Job ID          : ${job.job_id || 'N/A'}
  Timestamp (IST) : ${formatISTDate(job.created_at)}
  Completed (IST) : ${formatISTDate(job.completed_at)}
  Filename        : ${job.filename || 'N/A'}
  Dimensions      : ${job.width || '?'} x ${job.height || '?'} px
  Format          : ${job.format || 'N/A'}
  File Size       : ${job.filesize_display || 'N/A'} (${(job.filesize || 0).toLocaleString()} bytes)
  SHA-256         : ${job.sha256 || 'N/A'}

${'─'.repeat(72)}
  STATISTICAL CLASSIFIER ESTIMATION (MODEL OUTPUT)
${'─'.repeat(72)}

  Verdict Estimate: ${res.verdict || 'N/A'} (Statistical Model Estimate)
  AI Score Est.   : ${res.ai_score ?? 'N/A'} %
  Human Score Est.: ${res.human_score ?? 'N/A'} %
  Decision Bound  : ${((res.threshold_used || CONFIDENCE_THRESHOLD) * 100).toFixed(0)} %
  Inference Model : ${MODEL_ID}

${'─'.repeat(72)}
  AVAILABLE EXIF METADATA
${'─'.repeat(72)}

${exifBlock}

${'─'.repeat(72)}
  RAW MODEL TENSOR OUTPUT
${'─'.repeat(72)}
${rawBlock}

${'─'.repeat(72)}
  FORENSIC LIMITATION & ADVISORY
${'─'.repeat(72)}

  ${res.disclaimer || defaultDisclaimer}

  Images are processed in a local session environment. Temporary upload data is
  held in memory for validation and discarded upon session recycling.

${'='.repeat(72)}
`;
}

// Clean job object for public API responses
function cleanJob(j: ForensicJob) {
  const { _image_bytes, ...rest } = j;
  return rest;
}

// ── API ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/health', async (req: Request, res: Response) => {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8000' : undefined);
  let classifierStatus: 'ready' | 'loading' | 'unreachable' | 'unavailable' | 'not_configured' = 'not_configured';
  let classifierDetails: any = null;

  if (pythonBackendUrl) {
    try {
      const pRes = await fetch(`${pythonBackendUrl.replace(/\/$/, '')}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (pRes.ok) {
        classifierDetails = await pRes.json();
        classifierStatus = classifierDetails.model_status === 'loaded' ? 'ready' : (classifierDetails.model_status || 'loading');
      } else {
        classifierStatus = 'unavailable';
        classifierDetails = { status: 'error', http_code: pRes.status };
      }
    } catch (err: any) {
      classifierStatus = 'unreachable';
      classifierDetails = { status: 'unreachable', error: err.message };
    }
  }

  // Clearly distinguish application health from classifier readiness
  const isClassifierReady = classifierStatus === 'ready';
  const overallStatus = isClassifierReady ? 'ok' : 'degraded';

  res.json({
    status: overallStatus,
    application: {
      status: 'operational',
      runtime: 'Node.js 22',
      jobs_in_memory: JOBS.size,
      storage: 'session-memory',
    },
    classifier: {
      model_id: MODEL_ID,
      readiness: classifierStatus,
      configured: !!pythonBackendUrl,
      provider: pythonBackendUrl ? `Python FastAPI Service (${pythonBackendUrl})` : 'None (PYTHON_BACKEND_URL not set)',
      details: classifierDetails,
      degraded_reason: !pythonBackendUrl
        ? 'PYTHON_BACKEND_URL environment variable is not configured.'
        : classifierStatus !== 'ready'
        ? `Inference service state is ${classifierStatus}.`
        : null,
    },
  });
});

app.post('/api/analyze', upload.single('file') as any, (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ detail: 'No media file provided.' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return res.status(415).json({
      detail: `Unsupported file type '${ext}'. Allowed: ${Array.from(ALLOWED_EXT).join(', ')}`,
    });
  }

  const jobId = crypto.randomUUID();
  const fsDisplay =
    file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`;

  const newJob: ForensicJob = {
    job_id: jobId,
    status: 'queued',
    filename: file.originalname,
    mime_type: file.mimetype,
    sha256: null,
    width: null,
    height: null,
    format: null,
    filesize: file.size,
    filesize_display: fsDisplay,
    exif: {},
    result: null,
    error: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    _image_bytes: file.buffer,
  };

  JOBS.set(jobId, newJob);

  // Trigger processing asynchronously
  processJob(jobId, file.buffer, file.originalname, file.mimetype);

  res.status(202).json({ job_id: jobId, status: 'queued' });
});

// Genuine retry endpoint for failed jobs
app.post('/api/jobs/:id/retry', (req: Request, res: Response) => {
  const job = JOBS.get(req.params.id);
  if (!job) {
    return res.status(404).json({ detail: `Job '${req.params.id}' not found.` });
  }
  if (!job._image_bytes) {
    return res.status(410).json({ detail: 'Image payload is no longer stored in session memory.' });
  }

  job.status = 'queued';
  job.error = null;
  job.result = null;
  job.completed_at = null;

  // Re-trigger background worker
  processJob(job.job_id, job._image_bytes, job.filename, job.mime_type || 'image/png');

  res.json({ job_id: job.job_id, status: 'queued', message: 'Retry initiated.' });
});

app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = JOBS.get(req.params.id);
  if (!job) {
    return res.status(404).json({ detail: `Job '${req.params.id}' not found.` });
  }
  const t = new Date(job.completed_at || job.created_at).getTime();
  if (!isNaN(t) && Date.now() - t > 24 * 60 * 60 * 1000) {
    JOBS.delete(req.params.id);
    return res.status(404).json({ detail: `Job '${req.params.id}' expired after 24 hours.` });
  }
  res.json(cleanJob(job));
});

app.get('/api/jobs/:id/image', (req: Request, res: Response) => {
  const job = JOBS.get(req.params.id);
  if (!job || !job._image_bytes) {
    return res.status(404).json({ detail: 'Image not found.' });
  }
  const t = new Date(job.completed_at || job.created_at).getTime();
  if (!isNaN(t) && Date.now() - t > 24 * 60 * 60 * 1000) {
    JOBS.delete(req.params.id);
    return res.status(404).json({ detail: 'Image expired after 24 hours.' });
  }
  const ext = path.extname(job.filename).toLowerCase();
  const mediaType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  res.setHeader('Content-Type', mediaType);
  res.send(job._image_bytes);
});

app.get('/api/history', (req: Request, res: Response) => {
  // Prune any in-memory jobs older than 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [id, job] of JOBS.entries()) {
    const t = new Date(job.completed_at || job.created_at).getTime();
    if (!isNaN(t) && now - t > TWENTY_FOUR_HOURS_MS) {
      JOBS.delete(id);
    }
  }

  const allJobs = Array.from(JOBS.values());
  const completed = allJobs.filter((j) => j.status === 'complete');
  const failed = allJobs.filter((j) => j.status === 'error');
  const pending = allJobs.filter((j) => j.status === 'queued' || j.status === 'validating' || j.status === 'classifying');

  const stats = {
    total: allJobs.length,
    completed: completed.length,
    failed: failed.length,
    pending: pending.length,
    ai_generated: completed.filter((j) => j.result?.verdict === 'AI-Generated').length,
    human_created: completed.filter((j) => j.result?.verdict === 'Human-Created').length,
    inconclusive: completed.filter((j) => j.result?.verdict === 'Inconclusive').length,
  };

  const records = allJobs
    .map(cleanJob)
    .sort((a, b) => ((b.created_at || '') > (a.created_at || '') ? 1 : -1));

  res.json({ jobs: records, stats });
});

app.get('/api/reports/:id', (req: Request, res: Response) => {
  const job = JOBS.get(req.params.id);
  if (!job) {
    return res.status(404).json({ detail: 'Job not found.' });
  }
  const t = new Date(job.completed_at || job.created_at).getTime();
  if (!isNaN(t) && Date.now() - t > 24 * 60 * 60 * 1000) {
    JOBS.delete(req.params.id);
    return res.status(404).json({ detail: 'Job expired after 24 hours.' });
  }
  if (job.status !== 'complete') {
    return res.status(409).json({ detail: `Job status is '${job.status}', not complete.` });
  }

  const reportText = makeReport(job);
  const safeName = job.filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="SPECTRA_${safeName}_${job.job_id.slice(0, 8)}.txt"`
  );
  res.send(reportText);
});

// ── SCREEN ROUTES & STATIC SERVING ─────────────────────────────────────────

// Serve local vendor libraries (Three.js, etc.)
app.use('/vendor', express.static(path.join(__dirname, 'public/vendor')));

const SCREEN_DIRS: Record<string, string> = {
  '/home': path.join(__dirname, 'home'),
  '/overview': path.join(__dirname, 'investigation_overview'),
  '/analyze': path.join(__dirname, 'analyze_media'),
  '/progress': path.join(__dirname, 'analysis_in_progress_scientific_forensics_globe'),
  '/results': path.join(__dirname, 'analysis_results'),
  '/reports': path.join(__dirname, 'investigation_reports'),
};

for (const [routePath, dirPath] of Object.entries(SCREEN_DIRS)) {
  if (fs.existsSync(dirPath)) {
    const serveScreen = (req: Request, res: Response) => {
      const codeHtml = path.join(dirPath, 'code.html');
      if (fs.existsSync(codeHtml)) {
        return res.sendFile(codeHtml);
      }
      const indexHtml = path.join(dirPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      res.status(404).send('Screen not found');
    };

    app.get(routePath, serveScreen);
    app.get(`${routePath}/`, serveScreen);

    // Mount static assets (screen.png, etc.)
    app.use(routePath, express.static(dirPath));
  }
}

// Root route — Home Page
app.get('/', (req: Request, res: Response) => {
  const homeHtml = path.join(__dirname, 'home', 'code.html');
  if (fs.existsSync(homeHtml)) {
    return res.sendFile(homeHtml);
  }
  res.redirect('/analyze/');
});

app.listen(PORT, HOST, () => {
  console.log(`[SPECTRA] Server running on http://${HOST}:${PORT}`);
});
