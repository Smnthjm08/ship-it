"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  GitBranch,
  Terminal,
  MoreHorizontal,
  RotateCw,
  History,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deploymentUrl } from "@/lib/deployment-url";
import { useRedeploy } from "./redeploy-button";
import { DeploymentStatus } from "./deployment-status";
import { absoluteTime, duration, relativeTime, shortId } from "@/lib/format";
import { statusMeta } from "@/lib/deployment-status";

/**
 * Its own component so the hook isn't called inside the row loop — one instance
 * per row keeps the hook count stable.
 */
function RedeployMenuItem({
  projectId,
  isRetry,
}: {
  projectId: string;
  isRetry: boolean;
}) {
  const { redeploy, isRedeploying } = useRedeploy(projectId);

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        redeploy();
      }}
      disabled={isRedeploying}
    >
      <RotateCw className="mr-2 h-4 w-4" />
      {isRetry ? "Retry deployment" : "Redeploy"}
    </DropdownMenuItem>
  );
}

interface Deployment {
  id: string;
  status: string;
  branch: string;
  createdAt: Date;
  updatedAt?: Date | string;
  projectId: string;
  project?: { id: string; name: string };
}

interface DeploymentTableProps {
  deployments: Deployment[];
  showProject?: boolean;
}

export function DeploymentTable({
  deployments,
  showProject = false,
}: DeploymentTableProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  const handleRollback = async (deployment: Deployment) => {
    setIsRollingBack(deployment.id);
    try {
      await clientAxios.post(`/projects/${deployment.projectId}/rollback`, {
        deploymentId: deployment.id,
      });
      // The proxy memoises routes, so the switch isn't instant.
      toast.success("Rolled back — live within 30 seconds");
      router.refresh();
    } catch (error) {
      console.error("Failed to roll back", error);
      toast.error("Failed to roll back");
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleDelete = async (deploymentId: string) => {
    setIsDeleting(deploymentId);
    try {
      await clientAxios.delete(`/deployments/${deploymentId}`);
      toast.success("Deployment deleted");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete deployment", error);
      toast.error("Failed to delete deployment");
    } finally {
      setIsDeleting(null);
    }
  };

  if (deployments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">No deployments yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Every build shows up here with its logs and duration.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop: a table, because comparing runs across columns is the job.
          Numbers and IDs use tabular figures so rows stay aligned. */}
      <div className="hidden rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-35">Status</TableHead>
              {showProject && <TableHead>Project</TableHead>}
              <TableHead>Branch</TableHead>
              <TableHead className="w-30">Age</TableHead>
              <TableHead className="w-25">Duration</TableHead>
              <TableHead className="w-30">Deployment</TableHead>
              <TableHead className="w-15 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => {
              const meta = statusMeta(deployment.status);
              const took = meta.isLive
                ? null
                : duration(deployment.createdAt, deployment.updatedAt);

              return (
                <TableRow key={deployment.id} className="group">
                  <TableCell>
                    {/* The row's primary link. Stretching it across the row
                        would swallow the action menu, so it anchors here and
                        the rest of the row is quiet. */}
                    <Link
                      href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                      className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <DeploymentStatus status={deployment.status} size="sm" />
                    </Link>
                  </TableCell>

                  {showProject && (
                    <TableCell className="font-medium">
                      {deployment.project ? (
                        <Link
                          href={`/projects/${deployment.project.id}`}
                          className="hover:underline"
                        >
                          {deployment.project.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}

                  <TableCell>
                    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                      <GitBranch className="size-3" aria-hidden />
                      <span className="font-machine">{deployment.branch}</span>
                    </span>
                  </TableCell>

                  <TableCell>
                    <time
                      dateTime={new Date(deployment.createdAt).toISOString()}
                      title={absoluteTime(deployment.createdAt)}
                      className="font-machine text-muted-foreground text-xs"
                    >
                      {relativeTime(deployment.createdAt)}
                    </time>
                  </TableCell>

                  <TableCell className="font-machine text-muted-foreground text-xs">
                    {took ?? "—"}
                  </TableCell>

                  <TableCell className="font-machine text-muted-foreground text-xs">
                    {shortId(deployment.id)}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-8 p-0">
                          <span className="sr-only">
                            Actions for deployment {shortId(deployment.id)}
                          </span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                          >
                            <Terminal className="mr-2 h-4 w-4" />
                            View logs
                          </Link>
                        </DropdownMenuItem>
                        {deployment.status === "COMPLETED" && (
                          <DropdownMenuItem asChild>
                            <a
                              href={deploymentUrl(deployment.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visit site
                            </a>
                          </DropdownMenuItem>
                        )}
                        {deployment.status === "COMPLETED" && (
                          <DropdownMenuItem
                            disabled={isRollingBack === deployment.id}
                            onSelect={(e) => {
                              e.preventDefault();
                              handleRollback(deployment);
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Roll back to this
                          </DropdownMenuItem>
                        )}
                        {(deployment.status === "COMPLETED" ||
                          deployment.status === "FAILED") && (
                          <RedeployMenuItem
                            projectId={deployment.projectId}
                            isRetry={deployment.status === "FAILED"}
                          />
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(deployment.id)}
                          disabled={isDeleting === deployment.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards. A six-column table on a 375px screen is a
          scroll-to-read experience, not a list. */}
      <ul className="divide-border divide-y rounded-lg border sm:hidden">
        {deployments.map((deployment) => {
          const meta = statusMeta(deployment.status);
          const took = meta.isLive
            ? null
            : duration(deployment.createdAt, deployment.updatedAt);

          return (
            <li key={deployment.id}>
              <Link
                href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                className="hover:bg-muted/50 focus-visible:ring-ring block p-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between gap-3">
                  <DeploymentStatus status={deployment.status} size="sm" />
                  <time
                    dateTime={new Date(deployment.createdAt).toISOString()}
                    className="font-machine text-muted-foreground text-xs"
                  >
                    {relativeTime(deployment.createdAt)}
                  </time>
                </div>
                <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                  {showProject && deployment.project && (
                    <span className="truncate font-medium">
                      {deployment.project.name}
                    </span>
                  )}
                  <span className="font-machine inline-flex items-center gap-1">
                    <GitBranch className="size-3" aria-hidden />
                    {deployment.branch}
                  </span>
                  {took && <span className="font-machine">{took}</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
