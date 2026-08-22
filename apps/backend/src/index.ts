import express, { Request, Response, NextFunction, Application } from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth/server";
import { logger } from "@repo/shared/logger";
import { requireEnv, BACKEND_REQUIRED_ENV } from "@repo/shared/env/require";

import v1Router from "./routes/index";

import { connectRedis } from "@repo/shared";

// Before the first import that reads one. A missing value here is a
// misconfiguration, not a runtime condition — crash loudly rather than serve
// requests that will fail confusingly later.
requireEnv(BACKEND_REQUIRED_ENV, "backend");

// Not fatal on purpose: auth and every read path still work without Redis, and
// exiting here would take the whole API down over a queue outage. What must not
// happen is serving as if nothing is wrong — /api/v1/health reports the queue
// and the enqueue paths answer 503, so a broken queue is visible rather than
// silently swallowing deployments.
connectRedis().catch((err) =>
  logger.error(
    { err },
    "[startup] Redis is unreachable — deployments cannot be queued until it recovers",
  ),
);

const app: Application = express();

// Before everything else, so even a rejected request carries the headers.
app.use(
  helmet({
    // This is a JSON API consumed by the web app on another origin. Helmet's
    // default `same-origin` would be wrong here; CORS still gates who may read.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const allowedOrigins = [process.env.BETTER_AUTH_URL!];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Every log line from a request carries the same id, so one failing call can be
// followed across middleware, controller and service. Honour an inbound header
// when there is one, so the id survives a proxy in front of this.
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = (Array.isArray(existing) ? existing[0] : existing)?.slice(
        0,
        128,
      );
      const requestId = id || randomUUID();
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    // Health checks are polled constantly and say nothing when they pass.
    autoLogging: {
      ignore: (req) => req.url === "/api/v1/health",
    },
    // pino-http's defaults serialise every request and response header, which
    // buries the useful fields and makes each production log line kilobytes.
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

app.all("/api/auth/{*splat}", toNodeHandler(auth));

// Capped so a single request can't buffer unbounded memory. 1mb is far above the
// largest legitimate body here — a pasted .env on the environment page.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Backend API" });
});

app.use("/api/v1", v1Router);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found!",
  });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // body-parser rejects an oversized body with a typed 413 — answering 500 would
  // read as "we broke" when the correct answer is "your request was too large".
  const status =
    (err as { status?: number; statusCode?: number }).status ?? 500;
  if (status === 413) {
    return res.status(413).json({
      success: false,
      message: "Request body is too large (limit 1mb)",
    });
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const port = process.env.PORT || 3002;

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    logger.info({ port }, `Server is running on http://localhost:${port}`);
  });
}

export default app;
