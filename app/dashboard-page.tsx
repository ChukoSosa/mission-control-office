"use client";

import { useState } from "react";
import { AgentsPanel } from "@/components/dashboard/AgentsPanel";
import { TasksPanel } from "@/components/dashboard/TasksPanel";
import { TaskDetailPanel } from "@/components/dashboard/TaskDetailPanel";
import { ActivityFeedPanel } from "@/components/dashboard/ActivityFeedPanel";
import { KpiPanel } from "@/components/dashboard/KpiPanel";
import { SSEPanel } from "@/components/dashboard/SSEPanel";
import { AgentDetailModal } from "@/components/dashboard/AgentDetailModal";
import type { Agent } from "@/types";

export default function DashboardPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  return (
    <>
      <div className="h-full grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_1fr_280px] xl:grid-cols-[300px_1fr_1fr_300px] overflow-hidden">
        <AgentsPanel onSelectAgent={setSelectedAgent} />
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

      <AgentDetailModal
        agent={selectedAgent}
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </>
  );
}
