// The single place that knows what a status means. The API speaks the Prisma
// enum, users read "Ready"/"Error". Translating here is what stopped five
// components inventing their own mapping — one compared against a `"success"`
// the API has never returned.

export type DeploymentStatus =
  | "QUEUED"
  | "CLONING"
  | "BUILDING"
  | "FAILED"
  | "COMPLETED";

export type StatusTone = "success" | "error" | "active" | "idle";

export interface StatusMeta {
  /** What the user reads. */
  label: string;
  tone: StatusTone;
  /** Still moving — drives polling and the pulsing dot. */
  isLive: boolean;
}

const STATUS_META: Record<string, StatusMeta> = {
  COMPLETED: { label: "Ready", tone: "success", isLive: false },
  FAILED: { label: "Error", tone: "error", isLive: false },
  BUILDING: { label: "Building", tone: "active", isLive: true },
  CLONING: { label: "Cloning", tone: "active", isLive: true },
  QUEUED: { label: "Queued", tone: "idle", isLive: true },
};

const UNKNOWN: StatusMeta = { label: "Unknown", tone: "idle", isLive: false };

export function statusMeta(status: string | null | undefined): StatusMeta {
  if (!status) return UNKNOWN;
  return STATUS_META[status] ?? UNKNOWN;
}

/** True while the deployment can still change on its own. */
export function isLiveStatus(status: string | null | undefined): boolean {
  return statusMeta(status).isLive;
}

/** The ordered stages a build moves through, for the progress timeline. */
export const BUILD_STAGES = [
  { status: "QUEUED", label: "Queued" },
  { status: "CLONING", label: "Cloning" },
  { status: "BUILDING", label: "Building" },
  { status: "COMPLETED", label: "Ready" },
] as const;

/**
 * Index of the current stage, or -1 when the build failed. Used to decide which
 * timeline steps are done, active, or still ahead.
 */
export function stageIndex(status: string): number {
  return BUILD_STAGES.findIndex((stage) => stage.status === status);
}
