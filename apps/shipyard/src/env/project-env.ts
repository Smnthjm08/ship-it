import fs from "fs";
import { logger } from "@repo/shared/logger";
import path from "path";
import { decryptSecret } from "@repo/shared/crypto/secrets";
import { parseDotEnv, serializeDotEnv } from "@repo/shared/env/vars";
import type { EnvVarPair } from "@repo/shared/env/vars";

/** The stored (encrypted) shape as it comes off the `env_var` table. */
export interface StoredEnvVar {
  key: string;
  value: string;
}

// Decryption failure is fatal on purpose: building without a variable produces
// a deployment that looks fine and is broken at runtime.
export function decryptProjectEnv(stored: StoredEnvVar[]): EnvVarPair[] {
  return stored.map(({ key, value }) => {
    try {
      return { key, value: decryptSecret(value) };
    } catch {
      throw new Error(
        `Could not decrypt environment variable "${key}". It was encrypted with a ` +
          "different ENV_SECRET_KEY / BETTER_AUTH_SECRET — re-enter it in project settings.",
      );
    }
  });
}

// Writes `<buildPath>/.env` for file-based loaders (Vite, CRA, dotenv). Repo-
// committed vars are kept unless the project overrides them. Returns the keys
// that came from the repo's own `.env`, for logging.
export function writeDotEnvFile(
  buildPath: string,
  vars: EnvVarPair[],
): { path: string; inheritedKeys: string[] } {
  const dotEnvPath = path.join(buildPath, ".env");

  let inherited: EnvVarPair[] = [];
  if (fs.existsSync(dotEnvPath)) {
    const ours = new Set(vars.map((v) => v.key));
    inherited = parseDotEnv(fs.readFileSync(dotEnvPath, "utf8")).filter(
      (v) => !ours.has(v.key),
    );
  }

  fs.writeFileSync(dotEnvPath, serializeDotEnv([...inherited, ...vars]), {
    mode: 0o600,
  });
  // `mode` only applies when the file is created, and the repo may already ship
  // a world-readable .env — tighten it either way.
  fs.chmodSync(dotEnvPath, 0o600);

  return { path: dotEnvPath, inheritedKeys: inherited.map((v) => v.key) };
}

/**
 * Belt and braces: the build container runs arbitrary user commands against a
 * bind-mounted clone, so make git itself refuse to stage the file we just
 * wrote. Best-effort — a repo without `.git` is fine.
 */
export function excludeDotEnvFromGit(cloneDir: string, rootDir: string): void {
  const infoDir = path.join(cloneDir, ".git", "info");
  if (!fs.existsSync(path.join(cloneDir, ".git"))) return;

  try {
    fs.mkdirSync(infoDir, { recursive: true });
    const excludePath = path.join(infoDir, "exclude");
    const relative = path.posix.join(
      rootDir
        .replace(/\\/g, "/")
        .replace(/^\.?\/+/, "")
        .replace(/\/+$/, ""),
      ".env",
    );
    const entry = `\n# added by ShipIt — injected build env, never commit\n/${relative}\n`;

    const current = fs.existsSync(excludePath)
      ? fs.readFileSync(excludePath, "utf8")
      : "";
    if (!current.includes(`/${relative}`)) {
      fs.appendFileSync(excludePath, entry);
    }
  } catch (e) {
    logger.warn({ err: e }, "Could not update .git/info/exclude");
  }
}
