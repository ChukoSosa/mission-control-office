"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getAgents } from "@/lib/api/agents";
import { getTasks } from "@/lib/api/tasks";
import { OfficeScene, type OfficeAgentView } from "@/components/office/OfficeScene";
import { AgentInspector } from "@/components/office/AgentInspector";
import { ActivityPanel } from "@/components/office/ActivityPanel";
import { useOfficeStore } from "@/store/officeStore";
import { OFFICE_ZONES, type ZoneId } from "@/lib/office/zones";
import {
  resolveBaseZone,
  resolveCurrentTask,
  resolveSeatAssignments,
  resolveTargetZoneFromState,
} from "@/lib/office/placementEngine";
import { normalizeSceneState } from "@/lib/office/sceneStateNormalizer";
import {
  generateMcMonkeyAvatar,
  persistAvatar,
  readAvatarMappingFromStorage,
  resolveAgentAvatarUrl,
  saveAvatarMappingToStorage,
} from "@/lib/office/avatarGenerator";
import type { Agent, Task } from "@/types";
import { getRealtimeRefetchInterval, isPublicDemoMode } from "@/lib/utils/demoMode";

const EMPTY_AGENTS: Agent[] = [];
const EMPTY_TASKS: Task[] = [];
const MCLUCY_ID = "mclucy-chief";
const MCLUCY_AGENT: Agent = {
  id: MCLUCY_ID,
  name: "mcLUCY",
  role: "Chief Mission Control",
  status: "WORKING",
  statusMessage: "Overseeing all operations",
  avatarUrl: "/office/imgs/mclucy-avatar.png",
};

