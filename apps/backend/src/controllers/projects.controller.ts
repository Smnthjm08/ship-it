import { projectsService } from "../services/projects.service";

export const getAllProjectsController = async (req: any, res: any) => {
  try {
    const projects = await projectsService.getProjects(req.user.id);
    res.status(200).json({
      message: "Projects fetched successfully",
      data: projects,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProjectByIdController = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const project = await projectsService.getProjectById(req.user.id, id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error(`Error fetching project with id ${id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createProjectController = async (req: any, res: any) => {
  try {
    const newProject = await projectsService.createProject(
      req.body,
      req.user.id,
    );
    res.status(201).json({
      message: "Project created successfully",
      data: newProject,
      error: null,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProjectController = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const updatedProject = await projectsService.updateProject(
      req.user.id,
      id,
      req.body,
    );
    res.status(200).json({
      message: "Project updated successfully",
      data: updatedProject,
      error: null,
    });
  } catch (error) {
    console.error(`Error updating project with id ${id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProjectController = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    await projectsService.deleteProject(req.user.id, id);
    res.status(200).json({
      message: "Project deleted successfully",
      data: null,
      error: null,
    });
  } catch (error) {
    console.error(`Error deleting project with id ${id}:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};
