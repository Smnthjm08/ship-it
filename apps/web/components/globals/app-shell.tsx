"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { AppBreadcrumb } from "./app-breadcrumb";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import {
  CommandPaletteProvider,
  CommandPaletteTrigger,
} from "./command-palette";
import { MobileActionBar } from "./mobile-action-bar";

/** `/projects/<id>/...` — anything deeper than the list itself. */
const PROJECT_ROUTE = /^\/projects\/[^/]+/;

/**
 * Two shells, chosen by depth.
 *
 * Account routes get a top bar and the full width — at that level the sidebar's
 * only job was listing projects, which the page body already does. Project
 * routes keep it for the section nav and latest deployment.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (!PROJECT_ROUTE.test(pathname)) {
    return (
      <CommandPaletteProvider>
        <div className="flex min-h-svh flex-col">
          <AppTopbar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </CommandPaletteProvider>
    );
  }

  const projectId = pathname.split("/")[2]!;

  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* Same cluster as the top bar, so the account menu doesn't jump
              across the screen when you open a project. */}
          <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1" />
            <AppBreadcrumb />
            <div className="ml-auto flex items-center gap-1">
              <CommandPaletteTrigger className="hidden sm:inline-flex" />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
          <MobileActionBar projectId={projectId} />
        </SidebarInset>
      </SidebarProvider>
    </CommandPaletteProvider>
  );
}
