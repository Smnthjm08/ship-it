import { prisma, Deployment, DeploymentLog, Prisma } from "@repo/db";
import { enqueueBuild, QueueUnavailableError } from "@repo/shared";

export class DeploymentService {
  getAllDeployments(projectId: string): Promise<Deployment[]> {
    return prisma.deployment.findMany({
      where: { projectId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  getDeploymentById(id: string): Promise<Deployment | null> {
    return prisma.deployment.findUnique({
      where: { id },
    });
  }

  createDeployment(data: Prisma.DeploymentCreateInput): Promise<Deployment> {
    return prisma.deployment.create({ data });
  }

  updateDeployment(
    id: string,
    data: Prisma.DeploymentUpdateInput,
  ): Promise<Deployment> {
    return prisma.deployment.update({
      where: { id },
      data,
    });
  }

  deleteDeployment(id: string): Promise<Deployment> {
    return prisma.deployment.delete({
      where: { id },
    });
  }

  /**
   * Fetch a deployment only if it belongs to `userId`. Every user-facing route
   * goes through this so a deployment id can't be used to read someone else's build.
   */
  getOwnedDeployment(id: string, userId: string): Promise<Deployment | null> {
    return prisma.deployment.findFirst({
      where: {
        id,
        isDeleted: false,
        project: { userId, isDeleted: false },
      },
    });
  }

  listOwnedDeployments(
    projectId: string,
    userId: string,
    { skip = 0, take = 20 }: { skip?: number; take?: number } = {},
  ): Promise<[Deployment[], number]> {
    const where: Prisma.DeploymentWhereInput = {
      projectId,
      isDeleted: false,
      project: { userId, isDeleted: false },
    };

    return Promise.all([
      prisma.deployment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.deployment.count({ where }),
    ]);
  }

  getLogs(
    deploymentId: string,
    { after, take = 500 }: { after?: Date; take?: number } = {},
  ): Promise<DeploymentLog[]> {
    return prisma.deploymentLog.findMany({
      where: {
        deploymentId,
        isDeleted: false,
        ...(after && { timestamp: { gt: after } }),
      },
      orderBy: { timestamp: "asc" },
      take,
    });
  }

  /**
   * Create a fresh deployment for a project and push it onto the build queue.
   *
   * The row is written before the enqueue, so a queue outage would otherwise
   * leave a deployment sitting at QUEUED that no worker will ever see. Mark it
   * FAILED instead and let the caller answer 503 — a visible failure the user
   * can retry beats a build that silently never starts.
   */
  async queueDeployment(
    projectId: string,
    branch: string,
  ): Promise<Deployment> {
    const deployment = await prisma.deployment.create({
      data: { projectId, status: "QUEUED", branch },
    });

    try {
      await enqueueBuild(deployment.id);
    } catch (error) {
      if (error instanceof QueueUnavailableError) {
        await prisma.deployment
          .update({
            where: { id: deployment.id },
            data: { status: "FAILED" },
          })
          .catch(() => {});
      }
      throw error;
    }

    return deployment;
  }

  softDeleteDeployment(id: string): Promise<Deployment> {
    return prisma.deployment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

export const deploymentService = new DeploymentService();
