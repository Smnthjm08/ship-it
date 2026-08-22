// Subpath-only export (`@repo/shared/env/require`) — no Node-specific imports,
// but it must never be pulled into the browser bundle via the barrel either.

/**
 * Fail at startup when a required variable is missing, listing every one at once
 * rather than dying on the first.
 *
 * The failure this prevents is the quiet one: `process.env.X!` is a lie to the
 * type checker, so a missing value surfaces minutes later as a confusing runtime
 * error — an undefined connection string, a build that uploads nowhere. Worse
 * under Turborepo, where a variable missing from `globalEnv` is stripped from
 * the task environment and reads as `undefined` even though it is set in `.env`.
 */
export function requireEnv(names: readonly string[], service: string): void {
  const missing = names.filter((name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === "";
  });

  if (missing.length === 0) return;

  const lines = [
    `[${service}] Missing required environment variable${missing.length === 1 ? "" : "s"}:`,
    ...missing.map((name) => `  - ${name}`),
    "",
    "Set them in .env (see .env.example). If a variable IS set but still reported",
    "missing, check it is listed in turbo.json globalEnv — Turborepo strict mode",
    "strips anything undeclared from the task environment.",
  ];

  throw new Error(lines.join("\n"));
}

/** Everything the API needs before it can serve a single authenticated request. */
export const BACKEND_REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

/**
 * Everything a build needs end to end. `AWS_REGION` and `AWS_ENDPOINT` are
 * omitted deliberately — both have working defaults.
 */
export const SHIPYARD_REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "AWS_ACCESS_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
] as const;
