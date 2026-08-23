import { pino, type Logger } from "pino";

// Subpath-only export: pino must never reach the browser bundle.

const isProduction = process.env.NODE_ENV === "production";

// NDJSON in production so an aggregator can query it; pretty-printing is
// dev-only and runs in a worker thread.
const transport = isProduction
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    };

// By path, so it only fires on shapes we know about — not a substitute for not
// logging a secret in the first place.
const redact = {
  paths: [
    "accessToken",
    "refreshToken",
    "password",
    "*.accessToken",
    "*.refreshToken",
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  censor: "[redacted]",
};

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: undefined,
  transport,
  redact,
});

/** Binds `deploymentId` to every line, which is what makes a build searchable. */
export function deploymentLogger(deploymentId: string): Logger {
  return logger.child({ deploymentId });
}

export type { Logger };
