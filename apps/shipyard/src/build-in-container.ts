import Docker from "dockerode";
import path from "path";
import fs from "fs";
import { PassThrough } from "stream";
import { prisma, Framework } from "@repo/db";
import { publishDeploymentLog } from "@repo/shared";
import type { EnvVarPair } from "@repo/shared/env/vars";
import { resolveWithin } from "./paths.js";
import { getAllFiles } from "./get-all-files";
import { uploadFile } from "./aws";
import { deploymentLogger } from "@repo/shared/logger";
import { excludeDotEnvFromGit, writeDotEnvFile } from "./env/project-env";
import { prepareNextProject } from "./frameworks/nextjs";

export const docker = new Docker();

// Hard ceiling on a single build so one hung build can't wedge the worker forever.
const BUILD_TIMEOUT_MS = Number(process.env.BUILD_TIMEOUT_MS) || 10 * 60 * 1000;

// Directories we look at when the project doesn't declare an output dir.
// `.next` is deliberately absent — a raw `.next` dir is not servable as static
// files, see resolveOutputDir().
const OUTPUT_DIR_CANDIDATES = ["dist", "build", "out"];

/**
 * Collects build output, persists it to `DeploymentLog` in batches and publishes
 * every line to Redis so `ws-server` can stream it live.
 */
class LogSink {
  private pending: string[] = [];
  private partial = "";
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> = Promise.resolve();
  private secrets: string[] = [];

  constructor(
    private readonly deploymentId: string,
    private readonly batchSize = 50,
    private readonly flushIntervalMs = 500,
  ) {}

  /**
   * Register values to mask before anything is persisted or streamed. Build
   * tools echo their environment more often than you'd like (`vite build
   * --debug`, failing scripts printing argv), and these logs are stored.
   */
  setSecrets(values: string[]) {
    // Longest first so a value containing another is masked whole.
    this.secrets = values
      .filter((v) => v.length >= 4)
      .sort((a, b) => b.length - a.length);
  }

  private redact(message: string) {
    let out = message;
    for (const secret of this.secrets) {
      if (out.includes(secret)) out = out.split(secret).join("***");
    }
    return out;
  }

  /** Feed raw output; only complete lines are emitted. */
  write(chunk: string) {
    const lines = (this.partial + chunk).split(/\r?\n/);
    this.partial = lines.pop() ?? "";
    for (const line of lines) this.line(line);
  }

  /** Emit a single line immediately (used for worker-generated notices). */
  line(message: string) {
    const trimmed = this.redact(message.trim());
    if (!trimmed) return;

    void publishDeploymentLog({
      deploymentId: this.deploymentId,
      message: trimmed,
      timestamp: new Date().toISOString(),
    });

    this.pending.push(trimmed);
    if (this.pending.length >= this.batchSize) {
      this.scheduleFlush(0);
    } else if (!this.timer) {
      this.scheduleFlush(this.flushIntervalMs);
    }
  }

  private scheduleFlush(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushing = this.flushing.then(() => this.flush());
    }, delay);
  }

  private async flush() {
    if (!this.pending.length) return;
    const batch = this.pending.splice(0, this.pending.length);
    try {
      await prisma.deploymentLog.createMany({
        data: batch.map((message) => ({
          deploymentId: this.deploymentId,
          message,
        })),
      });
    } catch (e) {
      deploymentLogger(this.deploymentId).error(
        { err: e },
        "Could not persist deployment logs",
      );
    }
  }

  /** Flush anything still buffered. Always await this before the build ends. */
  async close() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.partial.trim()) {
      this.line(this.partial);
      this.partial = "";
    }
    this.flushing = this.flushing.then(() => this.flush());
    await this.flushing;
  }
}

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

