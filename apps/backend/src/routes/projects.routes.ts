import { Router } from "express";

const projectRoutes: Router = Router();

projectRoutes.post("/", (req, res) => {
  res.send("create of projects");
});

projectRoutes.get("/", (req, res) => {
  res.send("List of projects");
});

projectRoutes.get("/:id", (req, res) => {
  res.send("get by id of projects");
});

projectRoutes.put("/:id", (req, res) => {
  res.send("put by id of projects");
});

projectRoutes.delete("/:id", (req, res) => {
  res.send("delete by id of projects");
});

export default projectRoutes;
