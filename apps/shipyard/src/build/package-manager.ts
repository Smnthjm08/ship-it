import fs from "fs";
import path from "path";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export function detectPackageManager(projectRoot: string): PackageManager {
  // `bun.lockb` is the binary lockfile, `bun.lock` the text one bun 1.2+ writes.
  if (
    fs.existsSync(path.join(projectRoot, "bun.lockb")) ||
    fs.existsSync(path.join(projectRoot, "bun.lock"))
  ) {
    return "bun";
  }
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

/** Whether `command` invokes `tool` as a program, rather than merely containing the word. */
function invokes(command: string, tool: string): boolean {
  return new RegExp(`(?:^|[\\s;&|(])${tool}(?:[\\s;&|)]|$)`).test(command);
}

// node:20-alpine ships npm and corepack only. Corepack covers pnpm and yarn;
// bun isn't corepack-managed and needs installing from npm, or the container
// starts and then dies on `bun: not found`. Keyed off the resolved commands, not
// the lockfile — a user can type `bun install` in a repo with no bun lockfile.
export function toolchainPrelude(commands: string): string {
  const steps: string[] = [];

  if (invokes(commands, "pnpm") || invokes(commands, "yarn")) {
    steps.push("corepack enable >/dev/null 2>&1 || true");
  }

  if (invokes(commands, "bun") || invokes(commands, "bunx")) {
    steps.push('echo "Installing bun (not bundled with the build image)..."');
    // Failing here rather than letting the build reach `bun: not found`, which
    // reads like the project is broken instead of the container.
    steps.push(
      'npm install -g bun >/dev/null || { echo "Failed to install bun in the build container"; exit 1; }',
    );
  }

  return steps.length ? `${steps.join("; ")}; ` : "";
}
