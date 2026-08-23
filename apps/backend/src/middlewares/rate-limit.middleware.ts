import { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Keyed by user, not IP: these routes sit behind authMiddleware, and one account
// behind a shared NAT shouldn't exhaust everyone else's quota. The IP fallback
// stops the limiter keying everything to `undefined` if req.user is missing.
const byUser = (req: Request) =>
  req.user?.id ?? ipKeyGenerator(req.ip ?? "", 56);

const message = (retryAfterSeconds: number) => ({
  success: false,
  message: `Too many requests. Try again in ${retryAfterSeconds}s.`,
  data: null,
  error: "RATE_LIMITED",
});

/** Cheapest way to flood the worker: each one immediately queues a build. */
export const createProjectLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: byUser,
  handler: (_req, res) => res.status(429).json(message(60)),
});

/** Each occupies the single worker for minutes; the 409 only covers the obvious case. */
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
