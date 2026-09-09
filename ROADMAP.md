# ShipIt — Roadmap

Unchecked means still live; finished work is deleted, not ticked. Design tokens
in [DESIGN.md](DESIGN.md) / [brand.md](brand.md), architecture in
[CLAUDE.md](CLAUDE.md).

**Goal: portfolio-ready.** Security blockers and the operational basics
(structured logging, rate limiting, headers, body cap, startup env validation)
are done, and the schema is migrated. What's left is coverage and proof — there
is not a single test file in the repo, no CI, and the newest features have never
been run.

## Next up

- [ ] Screenshots in the README — project list, build logs, import, environment
- [ ] Walk the app signed in; nothing recent has been clicked
- [ ] First test runner at all — pick vitest, then cover the pure units that the
      Unverified list keeps assuming are covered (branch-slug round-trip,
      output-dir resolution, `.env` parse/serialise)
- [ ] One integration test: mock repo + Docker → does a build produce S3 artifacts
- [ ] GitHub Actions CI: install → lint → type-check → build

## Before launch

- [ ] Sentry or equivalent error tracking
- [ ] Docker Compose for local dev — _parked; blocks anyone else running the project_

## Features

- [ ] More frameworks — Vite, CRA and Next static export work today
- [ ] Custom domains (DNS CNAME → proxy)
- [ ] GitHub webhooks for push-to-deploy
- [ ] Notifications (email / Slack / Discord)

## Repo hygiene

- [ ] `pnpm audit` in CI, plus `gitleaks`/`trufflehog`
- [ ] README needs an env-var table — it defers to `.env.example` today
- [ ] API response envelope + OpenAPI spec

## Later

Horizontal shipyard workers are the one architectural blocker worth writing
down: `recoverStaleBuilds()` requeues the whole processing list at startup, so a
second worker would steal a peer's in-flight job — it needs per-worker lists
first. Everything else here is ordinary scaling work (managed Redis, per-user
concurrency quotas, S3 lifecycle rules) and can wait for a reason to exist.

Open-source packaging — `CONTRIBUTING.md`, issue and PR templates, Dependabot,
and a hosted demo (needs a VPS; the worker wants a Docker daemon) — is deferred
until after the portfolio pass.

## Unverified

Type-checks and builds, never proven at runtime. Nothing here is covered by a
test either — there are none — so "reasoned" is the strongest claim any of it has:

- Branch previews end to end — no preview URL has been resolved by a running proxy
- Deployment cancellation — the API route and the worker's abort path are wired
  up, but no in-flight build has been cancelled against a live Docker daemon
- Dead-letter path — the attempt counter and abandonment at 3 crashes have never been triggered
- Rollback end to end — the pin, the proxy fallback and the auto-clear on a newer build are all unexercised against a real deployment
- Command palette since its crash fix, plus the project switcher and mobile action bar — the palette threw on first open and has not been confirmed working since
- `CapDrop: ["ALL"]` — never run against a live Docker daemon; first suspect if a build fails on permissions
- The 503 queue-outage branches — reasoned, not exercised (`isQueueReady()` itself is confirmed via `/api/v1/health`)
- Live polling during a build — needs Redis, Docker and the worker at once
- Mobile at 375px — action bar and env-row wrapping both depend on it
- Deployments created before the branchSlug migration have `NULL` slugs, so their branch preview URLs won't resolve — needs a backfill if you want them reachable
- The split build pipeline and the pinned image digest — types and build pass, but no build has run through `run-build.ts` against a live Docker daemon
- Env masking in Firefox — `-webkit-text-security` unsupported, so values show until toggled
