---
name: Verity Forensics
colors:
  surface: '#0f141c'
  surface-dim: '#0f141c'
  surface-bright: '#343942'
  surface-container-lowest: '#090e16'
  surface-container-low: '#171c24'
  surface-container: '#1b2028'
  surface-container-high: '#252a33'
  surface-container-highest: '#30353e'
  on-surface: '#dee2ee'
  on-surface-variant: '#c4c5d9'
  inverse-surface: '#dee2ee'
  inverse-on-surface: '#2c3139'
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
  tertiary: '#ffb955'
  on-tertiary: '#452b00'
  tertiary-container: '#935f00'
  on-tertiary-container: '#ffe8ce'
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
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#ffb955'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#0f141c'
  on-background: '#dee2ee'
  surface-variant: '#30353e'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.875rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 0.9375rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.1875rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
  mono-data-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: -0.01em
  mono-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '400'
    lineHeight: 0.9375rem
    letterSpacing: 0em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets cybercrime analysts, digital forensic investigators, and incident responders handling mission-critical evidentiary workflows. The environment is austere, authoritative, disciplined, and strictly rationalist. It projects absolute technical rigor and chain-of-custody integrity.

Visual architecture is rooted in technical minimalism and structural precision:
- **Zero Ornamentation:** No non-functional glows, artificial drop shadows, decorative scanlines, or Hollywood-style pseudo-terminal graphics.
- **Instrument-Grade UI:** High density, razor-sharp edge definition, explicit state visualization, and uncompromising alignment.
- **Information Priority:** Visual weight is strictly reserved for evidentiary state changes, timeline discrepancies, cryptographic hashes, and critical anomaly indicators.

## Colors

The palette enforces a calibrated hierarchy designed for prolonged, high-focus operation in low-light environments without eye fatigue.

### Core Architecture
- **Root Canvas / App Shell:** `#0A0D12` (Base substrate for root framing and outer boundaries)
- **Primary Workspace Canvas:** `#10151D` (Working surface for tables, hex viewers, and timeline panes)
- **Container / Panel Surface:** `#151C26` (Data panels, tool cards, inspect sheets)
- **Elevated / Modal Surface:** `#1B2430` (Contextual flyouts, dropdowns, forensic inspectors)
- **Structural Outlines:** `#293443` (Strict 1px borders dividing all functional regions)

### Typography & Content
- **Text Primary:** `#F4F6FA` (High-contrast, for labels, values, and headers)
- **Text Secondary:** `#9AA8B8` (Structural metadata, unselected states, breadcrumbs)
- **Text Muted:** `#526071` (Timestamps, inactive table column handles, micro-legends)

### Accent & Telemetry Tokens
- **Action Cobalt (`#2457FF`):** Dedicated exclusively to interactive controls, key primary actions, selected timeline segments, and active navigation nodes.
- **Precision Lime (`#C8FF3D`):** Sparing usage. Micro telemetry pulses, focal markers, cursor coordinates, and trace milestones. Never used to denote "pass" or "safe/authentic" status.
- **Warning Amber (`#FFB547`):** Unverified integrity, missing hashes, unparsed partitions, or corrupted timestamps.
- **Critical Red (`#FF5C68`):** Tamper alerts, signature mismatch, privilege escalation, or malware detonation triggers.

## Typography

The typography architecture uses a functional tri-font system:
1. **Space Grotesk (Structural Display):** Geometric, exact, and modern without being expressive. Used for view headings, panel headers, and metric callouts.
2. **Inter (Interface & Analytical Body):** High-legibility neutral sans-serif tuned for dense UI forms, forensic notes, case dossiers, and contextual status dialogs.
3. **JetBrains Mono (Forensic Telemetry):** Strict tabular sizing for cryptographic hashes (SHA-256, MD5), raw hex offsets, network IP/CIDR ranges, packet logs, and memory addresses.

Typography rules:
- All labels prefixed with structural classifications must use `label-caps` in uppercase.
- Forensic hashes and file traces must always use `mono-data-sm` with tabular numerals enabled (`font-variant-numeric: tabular-nums`).
- Text tracking is kept neutral to slightly tight; no loose consumer tracking.

## Layout & Spacing

Designed for workstation environments at standard enterprise desktop resolutions (1440x900 baseline, scalable to dual 4K setups). 

### Layout Architecture
- **Navigation Anchor (Left Sidebar):** Fixed width of `228px` (docked, compact). Can collapse to a `48px` icon rail for maximize timeline viewing.
- **Top Utility Rail:** Fixed height of `40px` incorporating case ID, evidence volume lock status, analyst profile, and workspace memory health.
- **Main Working Canvas:** Multi-pane tiled dashboard employing vertical and horizontal splitters. Pane borders are exact 1px lines (`#293443`).
- **Inspector / Detail Drawer (Right Sidebar):** Contextual toggle width fixed at `320px`.

