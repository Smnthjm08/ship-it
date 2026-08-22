"use client";

import { RedeployButton } from "@/components/deployments/redeploy-button";

/**
 * Project-level primary action, pinned on small screens only.
 *
 * On desktop the sidebar and page header both surface Redeploy; on mobile the
 * sidebar is a sheet, so without this the main action of the whole section sits
 * behind a hamburger. `pb-[env(safe-area-inset-bottom)]` keeps it clear of the
 * iOS home indicator.
 */
export function MobileActionBar({ projectId }: { projectId: string }) {
  return (
    <div className="bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky bottom-0 z-20 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      <RedeployButton projectId={projectId} className="w-full" />
    </div>
  );
}
