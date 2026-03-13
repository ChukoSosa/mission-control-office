import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";

export type ActivityKind = "task" | "subtask" | "comment" | "run" | "agent";

export interface ActivityActor {
  type: "agent" | "human" | "system";
  id: string;
  name?: string;
}

function toMetadata(payload: unknown): Record<string, unknown> | undefined {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return undefined;
}

function mapEvent(event: {
  id: string;
  source: string;
  eventType: string;
  payload: unknown;
  taskId: string | null;
  subtaskId: string | null;
  commentId: string | null;
  agentId: string | null;
  actorType: string | null;
  actorId: string | null;
  runId: string | null;
  occurredAt: Date;
}) {
  const metadata = toMetadata(event.payload);
  const actorName = typeof metadata?.actorName === "string" ? metadata.actorName : undefined;

  return {
    id: event.id,
    summary: typeof metadata?.summary === "string" ? metadata.summary : undefined,
    kind: event.source,
    action: event.eventType,
    type: event.eventType,
    taskId: event.taskId,
    subtaskId: event.subtaskId,
    commentId: event.commentId,
    agentId: event.agentId,
    actorType: event.actorType,
    actorId: event.actorId,
    actorName,
    runId: event.runId,
    occurredAt: event.occurredAt.toISOString(),
    metadata,
  };
}

export const activityService = {
  async log(params: {
    kind: ActivityKind;
    action: string;
    summary: string;
    actor: ActivityActor;
    agentId?: string;
    taskId?: string;
    subtaskId?: string;
    commentId?: string;
    runId?: string;
    payload?: Record<string, unknown>;
  }) {
    const event = await prisma.systemEvent.create({
      data: {
        source: params.kind,
        eventType: params.action,
        severity: "info",
        payload: {
          summary: params.summary,
          actorName: params.actor.name,
          ...params.payload,
        },
        agentId: params.agentId,
        taskId: params.taskId,
        subtaskId: params.subtaskId,
        commentId: params.commentId,
        actorType: params.actor.type,
        actorId: params.actor.id,
        runId: params.runId,
      },
    });

    emitEvent({
      type: "activity.logged",
      data: {
        id: event.id,
        kind: params.kind,
        action: params.action,
        summary: params.summary,
        actorType: params.actor.type,
        actorId: params.actor.id,
        actorName: params.actor.name,
        agentId: params.agentId,
        taskId: params.taskId,
        subtaskId: params.subtaskId,
        commentId: params.commentId,
        runId: params.runId,
        payload: params.payload ?? null,
        occurredAt: event.occurredAt.toISOString(),
      },
    });

    return event;
  },

  async recent(limit = 50) {
    const events = await prisma.systemEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return events.map(mapEvent);
  },

  async list(options?: {
    limit?: number;
    cursor?: string;
    taskId?: string;
    agentId?: string;
    subtaskId?: string;
    commentId?: string;
    actorId?: string;
    actorType?: string;
  }) {
    const take = Math.max(1, Math.min(options?.limit ?? 50, 200));

    const events = await prisma.systemEvent.findMany({
      where: {
        taskId: options?.taskId ?? undefined,
        agentId: options?.agentId ?? undefined,
        subtaskId: options?.subtaskId ?? undefined,
        commentId: options?.commentId ?? undefined,
        actorId: options?.actorId ?? undefined,
        actorType: options?.actorType ?? undefined,
      },
      orderBy: { occurredAt: "desc" },
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : undefined,
      take: take + 1,
    });

    const hasMore = events.length > take;
    const page = hasMore ? events.slice(0, take) : events;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return {
      events: page.map(mapEvent),
      nextCursor,
    };
  },

  async getById(id: string) {
    return prisma.systemEvent.findUnique({ where: { id } });
  },

  async forRun(runId: string) {
    return prisma.systemEvent.findMany({
      where: { runId },
      orderBy: { occurredAt: "desc" },
    });
  },

  async forAgent(agentId: string, limit = 20) {
    return prisma.systemEvent.findMany({
      where: { agentId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  },

  async forTask(taskId: string, limit = 20) {
    return prisma.systemEvent.findMany({
      where: { taskId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  },
};
