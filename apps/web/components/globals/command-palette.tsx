"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { clientAxios } from "@/lib/axios-instance";
import {
  LayoutDashboard,
  Layers,
  Moon,
  PlusCircle,
  Rocket,
  RotateCw,
  Settings,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { StatusDot } from "@/components/deployments/deployment-status";
import { useRedeploy } from "@/components/deployments/redeploy-button";

interface PaletteProject {
  id: string;
  name: string;
  deployments?: { status: string }[];
}

const PaletteContext = createContext<{ open: () => void }>({
  open: () => {},
});

export const useCommandPalette = () => useContext(PaletteContext);

function projectIdFrom(pathname: string): string | null {
  return pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
}

/**
 * Mounts the palette once and hands the rest of the app an `open()`.
 *
 * Projects load on first open rather than on mount: the palette is the one
 * surface that lists every project, and paying for that on every page load to
 * serve a shortcut most sessions never press is the wrong trade.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<PaletteProject[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();

  const projectId = projectIdFrom(pathname);
  const { redeploy } = useRedeploy(projectId ?? "");

  const open = useCallback(() => setIsOpen(true), []);
  const value = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setIsOpen((wasOpen) => !wasOpen);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen || projects) return;
    clientAxios
      .get<{ data: PaletteProject[] }>("/projects")
      .then((res) => setProjects(res.data.data))
      .catch(() => setProjects([]));
  }, [isOpen, projects]);

  const run = useCallback((action: () => void) => {
    setIsOpen(false);
    action();
  }, []);

  return (
    <PaletteContext.Provider value={value}>
      {children}

      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Command palette"
        description="Jump to a project or run an action"
      >
        {/* This repo's CommandDialog renders only Dialog + DialogContent — it
            does not wrap children in <Command> the way stock shadcn does, so
            the cmdk context has to be established here or CommandInput throws
            "Cannot read properties of undefined (reading 'subscribe')". */}
        <Command>
          <CommandInput placeholder="Search projects and actions…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            <CommandGroup heading="Go to">
              <CommandItem
                onSelect={() => run(() => router.push("/projects"))}
                value="projects all projects"
              >
                <Layers />
                All projects
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => router.push("/deployments"))}
                value="deployments activity"
              >
                <Rocket />
                All deployments
              </CommandItem>
              <CommandItem
                onSelect={() => run(() => router.push("/new"))}
                value="new project import repository"
              >
                <PlusCircle />
                New project
              </CommandItem>
            </CommandGroup>

            {projectId && (
              <>
                <CommandSeparator />
                <CommandGroup heading="This project">
                  <CommandItem
                    onSelect={() =>
                      run(() => router.push(`/projects/${projectId}`))
                    }
                    value="overview this project"
                  >
                    <LayoutDashboard />
                    Overview
                  </CommandItem>
                  <CommandItem
                    onSelect={() =>
                      run(() =>
                        router.push(`/projects/${projectId}/deployments`),
                      )
                    }
                    value="project deployments builds"
                  >
                    <Rocket />
                    Deployments
                  </CommandItem>
                  <CommandItem
                    onSelect={() =>
                      run(() =>
                        router.push(`/projects/${projectId}/environment`),
                      )
                    }
                    value="environment variables secrets env"
                  >
                    <SlidersHorizontal />
                    Environment
                  </CommandItem>
                  <CommandItem
                    onSelect={() =>
                      run(() => router.push(`/projects/${projectId}/settings`))
                    }
                    value="project settings build config"
                  >
                    <Settings />
                    Settings
                  </CommandItem>
                  <CommandItem
                    onSelect={() => run(redeploy)}
                    value="redeploy rebuild ship"
                  >
                    <RotateCw />
                    Redeploy
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {projects && projects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Projects">
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.name} ${project.id}`}
                      onSelect={() =>
                        run(() => router.push(`/projects/${project.id}`))
                      }
                    >
                      <StatusDot status={project.deployments?.[0]?.status} />
                      {project.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup heading="Preferences">
              <CommandItem
                onSelect={() =>
                  run(() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark"),
                  )
                }
                value="theme dark light appearance"
              >
                {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </PaletteContext.Provider>
  );
}

/** Topbar affordance — the shortcut is only discoverable if something shows it. */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { open } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={open}
      className={
        "text-muted-foreground hover:text-foreground hover:border-hairline-strong border-border focus-visible:ring-ring inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none " +
        (className ?? "")
      }
    >
      <span>Search…</span>
      <CommandShortcut className="font-machine text-xs">⌘K</CommandShortcut>
    </button>
  );
}