export default function OfficePage() {
  const demoMode = isPublicDemoMode();
  const [activeGenerationAgentId, setActiveGenerationAgentId] = useState<string | null>(null);
  const [generationQueue, setGenerationQueue] = useState<string[]>([]);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [lucyAvatarUrl, setLucyAvatarUrl] = useState<string>("/office/imgs/mclucy-avatar.png");
  const isMountedRef = useRef(true);

  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const agentPositions = useOfficeStore((s) => s.agentPositions);
  const avatarMapping = useOfficeStore((s) => s.avatarMapping);
  const setSelectedAgentId = useOfficeStore((s) => s.setSelectedAgentId);
  const syncAgentTargets = useOfficeStore((s) => s.syncAgentTargets);
  const advanceAgentTransition = useOfficeStore((s) => s.advanceAgentTransition);
  const setAvatar = useOfficeStore((s) => s.setAvatar);
  const hydrateAvatarMapping = useOfficeStore((s) => s.hydrateAvatarMapping);

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ["office-agents"],
    queryFn: getAgents,
    refetchInterval: getRealtimeRefetchInterval(12_000),
  });

  const { data: tasksData } = useQuery({
    queryKey: ["office-tasks"],
    queryFn: () => getTasks(),
    refetchInterval: getRealtimeRefetchInterval(12_000),
  });

  const agents = agentsData ?? EMPTY_AGENTS;
  const tasks = tasksData ?? EMPTY_TASKS;

  useEffect(() => {
    hydrateAvatarMapping(readAvatarMappingFromStorage());
  }, [hydrateAvatarMapping]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLucyAvatar = async () => {
      try {
        const response = await fetch("/api/mc-monkeys", { method: "GET" });
        if (!response.ok) return;

        const payload = await response.json() as { lucyAvatar?: string | null };
        if (!cancelled && payload.lucyAvatar) {
          setLucyAvatarUrl(payload.lucyAvatar);
        }
      } catch {
        // keep static fallback
      }
    };

    loadLucyAvatar();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let changed = false;
    const nextMapping = { ...avatarMapping };

    agents.forEach((agent) => {
      const apiAvatarUrl = resolveAgentAvatarUrl(agent);
      if (apiAvatarUrl && !nextMapping[agent.id]) {
        nextMapping[agent.id] = apiAvatarUrl;
        changed = true;
      }
    });

    if (!changed) return;
    hydrateAvatarMapping(nextMapping);
    saveAvatarMappingToStorage(nextMapping);
  }, [agents, avatarMapping, hydrateAvatarMapping]);

  const seatAssignments = useMemo(() => resolveSeatAssignments(agents), [agents]);

  const derived = useMemo(() => {
    const baseAgents = agents.map((agent) => {
      const sceneState = normalizeSceneState(agent);
      const baseZone = resolveBaseZone(agent, seatAssignments);
      const targetZone = resolveTargetZoneFromState(sceneState.state, baseZone);
      const task = resolveCurrentTask(agent, tasks);
      return { agent, sceneState, baseZone, targetZone, task };
    });

    return [
      {
        agent: {
          ...MCLUCY_AGENT,
          avatarUrl: lucyAvatarUrl,
        },
        sceneState: normalizeSceneState(MCLUCY_AGENT),
        baseZone: "chief-desk" as ZoneId,
        targetZone: "chief-desk" as ZoneId,
        task: null,
      },
      ...baseAgents,
    ];
  }, [agents, lucyAvatarUrl, seatAssignments, tasks]);

  const derivedRef = useRef(derived);
  useEffect(() => {
    derivedRef.current = derived;
  }, [derived]);

  useEffect(() => {
    const targets: Record<string, ZoneId> = {};
    derived.forEach((item) => {
      targets[item.agent.id] = item.targetZone;
    });
    syncAgentTargets(targets);
  }, [derived, syncAgentTargets]);

  const sceneAgents: OfficeAgentView[] = useMemo(() => {
    return derived.map((item) => {
      const position = agentPositions[item.agent.id];
      const visualZone = position?.waypointZone ?? position?.targetZone ?? item.targetZone;
      const zoneConfig = OFFICE_ZONES[visualZone] ?? OFFICE_ZONES.hallway;

      return {
        agent: item.agent,
        task: item.task,
        x: zoneConfig.x,
        y: zoneConfig.y,
        avatarUrl: avatarMapping[item.agent.id] ?? resolveAgentAvatarUrl(item.agent),
        isGenerating: activeGenerationAgentId === item.agent.id,
        state: item.sceneState,
      };
    });
  }, [activeGenerationAgentId, agentPositions, avatarMapping, derived]);

  const selected = useMemo(() => {
    if (!selectedAgentId) return null;
    return derived.find((item) => item.agent.id === selectedAgentId) ?? null;
  }, [derived, selectedAgentId]);

  const selectedZone = useMemo(() => {
    if (!selected) return null;
    const pos = agentPositions[selected.agent.id];
    return (pos?.waypointZone ?? pos?.targetZone ?? selected.targetZone) as ZoneId;
  }, [agentPositions, selected]);

  const selectedAssignedTasks = useMemo(() => {
    if (!selected) return [];

    if (selected.agent.id === MCLUCY_ID) {
      return tasks;
    }

    return tasks.filter((task) => {
      return (
        task.assignedAgentId === selected.agent.id ||
        task.ownerAgentId === selected.agent.id ||
        task.assignedAgent?.id === selected.agent.id
      );
    });
  }, [selected, tasks]);

  const handleGenerateAvatar = async () => {
    if (!selected || selected.agent.id === MCLUCY_ID) return;

    const agentId = selected.agent.id;
    const alreadyQueued = generationQueue.includes(agentId) || activeGenerationAgentId === agentId;
    if (alreadyQueued) return;

    setAvatarError(null);
    setGenerationQueue((prev) => [...prev, agentId]);
  };

  useEffect(() => {
    if (activeGenerationAgentId || generationQueue.length === 0) return;

    const nextAgentId = generationQueue[0];
    const nextAgent = derivedRef.current.find((item) => item.agent.id === nextAgentId)?.agent;

    if (!nextAgent) {
      setGenerationQueue((prev) => prev.slice(1));
      return;
    }

    const runGeneration = async () => {
      setActiveGenerationAgentId(nextAgentId);

      try {
        const { avatarUrl, prompt, variant } = await generateMcMonkeyAvatar(nextAgent);
        await persistAvatar(nextAgentId, avatarUrl, prompt, variant);
        setAvatar(nextAgentId, avatarUrl);

        const currentMapping = useOfficeStore.getState().avatarMapping;
        saveAvatarMappingToStorage({
          ...currentMapping,
          [nextAgentId]: avatarUrl,
        });
      } catch (err) {
        setAvatarError(err instanceof Error ? err.message : "Failed to generate avatar");
      } finally {
        if (isMountedRef.current) {
          setActiveGenerationAgentId(null);
          setGenerationQueue((prev) => prev.slice(1));
        }
      }
    };

    runGeneration();
  }, [activeGenerationAgentId, generationQueue, setAvatar]);

  return (
    <DashboardShell showFilters={false}>
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_300px_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_320px_minmax(0,1fr)]">
        <section className="min-h-0 lg:h-full lg:min-h-[560px]">
          {agentsLoading ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-surface-700 bg-surface-900 text-sm text-slate-400">
              Loading office scene...
            </div>
          ) : (
            <OfficeScene
              agents={sceneAgents}
              onSelectAgent={setSelectedAgentId}
              onReachedPosition={advanceAgentTransition}
            />
          )}
        </section>

        <section className="min-h-0 lg:h-full lg:min-h-[560px]">
          <AgentInspector
            agent={selected?.agent ?? null}
            task={selected?.task ?? null}
            assignedTasks={selectedAssignedTasks}
            zone={selectedZone}
            state={selected?.sceneState ?? null}
            avatarUrl={selected ? avatarMapping[selected.agent.id] ?? resolveAgentAvatarUrl(selected.agent) : undefined}
            generating={activeGenerationAgentId === selected?.agent.id}
            avatarError={avatarError}
            onGenerateAvatar={demoMode || selected?.agent.id === MCLUCY_ID ? undefined : handleGenerateAvatar}
            title={selected?.agent.id === MCLUCY_ID ? "Mission Control Inspector" : "Agent Inspector"}
          />
        </section>

        <section className="min-h-0 lg:h-full lg:min-h-[560px]">
          <ActivityPanel
            selectedAgentId={selectedAgentId}
            selectedAgentName={selected?.agent.name ?? null}
            showAllActivity={selected?.agent.id === MCLUCY_ID}
          />
        </section>
      </div>
    </DashboardShell>
  );
}