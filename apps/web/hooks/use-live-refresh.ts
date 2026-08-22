"use client";

import { useEffect } from "react";

// Re-runs `refresh` while `enabled`. Callers pass "any deployment is still
// queued, cloning or building", so a screen of finished builds stops polling.
export function useLiveRefresh(
  refresh: () => void,
  enabled: boolean,
  intervalMs = 5000,
) {
  useEffect(() => {
    if (!enabled) return;

    // Pause while the tab is hidden; refresh once on the way back so the user
    // never returns to stale status.
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, enabled, intervalMs]);
}
