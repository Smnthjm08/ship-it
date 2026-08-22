"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ExternalLink,
  LayoutDashboard,
  Layers,
  PlusCircle,
  Rocket,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { StatusDot } from "@/components/deployments/deployment-status";
import { deploymentUrl } from "@/lib/deployment-url";
import { relativeTime } from "@/lib/format";
import { isLiveStatus } from "@/lib/deployment-status";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { cn } from "@/lib/utils";

interface SidebarProject {
  id: string;
  name: string;
  deployments?: { id: string; status: string; createdAt: string }[];
}

/** `/projects/<id>/...` → the id, or null at the account level. */
function useProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

const ACCOUNT_NAV = [
  { title: "Projects", href: "/projects", icon: Layers },
  { title: "Deployments", href: "/deployments", icon: Rocket },
];

/**
 * The sidebar has two modes.
 *
 * At the account level it lists your projects and their live status. Once you
 * open a project it becomes that project's sidebar — nav plus the latest
 * deployment — which is what makes deep navigation feel like you're somewhere
 * rather than just further down a URL.
 *
 * It deliberately carries no primary action and no account menu: every project
 * page renders its own redeploy button next to the status it acts on, and the
 * account menu lives in the header so it sits in one place across both shells.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const projectId = useProjectId(pathname);

  return (
    <Sidebar variant="inset" collapsible="icon">
      {projectId ? (
        <ProjectSidebar projectId={projectId} pathname={pathname} />
      ) : (
        <AccountSidebar pathname={pathname} />
      )}
    </Sidebar>
  );
}

function SidebarBrand() {
  return (
    <Link
      href="/projects"
      className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <div className="bg-primary text-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
        <Image src="/logo.svg" alt="" width={16} height={16} />
      </div>
      <span className="truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
        ShipIt
      </span>
    </Link>
  );
}

function AccountSidebar({ pathname }: { pathname: string }) {
  const [projects, setProjects] = useState<SidebarProject[]>([]);

  const load = async () => {
    try {
      const res = await axios.get<{ data: SidebarProject[] }>("/api/projects", {
        params: { limit: 5 },
      });
      setProjects(res.data.data);
    } catch {
      // The sidebar is ambient — a failed fetch just means no recent list.
      setProjects([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasLiveBuild = projects.some((p) =>
    isLiveStatus(p.deployments?.[0]?.status),
  );
  useLiveRefresh(load, hasLiveBuild);

  return (
    <>
      <SidebarHeader>
        <SidebarBrand />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="New Project"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <Link href="/new">
                <PlusCircle />
                <span>New Project</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ACCOUNT_NAV.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projects.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild tooltip={project.name}>
                      <Link href={`/projects/${project.id}`}>
                        <StatusDot status={project.deployments?.[0]?.status} />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </>
  );
}

function ProjectSidebar({
  projectId,
  pathname,
}: {
  projectId: string;
  pathname: string;
}) {
  const [project, setProject] = useState<{
    name: string;
    deployments?: { id: string; status: string; createdAt: string }[];
    _count?: { envVars: number; deployments: number };
  } | null>(null);

  const load = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}`);
      setProject(res.data.data);
    } catch {
      setProject(null);
    }
  };

  useEffect(() => {
    load();
    // Re-fetch when the user switches projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const latest = project?.deployments?.[0];
  useLiveRefresh(load, isLiveStatus(latest?.status));

  const nav = [
    {
      title: "Overview",
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "Deployments",
      href: `/projects/${projectId}/deployments`,
      icon: Rocket,
      count: project?._count?.deployments,
    },
    {
      title: "Environment",
      href: `/projects/${projectId}/environment`,
      icon: SlidersHorizontal,
      count: project?._count?.envVars,
    },
    {
      title: "Settings",
      href: `/projects/${projectId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <>
      <SidebarHeader>
        {/* No back link here: the header breadcrumb's "Projects" crumb is the
            escape hatch, and two of them in the same corner is noise. */}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex aspect-square size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
            {project?.name?.[0]?.toUpperCase() ?? "·"}
          </div>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {project?.name ?? "Loading…"}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "relative",
                        // Active must differ from hover, not just from rest —
                        // hence the marker bar, which is geometry rather than
                        // colour and so survives greyscale.
                        isActive
                          ? "before:bg-sidebar-primary [&>svg]:text-sidebar-primary before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full"
                          : "text-muted-foreground [&>svg]:text-muted-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                        {typeof item.count === "number" && item.count > 0 && (
                          <span className="text-muted-foreground font-machine ml-auto text-xs group-data-[collapsible=icon]:hidden">
                            {item.count}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {latest && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Latest deployment</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <Link
                href={`/projects/${projectId}/deployments/${latest.id}`}
                className="hover:bg-sidebar-accent focus-visible:ring-ring block rounded-md px-2 py-1.5 transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <StatusDot status={latest.status} />
                  {latest.status === "COMPLETED"
                    ? "Ready"
                    : latest.status === "FAILED"
                      ? "Error"
                      : "Building"}
                </span>
                <span className="text-muted-foreground font-machine mt-0.5 block text-xs">
                  {relativeTime(latest.createdAt)}
                </span>
              </Link>

              {latest.status === "COMPLETED" && (
                <a
                  href={deploymentUrl(latest.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors duration-150 ease-shipit"
                >
                  <ExternalLink className="size-3" aria-hidden />
                  Visit site
                </a>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </>
  );
}
