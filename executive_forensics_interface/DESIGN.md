---
name: Executive Forensics Interface
colors:
  surface: '#0f141b'
  surface-dim: '#0f141b'
  surface-bright: '#353941'
  surface-container-lowest: '#090e15'
  surface-container-low: '#171c23'
  surface-container: '#1b2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#30353d'
  on-surface: '#dee2ed'
  on-surface-variant: '#c4c5d9'
  inverse-surface: '#dee2ed'
  inverse-on-surface: '#2c3138'
  outline: '#8d90a2'
  outline-variant: '#434656'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002487'
  primary-container: '#2457ff'
  on-primary-container: '#e9eaff'
  inverse-primary: '#0549f3'
  secondary: '#bef532'
  on-secondary: '#263500'
  secondary-container: '#a3d700'
  on-secondary-container: '#435a00'
  tertiary: '#f9bc5a'
  on-tertiary: '#442c00'
  tertiary-container: '#8f6100'
  on-tertiary-container: '#ffe8cb'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0036bc'
  secondary-fixed: '#bef532'
  secondary-fixed-dim: '#a3d700'
  on-secondary-fixed: '#151f00'
  on-secondary-fixed-variant: '#394d00'
  tertiary-fixed: '#ffddaf'
  tertiary-fixed-dim: '#f9bc5a'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#614000'
  background: '#0f141b'
  on-background: '#dee2ed'
  surface-variant: '#30353d'
typography:
  display-metric:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-hash:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system defines an executive-grade media forensics workstation tailored for intelligence analysts, corporate legal counsels, and integrity officers. The visual narrative balances institutional authority with cutting-edge analytical clarity. It intentionally departs from dystopian sci-fi tropes, cluttered HUDs, matrix green cascades, and terminal-style noise. Instead, it presents a composed, luminous, high-clarity enterprise workspace engineered for long-duration investigative scrutiny.

The design movement is **Precision Corporate Minimalism with Luminous Accents**. It relies on high-legibility typographic hierarchies, strict architectural surface zoning, micro-restrained luminous indicators, and structured spatial grids. Surfaces suggest surgical precision: hairline neutral partitions, controlled matte depths, and zero synthetic decorations. Every element exists solely to empower human judgment over complex, probabilistic AI artifacts.

## Colors

The palette establishes an ordered tonal architecture designed to prevent eye fatigue while preserving absolute chromatic hierarchy:

- **Primary Action (`#2457FF` - Cobalt Blue):** Anchors visual priority. Used for primary commands, interactive states, selected navigation markers, and decisive metric indicators.
- **Processing Accent (`#C8FF3D` - Electric Lime):** Reserved strictly for live micro-status pings, running background ingestion pipelines, and dynamic process spinners. Never utilized to signal verification, safety, or authenticity.
- **Alert Tones:**
  - **Warning Amber (`#E8AD4D`):** Inconclusive artifacts, metadata mismatch, or moderate confidence variances.
  - **Critical Red (`#E76670`):** Flagged manipulation vectors, deepfake synthesis markers, and compromised file signatures.
- **Architectural Surfaces & Layers:**
  - Deep Base Floor: `#0B0E12`
  - Fixed Primary Rail & Sidebar: `#0D1117`
  - Central Canvas & Workspace: `#11161D`
  - Base Cards & Panes: `#171D25`
  - Elevated Inspection Modals & Flyouts: `#1B222C`
  - Hairline Separators: `#2A313C` (strictly 1px solid)
- **Text & Editorial Values:**
  - High Contrast Primary: `#F3F5F8`
  - Secondary Context: `#A3ACB8`
  - Muted Metadata & Structural Borders: `#788493`

## Typography

Typographic execution emphasizes structure, technical restraint, and fast scanning under high information density:

- **Manrope:** Drives primary hierarchy. Used in structural section titles, analytical dashboard titles, and large analytical metrics (`display-metric`). Its geometric yet approachable proportions deliver executive polish without looking clinical or whimsical.
- **Inter:** The functional engine for all transactional workflows, forensic logs, data grids, inspection panels, and form controls. Provides neutral clarity across high-density tables.
- **JetBrains Mono:** Dedicated exclusively to cryptographically sensitive data strings, such as SHA-256 hashes, file checksums, and hex offsets. Monospaced styling is strictly prevented from leaking into generic labels or system navigation to preserve modern workstation standards.

## Layout & Spacing

The workstation adopts an 8px architectural cadence mapped strictly into four primary functional zones:

