import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { DeploymentTable } from "@/components/deployments/deployment-table";
import { RedeployButton } from "@/components/deployments/redeploy-button";

interface ProjectDeploymentsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDeploymentsPage({
  params,
}: ProjectDeploymentsPageProps) {
  const { projectId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return notFound();
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
      isDeleted: false,
    },
  });

  if (!project) {
    return notFound();
  }

  const deployments = await prisma.deployment.findMany({
    where: {
      projectId: projectId,
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display-sm">Deployments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {deployments.length === 0
              ? "No builds yet for this project."
              : `${deployments.length} build${deployments.length === 1 ? "" : "s"} for ${project.name}.`}
          </p>
        </div>
        <RedeployButton projectId={projectId} size="sm" />
      </div>

      <DeploymentTable deployments={deployments} />
    </div>
  );
}
