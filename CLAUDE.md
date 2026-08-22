# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ShipIt is a self-hosted Vercel-like deployment platform. Users connect GitHub repos, trigger deployments, and get a live URL served from S3. It is a pnpm monorepo managed with Turborepo.

## Commands

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Run a single app
pnpm --filter backend dev
pnpm --filter web dev
pnpm --filter shipyard dev
pnpm --filter proxy dev

# Lint all packages
pnpm lint

# Type-check all packages
pnpm check-types

# Build all
pnpm build

# Database
pnpm db:migrate        # run migrations (prisma migrate dev)
pnpm db:push           # push schema without migration
pnpm db:studio         # open Prisma Studio
pnpm --filter @repo/db run db:generate   # regenerate Prisma client
```

There are no tests in this project yet.

## Architecture

### Deployment flow

1. User authenticates via GitHub OAuth (better-auth stores GitHub access token in `account.accessToken`)
2. User creates a project by searching repos via Octokit and saving to `Project` table
3. Triggering a deploy creates a `Deployment` row (status: `QUEUED`) and pushes its ID onto a Redis queue
4. **Shipyard** worker dequeues the ID → clones the repo using the stored GitHub token → builds inside a Docker container (`node:20-alpine`) → uploads all output files to S3
5. **Proxy** server maps incoming subdomains to a deployment, fetches files from S3, and serves them — with `index.html` fallback for SPAs

### Apps

| App         | Port | Purpose                                |
| ----------- | ---- | -------------------------------------- |
| `web`       | 3000 | Next.js frontend                       |
| `backend`   | 3002 | Express REST API + better-auth         |
| `shipyard`  | —    | Background Docker/S3 build worker      |
| `ws-server` | 3003 | Streams live build logs over WebSocket |
| `proxy`     | 8001 | Subdomain → S3 asset server            |

### Packages

- **`@repo/db`** — Prisma client (PostgreSQL via `@prisma/adapter-pg`). Exports a singleton `prisma` instance from `src/index.ts`. Generated client lands in `packages/db/generated/prisma`.
- **`@repo/auth`** — better-auth config. Exports `./server` (auth instance) and `./client` (client-side auth). GitHub scope includes `repo` so the access token can clone private repos.
- **`@repo/shared`** — Redis client factory and typed queue/pub-sub helpers. Always use `connectRedis`/`disconnectRedis` wrappers rather than the raw client. Enqueue and consume build jobs through `enqueueBuild` / `reserveBuild` / `ackBuild` / `recoverStaleBuilds` (`redis/queue.ts`) — never `lPush`/`brPop` the queue key directly, or the crash-recovery guarantee is lost. Build output flows through `publishDeploymentLog` / `subscribeDeploymentLogs` (`redis/logs.ts`). Two subpath-only exports stay out of the barrel so the browser bundle never pulls them in: `@repo/shared/crypto/secrets` (AES-256-GCM for env-var values) and `@repo/shared/env/vars` (pure `.env` parse/serialise/validate helpers).

### Key data models

- `User` → `Project` (one-to-many)
- `Project` → `Deployment` (one-to-many); projects and deployments use soft-delete (`isDeleted`)
- `Deployment` → `DeploymentLog` (one-to-many)
- `Project` → `EnvVar` (one-to-many, unique on `[projectId, key]`, hard-deleted and cascading)
- `Account.accessToken` holds the GitHub OAuth token used by Shipyard to clone repos

### Frontend routes

The sidebar is context-aware: account-wide at the top level, project-scoped once
you open a project.

| Account level                 | Project level                |
| ----------------------------- | ---------------------------- |
| `/projects`                   | `/projects/[id]` — overview  |
| `/deployments` (all projects) | `/projects/[id]/deployments` |
| `/settings/account`           | `/projects/[id]/environment` |
|                               | `/projects/[id]/settings`    |

`/` is landing only; signed-in users go to `/projects`. `/dashboard` redirects to
`/projects`. There is no back link inside a project — the header breadcrumb's
`Projects` crumb is the escape hatch and the sidebar's project switcher moves
sideways.

### Next.js projects

There is no Node runtime, so the only deployable Next build is a static export. `apps/shipyard/src/frameworks/nextjs.ts` runs before the build container starts and makes that happen without the user editing their repo:

- **Detection is from `package.json`**, not `Project.framework` — the stored enum is a dropdown guess made before the repo was cloned. The framework field only survives as a tiebreaker for the output-dir search.
- **Blockers fail the build in seconds, not minutes.** `middleware.*`, `app/**/route.*`, `pages/api/**`, `getServerSideProps`, `export const dynamic = "force-dynamic"` and any `export const revalidate` that isn't `false`. `dynamic`/`revalidate` are only read from route-segment files (`page`/`layout`/`template`/`default`) — the same names in a helper module are ordinary exports and must not be flagged.
- **The config is rewritten in the clone.** No config → a generated `next.config.mjs`. An existing one → renamed to `next.config.shipit-original.*` and replaced by a wrapper that imports it, resolves the function form if it is one, and forces `output: "export"` plus `images.unoptimized`. `rewrites`/`redirects`/`headers` are dropped because `next build` refuses to run with them under `output: "export"`.
- **The wrapper's extension must match the original's.** `.js`/`.cjs`/`.mjs` configs are `import()`ed by Next, so one `.mjs` wrapper reaches all three. A `.ts` config goes through a different pipeline — Next transpiles it with SWC and `require`s it from a string, registering a `require.extensions` hook for `.ts` whenever the output contains `require(` — so the wrapper must be `.ts` as well, and imports the original **with the explicit `.ts` extension** (the hook resolves it, and Node's native type stripping rejects extensionless relative imports). An `.mjs` wrapper cannot import a `.ts` original at all. The `.ts` wrapper carries `// @ts-nocheck` because `next build` type-checks the project and the generated tsconfig's `**/*.ts` includes it.
- Nothing is written back to the user's repository; every change lands in the throwaway clone and is announced in the build log.

### Environment variables for deployed projects

Build-time env vars live in `EnvVar` and are **encrypted at rest** with AES-256-GCM (`encryptSecret`/`decryptSecret` in `@repo/shared/crypto/secrets`). The key comes from `ENV_SECRET_KEY`, falling back to one derived from `BETTER_AUTH_SECRET` — rotating either makes existing values undecryptable, which fails the build with an explicit message rather than deploying without them.

Rules that matter when touching this:

- Values are **write-only over the API**. `GET /projects/:id/env` returns keys and timestamps only; `PUT` takes the complete desired set, where an entry without a `value` keeps the stored secret and an omitted key deletes it. Don't add an endpoint that returns plaintext.
- Shipyard writes `<rootDir>/.env` in the clone before the container starts (`apps/shipyard/src/env/project-env.ts`) **and** passes the pairs as container `Env`. Both are needed: Vite/CRA inline `.env` files, plain scripts read `process.env`.
- Variables committed in the repo's own `.env` are preserved; project values override them on a key collision.
- The injected `.env` is added to `.git/info/exclude`, and `getAllFiles()` skips `.env*` and `.git` so a project whose output dir is the repo root can't publish its secrets to S3.
- `LogSink.setSecrets()` masks every injected value in build logs before they're persisted or streamed. Don't `console.log` raw container output around it.
- Never set `CI` on the build container — `react-scripts build` turns warnings into errors when it's present.

### Package managers in the build container

`node:20-alpine` ships npm and corepack only. `toolchainPrelude()` in `build-in-container.ts` prepends whatever the resolved commands need: `corepack enable` for pnpm/yarn, and `npm install -g bun` for bun, which corepack does not manage. It keys off the **commands**, not the detected lockfile, because a user can type `bun install` in a repo with no `bun.lockb` — that mismatch is what produces `sh: bun: not found` after the container has already started. `detectPackageManager()` recognises `bun.lockb`/`bun.lock` so bun repos get bun defaults.

Known bad combination: `typescript@7` (the native port) publishes only `lib/version.cjs` from its `exports` map and no compiler API, so Next's `next.config.ts` loader fails with `Cannot find module 'typescript'`. bun installs optional peers by default and will resolve `typescript` to 7 when the project doesn't pin it. Projects that pin `typescript@^5` are unaffected.

These are build-time values baked into static bundles, so they're public by definition; the encryption protects the database and logs, not the shipped site.

### Auth middleware

`apps/backend/src/middlewares/auth.middleware.ts` verifies the better-auth session cookie and attaches `SessionUser` to `req.user`. All `/api/v1/*` routes except health require this middleware.

### Proxy routing

`apps/proxy/src` is split into `config.ts` (env), `resolve.ts` (host → deployment) and `serve.ts` (S3 → response).

The proxy reads the subdomain from the incoming `Host` header (`X-Forwarded-Host` is trusted, so it works behind a load balancer). With `DEPLOY_BASE_DOMAIN` set, only direct children of that domain resolve; unset, any `<label>.localhost` works for local dev. A subdomain is looked up first as a deployment ID, then as a project ID whose latest `COMPLETED` deployment wins. Project **names** are not routable — only IDs. Lookups are memoised for `PROXY_ROUTE_CACHE_TTL_MS` (30s), so a fresh deployment can take that long to become visible.

Serving rules worth knowing before changing `serve.ts`:

- Only `GET`/`HEAD`; everything else is 405. `HEAD` uses `HeadObject`, not a discarded body.
- The request path is percent-decoded and normalised before it becomes an S3 key — uploads store literal filenames, so skipping the decode makes any file with a space unreachable.
- Clean URLs resolve in order: exact key, `<path>.html`, `<path>/index.html`. Without this a static export serves its homepage on every route.
- The `index.html` SPA fallback applies **only** to navigations (no file extension + `Accept: text/html`). A missing `.js`/`.css` must 404 — answering it with HTML is what produces `Unexpected token '<'` and a blank page.
- A missing key is a 404, but any other S3 failure (403, 5xx, network) propagates to a 502. Never collapse those into "not found" — a misconfigured bucket would then look like a working site.
- Hashed assets get `immutable` caching, HTML gets `must-revalidate`; conditional requests are forwarded to S3 so unchanged assets cost a 304.
- `deploymentUrl()` in `apps/web/lib/deployment-url.ts` is the only place the public URL is built. Keep `NEXT_PUBLIC_DEPLOY_HOST` in sync with `DEPLOY_BASE_DOMAIN`.

## Environment Variables

Defined in `.env.example` at the root.

**A new variable must be added to `turbo.json` `globalEnv` as well as `.env.example`.** Turborepo 2.x defaults to strict env mode: a variable not listed there is stripped from the task environment, so code reading it under `pnpm dev` sees `undefined` while the same code run directly sees the real value. That split is silent whenever the reader has a fallback — which is exactly how `ENV_SECRET_KEY` went missing and quietly demoted every project's secrets to the `BETTER_AUTH_SECRET`-derived key.

| Variable                                                                                       | Used by                                 |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`                                                                                 | `@repo/db`                              |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`                                                       | `@repo/auth`, `backend`, `web`          |
| `NEXT_PUBLIC_BETTER_AUTH_URL`                                                                  | `@repo/auth` client (browser bundle)    |
| `ENV_SECRET_KEY`                                                                               | `backend`, `shipyard` (optional)        |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`                                                    | `@repo/auth`                            |
| `NEXT_PUBLIC_API_BASE_URL`                                                                     | `web`                                   |
| `NEXT_PUBLIC_WS_URL` / `WS_PORT`                                                               | `web`, `ws-server` (default `3003`)     |
| `REDIS_URL`                                                                                    | `@repo/shared`, `backend`, `shipyard`   |
| `AWS_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT` / `AWS_BUCKET_NAME` / `AWS_REGION` | `shipyard`, `proxy`                     |
| `BUILD_TIMEOUT_MS`                                                                             | `shipyard` (default 10 min)             |
| `PORT`                                                                                         | `backend` (default `3002`)              |
| `PROXY_PORT` / `DEPLOY_BASE_DOMAIN` / `PROXY_ROUTE_CACHE_*_TTL_MS`                             | `proxy`                                 |
| `NEXT_PUBLIC_DEPLOY_HOST`                                                                      | `web` (must match `DEPLOY_BASE_DOMAIN`) |

## Conventions

- All apps are `"type": "module"` — use ESM imports, not CommonJS `require`.
- Module resolution is `NodeNext` across all packages. Import paths inside packages must use explicit `.js` extensions even for `.ts` source files.
- `@repo/db` is imported via its `exports` map entry (`"."`) which resolves to `./src/index.ts` at dev time — no build step needed for the shared packages.
- Prisma client is generated to `packages/db/generated/prisma` (not the default location). Import it from `@repo/db`.
- Soft-delete pattern: set `isDeleted: true` rather than removing rows for `Project`, `Deployment`, and `DeploymentLog`.
- The `Account.accessToken` comment in schema marks it as important for Octokit — do not remove this field or its mapping.

## Pitfalls

- **Prisma generate must run before builds.** The `postinstall` script and the `generate` turbo task handle this, but if types are missing after checkout run `pnpm --filter @repo/db run db:generate`.
- **Redis must be running** before starting `backend` or `shipyard` — both call `connectRedis()` at startup.
- **Docker must be running** on the Shipyard host — it calls the Docker daemon via `dockerode` to spin up build containers.
- **S3-compatible storage required** — `AWS_ENDPOINT` supports any S3-compatible service (Cloudflare R2, MinIO, etc.); the bucket must be pre-created.
- **Static hosting only.** The proxy pipes files out of S3 — there is no Node runtime. Next.js deploys as a static export only; see below. A build that produces only `.next` fails on purpose in `build-in-container.ts`.
- **The build queue is single-worker.** `recoverStaleBuilds()` requeues everything on the processing list at startup, so a second concurrent worker would steal in-flight jobs.
