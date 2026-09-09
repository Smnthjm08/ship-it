# 🚀 ShipIt

ShipIt is a self-hosted deployment platform inspired by Vercel. Connect your
GitHub repo, trigger a build, and get a live URL — powered by Docker workers, a
Redis queue, and S3 hosting behind a subdomain router.

It exists to work through the system design behind modern deployment platforms:
async job queues, worker-based builds, containerized execution, static asset
hosting, and subdomain routing.

---

## ✨ What ShipIt Does

- 🔐 Sign in with GitHub (private + public repos)
- 📦 Import any repo you can access, or paste a GitHub URL
- 🧵 Async build pipeline backed by a Redis queue, with crash recovery
- 🐳 Every build runs in a locked-down container — see [Build sandbox](#-build-sandbox)
- 🔑 Build-time environment variables, encrypted at rest and masked in logs
- 📡 Live build logs streamed over WebSocket while the build runs
- ☁️ Build output uploaded to any S3-compatible bucket, served back on a
  per-deployment subdomain — `pending` and `failed` report as themselves rather
  than as a 404
- 📊 Deployment status tracked end to end: `QUEUED → CLONING → BUILDING → COMPLETED | FAILED`

> **Static hosting only.** The proxy streams files out of S3 — there is no Node
> runtime, so a server can't be deployed here. Next.js projects are built as a
> static export automatically; see [Framework support](#-framework-support).

---

## 🏗️ Architecture

<img src="./docs/architecture.svg" alt="ShipIt Architecture" width="80%" />

> Flow: GitHub OAuth → repo selection → Redis queue → Docker build worker → S3 → proxy → live URL

| App         | Port | Purpose                                                   |
| ----------- | ---- | --------------------------------------------------------- |
| `web`       | 3000 | Next.js frontend, and it serves `/api/auth`               |
| `backend`   | 3002 | Express REST API + better-auth session verification       |
| `shipyard`  | 3004 | Background worker: clone → build in Docker → upload to S3 |
| `ws-server` | 3003 | Streams live build logs to the browser                    |
| `proxy`     | 8001 | Maps an incoming subdomain to a deployment and serves it  |

Shared packages: `@repo/db` (Prisma), `@repo/auth` (better-auth), `@repo/shared`
(Redis queue/pub-sub, S3, secret encryption).

---

## 🔒 Build sandbox

A build runs `npm run build` — arbitrary code from someone else's repo. The
container is the trust boundary, not the command string.

- **No capabilities** — `CapDrop: ALL` plus `no-new-privileges`.
- **Resource caps** — 2 GiB memory (swap pinned to match), 2 CPUs, 512 PIDs, and
  a 10-minute hard timeout, so a hung build can't wedge the worker.
- **Pinned base image** — a multi-arch _index digest_, not the `node:20-alpine`
  tag, so a moved or compromised upstream tag can't land in the container. Bump
  it with `docker buildx imagetools inspect node:20-alpine`.
- **Rate limits per user** — 10 projects and 12 deployments a minute, keyed by
  account rather than IP; each deployment holds the single worker for minutes.
- **Bounded route cache** — subdomain lookups cached 30s, misses 5s, capped at
  5,000 entries.

---

## 🚦 Getting started

### Prerequisites

- **Node 20+** and **pnpm**
- **PostgreSQL** — the app database
- **Redis** — `backend` and `shipyard` both refuse to start without it
- **Docker**, running — Shipyard talks to the daemon to spin up build containers
- **An S3-compatible bucket**, already created (AWS S3, Cloudflare R2, MinIO…)

### Setup

```bash
pnpm install                 # postinstall generates the Prisma client
cp .env.example .env         # then fill it in — see the comments in that file
pnpm db:migrate              # create the schema
pnpm dev                     # run every app
```

Open <http://localhost:3000> and sign in with GitHub. You'll also need an OAuth
App configured — see the next section, it's the most common thing to get wrong.

### Commands

```bash
pnpm --filter web dev                    # run one app (web/backend/shipyard/proxy)
pnpm lint                                # lint every package
pnpm check-types                         # tsc --noEmit across the monorepo
pnpm build                               # build everything
pnpm db:studio                           # browse the database
pnpm --filter @repo/db run db:generate   # regenerate the Prisma client
```

There are no tests yet.

---

## 🔑 GitHub OAuth setup

ShipIt needs an **OAuth App** — not a GitHub App. Create one at
**Settings → Developer settings → OAuth Apps → New OAuth App**:

| Field                      | Value                                            |
| -------------------------- | ------------------------------------------------ |
| Homepage URL               | `http://localhost:3000`                          |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

The callback must match `${BETTER_AUTH_URL}/api/auth/callback/github`
**character for character** — any difference (port, trailing slash, `127.0.0.1`
vs `localhost`) gets rejected with _"The redirect_uri is not associated with this
application."_ `BETTER_AUTH_URL` points at the **web** app, which serves
`/api/auth` — not the backend.

Copy the client ID and secret into `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
An OAuth App client ID is 20 hex characters; one starting with `Iv23li` or `Iv1.`
is a **GitHub App**, which won't work — GitHub Apps ignore the `repo` scope and
issue short-lived tokens scoped to installed repositories, so Shipyard can't
clone private repos with them.

---

## 🧩 Framework support

| Framework    | Output    | Notes                                                 |
| ------------ | --------- | ----------------------------------------------------- |
| Static HTML  | repo root | No build step — files are published as-is, in seconds |
| Vite         | `dist`    | —                                                     |
| React (CRA)  | `build`   | `CI` is never set, so warnings don't fail the build   |
| Next.js      | `out`     | Forced to `output: "export"` — static only            |
| None / other | detected  | Set the output directory yourself in project settings |

Next.js repos are rewritten **in the throwaway clone**, never in your
repository: the config is wrapped to force a static export, and server-only
features (`middleware`, route handlers, `pages/api`, `getServerSideProps`,
`force-dynamic`) fail the build in seconds rather than after a long install.

A repo with no build script but an `index.html` skips the container entirely —
it's looked for at the repo root, then `public/`, `site/`, `www/`, `docs/`,
`src/`. Install and build commands are inferred from your lockfile (npm, pnpm,
yarn, bun); every field is editable under **Project → Settings → Build & Output**.

---

## 🔐 Environment variables for deployed projects

Set them under **Project → Environment**. They're written into the build as both
a `.env` file and container environment, so Vite, CRA and plain scripts all pick
them up. Changes apply on the **next** deployment.

- Encrypted at rest with AES-256-GCM and **write-only over the API** — the UI
  shows keys, never stored values.
- Masked in build logs before they're persisted or streamed.
- Excluded from the S3 upload, so a project whose output directory is the repo
  root can't publish its own secrets.

They're baked into a static bundle at build time, so treat them as public in the
shipped site — the encryption protects the database and the logs.

---

## 📋 Project docs

| Doc                      | What's in it                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| [ROADMAP.md](ROADMAP.md) | Open work — blockers, pre-launch hardening, features, refactors   |
| [DESIGN.md](DESIGN.md)   | Design tokens: colours, typography, spacing, radius               |
| [brand.md](brand.md)     | How that system is wired into `globals.css`, and where it departs |
| [CLAUDE.md](CLAUDE.md)   | Architecture, conventions and pitfalls                            |
