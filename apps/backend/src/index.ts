import express, { Router, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth/server";

import authMiddleware from "./middlewares/auth.middleware";
import projectRoutes from "./routes/projects.routes";
import { newProjectController } from "./controllers/new-project.controller";

const app = express();

const allowedOrigins = [process.env.BETTER_AUTH_URL!];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["*"],
    credentials: true,
  }),
);
app.use(morgan("dev"));

app.all("/api/auth/{*splat}", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const v1Router = Router();

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Backend API" });
});

app.use("/api/v1", v1Router);

v1Router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "healthy!" });
});

v1Router.use("/projects", authMiddleware, projectRoutes);
v1Router.use("/new", authMiddleware, newProjectController);
// v1Router.use("/dashboard", authMiddleware, dashboardRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found!",
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

app.listen(3002, () => {
  console.log("Server is running on http://localhost:3002");
});
