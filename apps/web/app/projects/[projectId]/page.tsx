import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import {
  ExternalLink,
  Github,
  GitBranch,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deploymentUrl } from "@/lib/deployment-url";
import { RedeployButton } from "@/components/deployments/redeploy-button";
import { DeploymentStatus } from "@/components/deployments/deployment-status";
import { statusMeta } from "@/lib/deployment-status";
import {
  absoluteTime,
  duration,
  relativeTime,
  repoSlug,
  shortId,
} from "@/lib/format";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

/** Last line that looks like a failure — the fastest answer to "what broke?". */
const ERROR_PATTERN =
  /\b(error|failed|failure|npm ERR|ELIFECYCLE|ENOENT|exit code [1-9])\b/i;

export default async function ProjectPage({ params }: ProjectPageProps) {
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
    include: {
      deployments: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      _count: { select: { envVars: true } },
    },
  });

  if (!project) {
    return notFound();
  }

  const [latest, ...previous] = project.deployments;
  const meta = statusMeta(latest?.status);
  const isLive = latest?.status === "COMPLETED";
  const hasFailed = latest?.status === "FAILED";

  // Pull the failing line out of the logs so the user doesn't have to go
  // looking for it — a failed build with no explanation is the worst state
  // this page can be in.
  let failureLine: string | null = null;
  if (hasFailed && latest) {
    const logs = await prisma.deploymentLog.findMany({
      where: { deploymentId: latest.id, isDeleted: false },
      orderBy: { timestamp: "desc" },
      take: 40,
      select: { message: true },
    });
    failureLine =
      logs.find((log) => ERROR_PATTERN.test(log.message))?.message ?? null;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero: status and the live URL lead, repo metadata follows. */}
      <section className="flex flex-col gap-5 border-b pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-display-sm truncate">{project.name}</h1>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground font-machine inline-flex items-center gap-1.5 transition-colors duration-150 ease-shipit"
              >
                <Github className="size-3" aria-hidden />
                {repoSlug(project.repoUrl)}
              </a>
              <span aria-hidden>·</span>
              <span className="font-machine inline-flex items-center gap-1.5">
                <GitBranch className="size-3" aria-hidden />
                {project.branch}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RedeployButton
              projectId={project.id}
              intent={hasFailed ? "retry" : "redeploy"}
              size="sm"
            />
            {isLive && latest && (
              <Button asChild size="sm">
                <a
                  href={deploymentUrl(latest.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink aria-hidden />
                  Visit
                </a>
              </Button>
            )}
          </div>
        </div>

        {latest ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <DeploymentStatus status={latest.status} />
            <span className="text-muted-foreground font-machine text-xs">
              <time
                dateTime={latest.createdAt.toISOString()}
                title={absoluteTime(latest.createdAt)}
              >
                {relativeTime(latest.createdAt)}
              </time>
              {!meta.isLive &&
                (() => {
                  const took = duration(latest.createdAt, latest.updatedAt);
                  return took ? ` · built in ${took}` : "";
                })()}
            </span>
            {isLive && (
              <a
                href={deploymentUrl(latest.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground font-machine truncate text-xs underline underline-offset-4 transition-colors duration-150 ease-shipit"
              >
                {deploymentUrl(latest.id).replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No deployments yet — trigger one to publish this project.
          </p>
        )}
      </section>

      {/* A failed build gets the reason inline, next to the way out of it. */}
      {hasFailed && latest && (
        <section className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="text-destructive mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-destructive text-sm font-medium">
                The last build failed
              </h2>
              {failureLine && (
                <p className="font-machine text-muted-foreground mt-2 line-clamp-3 text-xs wrap-break-word">
                  {failureLine}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/projects/${project.id}/deployments/${latest.id}`}
                  >
                    View full logs
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/projects/${project.id}/settings`}>
                    Check build settings
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Recent deployments — one line each, not a nested card. */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-eyebrow text-muted-foreground">
              Recent deployments
            </h2>
            <Link
              href={`/projects/${project.id}/deployments`}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors duration-150 ease-shipit"
            >
              View all
            </Link>
          </div>

          {project.deployments.length > 0 ? (
            <ul className="divide-border divide-y rounded-lg border">
              {project.deployments.map((deployment) => (
                <li key={deployment.id}>
                  <Link
                    href={`/projects/${project.id}/deployments/${deployment.id}`}
                    className="hover:bg-muted/50 focus-visible:ring-ring flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <DeploymentStatus status={deployment.status} size="sm" />
                    <span className="text-muted-foreground font-machine flex items-center gap-3 text-xs">
                      <span className="hidden sm:inline">
                        {shortId(deployment.id)}
                      </span>
                      <time dateTime={deployment.createdAt.toISOString()}>
                        {relativeTime(deployment.createdAt)}
                      </time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
              Deployments will appear here.
            </p>
          )}

          {previous.length === 0 && latest && (
            <p className="text-muted-foreground mt-2 text-xs">
              This is the first deployment for {project.name}.
            </p>
          )}
        </section>

        {/* Config summary — read-only, but every row links to where it's edited. */}
        <aside className="flex flex-col gap-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-eyebrow text-muted-foreground">Build</h2>
              <Link
                href={`/projects/${project.id}/settings`}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors duration-150 ease-shipit"
              >
                Edit
              </Link>
            </div>
            <dl className="divide-border divide-y rounded-lg border text-xs">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">Framework</dt>
                <dd className="font-machine">{project.framework ?? "NONE"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">Build</dt>
                <dd className="font-machine truncate">
                  {project.buildCommand || "auto"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">Install</dt>
                <dd className="font-machine truncate">
                  {project.installCommand || "auto"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">Output</dt>
                <dd className="font-machine truncate">
                  {project.outputDir || "auto"}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-eyebrow text-muted-foreground mb-3">
              Environment
            </h2>
            <Link
              href={`/projects/${project.id}/environment`}
              className="hover:bg-muted/50 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-lg border px-3 py-3 transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="flex items-center gap-2 text-xs">
                <SlidersHorizontal
                  className="text-muted-foreground size-3.5"
                  aria-hidden
                />
                {project._count.envVars === 0
                  ? "No variables set"
                  : `${project._count.envVars} variable${
                      project._count.envVars === 1 ? "" : "s"
                    }`}
              </span>
              <span className="text-muted-foreground text-xs">Manage</span>
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
