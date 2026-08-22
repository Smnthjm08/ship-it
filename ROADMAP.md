# ShipIt — Roadmap & Open Work

> Merged 2026-08-22 from `PRODUCT_ROAST.md` (engineering audit, 2026-07-23),
> `revamp.md` (frontend audit, 2026-07-31) and `docs/TODO.md`. Every item was
> re-checked against the code on the merge date — anything verified fixed was
> deleted rather than ticked, so an unchecked box here means the work is still
> live. Design tokens and typography live in [DESIGN.md](DESIGN.md) and
> [brand.md](brand.md); architecture and conventions in [CLAUDE.md](CLAUDE.md).

## Where this stands

The pipeline architecture is sound — GitHub → Redis queue → isolated Docker
build → S3 → subdomain proxy maps cleanly onto real infrastructure, the monorepo
boundaries hold, and the soft-delete and auth patterns are applied consistently.
The frontend journey that used to break on a failed build is closed: build config
is editable, status has one vocabulary, the log viewer is real, and the sidebar
follows project context.

What's missing is the hardening layer. The blockers below are closed, but there
are still no tests, no CI, no structured logging and no rate limiting. That gap —
between the architecture's ambition and the operational maturity around it — is
the remaining finding.

**Current goal: portfolio-ready, not contributor-ready.** Work is ordered for
someone evaluating this repo as a work sample. Open-source scaffolding —
`CONTRIBUTING.md`, issue and PR templates, dependency bots — is deliberately
deferred to its own section at the bottom, to pick up later.

---

## Blockers

Closed 2026-08-22 — kept here with what was actually done, since two of the four
were mis-stated when this list was written.

- [x] **GitHub token in the git URL.** Replaced with a `credential.helper` shell function that reads the token from `SHIPIT_GIT_TOKEN` in the environment (`apps/shipyard/src/git/clone-repo.ts`). Passed via `-c`, so it is never an argument, never in the URL, and never written to `<clone>/.git/config` — the after-the-fact `remote set-url` scrub is gone with it.
- [x] **Redis failure is silent.** `enqueueBuild` now fails fast with a typed `QueueUnavailableError` instead of buffering against a dead socket; `GET /api/v1/health` reports `checks.redis` and answers 503 when it's down; project creation pre-checks the queue and refuses with 503 before writing anything; and a redeploy that can't be queued marks its row `FAILED` rather than leaving a phantom `QUEUED` no worker will ever pick up.
- [x] **Command injection — re-assessed, not a host RCE.** The string reaches `/bin/sh -c` _inside the throwaway build container_, and `npm run build` already runs whatever the repo's `package.json` says: the container is the trust boundary, not the command string, so there is no privilege here the project owner doesn't already have. The "pre-auth" framing was also wrong — it needs an authenticated user who owns the project. What was genuinely missing was container hardening, now added: `CapDrop: ["ALL"]` and `SecurityOpt: ["no-new-privileges"]`. Single-line and length limits on the commands were already enforced by `command()` in `@repo/shared/validation/project`.
- [x] **Validation covers one endpoint — this was wrong.** Written from a grep that only searched `apps/backend/src`. Every write path was already validated: `createProjectSchema` on `POST /api/v1/new`, `updateProjectSchema` on the web `PATCH /api/projects/:id` (build config included), and `normalizeEnvVars()` on `PUT /projects/:id/env`. Redeploy takes no body. Every controller also gates on `projectService.getOwnedProject(id, req.user.id)`.

**Not verified:** `CapDrop: ["ALL"]` was type-checked and built but never run against a live Docker daemon — if a build starts failing on a permission error, that line is the first suspect. The authenticated 503 branches were reasoned through rather than exercised; the `isQueueReady()` predicate behind them is confirmed working via the health endpoint.

## Next up — portfolio ready

The short list that changes how this repo reads to someone spending two minutes
on it. Everything else can wait.

- [ ] **Screenshots in the README.** Signed in, dark theme: the project list with
      mixed statuses, a deployment's stage timeline + streaming logs, the import
      flow, and the environment page with values masked. Highest value per minute
      on this page — nobody clones a repo, they look at pictures.
- [ ] **Walk the app signed in.** Nothing built recently — command palette,
      project switcher, mobile action bar, the Expo palette swap, the 503 paths —
      has been opened in a browser. It type-checks and builds; that isn't the same
      thing.
- [ ] **One integration test.** Mock git repo + local Docker → does a build
      complete and produce S3 artifacts? Covers every layer at once, and "no
      tests" is the first thing a reviewing engineer notices.
- [ ] **GitHub Actions CI.** install → lint → type-check → build. Small, and the
      green check is visible from the repo page.

## Before launch

Ordered by what actually bites first.

