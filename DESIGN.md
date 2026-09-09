---
version: alpha
name: shipit-design-tokens
description: The token set ShipIt runs on — near-monochrome surfaces, pure black (`#000000`) primary actions, a single blue (`#0d74ce`) reserved for inline links, and colour spent almost entirely on deployment state. Inter carries display and body alike (600 / 400) with JetBrains Mono on every machine-generated value. Derived from Expo's design language; the departures ShipIt makes for a dark-first app are in brand.md.

colors:
  primary: "#000000"
  primary-active: "#1a1a1a"
  text-link: "#0d74ce"
  text-link-secondary: "#476cff"
  ink: "#171717"
  body: "#60646c"
  body-strong: "#171717"
  muted: "#999999"
  muted-soft: "#cccccc"
  hairline: "#f0f0f3"
  hairline-soft: "#f5f5f7"
  hairline-strong: "#dcdee0"
  canvas: "#ffffff"
  canvas-soft: "#fafafa"
  surface-card: "#ffffff"
  surface-strong: "#f0f0f3"
  surface-dark: "#171717"
  surface-dark-elevated: "#1a1a1a"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-dark-soft: "#b0b4ba"
  gradient-sky-light: "#cfe7ff"
  gradient-sky-mid: "#a8c8e8"
  accent-warning: "#ab6400"
  accent-preview: "#8145b5"
  accent-link-bright: "#47c2ff"
  semantic-error: "#eb8e90"
  semantic-success: "#16a34a"

typography:
  display-mega:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -1.92px
  display-xl:
    fontFamily: "'Inter', sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.44px
  display-lg:
    fontFamily: "'Inter', sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.08px
  display-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.84px
  display-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.5px
  title-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "'Inter', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "'Inter', sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.88px
    textTransform: uppercase
  code:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  nav-link:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
---

## Overview

