"use client";

import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListCheck, faClock, faUser } from "@fortawesome/free-solid-svg-icons";
import { getTasks } from "@/lib/api/tasks";
import { useDashboardStore } from "@/store/dashboardStore";
import { Card, StatusBadge, SkeletonList, EmptyState, ErrorMessage } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { fromNow } from "@/lib/utils/formatDate";
import { priorityLabel, priorityVariant } from "@/lib/utils/formatStatus";

export function TasksPanel() {
  const selectedTaskId = useDashboardStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useDashboardStore((s) => s.setSelectedTaskId);
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId);
  const taskStatusFilter = useDashboardStore((s) => s.taskStatusFilter);
  const searchQuery = useDashboardStore((s) => s.searchQuery);
    const showArchived = useDashboardStore((s) => s.showArchived);

  const { data: tasks, isLoading, isError } = useQuery({
      queryKey: ["tasks", showArchived],
      queryFn: () => getTasks({ includeArchived: showArchived }),
    refetchInterval: 20_000,
  });

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTasks = (tasks ?? []).filter((task) => {
    const matchesAgent =
      !selectedAgentId ||
      task.assignedAgent?.id === selectedAgentId ||
      task.assignedAgentId === selectedAgentId ||
      task.ownerAgentId === selectedAgentId;

    const matchesStatus =
      taskStatusFilter === "ALL" || (task.status ?? "UNKNOWN").toUpperCase() === taskStatusFilter;

    const searchText = [
      task.title,
      task.id,
      task.status,
      task.assignedAgent?.name,
      task.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !normalizedSearch || searchText.includes(normalizedSearch);
    return matchesAgent && matchesStatus && matchesSearch;
  });

  return (
    <Card
      title="Tasks"
      titleRight={
        tasks && (
          <span className="font-mono text-[10px] text-slate-500">{filteredTasks.length}/{tasks.length}</span>
        )
      }
      className="h-full"
    >
      {isLoading && <SkeletonList rows={5} />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && (!tasks || tasks.length === 0) && (
        <EmptyState message="No tasks found" />
      )}
      {filteredTasks.length > 0 && (
        <div className="space-y-1.5">
          {filteredTasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                className={cn(
                  "w-full text-left rounded-md border p-3 transition-colors",
                  isSelected
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-surface-700 bg-surface-800 hover:border-surface-600 hover:bg-surface-700",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FontAwesomeIcon icon={faListCheck} className="text-cyan-400 shrink-0 text-xs" />
                    <span className="text-sm font-medium text-slate-100 leading-snug line-clamp-2">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.priority != null && (
                      <StatusBadge
                        status={priorityLabel(task.priority)}
                        variant={priorityVariant(task.priority)}
                      />
                    )}
                    <StatusBadge status={task.status} pulse={task.status === "IN_PROGRESS"} />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  {task.assignedAgent && (
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUser} />
                      {task.assignedAgent.name}
                    </span>
                  )}
                  {task.updatedAt && (
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faClock} />
                      {fromNow(task.updatedAt)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
