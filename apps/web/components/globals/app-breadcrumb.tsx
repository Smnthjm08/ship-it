"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronRight } from "lucide-react";
import { shortId } from "@/lib/format";

interface Crumb {
  label: string;
  href?: string;
  /** Machine-generated values render in mono. */
  machine?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  deployments: "Deployments",
  environment: "Environment",
  settings: "Settings",
  new: "New project",
  import: "Import",
  profile: "Account",
};

// Replaces the old per-project tab strip: the sidebar carries navigation now, so
// the header only has to answer "where am I".
export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const [projectName, setProjectName] = useState<string | null>(null);

  const projectId = segments[0] === "projects" ? segments[1] : undefined;

  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      return;
    }

    let cancelled = false;
    axios
      .get(`/api/projects/${projectId}`)
      .then((res) => {
        if (!cancelled) setProjectName(res.data?.data?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setProjectName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const crumbs: Crumb[] = [];

  if (segments[0] === "projects") {
    crumbs.push({ label: "Projects", href: "/projects" });

    if (projectId) {
      crumbs.push({
        // Fall back to the id until the name resolves, so the row doesn't jump.
        label: projectName ?? shortId(projectId),
        href: `/projects/${projectId}`,
        machine: !projectName,
      });

      const section = segments[2];
      if (section) {
        crumbs.push({
          label: SECTION_LABELS[section] ?? section,
          href: `/projects/${projectId}/${section}`,
        });
      }

      // A specific deployment.
      if (segments[2] === "deployments" && segments[3]) {
        crumbs.push({ label: shortId(segments[3]), machine: true });
      }
    }
  } else if (segments[0]) {
    crumbs.push({ label: SECTION_LABELS[segments[0]] ?? segments[0] });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0" aria-hidden />
              )}
              {isLast || !crumb.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`text-foreground max-w-48 truncate font-medium ${
                    crumb.machine ? "font-machine text-xs" : ""
                  }`}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground max-w-48 truncate transition-colors duration-150 ease-shipit"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