A near-monochrome canvas with **pure black** (`{colors.primary}`) as the only
primary-action fill, and a small blue text-link accent (`{colors.text-link}`)
reserved for inline links — never a button. Near-black ink
(`{colors.ink}` — #171717) carries display and body alike.

Type runs **Inter** as the single sans family at modest weights (display 600,
body 400); **JetBrains Mono** carries code and every machine-generated value.

These tokens live in `apps/web/app/globals.css` as CSS variables — that file is
the running source of truth. ShipIt is a dark-first application, so the dark
theme re-lights the semantic colours; see [brand.md](brand.md) for the
departures.

## Colors

### Brand & Accent

- **Black** (`{colors.primary}` — #000000): Primary action fill. Used scarcely.
- **Black Active** (`{colors.primary-active}` — #1a1a1a): Press state.
- **Text Link Blue** (`{colors.text-link}` — #0d74ce): Inline links in long-form copy. Never on a button.
- **Legal Link Blue** (`{colors.text-link-secondary}` — #476cff): Inline links in legal/footer copy.
- **Bright Cyan** (`{colors.accent-link-bright}` — #47c2ff): Very sparing — links on dark surfaces.

### Surface

- **Canvas** (`{colors.canvas}` — #ffffff): Page floor.
- **Canvas Soft** (`{colors.canvas-soft}` — #fafafa): Subtle alternating band.
- **Surface Card** (`{colors.surface-card}` — #ffffff): Card fill.
- **Surface Strong** (`{colors.surface-strong}` — #f0f0f3): Badges, secondary buttons.
- **Surface Dark** (`{colors.surface-dark}` — #171717): Dark cards, code blocks — and the app background in dark mode.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #1a1a1a): One step of lift above it.

### Atmospheric Backdrop

- **Sky Light** (`{colors.gradient-sky-light}` — #cfe7ff) + **Sky Mid** (`{colors.gradient-sky-mid}` — #a8c8e8): A soft gradient wash behind the landing hero only. Marketing surfaces, not app chrome, and not a brand action colour.

### Hairlines

- **Hairline** (`{colors.hairline}` — #f0f0f3): Default 1px divider.
- **Hairline Soft** (`{colors.hairline-soft}` — #f5f5f7): Lighter divider.
- **Hairline Strong** (`{colors.hairline-strong}` — #dcdee0): Stronger panel outline.

### Text

- **Ink** (`{colors.ink}` — #171717): Display, body emphasis.
- **Body** (`{colors.body}` — #60646c): Default running text — slightly cool grey.
- **Muted** (`{colors.muted}` — #999999): Sub-titles.
- **Muted Soft** (`{colors.muted-soft}` — #cccccc): Disabled text.
- **On Primary** (`{colors.on-primary}` — #ffffff): White text on the black action fill.
- **On Dark** (`{colors.on-dark}` — #ffffff): White text on dark surfaces.
- **On Dark Soft** (`{colors.on-dark-soft}` — #b0b4ba): Muted off-white on dark.

### Semantic

Deployment state is the one place hue is spent in app chrome.

- **Success** (`{colors.semantic-success}` — #16a34a): Completed.
- **Warning** (`{colors.accent-warning}` — #ab6400): Building / queued.
- **Error** (`{colors.semantic-error}` — #eb8e90): Failed. A fill tint — see brand.md, it is re-lit for dark.
- **Preview** (`{colors.accent-preview}` — #8145b5): Preview / branch tags.

## Typography

**Inter** is the single sans family across every text role. **JetBrains Mono**
carries every code surface. Fallback: `-apple-system, system-ui, sans-serif`.
Both are freely available and used directly.

| Token                            | Size | Weight | Line Height | Letter Spacing | Use                          |
| -------------------------------- | ---- | ------ | ----------- | -------------- | ---------------------------- |
| `{typography.display-mega}`      | 64px | 600    | 1.05        | -1.92px        | Landing hero h1              |
| `{typography.display-xl}`        | 48px | 600    | 1.1         | -1.44px        | Subsidiary heroes            |
| `{typography.display-lg}`        | 36px | 600    | 1.15        | -1.08px        | Section heads                |
| `{typography.display-md}`        | 28px | 600    | 1.2         | -0.84px        | Sub-section heads            |
| `{typography.display-sm}`        | 22px | 600    | 1.25        | -0.5px         | Card group titles            |
| `{typography.title-md}`          | 18px | 600    | 1.4         | 0              | Component titles             |
| `{typography.title-sm}`          | 16px | 600    | 1.4         | 0              | List labels                  |
| `{typography.body-md}`           | 16px | 400    | 1.5         | 0              | Default body                 |
| `{typography.body-sm}`           | 14px | 400    | 1.5         | 0              | Secondary body               |
| `{typography.caption}`           | 13px | 400    | 1.4         | 0              | Captions                     |
| `{typography.caption-uppercase}` | 11px | 600    | 1.4         | 0.88px         | Section labels, badges       |
| `{typography.code}`              | 13px | 400    | 1.5         | 0              | Code blocks — JetBrains Mono |
| `{typography.button}`            | 14px | 500    | 1.0         | 0              | Button labels                |
| `{typography.nav-link}`          | 14px | 500    | 1.4         | 0              | Nav menu                     |

**Principles**

- **Display weight stays at 600** — confident but not bombastic. Inter at 600 reads cleaner than 700.
- **Negative letter-spacing on display** — -0.5px to -1.92px tracking.
- **JetBrains Mono on every code surface** and every machine-generated value.

## Layout

- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.base}` 16px · `{spacing.md}` 20px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** 96px. **Max content width:** ~1200px.
- Dense card rows sit close (16–24px gap); marketing bands get the full section rhythm.

## Elevation & Depth

| Level           | Treatment                         | Use                             |
| --------------- | --------------------------------- | ------------------------------- |
| Flat (canvas)   | `{colors.canvas}`                 | Body bands, footer              |
| Card            | `{colors.surface-card}`           | Content cards                   |
| Hairline border | 1px `{colors.hairline}`           | Card outlines                   |
| Soft drop       | `0 4px 12px rgba(0, 0, 0, 0.04)`  | Hovered cards — one shadow tier |
| Dark inversion  | `{colors.surface-dark}` (#171717) | Dark cards, code blocks         |

## Shapes

| Token            | Value  | Use                      |
| ---------------- | ------ | ------------------------ |
| `{rounded.none}` | 0px    | Reserved                 |
| `{rounded.xs}`   | 4px    | Inline tags              |
| `{rounded.sm}`   | 6px    | Compact rows             |
| `{rounded.md}`   | 8px    | Buttons, form inputs     |
| `{rounded.lg}`   | 12px   | Cards, code blocks       |
| `{rounded.xl}`   | 16px   | Large surfaces           |
| `{rounded.xxl}`  | 24px   | Atmospheric cards (rare) |
| `{rounded.pill}` | 9999px | Badges only              |
| `{rounded.full}` | 9999px | Avatar plates            |

Compact, developer-ergonomic radii — 8px buttons, 12px cards. Pill geometry is
for badges, never buttons.

## Do's and Don'ts

**Do**

- Reserve `{colors.primary}` (black) for primary actions.
- Use `{colors.text-link}` (blue) for inline links only.
- Set buttons at `{rounded.md}` (8px).
- Inter 600 for display, 400 for body; JetBrains Mono on code and machine values.
- Spend hue on deployment state, not on chrome.

**Don't**

- Don't introduce a saturated brand action colour. Black is the only action fill.
- Don't put blue on a button.
- Don't drop display below weight 600 or above 700.
- Don't use full pills on buttons — pills are for badges.
- Don't take the gradient wash outside marketing surfaces.
