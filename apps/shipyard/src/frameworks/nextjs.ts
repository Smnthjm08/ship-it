import fs from "fs";
import path from "path";

// Next.js on a static-only host. There's no Node runtime, so a static export is
// the only deployable Next build. Runs before the container starts: refuses builds
// that can never be static (naming the file), then rewrites the config to set
// `output: "export"`. Writes only into the throwaway clone, never the user's repo.

const CONFIG_BASENAMES = [
  "next.config.js",
  "next.config.mjs",
  "next.config.cjs",
  "next.config.ts",
];

/** Where the user's own config is moved to before we take over the real name. */
const ORIGINAL_BASENAME = "next.config.shipit-original";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "dist",
  "build",
  "public",
]);

/** A hostile or enormous repo shouldn't turn preflight into its own build step. */
const MAX_SCANNED_FILES = 5000;

/** How many blockers to name before summarising the rest. */
const MAX_REPORTED_BLOCKERS = 8;

export interface NextBlocker {
  /** Path relative to the project root, as the user would see it. */
  file: string;
  reason: string;
}

type Log = (message: string) => void;

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// From package.json, not the stored `framework` — that's a dropdown guess made
// before the repo was ever cloned.
export function isNextProject(projectRoot: string): boolean {
  const pkg = readJson(path.join(projectRoot, "package.json"));
  if (!pkg) return false;

  const deps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };
  return "next" in deps;
}

