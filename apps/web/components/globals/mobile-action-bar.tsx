"use client";

import { RedeployButton } from "@/components/deployments/redeploy-button";

// On mobile the sidebar is a sheet, so the section's main action would sit
// behind a hamburger without this. The padding clears the iOS home indicator.
export function MobileActionBar({ projectId }: { projectId: string }) {
  return (
    <div className="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky bottom-0 z-20 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      <RedeployButton projectId={projectId} className="w-full" />
    </div>
  );
}
