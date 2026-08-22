# ShipIt — Roadmap

Unchecked means still live; finished work is deleted, not ticked. Design tokens
in [DESIGN.md](DESIGN.md) / [brand.md](brand.md), architecture in
[CLAUDE.md](CLAUDE.md).

**Goal: portfolio-ready.** Security blockers and the operational basics
(structured logging, rate limiting, headers, body cap, startup env validation)
are done. What's left is coverage and proof — no tests, no CI, and nothing built
recently has been opened in a browser.

## Next up

- [ ] Screenshots in the README — project list, build logs, import, environment
- [ ] Walk the app signed in; nothing recent has been clicked
- [ ] One integration test: mock repo + Docker → does a build produce S3 artifacts
- [ ] GitHub Actions CI: install → lint → type-check → build

## Before launch

- [ ] S3 upload parallelism — `build-in-container.ts:451` uploads sequentially
- [ ] Dead-letter queue — `recoverStaleBuilds()` handles restart, not repeated failure
- [ ] Health endpoint on shipyard (backend and proxy have one)
- [ ] Sentry or equivalent error tracking
- [ ] Docker Compose for local dev — _parked; blocks anyone else running the project_
- [ ] `/dashboard` redirects to `/projects` until there's something worth showing

## Features

- [ ] More frameworks — Vite, CRA and Next static export work today
- [ ] Custom domains (DNS CNAME → proxy)
- [ ] GitHub webhooks for push-to-deploy
- [ ] Branch-based deploys — `branch` is stored, but every deploy hits one subdomain
- [ ] Notifications (email / Slack / Discord)
- [ ] AI deployment suggestions

## Repo hygiene

- [ ] Pin the build image to a digest, not the `node:20-alpine` tag
- [ ] `pnpm audit` in CI, plus `gitleaks`/`trufflehog`
- [ ] README needs the pipeline diagram above the fold and the env-var table
- [ ] API response envelope + OpenAPI spec
- [ ] Finish splitting `build-in-container.ts` — container creation, log streaming and the upload loop still share one file

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

- Rollback end to end — the pin, the proxy fallback and the auto-clear on a newer build are all unexercised against a real deployment
- Authenticated screens — palette, switcher and mobile bar unclicked; the palette already shipped one crash this way
- `CapDrop: ["ALL"]` — never run against a live Docker daemon; first suspect if a build fails on permissions
- The 503 queue-outage branches — reasoned, not exercised (`isQueueReady()` itself is confirmed via `/api/v1/health`)
- Live polling during a build — needs Redis, Docker and the worker at once
- Mobile at 375px — action bar and env-row wrapping both depend on it
- Two schema changes not applied — run `pnpm db:migrate`. `CANCELLED` and `Project.activeDeploymentId` exist in the Prisma client but not in Postgres, so cancel and rollback will fail at runtime until then
- Env masking in Firefox — `-webkit-text-security` unsupported, so values show until toggled