- [ ] Structured logging (Pino) with `deploymentId` and a request ID in context — a failed production build is currently unsearchable
- [ ] `helmet` security headers
- [ ] Request body size limit — `express.json({ limit: "1mb" })`
- [ ] Rate limiting on project creation and the deployment trigger
- [ ] Validate required env vars at process startup in backend and shipyard
- [ ] S3 upload parallelism — `build-in-container.ts:451` awaits each file in sequence
- [ ] Dead-letter queue — `recoverStaleBuilds()` requeues on restart but nothing handles repeated failure
- [ ] Health endpoint on shipyard (backend and proxy already have one) reporting Redis, DB and Docker daemon status
- [ ] Sentry or equivalent error tracking
- [ ] Docker Compose for local dev (Postgres, Redis, MinIO) — _parked by choice; it's the one item that blocks anyone else from running the project at all_

## Frontend

Closed 2026-08-22:

- [x] **⌘K command palette.** `components/globals/command-palette.tsx` — global ⌘K/Ctrl-K, mounted once in `AppShell` so it works in both shells. Jumps to any project, the top-level routes, the current project's four sections, Redeploy, and the theme. Projects load on first open, not on mount. A `Search… ⌘K` button in both headers makes the shortcut discoverable.
- [x] **Project switcher.** `components/globals/project-switcher.tsx` replaces the static identity chip in the project sidebar — a Popover + Command combobox with live status dots and a check on the current project. Works in collapsed icon mode, so switching never means expanding the sidebar first.
- [x] **Sticky mobile action bar.** `components/globals/mobile-action-bar.tsx` pins Redeploy at the bottom below `md`, where the sidebar is a sheet and the section's main action was otherwise behind a hamburger. Clears the iOS home indicator via `env(safe-area-inset-bottom)`.
- [x] **Type scale is in use.** All ten page titles moved from ad-hoc `text-2xl font-semibold tracking-tight` to `.text-display-sm`, so the scale is no longer dead code. 24px → 22px with the design system's -0.5px tracking.
- [x] **`transition-all` is gone** — and there was more of it than this list claimed: `button.tsx`, `switch.tsx`, `sidebar.tsx` and `navigation-menu.tsx` (×2) as well as the two named. All now name their properties.

Still open:

- [ ] `/dashboard` redirects to `/projects`. Only build it once there's something to show: deploy frequency, success rate, build-time trend, storage used. Until then the redirect is the honest answer.

**Not verified:** none of this was opened in a browser — it type-checks and builds, but the palette, switcher and mobile bar have not been clicked. The mobile bar in particular is untested at 375px, which was already on the _Not yet verified_ list below.

## Features

- [ ] Support for more frameworks — Vite, CRA and Next static export work today
- [ ] Custom domain support (DNS CNAME → proxy)
- [ ] GitHub webhooks for push-to-deploy
- [ ] Branch-based deployments — `branch` is stored, but every deploy targets the same subdomain
- [ ] Deployment cancellation
- [ ] Deployment rollback — point a project at a previous completed deployment's S3 prefix
- [ ] Notifications via email, Slack or Discord
- [ ] AI-powered deployment suggestions

## Later

**Scale**

- [ ] Horizontal shipyard workers — several instances on one Redis queue. Blocked on `recoverStaleBuilds()`, which reclaims the whole processing list at startup and would steal a peer's in-flight job
- [ ] Managed or clustered Redis (ElastiCache, Upstash)
- [ ] Per-user deployment concurrency limits and storage quotas
- [ ] S3 lifecycle rules to expire artifacts from deleted deployments, plus cleanup on project/deployment delete
- [ ] PostgreSQL read replica for list and search queries

**Enterprise**

- [ ] OpenTelemetry or a Prometheus metrics endpoint across services
- [ ] Audit log — who deployed what, when, from which IP
- [ ] Team/organization model, multiple users per project
- [ ] Build cache — skip a rebuild when the commit SHA is unchanged
- [ ] Multi-region deploys
- [ ] SOC 2 readiness

## Repo hygiene

Worth doing while this is still a personal project.

- [ ] `.husky/pre-commit` runs only `pnpm format` — add `pnpm lint && pnpm check-types`
- [ ] Pin the build image to a digest instead of the `node:20-alpine` tag
- [ ] `pnpm audit` in CI, plus `gitleaks` or `trufflehog` against accidental secret commits
- [ ] README needs the pipeline diagram above the fold and the env-var table (`CLAUDE.md` has the table; the README links neither it nor `docs/`)
- [ ] API response envelope standardization; OpenAPI spec

**Refactors**

- [ ] Finish splitting `build-in-container.ts` — cloning, env injection, framework prep and the S3 client are extracted to `git/`, `env/`, `frameworks/` and `aws.ts`, but container creation, log streaming and the upload loop still share one file. Extract `createBuildContainer()`, `streamContainerLogs()`, `uploadBuildArtifacts()` — and rename the file `run-build.ts` once it only builds
- [ ] Split `new-project.controller.ts` into `search-repos.controller.ts` and `create-project.controller.ts` — two unrelated controllers share the file
- [ ] `apps/web/app/api/projects/**` calls Prisma directly; the backend's `services/` convention should apply here too

