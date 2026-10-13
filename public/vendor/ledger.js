/**
 * SPECTRA v2.4 — Forensic Investigation Ledger Client Store
 * Persistent ledger with 24-hour automatic timestamp-based expiry.
 * Complies with local-session privacy: stores only metadata, no image bytes.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'spectra_investigation_ledger';
  const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const MODEL_ID = 'Ateeqq/ai-vs-human-image-detector';

  function isValidTimestamp(val) {
    if (!val) return false;
    const t = new Date(val).getTime();
    return !isNaN(t) && t > 0;
  }

  function getRecordTime(record) {
    if (!record || typeof record !== 'object') return null;
    const ts = record.completed_at || record.created_at || record.stored_at;
    if (!isValidTimestamp(ts)) return null;
    return new Date(ts).getTime();
  }

  function isRecordExpired(record, now) {
    const t = getRecordTime(record);
    if (t === null) return true; // Missing or malformed timestamp -> expire
    const current = now || Date.now();
    return (current - t) > EXPIRY_MS;
  }

  function sanitizeRecord(job) {
    if (!job || typeof job !== 'object' || !job.job_id) return null;

    // A valid record must have at least one reliable timestamp
    const rawTime = job.completed_at || job.created_at || job.stored_at;
    if (!isValidTimestamp(rawTime)) {
      return null; // Reject malformed record missing valid timestamp
    }

    const validCreated = isValidTimestamp(job.created_at)
      ? new Date(job.created_at).toISOString()
      : (isValidTimestamp(job.completed_at) ? new Date(job.completed_at).toISOString() : new Date().toISOString());

    const validCompleted = isValidTimestamp(job.completed_at)
      ? new Date(job.completed_at).toISOString()
      : validCreated;

    // Never store raw image bytes or large base64 buffers
    const clean = {
      job_id: String(job.job_id),
      filename: String(job.filename || 'unnamed_exhibit.png'),
      status: job.status || 'complete',
      sha256: job.sha256 || null,
      width: typeof job.width === 'number' ? job.width : null,
      height: typeof job.height === 'number' ? job.height : null,
      format: job.format || null,
      filesize: typeof job.filesize === 'number' ? job.filesize : 0,
      filesize_display: job.filesize_display || '',
      exif: (job.exif && typeof job.exif === 'object') ? job.exif : {},
      result: job.result ? {
        verdict: job.result.verdict || 'Inconclusive',
        ai_score: typeof job.result.ai_score === 'number' ? job.result.ai_score : null,
        human_score: typeof job.result.human_score === 'number' ? job.result.human_score : null,
        raw_scores: job.result.raw_scores || null,
        raw_labels: Array.isArray(job.result.raw_labels) ? job.result.raw_labels : [],
        threshold_used: job.result.threshold_used || 0.70,
        disclaimer: job.result.disclaimer || ''
      } : null,
      error: job.error || null,
      created_at: validCreated,
      completed_at: validCompleted,
      stored_at: isValidTimestamp(job.stored_at) ? new Date(job.stored_at).toISOString() : new Date().toISOString(),
      model_id: job.model_id || MODEL_ID
    };

    return clean;
  }

  function readRawRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn('[SpectraLedger] Failed to read ledger from localStorage:', e);
      return [];
    }
  }

  function writeRawRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      console.error('[SpectraLedger] Failed to save ledger to localStorage:', e);
      return false;
    }
  }

  const SpectraLedger = {
    EXPIRY_MS,
    STORAGE_KEY,

    /**
     * Purges expired or malformed records, saves cleaned list, and returns valid records.
     */
    cleanup: function (now) {
      const current = now || Date.now();
      const rawList = readRawRecords();
      let modified = false;

      const validList = [];
      for (const item of rawList) {
        const clean = sanitizeRecord(item);
        if (!clean) {
          modified = true;
          continue;
        }
        if (isRecordExpired(clean, current)) {
          modified = true;
          continue;
        }
        validList.push(clean);
      }

      if (modified || validList.length !== rawList.length) {
        writeRawRecords(validList);
      }
      return validList;
    },

    /**
     * Gets all valid, non-expired records sorted by completion/creation timestamp descending.
     */
    getRecords: function (now) {
      const cleaned = this.cleanup(now);
      return cleaned.sort((a, b) => {
        const ta = getRecordTime(a) || 0;
        const tb = getRecordTime(b) || 0;
        return tb - ta;
      });
    },

    /**
     * Find single record by job ID.
     */
    getRecordById: function (jobId) {
      if (!jobId) return null;
      const records = this.getRecords();
      return records.find(r => r.job_id === jobId) || null;
    },

    /**
     * Add or update an investigation record.
     */
    saveRecord: function (job) {
      if (!job || !job.job_id) return null;
      const sanitized = sanitizeRecord(job);
      if (!sanitized) return null;

      const current = Date.now();
      const records = this.getRecords(current);
      const idx = records.findIndex(r => r.job_id === sanitized.job_id);

      if (idx >= 0) {
        records[idx] = Object.assign({}, records[idx], sanitized);
      } else {
        records.unshift(sanitized);
      }

      writeRawRecords(records);

      try {
        window.dispatchEvent(new CustomEvent('spectra:ledger-updated', {
          detail: { job_id: sanitized.job_id, record: sanitized }
        }));
      } catch (_) {}

      return sanitized;
    },

    /**
     * Merge array of jobs from backend (/api/history) into the local ledger.
     */
    syncWithBackend: function (backendJobs) {
      if (!Array.isArray(backendJobs) || backendJobs.length === 0) return this.getRecords();
      const current = Date.now();
      const records = this.getRecords(current);
      const recordMap = new Map();

      // Load current local records
      for (const r of records) {
        recordMap.set(r.job_id, r);
      }

      // Merge backend jobs
      let changed = false;
      for (const bJob of backendJobs) {
        if (!bJob || !bJob.job_id) continue;
        const clean = sanitizeRecord(bJob);
        if (!clean || isRecordExpired(clean, current)) continue;

        const existing = recordMap.get(clean.job_id);
        if (!existing) {
          recordMap.set(clean.job_id, clean);
          changed = true;
        } else {
          // If existing status was pending and new is complete, update
          if (existing.status !== clean.status || (!existing.result && clean.result)) {
            recordMap.set(clean.job_id, Object.assign({}, existing, clean));
            changed = true;
          }
        }
      }

      if (changed) {
        const mergedList = Array.from(recordMap.values());
        writeRawRecords(mergedList);
      }

      return this.getRecords(current);
    },

    /**
     * Calculates statistics for ledger cards.
     */
    getStats: function (records) {
      const list = Array.isArray(records) ? records : this.getRecords();
      const total = list.length;
      let aiCount = 0;
      let humanCount = 0;
      let incCount = 0;
      let failedCount = 0;

      for (const item of list) {
        if (item.status === 'error') {
          failedCount++;
          incCount++;
          continue;
        }
        const v = item.result ? item.result.verdict : null;
        if (v === 'AI-Generated') {
          aiCount++;
        } else if (v === 'Human-Created') {
          humanCount++;
        } else {
          incCount++;
        }
      }

      return {
        total,
        ai_generated: aiCount,
        human_created: humanCount,
        inconclusive: incCount,
        failed: failedCount
      };
    },

    /**
     * Formats a machine timestamp into consistent Indian Standard Time (Asia/Kolkata):
     * e.g., "13 Oct 2026, 18:30:45 IST"
     */
    formatIST: function (dateInput, includeSeconds = true) {
      if (!dateInput) return '—';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '—';
      const datePart = d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timePart = d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined
      });
      return `${datePart}, ${timePart} IST`;
    },

    /**
     * Gets 24-hour IST time string: e.g., "18:30:45 IST"
     */
    getISTTimeOnly: function (dateInput = new Date()) {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' IST';
    },

    /**
     * Initializes a non-drifting live 24-hour IST clock on any matching element.
     */
    initLiveClock: function (elementId = 'ist-clock') {
      function tick() {
        const el = document.getElementById(elementId) || document.getElementById('utc-clock');
        if (el) {
          el.textContent = SpectraLedger.getISTTimeOnly();
        }
      }
      tick();
      return setInterval(tick, 1000);
    },

    /**
     * Starts background interval cleanup to purge expired entries while app remains open.
     */
    startAutoCleanup: function (onCleanupCallback, intervalMs = 30000) {
      const run = () => {
        const before = readRawRecords().length;
        const records = this.cleanup();
        if (records.length !== before && typeof onCleanupCallback === 'function') {
          onCleanupCallback(records);
        }
      };

      const timerId = setInterval(run, intervalMs);

      // Also listen to storage events from other tabs
      const onStorage = (e) => {
        if (e.key === STORAGE_KEY && typeof onCleanupCallback === 'function') {
          onCleanupCallback(this.getRecords());
        }
      };
      window.addEventListener('storage', onStorage);

      const onCustom = () => {
        if (typeof onCleanupCallback === 'function') {
          onCleanupCallback(this.getRecords());
        }
      };
      window.addEventListener('spectra:ledger-updated', onCustom);

      return () => {
        clearInterval(timerId);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('spectra:ledger-updated', onCustom);
      };
    }
  };

  global.SpectraLedger = SpectraLedger;

  // Run cleanup once on script initialization
  try {
    SpectraLedger.cleanup();
  } catch (_) {}

})(typeof window !== 'undefined' ? window : this);
