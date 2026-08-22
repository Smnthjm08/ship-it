"use client";

import { useCallback, useEffect, useState } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { Rocket, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DeploymentTable } from "./deployment-table";
import { useAuth } from "@/components/providers/auth-provider";
import type { PaginatedResponse, PaginationMeta } from "@/types/api";
import { isLiveStatus } from "@/lib/deployment-status";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { cn } from "@/lib/utils";

interface DeploymentRow {
  id: string;
  status: string;
  branch: string;
  createdAt: string;
  updatedAt?: string;
  projectId: string;
  project: { id: string; name: string };
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "COMPLETED", label: "Ready" },
  { value: "FAILED", label: "Error" },
  { value: "BUILDING", label: "Building" },
] as const;

/** Table-shaped skeleton so the layout doesn't jump when rows arrive. */
function TableSkeleton() {
  return (
    <div className="divide-border divide-y rounded-lg border" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function DeploymentsView() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
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

  const fetchDeployments = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!user) return;
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const response = await clientAxios.get<
          PaginatedResponse<DeploymentRow>
        >("/deployments", {
          params: {
            page: currentPage,
            limit,
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(statusFilter && { status: statusFilter }),
          },
        });

        setDeployments(response.data.data);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          "We couldn't reach the ShipIt API. Check your connection and try again.",
        );
        if (!silent) setDeployments([]);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [user, currentPage, debouncedSearch, statusFilter, limit],
  );

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments, retryNonce]);

  const hasLiveBuild = deployments.some((d) => isLiveStatus(d.status));
  const silentRefresh = useCallback(
    () => fetchDeployments({ silent: true }),
    [fetchDeployments],
  );
  useLiveRefresh(silentRefresh, hasLiveBuild);

  if (!user) return null;

  const isFiltered = !!debouncedSearch || !!statusFilter;
  const isPristine =
    !isLoading && !error && !isFiltered && pagination.total === 0;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="mb-8">
        <h1 className="text-display-sm">Deployments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every build across all your projects
        </p>
      </div>

      {!isPristine && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search by project…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search deployments"
            />
          </div>

          {/* Segmented filter, not a dropdown — four known options that the
              user switches between constantly. */}
          <div
            role="group"
            aria-label="Filter by status"
            className="bg-muted flex w-fit items-center gap-0.5 rounded-pill p-0.5"
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "focus-visible:ring-ring rounded-pill px-3 py-1 text-xs font-medium transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Couldn&apos;t load deployments</AlertTitle>
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
      ) : isPristine ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Rocket aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No deployments yet</EmptyTitle>
            <EmptyDescription>
              Builds from any of your projects will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <DeploymentTable
            deployments={deployments.map((d) => ({
              ...d,
              createdAt: new Date(d.createdAt),
              updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
            }))}
            showProject
          />

          {pagination.totalPages > 1 && (
            <nav
              aria-label="Deployments pagination"
              className="mt-6 flex items-center justify-between gap-4"
            >
              <p className="text-muted-foreground text-xs">
                Page {pagination.page} of {pagination.totalPages} ·{" "}
                {pagination.total} total
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
      )}
    </div>
  );
}
