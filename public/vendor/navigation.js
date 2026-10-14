/**
 * SPECTRA v2.4 — Cinematic Forensic Navigation & Page Transitions
 *
 * Signature 3-Stage Transition Sequence:
 *   Stage A — Immediate Navigation Response:
 *     Selected nav item highlights instantly (0ms) with luminous cyan-blue indicator.
 *     Current page content initiates smooth exit fade and slight upward/horizontal movement.
 *   Stage B — Forensic Scan Sweep:
 *     Luminous cyan-violet edge beam sweeps across the viewport boundary (~260ms)
 *     with restrained forensic glow fitting dark workstation aesthetic.
 *   Stage C — Destination Reveal:
 *     New page content reveals smoothly (340ms, cubic-bezier(0.22, 1, 0.36, 1))
 *     with visual hierarchy stagger (header appears first, followed 40ms later by body).
 *
 * Standards:
 *  - Easing: cubic-bezier(0.22, 1, 0.36, 1)
 *  - Persistent shell (sidebar & header) remains rock-solid and stable.
 *  - Rapid click guard, bfcache Back/Forward support, and prefers-reduced-motion compliance.
 */
(function (global) {
  'use strict';

  const STYLE_ID = 'spectra-navigation-motion-styles';
  const SCAN_BEAM_ID = 'spectra-scan-beam';
  const IN_FLIGHT_KEY = 'spectra_transition_in_flight';

  // 1. Inject Standardized Transition Styles immediately
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Easing & Timing Specifications */
      :root {
        --spectra-ease-cinematic: cubic-bezier(0.22, 1, 0.36, 1);
        --spectra-nav-cyan: #38BDF8;
        --spectra-nav-violet: #8B5CF6;
        --spectra-nav-cobalt: #2457FF;
      }

      /* Stage C: Destination Page Entrance */
      @keyframes spectraPageEnter {
        0% {
          opacity: 0;
          transform: translateY(14px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Stage C Stagger: Header Reveal (Immediate 0ms) */
      @keyframes spectraHeaderReveal {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Stage C Stagger: Body Reveal (40ms stagger) */
      @keyframes spectraBodyReveal {
        0% {
          opacity: 0;
          transform: translateY(14px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Stage A: Page Exit Fade & Motion */
      @keyframes spectraPageExit {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-8px);
        }
      }

      /* Stage B: Forensic Scan Line Animations */
      @keyframes spectraScanSweep {
        0% {
          transform: scaleX(0);
          opacity: 1;
        }
        60% {
          transform: scaleX(0.72);
          opacity: 1;
        }
        100% {
          transform: scaleX(0.92);
          opacity: 1;
        }
      }

      @keyframes spectraScanFinish {
        0% {
          transform: scaleX(0.92);
          opacity: 1;
        }
        50% {
          transform: scaleX(1);
          opacity: 1;
        }
        100% {
          transform: scaleX(1);
          opacity: 0;
        }
      }

      @keyframes spectraScanSingleSweep {
        0% {
          transform: scaleX(0);
          opacity: 1;
        }
        65% {
          transform: scaleX(1);
          opacity: 1;
        }
        100% {
          transform: scaleX(1);
          opacity: 0;
        }
      }

      /* Content Transition Classes */
      .spectra-page-content {
        animation: spectraPageEnter 340ms var(--spectra-ease-cinematic) both;
        will-change: transform, opacity;
      }

      .spectra-page-content .spectra-reveal-header {
        animation: spectraHeaderReveal 300ms var(--spectra-ease-cinematic) both;
        will-change: transform, opacity;
      }

      .spectra-page-content .spectra-reveal-body {
        animation: spectraBodyReveal 340ms var(--spectra-ease-cinematic) 40ms both;
        will-change: transform, opacity;
      }

      .spectra-page-exit {
        animation: spectraPageExit 170ms var(--spectra-ease-cinematic) forwards !important;
        pointer-events: none !important;
      }

      /* Forensic Edge Scan Beam */
      #spectra-scan-beam {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.2) 20%, #38BDF8 50%, #8B5CF6 80%, rgba(56, 189, 248, 0.8) 95%, transparent 100%);
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.5), 0 0 14px rgba(139, 92, 246, 0.25);
        z-index: 99999;
        pointer-events: none;
        transform-origin: left center;
        transform: scaleX(0);
        opacity: 0;
        will-change: transform, opacity;
      }

      #spectra-scan-beam.spectra-scanning {
        animation: spectraScanSweep 260ms var(--spectra-ease-cinematic) forwards !important;
      }

      #spectra-scan-beam.spectra-finishing {
        animation: spectraScanFinish 260ms var(--spectra-ease-cinematic) forwards !important;
      }

      #spectra-scan-beam.spectra-pulse-sweep {
        animation: spectraScanSingleSweep 320ms var(--spectra-ease-cinematic) forwards !important;
      }

      /* Stage A: Immediate Nav Item Feedback */
      .spectra-nav-pending {
        background: linear-gradient(90deg, rgba(36, 87, 255, 0.22) 0%, rgba(56, 189, 248, 0.12) 100%) !important;
        border-left-color: #38BDF8 !important;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.25) !important;
        color: #FFFFFF !important;
        transition: all 140ms var(--spectra-ease-cinematic) !important;
      }

      .spectra-nav-pending .material-symbols-outlined {
        color: #38BDF8 !important;
        filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.5)) !important;
      }

      /* Section 5: Interactive Motion Polish */
      button:not(:disabled), a.inline-flex, .cta-shimmer {
        transition: transform 180ms var(--spectra-ease-cinematic),
                    box-shadow 180ms var(--spectra-ease-cinematic),
                    background-color 180ms var(--spectra-ease-cinematic),
                    border-color 180ms var(--spectra-ease-cinematic),
                    color 180ms var(--spectra-ease-cinematic);
      }

      button:not(:disabled):active, a.inline-flex:active {
        transform: scale(0.98);
      }

      .glass-panel {
        transition: border-color 220ms var(--spectra-ease-cinematic),
                    box-shadow 220ms var(--spectra-ease-cinematic),
                    background 220ms var(--spectra-ease-cinematic);
      }

      /* Smart Scroll-Aware Header */
      header.spectra-header-smart {
        transition: transform 240ms var(--spectra-ease-cinematic),
                    background-color 200ms ease,
                    border-color 200ms ease;
        will-change: transform;
      }

      header.spectra-header-smart.spectra-header-hidden {
        transform: translateY(-100%) !important;
      }

      /* Focus accessibility rings */
      a:focus-visible, button:focus-visible, input:focus-visible {
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4) !important;
      }

      /* Accessible Reduced Motion Compliance */
      @media (prefers-reduced-motion: reduce) {
        .spectra-page-content,
        .spectra-page-exit,
        .spectra-reveal-header,
        .spectra-reveal-body,
        #spectra-scan-beam,
        header.spectra-header-smart {
          animation: none !important;
          transform: none !important;
          opacity: 1 !important;
          transition: none !important;
        }
        header.spectra-header-smart.spectra-header-hidden {
          transform: none !important;
        }
        #spectra-scan-beam {
          display: none !important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let isNavigating = false;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getMainContainer() {
    return document.querySelector('main') || document.getElementById('main-workspace');
  }

  function getOrCreateScanBeam() {
    let beam = document.getElementById(SCAN_BEAM_ID);
    if (!beam) {
      beam = document.createElement('div');
      beam.id = SCAN_BEAM_ID;
      (document.body || document.documentElement).appendChild(beam);
    }
    return beam;
  }

  function startScanSweep() {
    if (prefersReducedMotion()) return;
    const beam = getOrCreateScanBeam();
    if (!beam) return;
    beam.classList.remove('spectra-finishing', 'spectra-pulse-sweep');
    void beam.offsetWidth;
    beam.classList.add('spectra-scanning');
  }

  function completeScanFinish() {
    if (prefersReducedMotion()) return;
    const beam = document.getElementById(SCAN_BEAM_ID);
    if (!beam) return;
    beam.classList.remove('spectra-scanning', 'spectra-pulse-sweep');
    void beam.offsetWidth;
    beam.classList.add('spectra-finishing');
    setTimeout(() => {
      if (beam) {
        beam.classList.remove('spectra-finishing');
        beam.style.opacity = '0';
        beam.style.transform = 'scaleX(0)';
      }
    }, 280);
  }

  function triggerSinglePulseSweep() {
    if (prefersReducedMotion()) return;
    const beam = getOrCreateScanBeam();
    if (!beam) return;
    beam.classList.remove('spectra-scanning', 'spectra-finishing');
    void beam.offsetWidth;
    beam.classList.add('spectra-pulse-sweep');
    setTimeout(() => {
      if (beam) {
        beam.classList.remove('spectra-pulse-sweep');
        beam.style.opacity = '0';
        beam.style.transform = 'scaleX(0)';
      }
    }, 340);
  }

  function replayPageEnter(main) {
    if (!main || prefersReducedMotion()) return;
    main.classList.remove('spectra-page-exit');
    main.classList.remove('spectra-page-content');
    void main.offsetWidth; // Force layout reflow
    main.classList.add('spectra-page-content');
    triggerSinglePulseSweep();
  }

  function normalizePath(p) {
    if (!p) return '/';
    let clean = p.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return clean === '' ? '/' : clean;
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function initNavigation() {
    // 1. Ensure Scan Beam element exists
    getOrCreateScanBeam();

    const main = getMainContainer();
    if (main && !prefersReducedMotion() && !main.classList.contains('spectra-page-content')) {
      main.classList.add('spectra-page-content');
    }

    // 2. Check if this page load was triggered by a cinematic transition in flight
    try {
      if (sessionStorage.getItem(IN_FLIGHT_KEY) === 'true') {
        sessionStorage.removeItem(IN_FLIGHT_KEY);
        completeScanFinish();
      }
    } catch (_) {}

    // 3. Intercept internal links for seamless tab transitions
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      // Ignore modified clicks (cmd, ctrl, shift, alt) or non-primary mouse buttons
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Ignore links with target="_blank", download, or external protocols
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      // Resolve URL
      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }

      // Check same origin
      if (url.origin !== window.location.origin) return;

      const currentPath = normalizePath(window.location.pathname);
      const targetPath = normalizePath(url.pathname);

      // Handle clicking the current page's tab
      if (currentPath === targetPath && url.search === window.location.search) {
        e.preventDefault();
        if (global.SpectraSounds && typeof global.SpectraSounds.play === 'function') {
          global.SpectraSounds.play('click');
        }
        replayPageEnter(main);
        closeMobileSidebar();
        return;
      }

      // If already navigating to another route, ignore rapid multi-clicks
      if (isNavigating) {
        e.preventDefault();
        return;
      }

      // If reduced motion is requested, proceed with instant native navigation
      if (prefersReducedMotion() || !main) {
        return;
      }

      // ── STAGE A: IMMEDIATE NAVIGATION RESPONSE ─────────────────────────────
      e.preventDefault();
      isNavigating = true;
      closeMobileSidebar();

      // Highlight clicked link instantly
      link.classList.add('spectra-nav-pending');

      // ── STAGE B: FORENSIC SCAN SWEEP ────────────────────────────────────────
      startScanSweep();
      if (global.SpectraSounds && typeof global.SpectraSounds.play === 'function') {
        global.SpectraSounds.play('transition');
      }
      try {
        sessionStorage.setItem(IN_FLIGHT_KEY, 'true');
      } catch (_) {}

      // Begin smooth page exit
      main.classList.remove('spectra-page-content');
      main.classList.add('spectra-page-exit');

      // Failsafe timer to reset navigation guard if user aborts or stays on page
      const failsafe = setTimeout(() => {
        isNavigating = false;
        if (main) main.classList.remove('spectra-page-exit');
        link.classList.remove('spectra-nav-pending');
        const beam = document.getElementById(SCAN_BEAM_ID);
        if (beam) {
          beam.classList.remove('spectra-scanning');
          beam.style.opacity = '0';
        }
        try {
          sessionStorage.removeItem(IN_FLIGHT_KEY);
        } catch (_) {}
      }, 700);

      setTimeout(() => {
        clearTimeout(failsafe);
        window.location.assign(url.href);
      }, 160);
    });

    // 4. Handle Browser Back / Forward and BFCache restore
    window.addEventListener('pageshow', (event) => {
      isNavigating = false;
      document.querySelectorAll('.spectra-nav-pending').forEach((el) => {
        el.classList.remove('spectra-nav-pending');
      });

      const m = getMainContainer();
      if (m) {
        m.classList.remove('spectra-page-exit');
        if (event.persisted || !m.classList.contains('spectra-page-content')) {
          replayPageEnter(m);
        }
      }

      try {
        if (sessionStorage.getItem(IN_FLIGHT_KEY) === 'true') {
          sessionStorage.removeItem(IN_FLIGHT_KEY);
          completeScanFinish();
        }
      } catch (_) {}
    });

    window.addEventListener('pagehide', () => {
      isNavigating = false;
    });

    // 5. Initialize Smart Scroll-Aware Header
    initScrollAwareHeader();
  }

  // ── SMART SCROLL-AWARE COMPACT HEADER ──────────────────────────────────────
  function initScrollAwareHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    header.classList.add('spectra-header-smart');

    let lastScrollY = Math.max(window.pageYOffset || document.documentElement.scrollTop || 0, 0);
    let isTicking = false;
    const SCROLL_DOWN_THRESHOLD = 8;
    const SCROLL_UP_THRESHOLD = -6;
    const TOP_REVEAL_THRESHOLD = 40;

    function handleScrollUpdate() {
      isTicking = false;
      if (prefersReducedMotion()) {
        header.classList.remove('spectra-header-hidden');
        return;
      }

      const currentScrollY = Math.max(window.pageYOffset || document.documentElement.scrollTop || 0, 0);
      const delta = currentScrollY - lastScrollY;

      // Never hide if a control inside header currently has focus
      if (header.contains(document.activeElement)) {
        header.classList.remove('spectra-header-hidden');
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY <= TOP_REVEAL_THRESHOLD) {
        // At or near top of the page -> always reveal
        header.classList.remove('spectra-header-hidden');
      } else if (delta > SCROLL_DOWN_THRESHOLD && currentScrollY > 60) {
        // Scrolling down past threshold -> hide header
        header.classList.add('spectra-header-hidden');
      } else if (delta < SCROLL_UP_THRESHOLD) {
        // Scrolling up past threshold -> reveal header
        header.classList.remove('spectra-header-hidden');
      }

      lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', () => {
      if (!isTicking) {
        window.requestAnimationFrame(handleScrollUpdate);
        isTicking = true;
      }
    }, { passive: true });

    // Keyboard accessibility: if focus moves into header (via Tab), immediately reveal header
    header.addEventListener('focusin', () => {
      header.classList.remove('spectra-header-hidden');
    });

    // Also reveal if user hovers near top viewport edge (within 12px of top)
    window.addEventListener('mousemove', (e) => {
      if (e.clientY <= 12 && header.classList.contains('spectra-header-hidden')) {
        header.classList.remove('spectra-header-hidden');
      }
    }, { passive: true });
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }

  global.SpectraNavigation = {
    replay: () => replayPageEnter(getMainContainer()),
    triggerScan: triggerSinglePulseSweep,
    init: initNavigation
  };
})(window);
