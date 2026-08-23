import Docker from "dockerode";
import { PassThrough } from "stream";
import type { Logger } from "@repo/shared/logger";
import type { LogSink } from "./log-sink.js";

export const docker = new Docker();

/** Hard ceiling on one build, so a hung build can't wedge the worker forever. */
export const BUILD_TIMEOUT_MS =
  Number(process.env.BUILD_TIMEOUT_MS) || 10 * 60 * 1000;

// Pinned to the multi-arch index digest, not a tag: `node:20-alpine` is a moving
// target, so an unpinned build is not reproducible and a compromised upstream
// tag would land straight in the build container. The index digest (rather than
// a per-platform manifest) keeps the daemon free to pick the right architecture.
//
// To bump: `docker buildx imagetools inspect node:20-alpine` and take Digest.
export const BUILD_IMAGE =
  "node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293";

/** Pull the build image unless the daemon already has it. */
export async function ensureImage(log: Logger): Promise<void> {
  try {
    await docker.getImage(BUILD_IMAGE).inspect();
    log.debug({ image: BUILD_IMAGE }, "Image present locally");
    return;
  } catch {
    log.info({ image: BUILD_IMAGE }, "Pulling build image");
  }

  await new Promise((resolve, reject) => {
    docker.pull(BUILD_IMAGE, (err: unknown, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(
        stream,
        (progressErr, output) =>
          progressErr ? reject(progressErr) : resolve(output),
        (event) => log.trace({ status: event.status }, "Image pull progress"),
      );
    });
  });
}

export interface BuildContainerOptions {
  deploymentId: string;
  /** Host path bind-mounted at /app. */
  hostPath: string;
  workdir: string;
  cmd: string[];
  envVars: { key: string; value: string }[];
}

export async function createBuildContainer({
  deploymentId,
  hostPath,
  workdir,
  cmd,
  envVars,
}: BuildContainerOptions): Promise<Docker.Container> {
  return docker.createContainer({
    Image: BUILD_IMAGE,
    name: `deployment-${deploymentId}`,
    Tty: false,
    AttachStdout: true,
    AttachStderr: true,
    Cmd: cmd,
    // Deliberately no `CI` here: `react-scripts build` turns warnings into
    // errors when CI is set, which fails perfectly deployable React apps.
    Env: envVars.map(({ key, value }) => `${key}=${value}`),
    HostConfig: {
      Binds: [`${hostPath}:/app`],
      AutoRemove: true,
      // Resource caps so an untrusted build can't exhaust the host.
      Memory: 2 * 1024 * 1024 * 1024, // 2 GiB
      MemorySwap: 2 * 1024 * 1024 * 1024, // no extra swap beyond Memory
      NanoCpus: 2 * 1_000_000_000, // 2 CPUs
      PidsLimit: 512,
      // The command is arbitrary by design — `npm run build` runs whatever the
      // repo says — so the container is the trust boundary, not the string.
      // A build needs no capabilities and must never gain privilege via setuid.
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
    },
    WorkingDir: workdir,
  });
}

/**
 * Pipe container stdout/stderr into the sink. Docker multiplexes both onto one
 * stream, so demultiplexStream splits them before anything is written.
 */
export async function streamContainerLogs(
  container: Docker.Container,
  logs: LogSink,
): Promise<void> {
  const stream = await container.attach({
    stream: true,
    stdout: true,
    stderr: true,
  });

  const stdout = new PassThrough();
  const stderr = new PassThrough();
  container.modem.demuxStream(stream, stdout, stderr);

  for (const source of [stdout, stderr]) {
    // Secrets are masked inside the sink, before persistence or streaming.
    source.on("data", (chunk: Buffer) => logs.write(chunk.toString()));
  }
}

/**
 * Run to completion, stopping the container if it outlives the timeout.
 * Throws on timeout or a non-zero exit.
 */
export async function runToCompletion(
  container: Docker.Container,
  { log, logs }: { log: Logger; logs: LogSink },
): Promise<void> {
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    log.error({ timeoutMs: BUILD_TIMEOUT_MS }, "Build exceeded timeout");
    logs.line(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
    // AutoRemove cleans up once stopped; fall back to kill if stop fails.
    void container
      .stop({ t: 0 })
      .catch(() => container.kill().catch(() => {}));
  }, BUILD_TIMEOUT_MS);

  let result: { StatusCode: number };
  try {
    result = await container.wait();
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    throw new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
  }

  if (result.StatusCode !== 0) {
    log.error({ statusCode: result.StatusCode }, "Build exited non-zero");
    throw new Error(`Build failed with status code: ${result.StatusCode}`);
  }
}
