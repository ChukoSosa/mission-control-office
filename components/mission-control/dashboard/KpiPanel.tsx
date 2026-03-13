"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupervisorKpis } from "@/lib/api/kpis";
import { Card, Skeleton, EmptyState, ErrorMessage } from "@/components/ui";
import { getRealtimeRefetchInterval } from "@/lib/utils/demoMode";

function formatKpiValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatKpiKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function KpiPanel() {
  const { data: kpis, isLoading, isError } = useQuery({
    queryKey: ["kpis"],
    queryFn: getSupervisorKpis,
    refetchInterval: getRealtimeRefetchInterval(30_000),
  });

  const entries = kpis ? Object.entries(kpis) : [];

  return (
    <Card title="Supervisor KPIs" className="h-full">
      {isLoading && (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorMessage />}

      {!isLoading && !isError && entries.length === 0 && (
        <EmptyState message="No KPI data available" />
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="rounded border border-surface-700 bg-surface-800 px-3 py-2 space-y-0.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500 truncate">
                {formatKpiKey(key)}
              </p>
              <p className="font-mono text-sm font-semibold text-slate-100 truncate">
                {formatKpiValue(value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
