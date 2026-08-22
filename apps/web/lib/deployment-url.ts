// Public URL the proxy serves a deployment on. NEXT_PUBLIC_DEPLOY_HOST is the
// wildcard host with port (`localhost:8001` dev, `shipit.dev` prod) and must
// match the proxy's DEPLOY_BASE_DOMAIN.
const DEPLOY_HOST = process.env.NEXT_PUBLIC_DEPLOY_HOST || "localhost:8001";

export function deploymentUrl(deploymentId: string): string {
  const protocol = /^localhost(:|$)/.test(DEPLOY_HOST) ? "http" : "https";
  return `${protocol}://${deploymentId}.${DEPLOY_HOST}`;
}
