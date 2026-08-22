"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, RefreshCw } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatusDot,
  TEXT_TONE,
} from "@/components/deployments/deployment-status";
import { isLiveStatus, statusMeta } from "@/lib/deployment-status";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { absoluteTime, relativeTime } from "@/lib/format";
import type { PaginatedResponse } from "@/types/api";

interface RecentDeployment {
  id: string;
  status: string;
  branch: string;
  createdAt: string;
  projectId: string;
  project: { id: string; name: string };
}

const LIMIT = 6;

function RowSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-2 py-2.5">
      <Skeleton className="mt-1 size-2 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  );
}

// The grid answers "is each project healthy"; this answers "what just happened",
// which the grid can't — it's ordered by creation date, not activity. Secondary
// surface, so a failed fetch says so quietly rather than alerting.
export function RecentDeployments({ className }: { className?: string }) {
  const [deployments, setDeployments] = useState<RecentDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setIsLoading(true);

      try {
        const res = await axios.get<PaginatedResponse<RecentDeployment>>(
          "/api/deployments",
          { params: { limit: LIMIT } },
        );
        setDeployments(res.data.data);
        setHasError(false);
      } catch {
        setHasError(true);
        if (!silent) setDeployments([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const hasLiveBuild = deployments.some((d) => isLiveStatus(d.status));
  const silentRefresh = useCallback(() => load({ silent: true }), [load]);
  useLiveRefresh(silentRefresh, hasLiveBuild);

  const hasRows = !isLoading && !hasError && deployments.length > 0;

  return (
    <Card size="sm" className={className}>
      <CardHeader className="border-b">
        {/* CardTitle renders a div, so the heading role is declared rather
            than inherited — the rail is a landmark users navigate to. */}
        <CardTitle role="heading" aria-level={2}>
          Recent activity
        </CardTitle>
        {hasLiveBuild && (
          <CardAction>
            {/* "Live" is the label — the dot is decoration, so it carries no
                second screen-reader announcement of its own. */}
            <span className="text-warning text-eyebrow flex items-center gap-1.5">
              <span className="relative flex size-2" aria-hidden>
                <span className="bg-warning absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                <span className="bg-warning relative inline-flex size-2 rounded-full" />
              </span>
              Live
            </span>
          </CardAction>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-2 text-center">
            <p className="text-muted-foreground text-xs">
              Couldn&apos;t load recent activity.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => load()}
            >
              <RefreshCw aria-hidden />
              Retry
            </Button>
          </div>
        ) : deployments.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            Builds will show up here as they run.
          </p>
        ) : (
          <ItemGroup className="gap-0">
            {deployments.map((deployment) => {
              const meta = statusMeta(deployment.status);
              return (
                <Item key={deployment.id} size="sm" className="px-2" asChild>
                  <Link
                    href={`/projects/${deployment.projectId}/deployments/${deployment.id}`}
                  >
                    <ItemMedia>
                      <StatusDot status={deployment.status} />
                    </ItemMedia>
                    <ItemContent className="gap-0.5">
                      <ItemTitle>{deployment.project.name}</ItemTitle>
                      <ItemDescription className="flex items-center gap-1.5 text-xs">
                        <span className={TEXT_TONE[meta.tone]}>
                          {meta.label}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="font-machine truncate">
                          {deployment.branch}
                        </span>
                      </ItemDescription>
                    </ItemContent>
                    <time
                      dateTime={new Date(deployment.createdAt).toISOString()}
                      title={absoluteTime(deployment.createdAt)}
                      className="text-muted-foreground font-machine shrink-0 self-start text-xs"
                    >
                      {relativeTime(deployment.createdAt)}
                    </time>
                  </Link>
                </Item>
              );
            })}
          </ItemGroup>
        )}
      </CardContent>

      {hasRows && (
        <CardFooter className="border-t">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground w-full justify-between"
          >
            <Link href="/deployments">
              All deployments
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
