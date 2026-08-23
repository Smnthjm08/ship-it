import { branchHostLabel } from "@repo/shared/branch/slug";

// NEXT_PUBLIC_DEPLOY_HOST is the wildcard host with port (`localhost:8001` dev,
// `shipit.dev` prod) and must match the proxy's DEPLOY_BASE_DOMAIN.
const DEPLOY_HOST = process.env.NEXT_PUBLIC_DEPLOY_HOST || "localhost:8001";
const PROTOCOL = /^localhost(:|$)/.test(DEPLOY_HOST) ? "http" : "https";

const url = (label: string) => `${PROTOCOL}://${label}.${DEPLOY_HOST}`;

/** One specific build, forever. */
export const deploymentUrl = (deploymentId: string) => url(deploymentId);

/** Whatever is live for the project right now, rollback included. */
export const projectUrl = (projectId: string) => url(projectId);

/** Newest completed build of a branch — stays valid across redeploys. */
export const branchUrl = (branch: string, projectId: string) =>
  url(branchHostLabel(branch, projectId));
