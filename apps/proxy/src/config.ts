// `PROXY_PORT` before `PORT`: `PORT` is a Turborepo global already claimed by
// the backend, so sharing it makes both servers bind the same port.
export const PORT = Number(process.env.PROXY_PORT || process.env.PORT) || 8001;

// Wildcard domain deployments are served under (`shipit.dev` → `<id>.shipit.dev`).
// Unset for local dev, where any `<id>.localhost` works. When set, hosts that
// aren't a direct child are rejected rather than parsed — otherwise the apex and
// any unrelated host pointed here would resolve to someone's site.
export const BASE_DOMAIN = (process.env.DEPLOY_BASE_DOMAIN || "")
  .trim()
  .toLowerCase()
  .replace(/^\./, "");

/** How long a resolved subdomain → deployment mapping is trusted. */
export const ROUTE_CACHE_TTL_MS =
  Number(process.env.PROXY_ROUTE_CACHE_TTL_MS) || 30_000;

/** Shorter, so a site appears promptly once its first build finishes. */
export const ROUTE_CACHE_MISS_TTL_MS =
  Number(process.env.PROXY_ROUTE_CACHE_MISS_TTL_MS) || 5_000;

/** Bounded so a flood of bogus hosts can't grow the map forever. */
export const ROUTE_CACHE_MAX_ENTRIES = 5_000;

/** Namespaced so it can't collide with a user's file. */
export const HEALTH_PATH = "/__shipit/health";
