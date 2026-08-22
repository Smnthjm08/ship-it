"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  Copy,
  Download,
  Search,
  TriangleAlert,
  WrapText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DeploymentStatus } from "@/components/deployments/deployment-status";
import { BUILD_STAGES, statusMeta, stageIndex } from "@/lib/deployment-status";
import { elapsed } from "@/lib/format";

export interface LogLine {
  id: string;
  message: string;
  timestamp: string;
}

interface DeploymentLogsProps {
  deploymentId: string;
  initialLogs: LogLine[];
  initialStatus: string;
  /** Deployment createdAt — drives the elapsed clock while a build runs. */
  startedAt: string;
}

const TERMINAL_STATUSES = ["COMPLETED", "FAILED"];

/** Lines worth jumping to. Build tools are inconsistent, so cast a wide net. */
const ERROR_PATTERN =
  /\b(error|failed|failure|npm ERR|ELIFECYCLE|ENOENT|exit code [1-9])\b/i;

// Streams from ws-server, falling back to polling REST when the socket won't
// open, so logs still appear if ws-server is down. Search, copy, download and
// jump-to-error are what make a failed build diagnosable instead of just visible.
export function DeploymentLogs({
  deploymentId,
  initialLogs,
  initialStatus,
  startedAt,
}: DeploymentLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>(initialLogs);
  const [status, setStatus] = useState(initialStatus);
  const [connection, setConnection] = useState<"live" | "polling" | "closed">(
    TERMINAL_STATUSES.includes(initialStatus) ? "closed" : "live",
  );
  const [query, setQuery] = useState("");
  const [wrap, setWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  // Latest logs, readable from the poller without re-running the stream effect.
  const logsRef = useRef(logs);
  logsRef.current = logs;

  const isLive = statusMeta(status).isLive;

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status)) return;

    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let finished = false;

    const appendLine = (message: string, timestamp: string) => {
      setLogs((prev) => {
        const last = prev[prev.length - 1];
        // The socket replays history on connect — don't duplicate what we have.
        if (last && last.timestamp >= timestamp && last.message === message) {
          return prev;
        }
        return [
          ...prev,
          { id: `${timestamp}-${prev.length}`, message, timestamp },
        ];
      });
    };

    const startPolling = () => {
      if (cancelled || finished || pollTimer) return;
      setConnection("polling");

      const poll = async () => {
        try {
          const after = logsRef.current.at(-1)?.timestamp;
          // NEXT_PUBLIC_API_BASE_URL already includes the /api/v1 prefix — see
          // lib/axios-instance.ts, whose callers request bare "/new".
          const url = new URL(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/deployments/${deploymentId}/logs`,
          );
          if (after) url.searchParams.set("after", after);

          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) return;

          const body = await res.json();
          for (const log of body.data.logs as {
            message: string;
            timestamp: string;
          }[]) {
            appendLine(log.message, log.timestamp);
          }
          setStatus(body.data.status);
          if (TERMINAL_STATUSES.includes(body.data.status)) {
            finished = true;
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
            setConnection("closed");
          }
        } catch (e) {
          console.error("Failed to poll deployment logs", e);
        }
      };

      void poll();
      pollTimer = setInterval(poll, 3000);
    };

    try {
      const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3003";
      socket = new WebSocket(`${base}/deployments/${deploymentId}/logs`);

      socket.onopen = () => setConnection("live");

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          message: string;
          timestamp: string;
          status?: string;
          done?: boolean;
        };
        appendLine(payload.message, payload.timestamp);
        if (payload.status) setStatus(payload.status);
        if (payload.done) {
          finished = true;
          setConnection("closed");
        }
      };

      socket.onerror = () => socket?.close();

      socket.onclose = () => {
        if (cancelled || finished) return;
        // We lost the stream before the build ended — keep showing output by
        // polling the REST endpoint instead.
        startPolling();
      };
    } catch (e) {
      console.error("Failed to open log socket", e);
      startPolling();
    }

    return () => {
      cancelled = true;
      socket?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
    // Re-subscribing on every log line would tear down the socket constantly —
    // this effect only depends on which deployment we're watching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId]);

  // Elapsed clock, only while something is actually running.
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  useEffect(() => {
    if (autoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScroll.current = atBottom;
    setPinned(atBottom);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    autoScroll.current = true;
    setPinned(true);
  };

  const visibleLogs = useMemo(() => {
    if (!query.trim()) return logs;
    const needle = query.toLowerCase();
    return logs.filter((log) => log.message.toLowerCase().includes(needle));
  }, [logs, query]);

  const firstErrorId = useMemo(
    () => logs.find((log) => ERROR_PATTERN.test(log.message))?.id ?? null,
    [logs],
  );

  const jumpToFirstError = () => {
    if (!firstErrorId) return;
    // Stop auto-scroll first, or the next line yanks the view back down.
    autoScroll.current = false;
    setPinned(false);
    document
      .getElementById(`log-${firstErrorId}`)
      ?.scrollIntoView({ block: "center" });
  };

  const asText = () =>
    logs
      .map((log) => `[${new Date(log.timestamp).toISOString()}] ${log.message}`)
      .join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable over plain http on some browsers.
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([asText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shipit-${deploymentId}.log`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const currentStage = stageIndex(status);
  const hasFailed = status === "FAILED";

  return (
    <div className="flex flex-col gap-4">
      {/* Stage timeline — turns opaque waiting into visible progress. */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {BUILD_STAGES.map((stage, index) => {
          const done = !hasFailed && currentStage > index;
          const active = !hasFailed && currentStage === index;
          const failedHere = hasFailed && index === BUILD_STAGES.length - 1;

          return (
            <li key={stage.status} className="flex items-center gap-2">
              <span
                className={cn(
                  "text-eyebrow transition-colors duration-150 ease-shipit",
                  failedHere && "text-destructive",
                  done && "text-foreground",
                  active && "text-foreground",
                  !done && !active && !failedHere && "text-muted-foreground/60",
                )}
              >
                {failedHere ? "Failed" : stage.label}
              </span>
              {index < BUILD_STAGES.length - 1 && (
                <span
                  className={cn(
                    "h-px w-6",
                    done ? "bg-foreground/40" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="overflow-hidden rounded-lg border">
        <div className="border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DeploymentStatus status={status} size="sm" />
              {isLive && (
                <span className="font-machine text-muted-foreground text-xs">
                  {elapsed(startedAt, now)}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {logs.length} line{logs.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {firstErrorId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={jumpToFirstError}
                  className="text-destructive hover:text-destructive"
                >
                  <TriangleAlert aria-hidden />
                  First error
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setWrap((w) => !w)}
                aria-pressed={wrap}
                aria-label={wrap ? "Disable line wrap" : "Enable line wrap"}
              >
                <WrapText aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleCopy}
                aria-label="Copy all logs"
              >
                {copied ? (
                  <Check className="text-success" aria-hidden />
                ) : (
                  <Copy aria-hidden />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={handleDownload}
                aria-label="Download logs"
              >
                <Download aria-hidden />
              </Button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter output…"
              aria-label="Filter build output"
              className="font-machine h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className={cn(
              "bg-muted/40 max-h-[60vh] overflow-auto p-4 font-machine text-xs leading-relaxed",
              !wrap && "overflow-x-auto",
            )}
          >
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                Waiting for output. Lines appear here as the build runs.
              </p>
            ) : visibleLogs.length === 0 ? (
              <p className="text-muted-foreground">
                No lines match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              visibleLogs.map((log) => {
                const isError = ERROR_PATTERN.test(log.message);
                return (
                  <div
                    key={log.id}
                    id={`log-${log.id}`}
                    className={cn("flex gap-3", isError && "text-destructive")}
                  >
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        wrap
                          ? "wrap-break-word whitespace-pre-wrap"
                          : "whitespace-pre",
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* The auto-scroll behaviour already existed but was invisible —
              this makes the paused state legible and recoverable. */}
          {!pinned && logs.length > 0 && (
            <Button
              size="sm"
              onClick={jumpToBottom}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
            >
              <ArrowDown aria-hidden />
              Jump to latest
            </Button>
          )}
        </div>

        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 rounded-full",
                connection === "live"
                  ? "bg-success"
                  : connection === "polling"
                    ? "bg-warning"
                    : "bg-muted-foreground",
              )}
              aria-hidden
            />
            {connection === "live"
              ? "Streaming"
              : connection === "polling"
                ? "Polling — live stream unavailable"
                : "Stream closed"}
          </span>
          {query && (
            <span>
              {visibleLogs.length} of {logs.length} lines
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
