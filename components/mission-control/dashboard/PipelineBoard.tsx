"use client";

import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faUser, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { getPipelines } from "@/lib/api/pipelines";
import { useDashboardStore } from "@/store/dashboardStore";
import { Card, SkeletonList, EmptyState, ErrorMessage, StatusBadge } from "@/components/ui";
import { fromNow } from "@/lib/utils/formatDate";
import { priorityLabel, priorityVariant } from "@/lib/utils/formatStatus";

export function PipelineBoard() {
  const setSelectedTaskId = useDashboardStore((s) => s.setSelectedTaskId);
  const selectedTaskId = useDashboardStore((s) => s.selectedTaskId);

  const { data: pipelines = [], isLoading, isError } = useQuery({
    queryKey: ["pipelines"],
    queryFn: getPipelines,
    refetchInterval: 30_000,
  });

  if (isLoading) return <SkeletonList rows={4} />;
  if (isError) return <ErrorMessage message="Failed to load pipelines" />;
  if (pipelines.length === 0) return <EmptyState message="No pipelines configured" />;

  return (
    <div className="space-y-6">
      {pipelines.map((pipeline) => (
        <div key={pipeline.id}>
          {/* Pipeline header */}
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faCodeBranch} className="text-cyan-400 text-xs" />
            <h2 className="text-sm font-semibold text-slate-200">{pipeline.name}</h2>
            {pipeline.description && (
              <span className="text-[11px] text-slate-500">{pipeline.description}</span>
            )}
            <span className="ml-auto text-[10px] rounded border border-surface-600 bg-surface-800 px-1.5 py-0.5 text-slate-500">
              {pipeline.type}
            </span>
          </div>

          {/* Stages as lanes */}
          <div className="overflow-x-auto">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${pipeline.stages.length}, minmax(220px, 1fr))` }}
            >
              {pipeline.stages.map((stage) => (
                <Card
                  key={stage.id}
                  title={stage.name}
                  titleRight={
                    <span className="text-[10px] text-slate-500">{stage.tasks.length}</span>
                  }
                  className="min-h-[120px]"
                >
                  {stage.tasks.length === 0 && (
                    <EmptyState message="No tasks" />
                  )}
                  <div className="space-y-2">
                    {stage.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() =>
                          setSelectedTaskId(selectedTaskId === task.id ? null : task.id)
                        }
                        className="w-full rounded border border-surface-700 bg-surface-800 p-2 text-left hover:bg-surface-700 transition-colors"
                      >
                        <p className="text-xs text-slate-100 line-clamp-2">{task.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <StatusBadge status={task.status} />
                          {task.priority != null && (
                            <StatusBadge
                              status={priorityLabel(task.priority)}
                              variant={priorityVariant(task.priority)}
                            />
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
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
        </div>
      ))}
    </div>
  );
}
