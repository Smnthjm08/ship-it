// Lists every missing variable at once. `process.env.X!` lies to the type
// checker, so without this a missing value surfaces minutes later as an
// undefined connection string or a build that uploads nowhere.
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

/** AWS_REGION and AWS_ENDPOINT are omitted — both have working defaults. */
export const SHIPYARD_REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "AWS_ACCESS_KEY",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
] as const;
