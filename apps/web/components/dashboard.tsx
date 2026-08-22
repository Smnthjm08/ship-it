"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import ProjectsCard, { ProjectTypes } from "@/components/cards/projects-card";
import { EmptyProjects } from "@/components/empty-projects";
import { RecentDeployments } from "@/components/dashboard/recent-deployments";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PaginatedResponse, PaginationMeta } from "@/types/api";
import axios from "axios";
import { SessionUser } from "@/types/session";
import { isLiveStatus } from "@/lib/deployment-status";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { cn } from "@/lib/utils";

interface DashboardProps {
  user: SessionUser;
}

/** Card-shaped so nothing jumps when the real cards land. */
function ProjectCardSkeleton() {
  return (
    <div className="border-border bg-card rounded-lg border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-14 rounded-pill" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="size-8 rounded-md" />
      </div>
    </div>
  );
}

export default function Dashboard({ user }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);
  const [projects, setProjects] = useState<ProjectTypes[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProjects = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      // A background refresh must not flash skeletons over content the user
      // is already reading.
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<PaginatedResponse<ProjectTypes>>(
          "/api/projects",
          {
            params: {
              page: currentPage,
              limit,
              ...(debouncedSearch && { search: debouncedSearch }),
            },
          },
        );

        setProjects(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          "We couldn't reach the ShipIt API. Check your connection and try again.",
        );
        if (!silent) setProjects([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [currentPage, debouncedSearch, limit],
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, retryNonce, user.id]);

  // Keep status current while any build is still moving, then go quiet.
  const hasLiveBuild = projects.some((project) =>
    isLiveStatus(project.deployments?.[0]?.status),
  );
  const silentRefresh = useCallback(
    () => fetchProjects({ silent: true }),
    [fetchProjects],
  );
  useLiveRefresh(silentRefresh, hasLiveBuild);

  const firstName = user.name.split(" ")[0];
  const isPristine =
    !isLoading && !error && !debouncedSearch && pagination.total === 0;
  // An empty rail beside an empty grid reads as two failures, not one invitation.
  const showRail = !isPristine;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      {/* Asymmetric: greeting left, action right. Not a centered hero. */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-sm">{firstName}&apos;s projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pagination.total > 0
              ? `${pagination.total} project${pagination.total === 1 ? "" : "s"} connected to GitHub`
              : "Connect a repository to deploy it"}
          </p>
        </div>
        <Button asChild>
          <Link href="/new">
            <PlusCircle aria-hidden />
            New Project
          </Link>
        </Button>
      </div>

      {!isPristine && (
        <div className="mb-6 relative w-full sm:max-w-xs">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search projects"
          />
        </div>
      )}

      {/* Projects lead; the rail stacks below them on narrow screens so the
          primary object is never pushed down the page. */}
      <div
        className={cn(
          "grid items-start gap-6",
          showRail && "lg:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        <div className="min-w-0">
          {isLoading ? (
            <div
              className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3"
              aria-busy="true"
              aria-live="polite"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Couldn&apos;t load your projects</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setRetryNonce((n) => n + 1)}
                >
                  <RefreshCw aria-hidden />
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : projects.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project: ProjectTypes) => (
                  <ProjectsCard key={project.id} project={project} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <nav
                  aria-label="Projects pagination"
                  className="mt-8 flex items-center justify-between gap-4"
                >
                  <p className="text-muted-foreground text-xs">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft aria-hidden />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(pagination.totalPages, p + 1),
                        )
                      }
                      disabled={currentPage === pagination.totalPages}
                    >
                      Next
                      <ChevronRight aria-hidden />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          ) : debouncedSearch ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No projects match that search</EmptyTitle>
                <EmptyDescription>
                  Nothing named &ldquo;{debouncedSearch}&rdquo;. Try a shorter
                  term.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <EmptyProjects />
          )}
        </div>

        {showRail && (
          <RecentDeployments className="lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto" />
        )}
      </div>
    </div>
  );
}
