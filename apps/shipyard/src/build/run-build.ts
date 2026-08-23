import path from "path";
import { Framework } from "@repo/db";
import type { EnvVarPair } from "@repo/shared/env/vars";
import { deploymentLogger, type Logger } from "@repo/shared/logger";
import { resolveWithin } from "../paths.js";
import { getAllFiles } from "../storage/get-all-files.js";
import { excludeDotEnvFromGit, writeDotEnvFile } from "../env/project-env.js";
import { prepareNextProject } from "../frameworks/nextjs.js";
import { LogSink } from "./log-sink.js";
import { detectPackageManager, toolchainPrelude } from "./package-manager.js";
import { resolveOutputDir } from "./output-dir.js";
import { uploadBuildArtifacts } from "../storage/upload-artifacts.js";
import {
  createBuildContainer,
  docker,
  ensureImage,
  runToCompletion,
  streamContainerLogs,
} from "./container.js";

const DEFAULT_INSTALL: Record<string, string> = {
  yarn: "yarn install",
  pnpm: "pnpm install",
  bun: "bun install",
  npm: "npm install",
};

const DEFAULT_BUILD: Record<string, string> = {
  yarn: "yarn build",
  pnpm: "pnpm build",
  bun: "bun run build",
  npm: "npm run build",
};

/** Collect a directory and upload it. The last step of both build paths. */
async function publish(
  dir: string,
  deploymentId: string,
  { log, logs }: { log: Logger; logs: LogSink },
): Promise<void> {
  const files = getAllFiles(dir);
  log.info({ dir, files: files.length }, "Uploading artifacts");
  logs.line(`Uploading ${files.length} files from ${path.basename(dir) || "/"}...`);

  await uploadBuildArtifacts(files, dir, deploymentId);
  log.info("Upload complete");
  logs.line(`Uploaded ${files.length} files.`);
}

/**
 * Clone on disk → container → S3. Each step lives in its own module; this is
 * the order they happen in and the error handling between them.
 */
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

    const absolutePath = path.resolve(cloneDir);
    // Every host path below derives from rootDir, so contain it once here.
    const projectRoot = resolveWithin(absolutePath, rootDir, "root directory");
    const workdir = projectRoot.relative
      ? path.posix.join("/app", projectRoot.relative)
      : "/app";

    const packageManager = detectPackageManager(projectRoot.absolute);
    log.info({ packageManager, workdir }, "Resolved build environment");

    const installCmd =
      !installCommand || installCommand === "npm run install"
        ? DEFAULT_INSTALL[packageManager]!
        : installCommand;
    const buildCmd = buildCommand || DEFAULT_BUILD[packageManager]!;
    const prelude = toolchainPrelude(`${installCmd} ${buildCmd}`);

    // Next.js only deploys as a static export, so the config is rewritten (and
    // impossible builds rejected) before the container starts rather than after
    // a full install. No-op for other frameworks.
    const isNext = prepareNextProject(projectRoot.absolute, (message) =>
      logs.line(message),
    );

    // Bundlers read env two ways — Vite and CRA inline `.env`, plain scripts
    // read process.env — so provide both.
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
    // argv to exec directly. Both are validated single-line and length-capped
    // by `command()` in @repo/shared/validation/project.
    const cmd = ["/bin/sh", "-c", `${prelude}${installCmd} && ${buildCmd}`];
    logs.line(`$ ${installCmd} && ${buildCmd}`);
    log.info({ installCmd, buildCmd }, "Starting build");

    await ensureImage(log);

    const container = await createBuildContainer({
      deploymentId,
      hostPath: absolutePath,
      workdir,
      cmd,
      envVars,
    });

    await streamContainerLogs(container, logs);

    // Published before start so a cancellation arriving mid-build can reach it —
    // by this point nothing outside this function holds the container.
    onContainerStart?.(async () => {
      await container
        .stop({ t: 0 })
        .catch(() => container.kill().catch(() => {}));
    });

    await container.start();
    await runToCompletion(container, { log, logs });
    log.info("Build succeeded");

    // Detection from package.json wins, but honour the user's pick as a
    // fallback so a project whose deps we couldn't read still checks `out`.
    const distFolder = resolveOutputDir(
      projectRoot.absolute,
      outputDir,
      isNext || framework === "NEXTJS",
    );

    await publish(distFolder, deploymentId, { log, logs });
  } finally {
    // Flush whatever is still buffered, whether the build passed or threw.
    await logs.close();
  }
};
