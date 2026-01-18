import { Router } from "express";
import {
  createProjectController,
  deleteProjectController,
  getAllProjectsController,
  getProjectByIdController,
  updateProjectController,
} from "../controllers/projects.controller";

const projectsRoutes: Router = Router();

projectsRoutes.get("/", getAllProjectsController);

projectsRoutes.post("/", createProjectController);

projectsRoutes.get("/:id", getProjectByIdController);

projectsRoutes.put("/:id", updateProjectController);

projectsRoutes.delete("/:id", deleteProjectController);

export default projectsRoutes;
