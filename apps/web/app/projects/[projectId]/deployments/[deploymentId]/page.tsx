import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, GitBranch } from "lucide-react";
import { DeploymentLogs } from "./deployment-logs";
import { branchUrl, deploymentUrl } from "@/lib/deployment-url";
import { RedeployButton } from "@/components/deployments/redeploy-button";
import { absoluteTime, duration, relativeTime, shortId } from "@/lib/format";
import { statusMeta } from "@/lib/deployment-status";

interface DeploymentPageProps {
  params: Promise<{ projectId: string; deploymentId: string }>;
}

export default async function DeploymentPage({ params }: DeploymentPageProps) {
  const { projectId, deploymentId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return notFound();
  }

  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      projectId,
      isDeleted: false,
      project: { userId: session.user.id, isDeleted: false },
    },
    include: {
      project: true,
      logs: {
        where: { isDeleted: false },
        orderBy: { timestamp: "asc" },
        take: 1000,
      },
    },
  });

  if (!deployment) {
    return notFound();
  }

  const meta = statusMeta(deployment.status);
  const took = meta.isLive
    ? null
    : duration(deployment.createdAt, deployment.updatedAt);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/projects/${projectId}/deployments`}
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors duration-150 ease-shipit"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All deployments
          </Link>

          <h1 className="text-display-sm truncate">
            {deployment.project.name}
          </h1>

          {/* Machine facts on one line, in mono, so they read as data. */}
          <div className="text-muted-foreground font-machine mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {/* The branch name links to its preview, which tracks the newest
                completed build of that branch rather than this one build. */}
            {deployment.status === "COMPLETED" ? (
              <a
                href={branchUrl(deployment.branch, deployment.project.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150 ease-shipit"
                title={`Preview for ${deployment.branch}`}
              >
                <GitBranch className="size-3" aria-hidden />
                {deployment.branch}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3" aria-hidden />
                {deployment.branch}
              </span>
            )}
            <span aria-hidden>·</span>
            <span title={deployment.id}>{shortId(deployment.id)}</span>
            <span aria-hidden>·</span>
            <time
              dateTime={deployment.createdAt.toISOString()}
              title={absoluteTime(deployment.createdAt)}
            >
              {relativeTime(deployment.createdAt)}
            </time>
            {took && (
              <>
                <span aria-hidden>·</span>
                <span>built in {took}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(deployment.status === "FAILED" ||
            deployment.status === "COMPLETED") && (
            <RedeployButton
              projectId={projectId}
              intent={deployment.status === "FAILED" ? "retry" : "redeploy"}
              size="sm"
            />
          )}
          {deployment.status === "COMPLETED" && (
            <Button asChild size="sm">
              <a
                href={deploymentUrl(deployment.id)}
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

      <DeploymentLogs
        deploymentId={deployment.id}
        initialStatus={deployment.status}
        startedAt={deployment.createdAt.toISOString()}
        initialLogs={deployment.logs.map((log) => ({
          id: log.id,
          message: log.message,
          timestamp: log.timestamp.toISOString(),
        }))}
      />
    </div>
  );
}
