"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusDot } from "@/components/deployments/deployment-status";
import { cn } from "@/lib/utils";

interface SwitcherProject {
  id: string;
  name: string;
  deployments?: { status: string }[];
}

/**
 * The project identity row, doubling as the way out of it.
 *
 * Collapsed to just the initial in icon mode — the popover still opens, so
 * switching never requires expanding the sidebar first.
 */
export function ProjectSwitcher({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<SwitcherProject[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen || projects) return;
    axios
      .get<{ data: SwitcherProject[] }>("/api/projects")
      .then((res) => setProjects(res.data.data))
      .catch(() => setProjects([]));
  }, [isOpen, projects]);

  const initial = projectName?.[0]?.toUpperCase() ?? "·";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="hover:bg-sidebar-accent focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 ease-shipit focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Switch project. Current: ${projectName ?? "loading"}`}
      >
        <span className="bg-primary text-primary-foreground flex aspect-square size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
          {initial}
        </span>
        <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
          {projectName ?? "Loading…"}
        </span>
        <ChevronsUpDown className="text-muted-foreground ml-auto size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Find project…" />
          <CommandList>
            <CommandEmpty>
              {projects ? "No projects found." : "Loading…"}
            </CommandEmpty>
            <CommandGroup>
              {projects?.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.id}`}
                  onSelect={() => {
                    setIsOpen(false);
                    if (project.id !== projectId) {
                      router.push(`/projects/${project.id}`);
                    }
                  }}
                >
                  <StatusDot status={project.deployments?.[0]?.status} />
                  <span className="truncate">{project.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4",
                      project.id === projectId ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
