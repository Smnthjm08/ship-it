# Brand — ShipIt

_Status: deferred (design system adopted from a reference, not generated)_

This project is **not** on stock shadcn defaults. It runs an Expo-derived system documented in [DESIGN.md](DESIGN.md) and wired into `apps/web/app/globals.css` as CSS variables. A Cal.com-derived spec came before it and was deleted on adoption — `globals.css` and `DESIGN.md` are the only source of truth.

## The direction in one line

Quietly-confident developer infrastructure: near-monochrome surfaces, **pure black** primary actions, a single blue reserved for inline links, and colour spent almost entirely on deployment state.

## What's wired

- **Surfaces** — `--canvas`, `--canvas-soft`, `--surface-soft`, `--surface-card`, `--surface-strong`, `--surface-dark`, `--surface-dark-elevated`, `--hairline`, `--hairline-soft`, `--hairline-strong`
- **Text** — `--ink`, `--body-text`, `--muted-text`, `--muted-soft`, `--on-primary`, `--on-dark`, `--on-dark-soft`
- **Accent** — `--brand-accent` (#0d74ce, links only), `--text-link-secondary`, `--accent-preview`, `--accent-link-bright`, `--gradient-sky-light` / `--gradient-sky-mid` (marketing surfaces only)
- **Semantic** — `--success`, `--warning`, `--error`, `--error-soft`
- **Type** — Inter for display _and_ body, split by weight (600 / 400) and negative tracking rather than by family; JetBrains Mono for code and every machine-generated value. `.text-display-mega` → `.text-nav-link` scale plus `.text-eyebrow` and `.font-machine` in `globals.css`
- **Radius** — `--radius-none` through `--radius-2xl`, plus `--radius-pill` / `--radius-full`

## Rules that aren't in DESIGN.md

DESIGN.md analyses a **marketing site**; ShipIt is a dark-first application. Three deliberate departures:

1. **Dark mode is the primary canvas.** DESIGN.md's `surface-dark` (#171717) is the app background, `surface-dark-elevated` (#1a1a1a) the one step of lift above it. The light theme is the faithful one.
2. **Semantic colours are re-lit for dark.** The marketing amber (#ab6400) sits at ~2.6:1 on #171717, and `semantic-error` (#eb8e90) is a fill tint at 2.3:1 on white. Same hues, more luminance, in the `.dark` block; the pale rose survives as `--error-soft` for fills and borders.
3. **Colour is the status channel.** Deployment state (green / amber / red / grey) is the only thing hue is spent on in app chrome. No branded buttons, no gradient headers, no coloured nav. Selection uses `--primary` and geometry, never the accent.

To replace all of this with a generated palette, typography, and voice, run `/brand-design` or say "pick brand colors". It will detect this deferred state, skip the overwrite confirmation, and rewrite both `globals.css` and this file.

Open design work — the unused type scale, the two vendored primitives that still
carry `transition-all` — is tracked in [ROADMAP.md](ROADMAP.md) under **Frontend**.

_Adopted: 2026-08-22 (Expo). Previously: Cal.com, deferred 2026-07-31._
