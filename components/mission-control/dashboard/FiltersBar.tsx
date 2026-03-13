"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faRotateLeft, faBoxArchive } from "@fortawesome/free-solid-svg-icons";
import { getAgents } from "@/lib/api/agents";
import { getTasks } from "@/lib/api/tasks";
import { useDashboardStore } from "@/store/dashboardStore";

export function FiltersBar() {
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useDashboardStore((s) => s.setSelectedAgentId);
  const taskStatusFilter = useDashboardStore((s) => s.taskStatusFilter);
  const setTaskStatusFilter = useDashboardStore((s) => s.setTaskStatusFilter);
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const setSearchQuery = useDashboardStore((s) => s.setSearchQuery);
  const activityLimit = useDashboardStore((s) => s.activityLimit);
  const setActivityLimit = useDashboardStore((s) => s.setActivityLimit);
  const clearFilters = useDashboardStore((s) => s.clearFilters);
  const showArchived = useDashboardStore((s) => s.showArchived);
  const setShowArchived = useDashboardStore((s) => s.setShowArchived);

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: getAgents });
  const { data: tasks = [] } = useQuery({
     queryKey: ["tasks", showArchived],
    queryFn: () => getTasks({ includeArchived: showArchived }),
  });

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.status) set.add(t.status.toUpperCase());
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [tasks]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
        <FontAwesomeIcon icon={faFilter} />
        Filters
      </div>

      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search tasks/activity/agents..."
        className="min-w-[220px] flex-1 rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
      />

      <select
        value={selectedAgentId ?? "ALL"}
        onChange={(e) => setSelectedAgentId(e.target.value === "ALL" ? null : e.target.value)}
        className="rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
      >
        <option value="ALL">All agents</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <select
        value={taskStatusFilter}
        onChange={(e) => setTaskStatusFilter(e.target.value)}
        className="rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status === "ALL" ? "All status" : status}
          </option>
        ))}
      </select>

      <select
        value={activityLimit}
        onChange={(e) => setActivityLimit(Number(e.target.value))}
        className="rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
      >
        <option value={25}>Activity 25</option>
        <option value={50}>Activity 50</option>
        <option value={100}>Activity 100</option>
      </select>

      <button
        onClick={clearFilters}
        className="inline-flex items-center gap-1 rounded border border-surface-700 bg-surface-800 px-2 py-1.5 text-xs text-slate-300 hover:bg-surface-700"
      >
        <FontAwesomeIcon icon={faRotateLeft} />
        Reset
      </button>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs transition ${
            showArchived
              ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
              : "border-surface-700 bg-surface-800 text-slate-400 hover:bg-surface-700"
          }`}
        >
          <FontAwesomeIcon icon={faBoxArchive} />
          Archivadas
        </button>
    </div>
  );
}
