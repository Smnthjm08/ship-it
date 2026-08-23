# ShipIt — Roadmap

Unchecked means still live; finished work is deleted, not ticked. Design tokens
in [DESIGN.md](DESIGN.md) / [brand.md](brand.md), architecture in
[CLAUDE.md](CLAUDE.md).

**Goal: portfolio-ready.** Security blockers and the operational basics
(structured logging, rate limiting, headers, body cap, startup env validation)
are done, and the schema is migrated. What's left is coverage and proof — there
are still no tests and no CI, and the newest features have never been run.

## Next up

- [ ] Screenshots in the README — project list, build logs, import, environment
- [ ] Walk the app signed in; nothing recent has been clicked
- [ ] One integration test: mock repo + Docker → does a build produce S3 artifacts
- [ ] GitHub Actions CI: install → lint → type-check → build

## Before launch

- [ ] Health endpoint on shipyard (backend and proxy have one)
- [ ] Sentry or equivalent error tracking
- [ ] Docker Compose for local dev — _parked; blocks anyone else running the project_
- [ ] `/dashboard` redirects to `/projects` until there's something worth showing

## Features

- [ ] More frameworks — Vite, CRA and Next static export work today
- [ ] Custom domains (DNS CNAME → proxy)
- [ ] GitHub webhooks for push-to-deploy
- [ ] Notifications (email / Slack / Discord)
- [ ] AI deployment suggestions

## Repo hygiene

- [ ] `pnpm audit` in CI, plus `gitleaks`/`trufflehog`
- [ ] README needs the pipeline diagram above the fold and the env-var table
- [ ] API response envelope + OpenAPI spec

## Later

**Scale** — horizontal shipyard workers (blocked: `recoverStaleBuilds()` would
steal a peer's in-flight job; needs per-worker lists) · managed Redis · per-user
concurrency limits and quotas · S3 lifecycle rules · Postgres read replica.

**Enterprise** — OpenTelemetry/Prometheus · audit log · teams · build cache ·
multi-region · SOC 2.

## Open source — deferred

Picked up after the portfolio pass: `CONTRIBUTING.md`, issue and PR templates,
Dependabot, and a hosted demo (needs a VPS — the worker wants a Docker daemon).

## Unverified

Type-checks and builds, never proven at runtime:

- Branch previews end to end — slug round-tripping is unit-tested, but no preview URL has been resolved by a running proxy
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
