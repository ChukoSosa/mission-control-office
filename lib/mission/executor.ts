import { toTaskCreationPlan, type MissionTaskCreationPlan } from "@/lib/mission/apiPayloads";
import type { MissionDraftTaskPayload } from "@/lib/mission/intake";
import type { MissionSubtask, MissionTask } from "@/types/mission";

export type MissionTaskCreationStage =
  | "task_created"
  | "subtasks_created"
  | "partial_failure"
  | "failed";

export type MissionFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type MissionTaskCreationExecutionInput =
  | {
      draftTask: MissionDraftTaskPayload;
      creationPlan?: never;
      apiBaseUrl?: string;
      fetchImpl?: MissionFetch;
    }
  | {
      draftTask?: never;
      creationPlan: MissionTaskCreationPlan;
      apiBaseUrl?: string;
      fetchImpl?: MissionFetch;
    };

export interface MissionTaskCreationExecutionResult {
  success: boolean;
  taskCreated: boolean;
  subtasksCreatedCount: number;
  taskId?: string;
  createdTask?: MissionTask;
  createdSubtasks?: MissionSubtask[];
  warnings: string[];
  errors: string[];
  stage: MissionTaskCreationStage;
}

interface JsonParseResult {
  ok: boolean;
  data?: unknown;
  rawText?: string;
}

