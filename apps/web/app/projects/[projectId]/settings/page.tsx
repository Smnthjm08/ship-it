import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { EditProjectForm } from "./edit-project-form";
import { BuildConfigForm, type Framework } from "./build-config-form";
import { DeleteProjectSection } from "./delete-project-section";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
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

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-display-sm">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configuration for {project.name}. Build changes take effect on the
          next deployment.
        </p>
      </div>

      <EditProjectForm
        projectId={projectId}
        initialName={project.name}
        initialDescription={project.description}
      />

      <BuildConfigForm
        projectId={projectId}
        initial={{
          framework: (project.framework ?? "NONE") as Framework,
          buildCommand: project.buildCommand ?? "",
          installCommand: project.installCommand ?? "",
          rootDir: project.rootDir ?? "",
          outputDir: project.outputDir ?? "",
          branch: project.branch,
        }}
      />

      <DeleteProjectSection projectId={projectId} projectName={project.name} />
    </div>
  );
}
