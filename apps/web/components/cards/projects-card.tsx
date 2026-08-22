import { Button } from "@/components/ui/button";
import { GitBranch, Github } from "lucide-react";
import Link from "next/link";
import { DeploymentStatus } from "@/components/deployments/deployment-status";
import { absoluteTime, relativeTime } from "@/lib/format";

export interface ProjectTypes {
  id: string;
  name: string;
  repoUrl: string;
  owner: string;
  repoName: string;
  branch: string;
  framework?: string | null;
  createdAt: Date;
  deployments?: { id: string; status?: string; createdAt?: string | Date }[];
}

interface ProjectsCardProps {
  project: ProjectTypes;
}

// Answers one question — "is it healthy?" — so status leads and repo metadata
// follows. The whole card is the link, via a stretched anchor rather than a
// wrapping <a>, so the GitHub button can nest inside it.
export default function ProjectsCard({ project }: ProjectsCardProps) {
  const latestDeployment = project.deployments?.[0];

  return (
    <div className="group border-border bg-card focus-within:ring-ring/40 relative flex flex-col rounded-lg border p-5 transition-shadow duration-150 ease-shipit hover:shadow-md focus-within:ring-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {/* Stretched link: the card is the hit target, the heading is the
                accessible name, and nested buttons still work. */}
            <Link
              href={`/projects/${project.id}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {project.name}
            </Link>
          </h3>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs">
            <Github className="size-3 shrink-0" aria-hidden />
            <span className="font-machine truncate">{project.repoName}</span>
          </p>
        </div>

        {project.framework && project.framework !== "NONE" && (
          <span className="text-eyebrow text-muted-foreground bg-muted shrink-0 rounded-pill px-2 py-1">
            {project.framework}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {latestDeployment ? (
          <>
            <DeploymentStatus status={latestDeployment.status} size="sm" />
            {latestDeployment.createdAt && (
              <time
                dateTime={new Date(latestDeployment.createdAt).toISOString()}
                title={absoluteTime(latestDeployment.createdAt)}
                className="text-muted-foreground font-machine text-xs"
              >
                {relativeTime(latestDeployment.createdAt)}
              </time>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">
            No deployments yet
          </span>
        )}
      </div>

      <div className="border-border mt-4 flex items-center justify-between gap-2 border-t pt-4">
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <GitBranch className="size-3 shrink-0" aria-hidden />
          <span className="font-machine truncate">{project.branch}</span>
        </span>

        {/* Relative + z-10 lifts this above the stretched link. */}
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="relative z-10 size-8"
        >
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${project.repoName} on GitHub`}
          >
            <Github className="size-4" aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  );
}