1. **Persistent Global Utility Rail (64px - 72px):** Docked on the left, `#0D1117`, containing session navigation and team tenant switches.
2. **Contextual Dossier Panel (280px - 320px):** Collapsible panel managing file queues, batch timelines, and chain-of-custody runs.
3. **Primary Forensic Canvas:** Fluid workspace (`#11161D`) structured along a 12-column adaptive grid with 24px gutters.
4. **Telemetry & Verification Inspector (360px - 400px):** Fixed-width right-hand inspection drawer for frame-by-frame confidence models.

### Breakpoints & Reflow Behavior
- **Desktop (1440px+):** Full 4-pane layout visible simultaneously without overlapping panels.
- **Laptop / Condensed Workstation (1024px - 1439px):** Contextual Dossier collapses to an icon bar; Inspector becomes an off-canvas drawer or toggleable pane.
- **Tablet / Mobile Review Mode (<1023px):** Single-column stack. Tables reflow into structured key-value summary cards. SHA-256 strings truncate to `8...8` characters with tap-to-copy affordance.

## Elevation & Depth

Visual depth is achieved through surgical, matte tonal stacking rather than heavy blur or skeuomorphic drops:

- **Floor Layer (`#0B0E12`):** Underlying application foundation.
- **Workspace Canvas (`#11161D`):** Recessed ground plane for data grids and media viewports.
- **Standard Card Surface (`#171D25`):** Bordered with a 1px solid hairline (`#2A313C`). Zero blur shadow in rested states.
- **Elevated Interactive Layer (`#1B222C`):** Used for modals, context popovers, and hovered table records. Supported by an ultra-soft ambient shadow: `box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.45)`.
- **Radial Focus Embers:** Key summary cards utilize a subtle, imperceptible background radial fill: `radial-gradient(120% 120% at 50% 0%, rgba(36, 87, 255, 0.04) 0%, transparent 70%)`. This anchors viewer priority without causing visual clutter.

## Shapes

The interface embraces a precise geometry calibrated to exactly **10px corner radiuses** for macro-containers:

- **Cards, Modals, Viewport Frames:** `10px` (`rounded-lg`).
- **Interactive Controls (Buttons, Inputs, Selects):** `6px` to `8px` (`rounded-md`).
- **Pills & Micro Badges (Status indicators, DEMO DATA tags):** `4px` subtle rounding or full circular radiuses for discrete 6px dot status indicators.
- **Borders:** Fixed uniform stroke of `1px` matching `#2A313C` across all cards, row dividers, and form elements. No heavy borders or synthetic double-stroke bevels.

## Components

### Buttons
- **Primary:** Background `#2457FF`, foreground `#F3F5F8`, weight `500`, radius `8px`, height `36px` (compact) or `40px` (default). Hover state: `#1E4BD6`. Focus: subtle `2px` focus ring offset with `#2457FF` at 50% opacity.
- **Secondary / Outline:** Background `transparent`, border `1px solid #2A313C`, text `#F3F5F8`. Hover state: background `#171D25`, border `#3B4554`.
- **Destructive:** Background `rgba(231, 102, 112, 0.12)`, border `1px solid rgba(231, 102, 112, 0.3)`, text `#E76670`.

### Data Cards & Surface Panels
- Constructed on `#171D25` with `1px solid #2A313C` borders and `10px` corners.
- Internal padding matches `16px` or `20px`. Section headers inside cards utilize `headline-sm` with optional right-aligned metadata tags.

### Inputs & Select Fields
- Base background `#0D1117`, border `1px solid #2A313C`, text `#F3F5F8`, placeholder `#788493`.
- Height: `38px`, font size `14px`, transition `border-color 150ms ease`. Focus state elevates border color to `#2457FF`.

### Status Indicators & Badges
- **Processing Pulse:** Contains a `6px` circular dot in Electric Lime (`#C8FF3D`) with a soft static glow: `0 0 8px rgba(200, 255, 61, 0.3)`. Text companion reads in `label-sm` (`#A3ACB8`).
- **Analysis Risk Tags:** Pill-shaped badges with muted backgrounds and high-contrast text:
  - Suspicious/Manipulated: Background `rgba(231, 102, 112, 0.15)`, text `#E76670`.
  - Inconclusive: Background `rgba(232, 173, 77, 0.15)`, text `#E8AD4D`.
  - Baseline Standard: Background `rgba(163, 172, 184, 0.12)`, text `#A3ACB8`.
- **Prototype Badges:** Explicit `DEMO DATA` labels set in `JetBrains Mono` 10px, uppercase, tracking `0.08em`, styled with background `#1B222C` and text `#788493`.

### Cryptographic String Viewers
- Readouts for SHA-256 signatures are rendered in `code-hash` inside an inset cell (`#0B0E12`) with a one-click copy affordance, preventing text wrapping anomalies.