/** Recursively collect source files under `dir`, bounded and skipping build/vendor dirs. */
function walkSources(dir: string, out: string[] = []): string[] {
  if (out.length >= MAX_SCANNED_FILES || !fs.existsSync(dir)) return out;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (out.length >= MAX_SCANNED_FILES) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkSources(full, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * True for the App Router files whose exported `dynamic` / `revalidate`
 * constants Next actually reads as route configuration.
 */
function isRouteSegment(basename: string): boolean {
  return /^(page|layout|template|default)\.(ts|tsx|js|jsx|mjs)$/.test(basename);
}

function readText(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

// `next build` would reject these anyway; catching them here costs a second
// instead of a full install-and-build, and names the offending file. Matching is
// textual — a false positive is cheap to explain, a false negative just falls
// through to the build's own error.
export function findExportBlockers(projectRoot: string): NextBlocker[] {
  const blockers: NextBlocker[] = [];
  const rel = (file: string) =>
    path.relative(projectRoot, file).replace(/\\/g, "/");

  // Middleware always needs a server sitting in front of the assets.
  for (const dir of ["", "src"]) {
    for (const ext of ["ts", "js", "mjs"]) {
      const file = path.join(projectRoot, dir, `middleware.${ext}`);
      if (fs.existsSync(file)) {
        blockers.push({
          file: rel(file),
          reason: "middleware runs per request and needs a server",
        });
      }
    }
  }

  for (const appDir of ["app", "src/app"]) {
    const root = path.join(projectRoot, appDir);
    for (const file of walkSources(root)) {
      const name = path.basename(file);

      if (/^route\.(ts|tsx|js|mjs)$/.test(name)) {
        blockers.push({
          file: rel(file),
          reason: "route handlers are server endpoints",
        });
        continue;
      }

      // `dynamic` and `revalidate` only mean anything to Next in a route
      // segment file. The same names in a helper module are ordinary exports,
      // and flagging those would fail builds that are perfectly static.
      if (!isRouteSegment(name)) continue;

      const source = readText(file);
      if (
        /export\s+const\s+dynamic\s*=\s*["'`]force-dynamic["'`]/.test(source)
      ) {
        blockers.push({
          file: rel(file),
          reason: 'export const dynamic = "force-dynamic" requires a server',
        });
      }

      const revalidate = source.match(
        /export\s+const\s+revalidate\s*=\s*([^;\n]+)/,
      );
      // `false` is "cache forever", the one value a static export can honour.
      // A number — including 0, which marks the segment dynamic — cannot be.
      if (revalidate && revalidate[1]!.trim() !== "false") {
        blockers.push({
          file: rel(file),
          reason: `export const revalidate = ${revalidate[1]!.trim()} requires a server`,
        });
      }
    }
  }

  for (const pagesDir of ["pages", "src/pages"]) {
    const root = path.join(projectRoot, pagesDir);
    for (const file of walkSources(root)) {
      const relative = rel(file);
      if (/(^|\/)pages\/api\//.test(`/${relative}`)) {
        blockers.push({
          file: relative,
          reason: "API routes are server endpoints",
        });
        continue;
      }

      const source = readText(file);
      if (/\bgetServerSideProps\b/.test(source)) {
        blockers.push({
          file: relative,
          reason: "getServerSideProps runs per request",
        });
      }
    }
  }

  return blockers;
}

/** Locate the project's Next config, if it has one. */
function findConfig(projectRoot: string): string | null {
  for (const name of CONFIG_BASENAMES) {
    const file = path.join(projectRoot, name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/** Textual check — good enough, and a wrapped config sets it regardless. */
function declaresStaticExport(source: string): boolean {
  return /output\s*:\s*["'`]export["'`]/.test(source);
}

const GENERATED_HEADER =
  "// Generated by ShipIt for this build only — not written back to your repository.\n" +
  "// ShipIt serves static files from S3, so the build must produce a static export.\n";

const STANDALONE_CONFIG = `${GENERATED_HEADER}
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // The default image loader needs a server; export requires this.
  images: { unoptimized: true },
};

export default nextConfig;
`;

// Wraps the user's config and forces what a static export needs. The wrapper's
// extension MUST match the original's, because Next loads the two kinds through
// different pipelines:
//   - `.js`/`.cjs`/`.mjs` are `import()`ed, so one `.mjs` wrapper reaches all three.
//   - `.ts` is SWC-transpiled and `require`d from a string, which registers a
//     `require.extensions` hook for `.ts` — so a `.ts` wrapper can require the
//     renamed original. An `.mjs` wrapper cannot import a `.ts` file at all.
// Body stays plain JS so one source is valid in both, and always exports the
// function form since the original may be a (possibly async) `(phase, context)`.
function wrapperConfig(
  originalSpecifier: string,
  isTypeScript: boolean,
): string {
  // `next build` type-checks the project, and a default create-next-app
  // tsconfig includes `**/*.ts` — which is this file. Nothing here is worth
  // failing a build over.
  const header = isTypeScript
    ? "// @ts-nocheck\n" + GENERATED_HEADER
    : GENERATED_HEADER;

  return `${header}
import base from "${originalSpecifier}";

// Features that cannot exist on a static host. Left in place, \`next build\`
// fails outright with "cannot be used with output: export".
const UNSUPPORTED = ["rewrites", "redirects", "headers"];

export default async function shipitConfig(phase, context) {
  const resolved =
    typeof base === "function" ? await base(phase, context) : base;
  const config = { ...(resolved ?? {}) };

  for (const key of UNSUPPORTED) delete config[key];

  return {
    ...config,
    output: "export",
    images: { ...(config.images ?? {}), unoptimized: true },
  };
}
`;
}

export type ConfigureResult =
  | { action: "already-configured"; file: string }
  | { action: "created"; file: string }
  | { action: "wrapped"; file: string; original: string };

/** Make sure the build produces a static export. */
export function configureStaticExport(projectRoot: string): ConfigureResult {
  const existing = findConfig(projectRoot);

  if (!existing) {
    const file = path.join(projectRoot, "next.config.mjs");
    fs.writeFileSync(file, STANDALONE_CONFIG);
    return { action: "created", file: "next.config.mjs" };
  }

  const basename = path.basename(existing);
  const source = readText(existing);

  if (declaresStaticExport(source)) {
    return { action: "already-configured", file: basename };
  }

  const extension = path.extname(existing);
  const isTypeScript = extension === ".ts";
  const wrapperName = isTypeScript ? "next.config.ts" : "next.config.mjs";

  // The extension stays on the specifier on purpose: `require("./x.ts")` needs
  // the hook's registered extension, and Node's native type stripping (used on
  // newer runtimes) rejects extensionless relative imports outright.
  const originalName = `${ORIGINAL_BASENAME}${extension}`;
  fs.renameSync(existing, path.join(projectRoot, originalName));
  fs.writeFileSync(
    path.join(projectRoot, wrapperName),
    wrapperConfig(`./${originalName}`, isTypeScript),
  );

  // The original has been renamed out of the way, so the wrapper is now the
  // only config Next will pick up — it never sees two.
  return { action: "wrapped", file: wrapperName, original: originalName };
}

// Everything a Next project needs before the container starts; no-op otherwise.
// Throws when it can't deploy statically — deliberately, before a multi-minute
// build that was always going to fail.
export function prepareNextProject(projectRoot: string, log: Log): boolean {
  if (!isNextProject(projectRoot)) return false;

  log("Detected a Next.js project — preparing a static export.");

  const blockers = findExportBlockers(projectRoot);
  if (blockers.length) {
    for (const blocker of blockers.slice(0, MAX_REPORTED_BLOCKERS)) {
      log(`  ${blocker.file} — ${blocker.reason}`);
    }
    if (blockers.length > MAX_REPORTED_BLOCKERS) {
      log(`  ...and ${blockers.length - MAX_REPORTED_BLOCKERS} more`);
    }
    throw new Error(
      `This Next.js app uses ${blockers.length} server-only feature${
        blockers.length === 1 ? "" : "s"
      } (listed above). ShipIt serves static files from S3 and cannot run a ` +
        "Next.js server — remove them, or deploy the parts that render at build time.",
    );
  }

  const result = configureStaticExport(projectRoot);
  switch (result.action) {
    case "already-configured":
      log(`${result.file} already sets output: "export" — using it as is.`);
      break;
    case "created":
      log(
        `No Next config found — generated ${result.file} with output: "export".`,
      );
      break;
    case "wrapped":
      log(
        `Wrapped ${result.original} in a generated ${result.file}: output: "export", ` +
          "images.unoptimized, and any rewrites/redirects/headers dropped " +
          "(a static host cannot apply them).",
      );
      break;
  }

  return true;
}