### Spacing Philosophy
- Base metric: Strict 4px/8px modular rhythm.
- Spacing inside tabular cells, lists, and metadata blocks prioritizes high information density while preserving vertical visual scanning tracks.
- Internal card padding is strictly uniform: `space-md` (12px) or `space-lg` (16px) for major analytical modules.

## Elevation & Depth

This design system rejects ambient drop shadows, soft light bleeds, and skeuomorphic bevels. Visual separation is achieved strictly through **Tonal Layering** and **Architectural 1px Gridlines**.

- **Level 0 (Base Bed):** `#0A0D12` — Frame and shell background.
- **Level 1 (Workspace Grid):** `#10151D` — Grid canvas, primary table regions.
- **Level 2 (Panels & Partitions):** `#151C26` bounded by 1px solid `#293443`.
- **Level 3 (Interactive Elevated):** `#1B2430` bounded by 1px solid `#3B4A5E` for dropdowns, popovers, and inspector overlays.
- **Focus / Target Indication:** 1px inset or exterior outline using Action Cobalt (`#2457FF`). Never employ blurred halos or diffuse glow rings.
- **Divider Lines:** Zero margins; borders divide panels directly with clean hairline geometry.

## Shapes

The design system uses deliberate, restrained edge softeners (`roundedness: 1`, 4px base border radius).

- **Panels, Windows, and Split Views:** Sharp 0px or subtle 2px corners (`rounded-none` to `rounded-xs`) to maintain an architectural, technical dock feel.
- **Interactive Controls (Buttons, Inputs, Selectors):** Uniform `4px` corner radius (`rounded-sm`).
- **Telemetry Chips and Key Indicators:** `2px` or `4px` radius. Pill shapes (`rounded-full`) are prohibited across analytical surfaces to avoid an informal, consumer-app appearance.
- **Icon containers & Thumbnails:** Strict square or 4px rounded rectangles.

## Components

### Buttons
- **Primary:** Background `#2457FF`, foreground `#F4F6FA`, 4px radius, 0 1px border `#3D6DFF`. Hover: `#1B4AE0`. Active: `#143CC0`. Focus: 1px solid `#F4F6FA` with 1px offset.
- **Secondary / Action Surface:** Background `#151C26`, border 1px solid `#293443`, foreground `#F4F6FA`. Hover: Background `#1B2430`, border `#3D4C60`.
- **Ghost / Tool Action:** Zero background, foreground `#9AA8B8`. Hover: Foreground `#F4F6FA`, background `#1B2430`.
- **Critical Action:** Background `#151C26`, border 1px solid `#FF5C68`, foreground `#FF5C68`. Hover: Background `#FF5C68`, foreground `#0A0D12`.

### Inputs & Search Bars
- Background `#10151D`, border 1px solid `#293443`, text `#F4F6FA`, height `32px` standard.
- Placeholder text `#526071`.
- Focused state: Border `#2457FF` with zero diffuse shadow. Monospaced font variant for hash searches, regex parameters, and IP filters.

### Forensic Data Tables
- Header: `#151C26`, border-bottom 1px solid `#293443`, text `label-caps` (`#9AA8B8`).
- Rows: Background `#10151D`, alternating zebra stripe `#121822`. Row hover: `#18202C`. Selected row: `#1B273A` with a 2px left border in `#2457FF`.
- Cell height: `28px` (compact) or `36px` (default). Text alignment: strict numerical tabular alignment for sizes, timestamps, and hashes.

### Metadata Chips & Status Badges
- Background `#151C26`, border 1px solid `#293443`, padding `2px 6px`, radius `2px`. Text `mono-data-sm`.
- **Active Trace Marker:** Border `#C8FF3D`, text `#C8FF3D`, background `rgba(200, 255, 61, 0.05)`.
- **Integrity Alert:** Border `#FF5C68`, text `#FF5C68`, background `rgba(255, 92, 104, 0.08)`.
- **Unverified Flag:** Border `#FFB547`, text `#FFB547`, background `rgba(255, 181, 71, 0.08)`.

### Cards & Analytical Panels
- Background `#151C26`, border 1px solid `#293443`.
- Panel Header: Height `36px`, integrated border-bottom 1px solid `#293443`, padding `0 12px`, flex-aligned with panel title in `headline-sm` and action slot on the right.

### Custom Workstation Components
- **Hex Inspector Pane:** Monospaced 16-byte grid display; offset column in `#526071`, hex data in `#9AA8B8`, ASCII decode column bounded by a 1px vertical border in `#293443`. Selected byte offset highlighted in `#2457FF` with text `#F4F6FA`.
- **Timeline Anomaly Scrubber:** Unified horizontal histogram band; unflagged events in `#293443`, active inspection frame bounded by `#2457FF`, discrepancy pings marked with a 2px vertical tick in `#C8FF3D`.