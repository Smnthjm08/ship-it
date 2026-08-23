import { prisma } from "@repo/db";
import { parseBranchHostLabel } from "@repo/shared/branch/slug";
import {
  BASE_DOMAIN,
  ROUTE_CACHE_MAX_ENTRIES,
  ROUTE_CACHE_MISS_TTL_MS,
  ROUTE_CACHE_TTL_MS,
} from "./config";

// `pending`/`failed` stay distinct from `unknown` so visitors get an honest
// answer instead of a 404 that looks identical to a typo'd URL.
export type Route =
  | { kind: "ready"; deploymentId: string }
  | { kind: "pending"; status: string }
  | { kind: "failed" }
  | { kind: "unknown" };

interface CacheEntry {
  route: Route;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// null for hosts that must not resolve: the apex, `www`, a bare hostname, and
// anything that isn't a direct child of BASE_DOMAIN when it's configured.
export function subdomainFor(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (BASE_DOMAIN) {
    if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
    const label = host.slice(0, -(BASE_DOMAIN.length + 1));
    // Only single-label subdomains are ours; `a.b.shipit.dev` is not a site.
    if (!label || label.includes(".") || label === "www") return null;
    return label;
  }

  // Local development: `<id>.localhost`.
  const [label, ...rest] = host.split(".");
  if (!label || rest.length === 0 || label === "www" || label === "localhost") {
    return null;
  }
  return label;
}

/** Uncached lookup: the subdomain is either a deployment id or a project id. */
async function lookup(subdomain: string): Promise<Route> {
  const deployment = await prisma.deployment.findFirst({
    where: { id: subdomain, isDeleted: false, project: { isDeleted: false } },
    select: { id: true, status: true },
  });

  if (deployment) {
    if (deployment.status === "COMPLETED") {
      return { kind: "ready", deploymentId: deployment.id };
    }
    if (deployment.status === "FAILED") return { kind: "failed" };
    return { kind: "pending", status: deployment.status };
  }

  // `<branchSlug>--<projectId>` is a branch preview: the newest completed build
  // of that branch, independent of whatever production is serving. Checked
  // before the project lookup because a preview label is never a bare id.
  const branchHost = parseBranchHostLabel(subdomain);
  if (branchHost) {
    const preview = await prisma.deployment.findFirst({
      where: {
        projectId: branchHost.projectId,
        branchSlug: branchHost.branchSlug,
        status: "COMPLETED",
        isDeleted: false,
        project: { isDeleted: false },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (preview) return { kind: "ready", deploymentId: preview.id };

    // Distinguish "this branch has never shipped" from a typo'd project.
    const anyBuild = await prisma.deployment.findFirst({
      where: {
        projectId: branchHost.projectId,
        branchSlug: branchHost.branchSlug,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (!anyBuild) return { kind: "unknown" };
    return anyBuild.status === "FAILED"
      ? { kind: "failed" }
      : { kind: "pending", status: anyBuild.status };
  }

  // Otherwise treat it as a project id and serve its current production build.
  //
  // A rollback pins `activeDeploymentId`. The pin is only honoured if it still
  // points at a completed, non-deleted build of this project — otherwise the
  // site would 404 because of a stale pointer, which is a far worse failure
  // than quietly serving the newest good build.
  const pinned = await prisma.project.findFirst({
    where: {
      id: subdomain,
      isDeleted: false,
      activeDeploymentId: { not: null },
    },
    select: { activeDeploymentId: true },
  });

  if (pinned?.activeDeploymentId) {
    const target = await prisma.deployment.findFirst({
      where: {
        id: pinned.activeDeploymentId,
        projectId: subdomain,
        status: "COMPLETED",
        isDeleted: false,
      },
      select: { id: true },
    });
    if (target) return { kind: "ready", deploymentId: target.id };
  }

  const latest = await prisma.deployment.findFirst({
    where: {
      projectId: subdomain,
      status: "COMPLETED",
      isDeleted: false,
      project: { isDeleted: false },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latest) return { kind: "ready", deploymentId: latest.id };

  // The project may exist but have no successful build yet — say so.
  const project = await prisma.project.findFirst({
    where: { id: subdomain, isDeleted: false },
    select: {
      deployments: {
        where: { isDeleted: false },
        select: { status: true },
        take: 1,
      },
    },
  });

  if (!project) return { kind: "unknown" };
  return project.deployments.length
    ? { kind: "failed" }
    : { kind: "pending", status: "QUEUED" };
}

// Memoised: without it every asset request is a Postgres round trip, and one
// page load of a bundled app is dozens.
export async function resolveDeployment(subdomain: string): Promise<Route> {
  const now = Date.now();
  const cached = cache.get(subdomain);
  if (cached && cached.expiresAt > now) return cached.route;

  const route = await lookup(subdomain);

  // Evict the oldest entry once the map is full (Map preserves insertion order).
  if (cache.size >= ROUTE_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  cache.delete(subdomain);
  cache.set(subdomain, {
    route,
    expiresAt:
      now +
      (route.kind === "ready" ? ROUTE_CACHE_TTL_MS : ROUTE_CACHE_MISS_TTL_MS),
  });

  return route;
}
