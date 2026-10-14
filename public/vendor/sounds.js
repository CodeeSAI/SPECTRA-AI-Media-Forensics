/**
 * SPECTRA v2.4 — Cinematic Sound Design System (Phase 06B Upgrade)
 *
 * Premium, high-end sci-fi workstation audio identity synthesized entirely in real-time
 * via native Web Audio API oscillators, procedural pink noise beds, and precision envelopes.
 *
 * Sound Hierarchy & Acoustic Profiles:
 *   1. 'transition' : Signature Layered Navigation Whoosh (~380ms)
 *                     - Layer A: Filtered sweeping pink noise bed with stereo panning (-0.35 -> +0.42)
 *                     - Layer B: Low-frequency momentum bed (85Hz -> 130Hz -> 88Hz)
 *                     - Layer C: Cyan magnetic resonance harmonic shimmer
 *   2. 'hover'      : Ultra-Subtle Digital Texture (~48ms)
 *                     - Layer A: Warm low-passed capacitive transient (440Hz -> 340Hz, LPF 680Hz)
 *                     - Layer B: Micro-friction air impulse (950Hz BPF, 14ms)
 *                     - Barely noticeable, velvety, zero piercing frequencies
 *   3. 'click'      : Tactile Mechanical-Electronic Micro-Switch (~40ms)
 *                     - Layer A: Mechanical micro-thump (240Hz -> 62Hz)
 *                     - Layer B: Tactile switch snap (1700Hz BPF noise impulse)
 *                     - Layer C: Subtle acoustic resonance (540Hz)
 *   4. 'toggle'     : Smooth Confirmation Blip (~55ms)
 *                     - Ascending interval (F#4 -> C#5) when enabling
 *                     - Descending interval (C#5 -> F#4) when muting
 *   5. 'success'    : Cryptographic / Forensic Resolution Chord (~420ms)
 *                     - Triad harmonic resolution (D4 -> A4 -> F#5) with soft noise shimmer
 *                     - Triggered ONLY when a genuine analysis completes successfully
 *
 * Core Standards:
 *   - Zero external audio files, zero network latency, zero dependencies.
 *   - Autoplay compliance: AudioContext resumed strictly upon legitimate user interaction.
 *   - Muted by default until explicitly enabled; persisted via localStorage.
 *   - Intelligent boundary tracking & cooldown deduplication prevents spam or child element echoes.
 *   - Zero clipping, zero DC offset pops (all nodes ramp to zero before stop/disconnect).
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'spectra_sound_enabled';
  const HOVER_COOLDOWN_MS = 55;
  const FOCUS_COOLDOWN_MS = 120;

  class SpectraSoundEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
      this.enabled = false;
      this.lastHoverTime = 0;
      this.lastFocusTime = 0;
      this.lastHoverTarget = null;
      this.lastFocusedTarget = null;
      this.isInteractingWithPointer = false;

      // Default: Muted until user explicitly enables
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.enabled = stored === 'true';
      } catch (_) {
        this.enabled = false;
      }

      this.initUserGestureListeners();
      this.initDelegatedInteractionEvents();
    }

    /**
     * Lazily get or create the Web Audio Context and procedural noise buffers
     */
    getAudioContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        try {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
          this.noiseBuffer = this.buildPinkNoiseBuffer(this.ctx);
        } catch (e) {
          console.warn('[SpectraSounds] Web Audio initialization notice:', e);
          return null;
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      return this.ctx;
    }

    /**
     * Generate 2 seconds of high-precision organic pink noise (1/f spectral density)
     * Provides a velvety, analog air texture instead of harsh white noise hiss.
     */
    buildPinkNoiseBuffer(ctx) {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Paul Kellet's refined 1/f noise generation algorithm
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
        b6 = white * 0.115926;
      }

      return buffer;
    }

    initUserGestureListeners() {
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      };

      window.addEventListener('pointerdown', () => {
        this.isInteractingWithPointer = true;
        unlockAudio();
      }, { passive: true, capture: true });

      window.addEventListener('keydown', () => {
        this.isInteractingWithPointer = false;
        unlockAudio();
      }, { passive: true, capture: true });
    }

    isEnabled() {
      return this.enabled;
    }

    setEnabled(enable) {
      const wasEnabled = this.enabled;
      this.enabled = Boolean(enable);

      try {
        localStorage.setItem(STORAGE_KEY, this.enabled ? 'true' : 'false');
      } catch (_) {}

      if (this.enabled) {
        const ctx = this.getAudioContext();
        if (this.masterGain && ctx) {
          const t = ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(t);
          this.masterGain.gain.setValueAtTime(1.0, t);
        }
        // Play ascending confirmation tone when enabling
        this.synthToggleChirp(true);
      } else {
        if (wasEnabled) {
          // Play descending tone right before muting
          this.synthToggleChirp(false);
          setTimeout(() => {
            if (this.masterGain && this.ctx) {
              const t = this.ctx.currentTime;
              this.masterGain.gain.cancelScheduledValues(t);
              this.masterGain.gain.setValueAtTime(0.0, t);
            }
          }, 60);
        } else if (this.masterGain && this.ctx) {
          const t = this.ctx.currentTime;
          this.masterGain.gain.setValueAtTime(0.0, t);
        }
      }

      this.updateToggleUI();
    }

    toggle() {
      this.setEnabled(!this.enabled);
    }

    /**
     * Public Dispatcher
     * @param {'transition'|'hover'|'click'|'toggle'|'success'|'action'} type
     */
    play(type) {
      if (!this.enabled) return;

      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      try {
        const t = ctx.currentTime;
        switch (type) {
          case 'transition':
            this.synthScanWhoosh(ctx, t);
            break;
          case 'hover':
            this.synthHoverTexture(ctx, t);
            break;
          case 'click':
            this.synthTactileClick(ctx, t);
            break;
          case 'action':
            this.synthActionChime(ctx, t);
            break;
          case 'toggle':
            this.synthToggleChirp(this.enabled);
            break;
          case 'success':
            this.synthAnalysisSuccess(ctx, t);
            break;
        }
      } catch (err) {
        // Fail silently without disrupting workstation operations
      }
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       1. SIGNATURE NAVIGATION WHOOSH (~380ms)
       Synchronized with the cyan-violet scanning animation and page transition.
       ═════════════════════════════════════════════════════════════════════════════ */
    synthScanWhoosh(ctx, t) {
      const duration = 0.38;

      // Master output node for this whoosh with safe zero-crossing ramp
      const whooshGain = ctx.createGain();
      whooshGain.gain.setValueAtTime(0.0001, t);
      whooshGain.gain.linearRampToValueAtTime(0.075, t + 0.045);
      whooshGain.gain.setValueAtTime(0.075, t + 0.18);
      whooshGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      whooshGain.connect(this.masterGain);

      // Stereo Panner (sweeps left to right with the scan beam if supported)
      let panner = null;
      if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(-0.35, t);
        panner.pan.linearRampToValueAtTime(0.42, t + duration);
        panner.connect(whooshGain);
      }
      const soundOutput = panner || whooshGain;

      // ── Layer A: Airy Sweeping Pink Noise Texture ─────────────────────────
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        noise.loop = true;

        const sweepFilter = ctx.createBiquadFilter();
        sweepFilter.type = 'bandpass';
        sweepFilter.Q.setValueAtTime(2.2, t);
        sweepFilter.frequency.setValueAtTime(260, t);
        sweepFilter.frequency.exponentialRampToValueAtTime(1180, t + 0.18);
        sweepFilter.frequency.exponentialRampToValueAtTime(440, t + duration);

        const gentleLowpass = ctx.createBiquadFilter();
        gentleLowpass.type = 'lowpass';
        gentleLowpass.frequency.setValueAtTime(3200, t);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, t);
        noiseGain.gain.linearRampToValueAtTime(0.065, t + 0.04);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        noise.connect(sweepFilter);
        sweepFilter.connect(gentleLowpass);
        gentleLowpass.connect(noiseGain);
        noiseGain.connect(soundOutput);

        noise.start(t);
        noise.stop(t + duration + 0.02);
      }

      // ── Layer B: Low-Frequency Movement Bed (Weight & Precision) ──────────
      const bedOsc = ctx.createOscillator();
      const bedFilter = ctx.createBiquadFilter();
      const bedGain = ctx.createGain();

      bedOsc.type = 'sine';
      bedOsc.frequency.setValueAtTime(85, t);
      bedOsc.frequency.exponentialRampToValueAtTime(130, t + 0.16);
      bedOsc.frequency.exponentialRampToValueAtTime(88, t + duration);

      bedFilter.type = 'lowpass';
      bedFilter.frequency.setValueAtTime(220, t);

      bedGain.gain.setValueAtTime(0.0001, t);
      bedGain.gain.linearRampToValueAtTime(0.040, t + 0.05);
      bedGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      bedOsc.connect(bedFilter);
      bedFilter.connect(bedGain);
      bedGain.connect(soundOutput);

      bedOsc.start(t);
      bedOsc.stop(t + duration + 0.02);

      // ── Layer C: Tonal Magnetic Resonance & Harmonic Shimmer ──────────────
      const toneOsc = ctx.createOscillator();
      const shimmerOsc = ctx.createOscillator();
      const toneGain = ctx.createGain();

      // Fundamental tone
      toneOsc.type = 'sine';
      toneOsc.frequency.setValueAtTime(260, t);
      toneOsc.frequency.exponentialRampToValueAtTime(580, t + 0.17);
      toneOsc.frequency.exponentialRampToValueAtTime(320, t + duration);

      // Soft crystalline overtone
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(780, t);
      shimmerOsc.frequency.exponentialRampToValueAtTime(1740, t + 0.17);
      shimmerOsc.frequency.exponentialRampToValueAtTime(960, t + duration);

      toneGain.gain.setValueAtTime(0.0001, t);
      toneGain.gain.linearRampToValueAtTime(0.035, t + 0.04);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      toneOsc.connect(toneGain);
      shimmerOsc.connect(toneGain);
      toneGain.connect(soundOutput);

      toneOsc.start(t);
      shimmerOsc.start(t);
      toneOsc.stop(t + duration + 0.02);
      shimmerOsc.stop(t + duration + 0.02);

      // Cleanup
      setTimeout(() => {
        try {
          whooshGain.disconnect();
          if (panner) panner.disconnect();
        } catch (_) {}
      }, (duration + 0.05) * 1000);
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       2. PREMIUM NAVIGATION HOVER (~48ms)
       Subtle digital texture: soft transient, short tonal body, minimal highs.
       ═════════════════════════════════════════════════════════════════════════════ */
    synthHoverTexture(ctx, t) {
      const duration = 0.048;

      // ── Layer A: Warm Low-Passed Capacitive Body ──────────────────────────
      const osc = ctx.createOscillator();
      const oscFilter = ctx.createBiquadFilter();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t); // A4
      osc.frequency.exponentialRampToValueAtTime(340, t + duration);

      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(680, t);

      // Barely noticeable, smooth envelope (0.020 peak)
      oscGain.gain.setValueAtTime(0.0001, t);
      oscGain.gain.linearRampToValueAtTime(0.020, t + 0.002);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + duration + 0.01);

      // ── Layer B: Micro Air Friction Transient ─────────────────────────────
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(950, t);
        noiseFilter.Q.setValueAtTime(3.5, t);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, t);
        noiseGain.gain.linearRampToValueAtTime(0.012, t + 0.002);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(t);
        noise.stop(t + 0.018);
      }
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       3. BUTTON CLICK (~40ms)
       Short, tactile confirmation click with physical micro-thump.
       ═════════════════════════════════════════════════════════════════════════════ */
    synthTactileClick(ctx, t) {
      const duration = 0.040;

      // ── Layer A: Mechanical Micro-Thump (Tactile Weight) ──────────────────
      const thumpOsc = ctx.createOscillator();
      const thumpFilter = ctx.createBiquadFilter();
      const thumpGain = ctx.createGain();

      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(240, t);
      thumpOsc.frequency.exponentialRampToValueAtTime(62, t + 0.022);

      thumpFilter.type = 'lowpass';
      thumpFilter.frequency.setValueAtTime(320, t);

      thumpGain.gain.setValueAtTime(0.0001, t);
      thumpGain.gain.linearRampToValueAtTime(0.045, t + 0.0015);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.026);

      thumpOsc.connect(thumpFilter);
      thumpFilter.connect(thumpGain);
      thumpGain.connect(this.masterGain);

      thumpOsc.start(t);
      thumpOsc.stop(t + 0.030);

      // ── Layer B: Tactile Switch Impulse ───────────────────────────────────
      if (this.noiseBuffer) {
        const snap = ctx.createBufferSource();
        snap.buffer = this.noiseBuffer;

        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'bandpass';
        snapFilter.frequency.setValueAtTime(1700, t);
        snapFilter.Q.setValueAtTime(2.2, t);

        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0.0001, t);
        snapGain.gain.linearRampToValueAtTime(0.038, t + 0.001);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);

        snap.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(this.masterGain);

        snap.start(t);
        snap.stop(t + 0.020);
      }

      // ── Layer C: Acoustic Micro-Resonance ─────────────────────────────────
      const toneOsc = ctx.createOscillator();
      const toneGain = ctx.createGain();

      toneOsc.type = 'sine';
      toneOsc.frequency.setValueAtTime(540, t);
      toneOsc.frequency.exponentialRampToValueAtTime(420, t + duration);

      toneGain.gain.setValueAtTime(0.0001, t);
      toneGain.gain.linearRampToValueAtTime(0.030, t + 0.001);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      toneOsc.connect(toneGain);
      toneGain.connect(this.masterGain);

      toneOsc.start(t);
      toneOsc.stop(t + duration + 0.01);
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       4. SOUND TOGGLE CONFIRMATION (~55ms)
       ═════════════════════════════════════════════════════════════════════════════ */
    synthToggleChirp(isEnabling) {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (isEnabling) {
        osc.frequency.setValueAtTime(370, t); // F#4
        osc.frequency.exponentialRampToValueAtTime(554, t + 0.055); // C#5
      } else {
        osc.frequency.setValueAtTime(554, t); // C#5
        osc.frequency.exponentialRampToValueAtTime(370, t + 0.055); // F#4
      }

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.032, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       5. PRIMARY ACTION CONFIRMATION CHIME (~75ms)
       ═════════════════════════════════════════════════════════════════════════════ */
    synthActionChime(ctx, t) {
      const duration = 0.075;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, t); // A4
      osc1.frequency.exponentialRampToValueAtTime(659.25, t + duration); // E5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, t); // E5
      osc2.frequency.exponentialRampToValueAtTime(880, t + duration); // A5

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + duration + 0.01);
      osc2.stop(t + duration + 0.01);
    }

    /* ═════════════════════════════════════════════════════════════════════════════
       6. SUCCESSFUL FORENSIC ANALYSIS RESOLUTION CHORD (~420ms)
       Understated scientific resolution chord (D4 -> A4 -> F#5).
       ═════════════════════════════════════════════════════════════════════════════ */
    synthAnalysisSuccess(ctx, t) {
      const duration = 0.42;

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.0001, t);
      chordGain.gain.linearRampToValueAtTime(0.052, t + 0.05);
      chordGain.gain.setValueAtTime(0.052, t + 0.16);
      chordGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      chordGain.connect(this.masterGain);

      // Triad notes: D4 (293.66Hz), A4 (440Hz), F#5 (739.99Hz)
      const freqs = [293.66, 440.0, 739.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const delay = idx * 0.035;
        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.linearRampToValueAtTime(0.045, t + delay + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(noteGain);
        noteGain.connect(chordGain);

        osc.start(t + delay);
        osc.stop(t + duration + 0.02);
      });

      // Subtle air shimmer
      if (this.noiseBuffer) {
        const air = ctx.createBufferSource();
        air.buffer = this.noiseBuffer;

        const airFilter = ctx.createBiquadFilter();
        airFilter.type = 'bandpass';
        airFilter.frequency.setValueAtTime(1600, t);
        airFilter.Q.setValueAtTime(2.8, t);

        const airGain = ctx.createGain();
        airGain.gain.setValueAtTime(0.0001, t);
        airGain.gain.linearRampToValueAtTime(0.015, t + 0.05);
        airGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

        air.connect(airFilter);
        airFilter.connect(airGain);
        airGain.connect(chordGain);

        air.start(t);
        air.stop(t + 0.30);
      }

      setTimeout(() => {
        try { chordGain.disconnect(); } catch (_) {}
      }, (duration + 0.05) * 1000);
    }

    /**
     * Identify valid interactive elements eligible for UI sound feedback
     */
    getInteractiveElement(target) {
      if (!target || !(target instanceof Element)) return null;
      return target.closest(
        'aside nav a, header nav a, header a, #main-sidebar a, ' +
        'button, a.cta-shimmer, a.inline-flex, select, ' +
        '[role="button"], [data-sound]'
      );
    }

    /**
     * Attach delegated listeners to window for hover, focus, and clicks
     */
    initDelegatedInteractionEvents() {
      // 1. Mouse/Pointer Hover with boundary check & cooldown deduplication
      document.addEventListener('pointerover', (e) => {
        if (!this.enabled || e.pointerType === 'touch') return;

        const el = this.getInteractiveElement(e.target);
        if (!el) return;

        // Verify if pointer came from inside the exact same interactive item
        const related = e.relatedTarget;
        if (related && (related === el || el.contains(related))) {
          return; // Ignore moving between child elements of the same menu item
        }

        // Apply hover cooldown and element deduplication
        const now = performance.now();
        if (now - this.lastHoverTime < HOVER_COOLDOWN_MS) return;
        if (this.lastHoverTarget === el && now - this.lastHoverTime < 300) return;

        this.lastHoverTime = now;
        this.lastHoverTarget = el;
        this.play('hover');
      }, { passive: true, capture: true });

      document.addEventListener('pointerout', (e) => {
        const el = this.getInteractiveElement(e.target);
        const related = e.relatedTarget;
        if (el && (!related || !el.contains(related))) {
          if (this.lastHoverTarget === el) {
            this.lastHoverTarget = null;
          }
        }
      }, { passive: true });

      // 2. Keyboard Focus Sound (only when navigating via keyboard, not mouse click)
      document.addEventListener('focusin', (e) => {
        if (!this.enabled || this.isInteractingWithPointer) return;

        const el = this.getInteractiveElement(e.target);
        if (!el || el === this.lastFocusedTarget) return;

        const now = performance.now();
        if (now - this.lastFocusTime < FOCUS_COOLDOWN_MS) return;

        this.lastFocusTime = now;
        this.lastFocusedTarget = el;
        this.play('hover');
      }, { passive: true, capture: true });

      // 3. Click interaction feedback
      document.addEventListener('click', (e) => {
        const el = this.getInteractiveElement(e.target);
        if (!el) return;

        // Sound toggle button handles its own state
        if (el.id === 'spectra-sound-toggle-btn' || el.classList.contains('spectra-sound-toggle')) {
          return;
        }

        if (!this.enabled) return;

        // Check if primary CTA action
        if (el.classList.contains('cta-shimmer') || el.id === 'cta-btn' || el.id === 'exportBtn') {
          this.play('action');
        } else if (el.tagName === 'SELECT' || el.getAttribute('type') === 'checkbox') {
          this.play('toggle');
        } else {
          this.play('click');
        }
      }, { passive: true, capture: true });
    }

    /**
     * Synchronize all sound toggle buttons in the DOM
     */
    updateToggleUI() {
      const btns = document.querySelectorAll('#spectra-sound-toggle-btn, .spectra-sound-toggle');
      btns.forEach((btn) => {
        const isMuted = !this.enabled;
        btn.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
        btn.setAttribute(
          'aria-label',
          isMuted ? 'Enable interface sounds' : 'Mute interface sounds'
        );
        btn.setAttribute(
          'title',
          isMuted ? 'Enable interface sounds (Currently Muted)' : 'Mute interface sounds (Currently Active)'
        );

        const icon = btn.querySelector('.material-symbols-outlined') || btn;
        if (icon) {
          icon.textContent = isMuted ? 'volume_off' : 'volume_up';
        }

        if (this.enabled) {
          btn.classList.add('text-cyan-glow', 'border-cyan-glow/40', 'shadow-[0_0_12px_rgba(56,189,248,0.2)]');
          btn.classList.remove('text-text-tertiary');
        } else {
          btn.classList.remove('text-cyan-glow', 'border-cyan-glow/40', 'shadow-[0_0_12px_rgba(56,189,248,0.2)]');
          btn.classList.add('text-text-tertiary');
        }
      });
    }

    /**
     * Initialize Sound Toggle Button handlers
     */
    initToggleButtons() {
      this.updateToggleUI();

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#spectra-sound-toggle-btn, .spectra-sound-toggle');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    }
  }

  // Instantiate singleton
  const engine = new SpectraSoundEngine();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.initToggleButtons());
  } else {
    engine.initToggleButtons();
  }

  global.SpectraSounds = engine;

})(typeof window !== 'undefined' ? window : this);
