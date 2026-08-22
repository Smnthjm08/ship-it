import { pino, type Logger } from "pino";

// Subpath-only export (`@repo/shared/logger`), like crypto/secrets and env/vars:
// pino is a Node library and must never be pulled into the browser bundle.

const isProduction = process.env.NODE_ENV === "production";

// Production emits newline-delimited JSON, which is what a log aggregator can
// actually query — the whole point of this over console.log. Pretty-printing is
// dev-only and runs in a worker thread, so it can't be used in both.
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

// Belt and braces: these keys carry GitHub tokens, session cookies and project
// secrets. Redaction is by path, so it only fires on the shapes we know about —
// it is not a substitute for not logging a secret in the first place.
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

/**
 * A logger bound to one deployment. Every line a build emits carries its
 * `deploymentId`, which is what makes a failed build searchable after the fact.
 */
export function deploymentLogger(deploymentId: string): Logger {
  return logger.child({ deploymentId });
}

export type { Logger };
