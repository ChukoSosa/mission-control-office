import { prisma } from "@/app/api/server/prisma";
import { taskService } from "@/app/api/server/task-service";
import { toTaskCreationPlan } from "@/lib/mission/apiPayloads";
import {
  createMissionControlOnboardingTask,
  MISSION_CONTROL_ONBOARDING_TASK_TITLE,
} from "@/lib/mission/bootstrapTask";
import {
  getMissionSystemState,
  isMissionSystemReady,
  markMissionSystemBootstrapping,
  markMissionSystemConfiguring,
  markMissionSystemReady,
  type MissionSystemState,
} from "@/lib/mission/systemState";

export interface MissionBootstrapResult {
  state: MissionSystemState;
  skipped: boolean;
  onboardingTaskId?: string;
  createdSubtasksCount: number;
  warnings: string[];
}

let bootstrapRunPromise: Promise<MissionBootstrapResult> | null = null;

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function ensureOnboardingSubtasks(taskId: string): Promise<number> {
  const draftTask = createMissionControlOnboardingTask();
  const creationPlan = toTaskCreationPlan(draftTask);

  const existing = await prisma.subtask.findMany({
    where: { taskId },
    select: { title: true },
  });

  const existingByTitle = new Set(
    existing.map((subtask: { title: string }) => normalizeTitle(subtask.title)),
  );

  const toCreate = creationPlan.subtaskPayloads
    .map((subtask, index) => ({
      title: subtask.title,
      taskId,
      position: subtask.position ?? index + 1,
      ownerAgentId: subtask.ownerAgentId,
    }))
    .filter((subtask) => !existingByTitle.has(normalizeTitle(subtask.title)));

  if (toCreate.length === 0) {
    return 0;
  }

  await prisma.subtask.createMany({ data: toCreate });

  return toCreate.length;
}

async function findExistingOnboardingTask(): Promise<{ id: string } | null> {
  return prisma.task.findFirst({
    where: { title: MISSION_CONTROL_ONBOARDING_TASK_TITLE },
    select: { id: true },
  });
}

async function runBootstrapMissionControl(): Promise<MissionBootstrapResult> {
  const warnings: string[] = [];

  try {
    // Check if bootstrap task already exists (marker that system was initialized)
    const existingTask = await findExistingOnboardingTask();
    console.log("[BOOTSTRAP] Check existing task:", existingTask ? `Found ${existingTask.id}` : "Not found");
    
    if (existingTask) {
      // System already initialized, just mark READY and return
      const state = markMissionSystemReady();
      console.log("[BOOTSTRAP] Already initialized, returning READY");
      return {
        state,
        skipped: true,
        onboardingTaskId: existingTask.id,
        createdSubtasksCount: 0,
        warnings,
      };
    }

    // First time: create bootstrap task
    console.log("[BOOTSTRAP] Creating new bootstrap task...");
    const draftTask = createMissionControlOnboardingTask();
    const createdTask = await taskService.create({
      title: draftTask.title,
      description: draftTask.description,
      status: "BACKLOG",
      priority: draftTask.priority ?? 1,
    });
    console.log("[BOOTSTRAP] Created task:", createdTask.id);

    // Create subtasks
    const createdSubtasksCount = await ensureOnboardingSubtasks(createdTask.id);
    console.log("[BOOTSTRAP] Created subtasks:", createdSubtasksCount);

    // Bootstrap complete, mark READY
    const state = markMissionSystemReady();
    console.log("[BOOTSTRAP] Bootstrap complete, marked READY");

    return {
      state,
      skipped: false,
      onboardingTaskId: createdTask.id,
      createdSubtasksCount,
      warnings,
    };
  } catch (error) {
    console.error("[BOOTSTRAP] ERROR:", error);
    const message = error instanceof Error ? error.message : "Unknown bootstrap error";
    warnings.push(`Bootstrap warning: ${message}`);

    // Safety-first: avoid startup crash, keep system operable while flagged as configuring.
    const state = markMissionSystemConfiguring();

    return {
      state,
      skipped: true,
      createdSubtasksCount: 0,
      warnings,
    };
  }
}

export async function bootstrapMissionControl(): Promise<MissionBootstrapResult> {
  // Run once per server process; startup remains safe if called multiple times.
  if (!bootstrapRunPromise) {
    bootstrapRunPromise = runBootstrapMissionControl();
  }

  return bootstrapRunPromise;
}