## Open source — deferred

Picked up later, once the portfolio pass is done. Until then it's scaffolding
nobody reviewing a personal project reads.

- [ ] `CONTRIBUTING.md` — monorepo layout, which package owns what, branch and PR convention, what to run before pushing
- [ ] `.github/ISSUE_TEMPLATE/` and `pull_request_template.md`
- [ ] Dependabot or Renovate for automated dependency updates
- [ ] A hosted demo — the build worker needs a Docker daemon, so this means a VPS, not a free tier

---

## Reference — information architecture

The sidebar is context-aware: account-wide at the top level, project-scoped once
you enter a project. This matches Vercel, Railway and Render, and the mental model
of "I'm working on one project right now."

```
Account level                     Project level
─────────────                     ─────────────
Projects        /projects         Overview      /projects/[id]
Deployments     /deployments      Deployments   /projects/[id]/deployments
Account         /settings/account Environment   /projects/[id]/environment
                                  Settings      /projects/[id]/settings
```

`/` is landing only; authed users redirect to `/projects`. `/dashboard` redirects
to `/projects`. `/deployments` is the cross-project activity feed.

```
┌──────────────────────────┐     ┌──────────────────────────┐
│  ▣  ShipIt         ⌘K    │     │  ▣  shipit-web           │
├──────────────────────────┤     ├──────────────────────────┤
│  ＋  New Project          │     │  ⟳  Redeploy             │
├──────────────────────────┤     ├──────────────────────────┤
│  ▦  Projects             │     │  ◧  Overview             │
│  ▲  Deployments          │     │  ▲  Deployments      12  │
├──────────────────────────┤     │  ⚙  Environment       3  │
│  RECENT                  │     │  ⚙  Settings             │
│   ● shipit-web           │     ├──────────────────────────┤
│   ◐ portfolio            │     │  LATEST DEPLOYMENT       │
│   ● api-gateway          │     │   ● Ready · 2m ago       │
├──────────────────────────┤     │   ↗ Visit site           │
│  👤 Sam Jain         ⌄   │     └──────────────────────────┘
└──────────────────────────┘
```

- **The primary action slot changes with context** — "New Project" at the account level, "Redeploy" inside a project. The likeliest next action is always in the same physical spot.
- **`RECENT` is a live status board.** ● green Ready · ◐ amber Building (pulsing) · ● red Error. A failing build is visible from anywhere in the app.
- **There is no back link at the project level.** The header breadcrumb's `Projects` crumb is the escape hatch; a second one in the sidebar was redundant. The project switcher, when built, goes in the identity row.
- **Collapsed (icon) mode works** — status dots survive the collapse, text sections hide.
- **Header**: breadcrumb (left) · ⌘K search (center) · theme toggle and account menu (right).

## Reference — standards

**Motion budget.** 100ms for hover and press feedback, 150ms for popovers,
200–250ms for dialogs and sheets. Entrances longer than exits, on the single
`--ease-shipit` curve. Never `linear`, never `transition: all`. Follow
[reveal.tsx](apps/web/components/landing/reveal.tsx) for reduced motion — it
renders the final state with zero movement, which is exactly right.

**Definition of done** for every screen touched:

- [ ] Tab order is logical; Enter/Space activate; Escape closes overlays
- [ ] Visible focus ring on every interactive element
- [ ] No `<div onClick>` — real `<button>` / `<a>`
- [ ] Hit targets ≥ 40×40px on touch
- [ ] Loading state exists, skeleton-shaped to match its content
- [ ] Empty state names a next action
- [ ] Error state offers recovery, not just a message
- [ ] Contrast passes WCAG AA (4.5:1 body, 3:1 large text and icons)
- [ ] `prefers-reduced-motion` disables motion rather than shortening it
- [ ] Dark mode verified — this app has a genuine dark theme, not an inversion
- [ ] Colors and spacing from tokens; no raw palette values
- [ ] Copy is active voice, sentence case, specific
- [ ] Icons are `aria-hidden` or labelled; status is never color-only
- [ ] Checked at 375px, 768px and 1280px

## Not yet verified

The 2026-07-31 frontend work passed types, lint, production build, route
existence, the custom 404, the `/dashboard` redirect and an anti-slop repo scan.
These were never checked and still haven't been:

| Not checked                        | Why                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated screens, visually    | Needs a signed-in browser session. Log in at `localhost:3000` and walk the flow — project list, a project, a failed build, the environment page |
| Live polling under a running build | Needs Redis, Docker and the Shipyard worker going at once                                                                                       |
| Mobile card list at 375px          | Never opened in a device viewport                                                                                                               |
