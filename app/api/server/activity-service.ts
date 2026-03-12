import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";

export type ActivityKind = "task" | "run" | "agent";

export const activityService = {
  async log(params: {
    kind: ActivityKind;
    action: string;
    summary: string;
    agentId?: string;
    taskId?: string;
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
          ...params.payload,
        },
        agentId: params.agentId,
        taskId: params.taskId,
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
        agentId: params.agentId,
        taskId: params.taskId,
        runId: params.runId,
        payload: params.payload ?? null,
        occurredAt: event.occurredAt.toISOString(),
      },
    });

    return event;
  },

  async recent(limit = 50) {
    return prisma.systemEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  },

  async list(options?: {
    limit?: number;
    cursor?: string;
    taskId?: string;
    agentId?: string;
  }) {
    const take = Math.max(1, Math.min(options?.limit ?? 50, 200));

    const events = await prisma.systemEvent.findMany({
      where: {
        taskId: options?.taskId ?? undefined,
        agentId: options?.agentId ?? undefined,
      },
      orderBy: { id: "desc" },
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : undefined,
      take: take + 1,
    });

    const hasMore = events.length > take;
    const page = hasMore ? events.slice(0, take) : events;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return { events: page, nextCursor };
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