function dedupeMessages(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function normalizeApiBaseUrl(baseUrl?: string): string {
  const normalized = (baseUrl ?? "/api").trim();
  if (!normalized) return "/api";
  return normalized.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
}

async function safeParseJson(response: Response): Promise<JsonParseResult> {
  const text = await response.text().catch(() => "");
  if (!text) {
    return { ok: false, rawText: "" };
  }

  try {
    return { ok: true, data: JSON.parse(text), rawText: text };
  } catch {
    return { ok: false, rawText: text };
  }
}

function extractErrorMessage(status: number, parsed: JsonParseResult): string {
  if (parsed.ok && parsed.data && typeof parsed.data === "object") {
    const error = (parsed.data as { error?: unknown }).error;
    const message = (parsed.data as { message?: unknown }).message;

    if (typeof error === "string" && error) {
      return `API ${status}: ${error}`;
    }

    if (typeof message === "string" && message) {
      return `API ${status}: ${message}`;
    }
  }

  if (parsed.rawText) {
    return `API ${status}: ${parsed.rawText}`;
  }

  return `API ${status}: Request failed`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toMissionTaskFromApi(value: unknown): MissionTask | undefined {
  if (!isObject(value)) return undefined;

  const id = typeof value.id === "string" ? value.id : undefined;
  const title = typeof value.title === "string" ? value.title : undefined;

  if (!id || !title) return undefined;

  const description = typeof value.description === "string" ? value.description : "";

  const statusRaw = typeof value.status === "string" ? value.status.toUpperCase() : "BACKLOG";
  const status =
    statusRaw === "BACKLOG" ||
    statusRaw === "IN_PROGRESS" ||
    statusRaw === "REVIEW" ||
    statusRaw === "DONE" ||
    statusRaw === "BLOCKED"
      ? statusRaw
      : "BACKLOG";

  const priorityValue = typeof value.priority === "number" ? value.priority : 3;
  const priority =
    priorityValue === 1 ||
    priorityValue === 2 ||
    priorityValue === 3 ||
    priorityValue === 4 ||
    priorityValue === 5
      ? priorityValue
      : 3;

  let assignedAgent: MissionTask["assignedAgent"] = null;
  if (isObject(value.assignedAgent)) {
    const assignedId = typeof value.assignedAgent.id === "string" ? value.assignedAgent.id : undefined;
    const assignedName =
      typeof value.assignedAgent.name === "string" ? value.assignedAgent.name : undefined;
    if (assignedId && assignedName) {
      assignedAgent = { id: assignedId, name: assignedName };
    }
  }

  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString();

  return {
    id,
    title,
    description,
    status,
    priority,
    assignedAgent,
    updatedAt,
  };
}

function toMissionSubtaskFromApi(value: unknown): MissionSubtask | undefined {
  if (!isObject(value)) return undefined;

  const id = typeof value.id === "string" ? value.id : undefined;
  const title = typeof value.title === "string" ? value.title : undefined;
  if (!id || !title) return undefined;

  const statusRaw = typeof value.status === "string" ? value.status.toUpperCase() : "TODO";
  const status =
    statusRaw === "TODO" || statusRaw === "DOING" || statusRaw === "DONE" || statusRaw === "BLOCKED"
      ? statusRaw
      : "TODO";

  const position = typeof value.position === "number" ? value.position : 0;

  let ownerAgent: MissionSubtask["ownerAgent"] = null;
  if (isObject(value.ownerAgent)) {
    const ownerId = typeof value.ownerAgent.id === "string" ? value.ownerAgent.id : undefined;
    const ownerName = typeof value.ownerAgent.name === "string" ? value.ownerAgent.name : undefined;
    if (ownerId && ownerName) {
      ownerAgent = { id: ownerId, name: ownerName };
    }
  }

  const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : createdAt;

  return {
    id,
    title,
    status,
    position,
    ownerAgent,
    createdAt,
    updatedAt,
  };
}

function hasCreationPlan(
  input: MissionTaskCreationExecutionInput,
): input is Extract<MissionTaskCreationExecutionInput, { creationPlan: MissionTaskCreationPlan }> {
  return !!(input as { creationPlan?: MissionTaskCreationPlan }).creationPlan;
}

export async function executeTaskCreation(
  input: MissionTaskCreationExecutionInput,
): Promise<MissionTaskCreationExecutionResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = normalizeApiBaseUrl(input.apiBaseUrl);
  const plan = hasCreationPlan(input) ? input.creationPlan : toTaskCreationPlan(input.draftTask);

  const warnings: string[] = [...plan.warnings];
  const errors: string[] = [];

  if (plan.readiness === "needs_review") {
    warnings.push("Creation plan marked as needs_review; proceeding in best-effort mode.");
  }

  let createdTask: MissionTask | undefined;
  let taskId: string | undefined;

  try {
    const taskResponse = await fetchImpl(buildUrl(baseUrl, "tasks"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan.taskPayload),
    });

    const parsed = await safeParseJson(taskResponse);

    if (!taskResponse.ok) {
      errors.push(extractErrorMessage(taskResponse.status, parsed));
      return {
        success: false,
        taskCreated: false,
        subtasksCreatedCount: 0,
        warnings: dedupeMessages(warnings),
        errors: dedupeMessages(errors),
        stage: "failed",
      };
    }

    createdTask = toMissionTaskFromApi(parsed.data);
    taskId = createdTask?.id;

    if (!taskId && isObject(parsed.data) && typeof parsed.data.id === "string") {
      taskId = parsed.data.id;
    }

    if (!taskId) {
      errors.push("Task creation succeeded but response did not include a task id.");
      return {
        success: false,
        taskCreated: false,
        subtasksCreatedCount: 0,
        warnings: dedupeMessages(warnings),
        errors: dedupeMessages(errors),
        stage: "failed",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task creation request failed.";
    errors.push(message);
    return {
      success: false,
      taskCreated: false,
      subtasksCreatedCount: 0,
      warnings: dedupeMessages(warnings),
      errors: dedupeMessages(errors),
      stage: "failed",
    };
  }

  if (plan.subtaskPayloads.length === 0) {
    return {
      success: true,
      taskCreated: true,
      subtasksCreatedCount: 0,
      taskId,
      createdTask,
      createdSubtasks: [],
      warnings: dedupeMessages(warnings),
      errors: dedupeMessages(errors),
      stage: "task_created",
    };
  }

  const createdSubtasks: MissionSubtask[] = [];

  for (const subtaskPayload of plan.subtaskPayloads) {
    try {
      const subtaskResponse = await fetchImpl(buildUrl(baseUrl, `tasks/${taskId}/subtasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subtaskPayload),
      });

      const parsed = await safeParseJson(subtaskResponse);

      if (!subtaskResponse.ok) {
        errors.push(
          `Failed to create subtask "${subtaskPayload.title}": ${extractErrorMessage(
            subtaskResponse.status,
            parsed,
          )}`,
        );
        continue;
      }

      const subtask = toMissionSubtaskFromApi(parsed.data);
      if (subtask) {
        createdSubtasks.push(subtask);
      } else {
        warnings.push(
          `Subtask "${subtaskPayload.title}" was created but response shape was not fully mappable.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown subtask creation error.";
      errors.push(`Failed to create subtask "${subtaskPayload.title}": ${message}`);
    }
  }

  // Rollback/reconciliation is intentionally not applied yet.
  // Future versions may add compensating actions if subtask creation partially fails.
  const subtasksCreatedCount = createdSubtasks.length;
  const attempted = plan.subtaskPayloads.length;
  const allSubtasksSucceeded = subtasksCreatedCount === attempted && errors.length === 0;
  const someSubtasksSucceeded = subtasksCreatedCount > 0;

  if (allSubtasksSucceeded) {
    return {
      success: true,
      taskCreated: true,
      subtasksCreatedCount,
      taskId,
      createdTask,
      createdSubtasks,
      warnings: dedupeMessages(warnings),
      errors: [],
      stage: "subtasks_created",
    };
  }

  if (someSubtasksSucceeded || errors.length > 0) {
    return {
      success: false,
      taskCreated: true,
      subtasksCreatedCount,
      taskId,
      createdTask,
      createdSubtasks,
      warnings: dedupeMessages(warnings),
      errors: dedupeMessages(errors),
      stage: "partial_failure",
    };
  }

  return {
    success: false,
    taskCreated: true,
    subtasksCreatedCount,
    taskId,
    createdTask,
    createdSubtasks,
    warnings: dedupeMessages(warnings),
    errors: dedupeMessages(errors),
    stage: "failed",
  };
}
