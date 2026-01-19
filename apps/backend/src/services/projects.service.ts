import { prisma, Prisma } from "@repo/db";

export class ProjectsService {
  async getProjects(userId: string) {
    return await prisma.project.findMany({
      where: { userId },
    });
  }

  async getProjectById(
    userId: string,
    id: string,
  ): Promise<Prisma.ProjectGetPayload<{ include: { deployments: true } }>> {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      include: { deployments: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  }

  async createProject(data: any, userId: string) {
    return await prisma.project.create({
      data: {
        ...data,
        userId,
        deployments: {
          create: {
            status: "queued",
          },
        },
      },
      include: {
        deployments: true,
      },
    });
  }

  async updateProject(userId: string, id: string, data: any) {
    await this.getProjectById(userId, id);

    return await prisma.project.update({
      where: { id },
      data,
    });
  }

  async deleteProject(userId: string, id: string) {
    await this.getProjectById(userId, id);

    return await prisma.project.delete({
      where: { id },
    });
  }
}

export const projectsService = new ProjectsService();
