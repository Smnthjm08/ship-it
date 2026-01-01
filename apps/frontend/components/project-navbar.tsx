"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectNavBar() {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.id as string;

  const getActiveTab = () => {
    if (pathname === `/project/${projectId}`) return "overview";
    if (pathname.includes("/configurations")) return "configurations";
    if (pathname.includes("/deployments")) return "deployments";
    if (pathname.includes("/environments")) return "environments";
    if (pathname.includes("/settings")) return "settings";
    return "overview";
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: "overview", label: "Overview", href: `/project/${projectId}` },
    {
      id: "deployments",
      label: "Deployments",
      href: `/project/${projectId}/deployments`,
    },
    {
      id: "configurations",
      label: "Configurations",
      href: `/project/${projectId}/configurations`,
    },
    {
      id: "environments",
      label: "Environments",
      href: `/project/${projectId}/environments`,
    },
    {
      id: "settings",
      label: "Settings",
      href: `/project/${projectId}/settings`,
    },
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex items-center px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link key={tab.id} href={tab.href}>
              <button
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
