// Shared by the proxy (parses hosts) and the web app (builds links) so the two
// can't disagree about a branch's URL.

/** DNS labels cap at 63 chars; the project id takes 25 and `--` takes 2. */
const MAX_SLUG_LENGTH = 32;

/** Separates the branch from the project id in a preview host. */
export const BRANCH_SEPARATOR = "--";

// Runs of non-alphanumerics collapse to one hyphen, which is what keeps `--` an
// unambiguous separator — no slug can contain one. Lossy by design (`feat/login`
// and `feat_login` both give `feat-login`), so the result is stored on the
// deployment rather than recomputed at lookup.
export function branchSlug(branch: string): string {
  const slug = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "branch";
}

/** The subdomain label a branch's preview is served on. */
export function branchHostLabel(branch: string, projectId: string): string {
  return `${branchSlug(branch)}${BRANCH_SEPARATOR}${projectId}`;
}

/** null when the label isn't a preview at all — a bare deployment or project id. */
export function parseBranchHostLabel(
  label: string,
): { branchSlug: string; projectId: string } | null {
  const index = label.lastIndexOf(BRANCH_SEPARATOR);
  if (index <= 0) return null;

  const slug = label.slice(0, index);
  const projectId = label.slice(index + BRANCH_SEPARATOR.length);
  if (!slug || !projectId) return null;

  return { branchSlug: slug, projectId };
}
