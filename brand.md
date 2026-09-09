# Brand — ShipIt

This project is **not** on stock shadcn defaults. It runs an Expo-derived system whose tokens are listed in [DESIGN.md](DESIGN.md) and wired into `apps/web/app/globals.css` as CSS variables. `globals.css` is the running source of truth; DESIGN.md is the reference.

## The direction in one line

Quietly-confident developer infrastructure: near-monochrome surfaces, **pure black** primary actions, a single blue reserved for inline links, and colour spent almost entirely on deployment state.

## What's wired

- **Surfaces** — `--canvas`, `--canvas-soft`, `--surface-soft`, `--surface-card`, `--surface-strong`, `--surface-dark`, `--surface-dark-elevated`, `--hairline`, `--hairline-soft`, `--hairline-strong`
- **Text** — `--ink`, `--body-text`, `--muted-text`, `--muted-soft`, `--on-primary`, `--on-dark`, `--on-dark-soft`
- **Accent** — `--brand-accent` (#0d74ce, links only), `--text-link-secondary`, `--accent-preview`, `--accent-link-bright`, `--gradient-sky-light` / `--gradient-sky-mid` (marketing surfaces only)
- **Semantic** — `--success`, `--warning`, `--error`, `--error-soft`
- **Type** — Inter for display _and_ body, split by weight (600 / 400) and negative tracking rather than by family; JetBrains Mono for code and every machine-generated value. `.text-display-mega` → `.text-nav-link` scale plus `.text-eyebrow` and `.font-machine` in `globals.css`
- **Radius** — `--radius-none` through `--radius-2xl`, plus `--radius-pill` / `--radius-full`

## Departures from the token reference

The tokens describe a light **marketing** canvas; ShipIt is a dark-first application. Three deliberate departures:

1. **Dark mode is the primary canvas.** `surface-dark` (#171717) is the app background, `surface-dark-elevated` (#1a1a1a) the one step of lift above it. The light theme is the faithful one.
2. **Semantic colours are re-lit for dark.** The marketing amber (#ab6400) sits at ~2.6:1 on #171717, and `semantic-error` (#eb8e90) is a fill tint at 2.3:1 on white. Same hues, more luminance, in the `.dark` block; the pale rose survives as `--error-soft` for fills and borders.
3. **Colour is the status channel.** Deployment state (green / amber / red / grey) is the only thing hue is spent on in app chrome. No branded buttons, no gradient headers, no coloured nav. Selection uses `--primary` and geometry, never the accent.

## Motion

100ms for hover and press feedback, 150ms for popovers, 200–250ms for dialogs and
sheets. Entrances longer than exits, on the single `--ease-shipit` curve. Never
`linear`, never `transition: all` — name the properties. See
[reveal.tsx](apps/web/components/landing/reveal.tsx) for reduced motion: it
renders the final state with zero movement.

Open design work: the type scale is only partly used, and two vendored
primitives still carry `transition-all`.

_Adopted 2026-08-22, from Expo's design language._
