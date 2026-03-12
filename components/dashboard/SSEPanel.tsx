"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSatelliteDish, faBolt } from "@fortawesome/free-solid-svg-icons";
import { Card, EmptyState } from "@/components/ui";
import { useSSE, type SSEStatus } from "@/lib/sse/useSSE";
import type { SSEEventData } from "@/lib/schemas";
import { formatShortTime } from "@/lib/utils/formatDate";
import { cn } from "@/lib/utils/cn";

const statusColorMap: Record<SSEStatus, string> = {
  connecting: "text-amber-400",
  connected: "text-green-400",
  disconnected: "text-slate-400",
  error: "text-red-400",
};

interface SSEPanelProps {
  status?: SSEStatus;
  events?: SSEEventData[];
}

export function SSEPanel({ status, events }: SSEPanelProps) {
  const stream = useSSE();
  const effectiveStatus = status ?? stream.status;
  const effectiveEvents = events ?? stream.events;

  return (
    <Card
      title="Live Events"
      titleRight={
        <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold", statusColorMap[effectiveStatus])}>
          <FontAwesomeIcon
            icon={faSatelliteDish}
            className={cn(effectiveStatus === "connected" && "animate-pulse")}
          />
          {effectiveStatus.toUpperCase()}
        </div>
      }
      className="h-full"
    >
      {effectiveEvents.length === 0 && <EmptyState message="Waiting for events…" />}

      {effectiveEvents.length > 0 && (
        <div className="space-y-1">
          {effectiveEvents.map((evt, idx) => (
            <div
              key={idx}
              className="rounded border border-surface-700 bg-surface-800 px-2.5 py-1.5 flex items-start gap-2"
            >
              <FontAwesomeIcon icon={faBolt} className="text-amber-400 text-[10px] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-cyan-400 truncate">
                    {evt.event ?? "message"}
                  </span>
                  {evt.receivedAt && (
                    <span className="text-[9px] text-slate-600 shrink-0">
                      {formatShortTime(evt.receivedAt)}
                    </span>
                  )}
                </div>
                {evt.data !== undefined && (
                  <p className="truncate font-mono text-[10px] text-slate-400">
                    {typeof evt.data === "string"
                      ? evt.data
                      : JSON.stringify(evt.data).slice(0, 120)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
