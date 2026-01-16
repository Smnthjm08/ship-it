import express, { Router, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import projectRoutes from "./routes/projects.routes";

const app = express();

app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const v1Router = Router();

app.get("/", (req: Request, res: Response) => {
  res.json({message: "Welcome to the Backend API"});
});

app.use("/api/v1", v1Router);

v1Router.use("/projects", projectRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
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