function detectPackageManager(projectRoot: string): PackageManager {
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

/** Directories the build actually produced, for an error the user can act on. */
function producedDirs(buildPath: string): string[] {
  try {
    return fs
      .readdirSync(buildPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .filter((e) => e.name !== "node_modules")
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// Which directory to upload. No Node runtime, so a Next project only deploys if
// built with `output: "export"` (a static `out/`). `prepareNextProject()` sets
// that up; a bare `.next` with no static output fails loudly rather than
// uploading something that can never be served.
function resolveOutputDir(
  buildPath: string,
  outputDir: string,
  isNext: boolean,
): string {
  if (outputDir) {
    // Contained, not joined — this directory gets uploaded to a public bucket.
    const explicit = resolveWithin(
      buildPath,
      outputDir,
      "output directory",
    ).absolute;
    if (!fs.existsSync(explicit)) {
      const produced = producedDirs(buildPath);
      throw new Error(
        `Configured output directory "${outputDir}" does not exist after the build.` +
          (produced.length
            ? ` The build produced: ${produced.join(", ")}. Update the project's ` +
              "output directory in settings to match."
            : ""),
      );
    }
    return explicit;
  }

  // Next static export lands in `out`, so check it first for Next projects.
  const candidates = isNext
    ? ["out", ...OUTPUT_DIR_CANDIDATES.filter((c) => c !== "out")]
    : OUTPUT_DIR_CANDIDATES;

  for (const candidate of candidates) {
    const dir = path.join(buildPath, candidate);
    if (fs.existsSync(dir)) return dir;
  }

  if (fs.existsSync(path.join(buildPath, ".next"))) {
    throw new Error(
      "Found a .next directory but no static output. ShipIt serves static files " +
        'from S3 and cannot run a Next.js server. Set `output: "export"` in ' +
        "next.config.js (which emits `out/`), or set the project's output " +
        "directory to a folder of static files.",
    );
  }

  throw new Error(
    `No build output found. Looked for ${candidates.join(", ")} in ${buildPath}. ` +
      "Set the project's output directory if your build writes somewhere else.",
  );
}

export const buildInContainer = async (
  deploymentId: string,
  cloneDir: string,
  projectId: string,
  buildCommand: string,
  installCommand: string,
  rootDir: string,
  outputDir: string,
  framework: Framework | null = null,
  envVars: EnvVarPair[] = [],
  /** Receives a stopper once the container exists, for cancellation. */
  onContainerStart?: (stop: () => Promise<void>) => void,
) => {
  const log = deploymentLogger(deploymentId);
  const logs = new LogSink(deploymentId);
  // Before anything can be written to the log stream.
  logs.setSecrets(envVars.map((v) => v.value));

  try {
    await docker.ping();
    log.debug("Docker connection established");

    const absolutePath = path.resolve(cloneDir);
    log.debug({ absolutePath }, "Mounting clone into container");

    // Every host path below derives from rootDir, so contain it once here.
    const projectRoot = resolveWithin(absolutePath, rootDir, "root directory");

    const WORKDIR = projectRoot.relative
      ? path.posix.join("/app", projectRoot.relative)
      : "/app";
    log.debug({ workdir: WORKDIR }, "Working directory resolved");

    // detect package manager using the sub-directory if rootDir is specified
    const packageManager = detectPackageManager(projectRoot.absolute);
    log.info({ packageManager }, "Detected package manager");

    let installCmd = installCommand;
    if (!installCmd || installCmd === "npm run install") {
      if (packageManager === "yarn") installCmd = "yarn install";
      else if (packageManager === "pnpm") installCmd = "pnpm install";
      else if (packageManager === "bun") installCmd = "bun install";
      else installCmd = "npm install";
    }

    let buildCmd = buildCommand;
    if (!buildCmd) {
      if (packageManager === "yarn") buildCmd = "yarn build";
      else if (packageManager === "pnpm") buildCmd = "pnpm build";
      else if (packageManager === "bun") buildCmd = "bun run build";
      else buildCmd = "npm run build";
    }

    const prelude = toolchainPrelude(`${installCmd} ${buildCmd}`);

    // Next.js can only be deployed here as a static export, so the config is
    // prepared (and impossible builds are rejected) before the container starts
    // rather than after a full install and build. No-op for other frameworks.
    const isNext = prepareNextProject(projectRoot.absolute, (message) =>
      logs.line(message),
    );

    // Bundlers read env two different ways — Vite and CRA inline `.env` files
    // at build time, while plain scripts read `process.env` — so provide both.
    if (envVars.length) {
      const { inheritedKeys } = writeDotEnvFile(projectRoot.absolute, envVars);
      excludeDotEnvFromGit(absolutePath, projectRoot.relative);

      logs.line(
        `Injected ${envVars.length} environment variable${envVars.length === 1 ? "" : "s"}: ` +
          envVars.map((v) => v.key).join(", "),
      );
      if (inheritedKeys.length) {
        logs.line(`Kept from the repo's own .env: ${inheritedKeys.join(", ")}`);
      }
    }

    // A shell is required: these are user-configured command *strings* that
    // legitimately chain (`npm run build && npm run export`), so there is no
    // argv to exec directly. Both strings are validated single-line and
    // length-capped by `command()` in @repo/shared/validation/project, which is
    // what stops a newline forging extra lines in the build log below.
    const cmd = ["/bin/sh", "-c", `${prelude}${installCmd} && ${buildCmd}`];
    log.debug({ installCmd, buildCmd }, "Resolved build command");
    logs.line(`$ ${installCmd} && ${buildCmd}`);

    log.info("Starting build");
    // Use node:20-alpine as base for now, can be dynamic later
    const image = "node:20-alpine";

    let imageExists = false;
    try {
      await docker.getImage(image).inspect();
      imageExists = true;
      log.debug({ image }, "Image present locally");
    } catch {
      log.info({ image }, "Pulling build image");
    }

    if (!imageExists) {
      await new Promise((resolve, reject) => {
        docker.pull(image, (err: unknown, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          docker.modem.followProgress(
            stream,
            (err, output) => {
              if (err) return reject(err);
              resolve(output);
            },
            (event) => {
              log.trace({ status: event.status }, "Image pull progress");
            },
          );
        });
      });
    }

    const container = await docker.createContainer({
      Image: image,
      name: `deployment-${deploymentId}`,
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      Cmd: cmd,
      // Deliberately no `CI` here: `react-scripts build` turns warnings into
      // errors when CI is set, which fails perfectly deployable React apps.
      Env: envVars.map(({ key, value }) => `${key}=${value}`),
      HostConfig: {
        Binds: [`${absolutePath}:/app`],
        AutoRemove: true,
        // Resource caps so an untrusted build can't exhaust the host.
        Memory: 2 * 1024 * 1024 * 1024, // 2 GiB
        MemorySwap: 2 * 1024 * 1024 * 1024, // no extra swap beyond Memory
        NanoCpus: 2 * 1_000_000_000, // 2 CPUs
        PidsLimit: 512,
        // The command below is arbitrary by design — `npm run build` runs
        // whatever the repo's package.json says, so the container is the trust
        // boundary, not the command string. Narrow what that boundary allows:
        // a build needs no Linux capabilities, and must never be able to gain
        // more privilege than it started with via a setuid binary.
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
      },
      WorkingDir: WORKDIR,
    });

    log.debug({ containerId: container.id }, "Container created");

    // Attach to container streams before starting
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    // Without a TTY the attach stream is multiplexed — demux it so the log lines
    // don't carry Docker's 8-byte frame headers.
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    docker.modem.demuxStream(stream, stdout, stderr);
    for (const s of [stdout, stderr]) {
      s.on("data", (chunk: Buffer) => {
        // Straight to the sink — it redacts injected secrets before anything is
        // persisted, streamed or printed. Don't console.log the raw text here.
        logs.write(chunk.toString());
      });
    }

    // Published so the worker's cancel subscriber can reach into this build —
    // by the time a container exists, nothing outside this function holds it.
    onContainerStart?.(async () => {
      await container
        .stop({ t: 0 })
        .catch(() => container.kill().catch(() => {}));
    });

    // Start the container
    await container.start();

    // Wait for the container to finish, but stop it if it blows past the timeout.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      log.error(
        { timeoutMs: BUILD_TIMEOUT_MS },
        "Build exceeded timeout — stopping container",
      );
      logs.line(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
      // AutoRemove cleans up once stopped; fall back to kill if stop fails.
      container.stop({ t: 0 }).catch(() => container.kill().catch(() => {}));
    }, BUILD_TIMEOUT_MS);

    let result;
    try {
      result = await container.wait();
    } finally {
      clearTimeout(timer);
    }

    if (timedOut) {
      throw new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
    }

    const statusCode = result.StatusCode;

    if (statusCode !== 0) {
      log.error({ statusCode }, "Build exited non-zero");
      throw new Error(`Build failed with status code: ${statusCode}`);
    }

    log.info("Build succeeded");

    // Detection from package.json wins, but honour the user's pick as a
    // fallback so a project whose deps we couldn't read still checks `out`.
    const distFolder = resolveOutputDir(
      projectRoot.absolute,
      outputDir,
      isNext || framework === "NEXTJS",
    );

    log.info({ distFolder }, "Uploading artifacts");
    logs.line(`Uploading artifacts from ${path.basename(distFolder)}...`);
    const allFiles = getAllFiles(distFolder);

    for (const file of allFiles) {
      const relativePath = path.relative(distFolder, file).replace(/\\/g, "/");
      const s3Key = `${deploymentId}/${relativePath}`;
      await uploadFile(s3Key, file);
    }
    log.info("Upload complete");
    logs.line(`Uploaded ${allFiles.length} files.`);
  } finally {
    // The worker records the failure message itself, so nothing to log here —
    // just make sure buffered output reaches the DB before the build ends.
    await logs.close();
  }
};
