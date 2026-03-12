"use client";

import { AgentsPanel } from "@/components/dashboard/AgentsPanel";
import { TasksPanel } from "@/components/dashboard/TasksPanel";
import { TaskDetailPanel } from "@/components/dashboard/TaskDetailPanel";
import { ActivityFeedPanel } from "@/components/dashboard/ActivityFeedPanel";
import { KpiPanel } from "@/components/dashboard/KpiPanel";
import { SSEPanel } from "@/components/dashboard/SSEPanel";
import { useDashboardStore } from "@/store/dashboardStore";

export default function DashboardPage() {
  const selectedAgentId = useDashboardStore((s) => s.selectedAgentId);
  const setSelectedAgentId = useDashboardStore((s) => s.setSelectedAgentId);
  const setSelectedTaskId = useDashboardStore((s) => s.setSelectedTaskId);

  return (
    <div className="h-full grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_1fr_280px] xl:grid-cols-[300px_1fr_1fr_300px] overflow-hidden">
      <AgentsPanel
        onSelectAgent={(agent) => {
          const nextAgentId = selectedAgentId === agent.id ? null : agent.id;
          setSelectedAgentId(nextAgentId);
          setSelectedTaskId(null);
        }}
      />
      <TasksPanel />
      <TaskDetailPanel />

      <div className="flex flex-col gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <ActivityFeedPanel />
        </div>
        <div className="shrink-0">
          <KpiPanel />
        </div>
        <div className="shrink-0">
          <SSEPanel />
        </div>
      </div>
    </div>
  );
}
