import { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Keyed by user, not IP: every limited route sits behind authMiddleware, and one
// account behind a shared NAT shouldn't be able to exhaust everyone else's quota.
// Falls back to the IP helper — which normalises IPv6 to a /56 — if `req.user`
// is somehow absent, so the limiter can never key everything to `undefined`.
const byUser = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "", 56);

const message = (retryAfterSeconds: number) => ({
  success: false,
  message: `Too many requests. Try again in ${retryAfterSeconds}s.`,
  data: null,
  error: "RATE_LIMITED",
});

/**
 * Creating a project writes a row, clones nothing yet, but immediately queues a
 * build — so this is the cheapest way to flood the worker.
 */
export const createProjectLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => res.status(429).json(message(60)),
});

/**
 * Redeploys are the expensive path: each one occupies the single build worker
 * for minutes. The 409 on an in-flight build already stops the obvious case;
 * this bounds the rest.
 */
export const deploymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => res.status(429).json(message(60)),
});

/** Repo search proxies GitHub's API, which has its own per-token rate limit. */
export const githubSearchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => res.status(429).json(message(60)),
});
