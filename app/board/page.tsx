"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TaskDetailPanel } from "@/components/dashboard/TaskDetailPanel";
import { Card, EmptyState, ErrorMessage, SkeletonList, StatusBadge } from "@/components/ui";
import { getTasks } from "@/lib/api/tasks";
import { useDashboardStore } from "@/store/dashboardStore";
import { fromNow } from "@/lib/utils/formatDate";
import { priorityLabel, priorityVariant } from "@/lib/utils/formatStatus";

const DEFAULT_BOARD_COLUMNS = ["BACKLOG", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"];

export default function BoardPage() {
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId);
  const taskStatusFilter = useDashboardStore((s) => s.taskStatusFilter);
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const selectedTaskId = useDashboardStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useDashboardStore((s) => s.setSelectedTaskId);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
    refetchInterval: 20_000,
  });

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedAgentId) {
        const assignedToAgent =
          task.assignedAgent?.id === selectedAgentId ||
          task.assignedAgentId === selectedAgentId ||
          task.ownerAgentId === selectedAgentId;
        if (!assignedToAgent) return false;
      }

      if (taskStatusFilter !== "ALL" && (task.status ?? "UNKNOWN").toUpperCase() !== taskStatusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;
      const blob = [task.title, task.description, task.status, task.assignedAgent?.name, task.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(normalizedSearch);
    });
  }, [normalizedSearch, selectedAgentId, taskStatusFilter, tasks]);

  const boardColumns = useMemo(() => {
    const statusSet = new Set(DEFAULT_BOARD_COLUMNS);
    filteredTasks.forEach((task) => statusSet.add((task.status ?? "UNKNOWN").toUpperCase()));

    const ordered = Array.from(statusSet);
    return ordered.sort((a, b) => {
      const aIdx = DEFAULT_BOARD_COLUMNS.indexOf(a);
      const bIdx = DEFAULT_BOARD_COLUMNS.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [filteredTasks]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filteredTasks> = {};
    boardColumns.forEach((status) => {
      map[status] = [];
    });
    filteredTasks.forEach((task) => {
      const key = (task.status ?? "UNKNOWN").toUpperCase();
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [boardColumns, filteredTasks]);

  return (
    <DashboardShell>
      <div className="h-full min-h-0">
        {isLoading && <SkeletonList rows={6} />}
        {isError && <ErrorMessage message="Failed to load board tasks" />}
        {!isLoading && !isError && filteredTasks.length === 0 && (
          <EmptyState message="No tasks match current filters" />
        )}

        {!isLoading && !isError && filteredTasks.length > 0 && (
          <div className="h-full min-h-0 overflow-x-auto">
            <div className="grid h-full min-w-[980px] grid-flow-col auto-cols-[280px] gap-3">
              {boardColumns.map((status) => (
                <Card
                  key={status}
                  title={status}
                  titleRight={<span className="text-[10px] text-slate-500">{grouped[status]?.length ?? 0}</span>}
                  className="h-full"
                >
                  <div className="space-y-2">
                    {(grouped[status] ?? []).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                        className="w-full rounded border border-surface-700 bg-surface-800 p-2 text-left hover:bg-surface-700"
                      >
                        <p className="text-xs text-slate-100 line-clamp-2">{task.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <StatusBadge status={status} />
                          {task.priority != null && (
                            <StatusBadge
                              status={priorityLabel(task.priority)}
                              variant={priorityVariant(task.priority)}
                            />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                          {task.assignedAgent && (
                            <span className="flex items-center gap-1 truncate">
                              <FontAwesomeIcon icon={faUser} />
                              {task.assignedAgent.name}
                            </span>
                          )}
                          {task.updatedAt && (
                            <span className="ml-auto flex items-center gap-1">
                              <FontAwesomeIcon icon={faClock} />
                              {fromNow(task.updatedAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-100">Task Details</h2>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="rounded border border-surface-700 bg-surface-800 px-2 py-1 text-slate-300 hover:bg-surface-700"
                aria-label="Close task details"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-60px)] overflow-y-auto p-4">
              <TaskDetailPanel />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
