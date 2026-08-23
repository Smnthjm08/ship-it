import { prisma } from "@repo/db";
import { publishDeploymentLog } from "@repo/shared";
import { deploymentLogger } from "@repo/shared/logger";

/**
 * Collects build output, persists it to `DeploymentLog` in batches and publishes
 * every line to Redis so `ws-server` can stream it live.
 */
export class LogSink {
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
