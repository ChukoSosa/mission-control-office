"use client";

import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot, faClock } from "@fortawesome/free-solid-svg-icons";
import { getAgents } from "@/lib/api/agents";
import { useDashboardStore } from "@/store/dashboardStore";
import { Card, StatusBadge, SkeletonList, EmptyState, ErrorMessage } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { fromNow } from "@/lib/utils/formatDate";
import type { Agent } from "@/types";
import { getRealtimeRefetchInterval } from "@/lib/utils/demoMode";

interface AgentsPanelProps {
  onSelectAgent: (agent: Agent) => void;
}

export function AgentsPanel({ onSelectAgent }: AgentsPanelProps) {
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId);

  const { data: agents, isLoading, isError } = useQuery({
    queryKey: ["agents"],
    queryFn: getAgents,
    refetchInterval: getRealtimeRefetchInterval(15_000),
  });

  return (
    <Card title="Agents" className="h-full">
      {isLoading && <SkeletonList rows={4} />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && (!agents || agents.length === 0) && (
        <EmptyState message="No agents found" />
      )}
      {agents && agents.length > 0 && (
        <div className="space-y-2">
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className={cn(
                  "w-full text-left rounded-md border p-3 space-y-1.5 transition-colors",
                  isSelected
                    ? "border-2 border-green-500/70 bg-green-500/10"
                    : "border-surface-700 bg-surface-800 hover:border-surface-600 hover:bg-surface-700",
                )}
              >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FontAwesomeIcon icon={faRobot} className="text-purple-400 shrink-0 text-xs" />
                  <span className="text-sm font-medium text-slate-100 truncate">{agent.name}</span>
                </div>
                <StatusBadge status={agent.status} pulse={agent.status?.toUpperCase() === "RUNNING"} />
              </div>

              {agent.role && (
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{agent.role}</p>
              )}

              {agent.statusMessage && (
                <p className="text-xs text-slate-400 line-clamp-2">{agent.statusMessage}</p>
              )}

              {agent.heartbeat && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <FontAwesomeIcon icon={faClock} />
                  <span>{fromNow(agent.heartbeat)}</span>
                </div>
              )}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
