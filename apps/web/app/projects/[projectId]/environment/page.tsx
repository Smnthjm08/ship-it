import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { EnvVarsForm } from "./env-vars-form";

interface EnvironmentPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EnvironmentPage({
  params,
}: EnvironmentPageProps) {
  const { projectId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return notFound();
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id, isDeleted: false },
    include: {
      envVars: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" } },
      deployments: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) {
    return notFound();
  }

  // Variables edited after the last build are not live yet — the form turns
  // this into a "redeploy to apply" prompt, which is the whole point of
  // giving environment its own page.
  const lastDeployedAt = project.deployments[0]?.createdAt ?? null;
  const lastChangedAt = project.envVars[0]?.updatedAt ?? null;
  const isStale =
    !!lastChangedAt && (!lastDeployedAt || lastChangedAt > lastDeployedAt);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-display-sm">Environment</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Variables written to <code className="font-machine">.env</code> in
          your project root and exported to the build.
        </p>
      </div>

      <EnvVarsForm
        projectId={projectId}
        framework={project.framework}
        isStale={isStale}
      />
    </div>
  );
}
