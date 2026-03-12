import { MIN_RECOMMENDED_SUBTASKS } from "@/lib/mission/decomposition";
import type { MissionDraftSubtask, MissionDraftTaskPayload } from "@/lib/mission/intake";

export interface MissionCreateTaskApiPayload {
  title: string;
  description: string;
  assignedAgentId?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
}

export interface MissionCreateSubtaskApiPayload {
  title: string;
  status?: string;
  position?: number;
  ownerAgentId?: string;
}

export type MissionTaskCreationReadiness = "ready" | "needs_review";

export interface MissionTaskCreationPlan {
  taskPayload: MissionCreateTaskApiPayload;
  subtaskPayloads: MissionCreateSubtaskApiPayload[];
  warnings: string[];
  readiness: MissionTaskCreationReadiness;
}

function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isWeakTitle(title: string): boolean {
  const text = cleanText(title);
  return text.length < 8 || text.toLowerCase() === "new intake task";
}

function isWeakDescription(description: string): boolean {
  const text = cleanText(description);
  return text.length < 20;
}

function normalizeSubtaskTitle(subtask: MissionDraftSubtask, fallbackIndex: number): string {
  const title = cleanText(subtask.title);
  if (title) return title;
  return `Subtask ${fallbackIndex}`;
}

function dedupeWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings));
}

export function toCreateTaskApiPayload(
  draftTask: MissionDraftTaskPayload,
): MissionCreateTaskApiPayload {
  return {
    title: cleanText(draftTask.title),
    description: cleanText(draftTask.description),
    assignedAgentId: draftTask.assignedAgentId,
    priority: draftTask.priority,
  };
}

export function toCreateSubtaskApiPayloads(
  draftTask: MissionDraftTaskPayload,
): MissionCreateSubtaskApiPayload[] {
  return draftTask.draftSubtasks.map((subtask, index) => ({
    title: normalizeSubtaskTitle(subtask, index + 1),
    position: index + 1,
    ownerAgentId: draftTask.assignedAgentId,
  }));
}

export function toTaskCreationPlan(
  draftTask: MissionDraftTaskPayload,
): MissionTaskCreationPlan {
  // Deterministic mapping layer only. No API calls here.
  // Intended for future main-agent, intake automations, and manual create-task flows.
  const taskPayload = toCreateTaskApiPayload(draftTask);
  const subtaskPayloads = toCreateSubtaskApiPayloads(draftTask);

  const warnings: string[] = [...draftTask.warnings];

  if (isWeakTitle(taskPayload.title)) {
    warnings.push("Task title is weak; review title clarity before creating the task.");
  }

  if (isWeakDescription(taskPayload.description)) {
    warnings.push("Task description is brief; add more execution context if possible.");
  }

  if (subtaskPayloads.length === 0) {
    warnings.push("No draft subtasks provided; task decomposition should be added before creation.");
  }

  if (subtaskPayloads.length > 0 && subtaskPayloads.length < MIN_RECOMMENDED_SUBTASKS) {
    warnings.push(
      `Subtask count (${subtaskPayloads.length}) is below recommended minimum (${MIN_RECOMMENDED_SUBTASKS}).`,
    );
  }

  const normalizedWarnings = dedupeWarnings(warnings);

  const readiness: MissionTaskCreationReadiness =
    normalizedWarnings.length > 0 ? "needs_review" : "ready";

  return {
    taskPayload,
    subtaskPayloads,
    warnings: normalizedWarnings,
    readiness,
  };
}
