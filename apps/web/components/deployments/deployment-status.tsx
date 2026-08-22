import { cn } from "@/lib/utils";
import { statusMeta, type StatusTone } from "@/lib/deployment-status";

const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-success",
  error: "bg-destructive",
  active: "bg-warning",
  idle: "bg-muted-foreground",
};

/** Exported so surfaces that lay out status text themselves — the activity
 *  rail, for one — don't re-derive the tone→class mapping. */
export const TEXT_TONE: Record<StatusTone, string> = {
  success: "text-success",
  error: "text-destructive",
  active: "text-warning",
  idle: "text-muted-foreground",
};

// Dot alone, for tight surfaces like the sidebar. Colour can't carry meaning by
// itself, so every dot has an sr-only label and visible text wherever there's room.
export function StatusDot({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const meta = statusMeta(status);

  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      {meta.isLive && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            DOT_TONE[meta.tone],
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          DOT_TONE[meta.tone],
        )}
        aria-hidden
      />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

/**
 * Dot plus label. This is the canonical way to render a deployment status —
 * import it rather than mapping the enum again.
 */
export function DeploymentStatus({
  status,
  className,
  size = "default",
}: {
  status: string | null | undefined;
  className?: string;
  size?: "default" | "sm";
}) {
  const meta = statusMeta(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        TEXT_TONE[meta.tone],
        className,
      )}
    >
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
