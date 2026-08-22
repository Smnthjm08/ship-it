import express, { Request, Response, NextFunction, Application } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth/server";

import v1Router from "./routes/index";

import { connectRedis } from "@repo/shared";

// Not fatal on purpose: auth and every read path still work without Redis, and
// exiting here would take the whole API down over a queue outage. What must not
// happen is serving as if nothing is wrong — /api/v1/health reports the queue
// and the enqueue paths answer 503, so a broken queue is visible rather than
// silently swallowing deployments.
connectRedis().catch((err) =>
  console.error(
    "[startup] Redis is unreachable — deployments cannot be queued until it recovers:",
    err,
  ),
);

const app: Application = express();

const allowedOrigins = [process.env.BETTER_AUTH_URL!];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use(morgan("dev"));

app.all("/api/auth/{*splat}", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const port = process.env.PORT || 3002;

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
