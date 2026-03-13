import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";
import { activityService } from "./activity-service";
import { ApiError } from "./api-error";
import { assertDemoWritable } from "./demo-mode";

const OPERATOR_ACTOR = {
  type: "human" as const,
  id: "operator",
  name: "Operator",
};

function buildTaskUpdateActivity(params: {
  previous: {
    status: string;
    assignedAgentId: string | null;
    title: string;
  };
  current: {
    status: string;
    assignedAgentId: string | null;
    title: string;
    id: string;
  };
}) {
  if (params.previous.status !== params.current.status) {
    if (params.current.status === "DONE") {
      return {
        eventType: "task.completed",
        summary: `Operator completed task "${params.current.title}"`,
        payload: {
          previousStatus: params.previous.status,
          nextStatus: params.current.status,
        },
      };
    }

    if (params.current.status === "BLOCKED") {
      return {
        eventType: "task.blocked",
        summary: `Operator marked task "${params.current.title}" as BLOCKED`,
        payload: {
          previousStatus: params.previous.status,
          nextStatus: params.current.status,
        },
      };
    }

    return {
      eventType: "task.moved",
      summary: `Operator moved task "${params.current.title}" from ${params.previous.status} to ${params.current.status}`,
      payload: {
        previousStatus: params.previous.status,
        nextStatus: params.current.status,
      },
    };
  }

  if (params.previous.assignedAgentId !== params.current.assignedAgentId) {
    return {
      eventType: "task.assigned",
      summary: `Operator changed assignment for task "${params.current.title}"`,
      payload: {
        previousAssignedAgentId: params.previous.assignedAgentId,
        nextAssignedAgentId: params.current.assignedAgentId,
      },
    };
  }

  return {
    eventType: "task.updated",
    summary: `Operator updated task "${params.current.title}"`,
    payload: {},
  };
}

function toPrismaTaskStatus(status: string) {
  return status as unknown as any;
}

export const taskService = {
  async list(options?: {
    status?: string;
    assignedAgentId?: string;
    limit?: number;
    cursor?: string;
    includeArchived?: boolean;
  }) {
    const take = typeof options?.limit === "number" ? Math.max(1, Math.min(options.limit, 200)) : undefined;
    const where: any = {
      status: options?.status ? toPrismaTaskStatus(options.status) : undefined,
      assignedAgentId: options?.assignedAgentId,
        archivedAt: options?.includeArchived ? undefined : null,
    };

    const tasks = await prisma.task.findMany({
      include: {
        assignedAgent: { select: { id: true, name: true } },
        pipelineStage: { select: { id: true, name: true, position: true, pipelineId: true } },
      },
      where,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      skip: options?.cursor ? 1 : undefined,
      take: take ? take + 1 : undefined,
      orderBy: { id: "desc" },
    });

    if (!take) {
      return { tasks, nextCursor: null };
    }

    const hasMore = tasks.length > take;
    const page = hasMore ? tasks.slice(0, take) : tasks;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return { tasks: page, nextCursor };
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedAgent: { select: { id: true, name: true } },
        subtasks: {
          include: { ownerAgent: { select: { id: true, name: true } } },
          orderBy: { position: "asc" },
        },
      },
    });

    return task;
  },

  async create(data: {
    title: string;
    description?: string;
    assignedAgentId?: string;
    status?: string;
    priority?: number;
    pipelineStageId?: string;
  }) {
    assertDemoWritable();

    if (typeof data.priority === "number" && (data.priority < 1 || data.priority > 5)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Priority must be between 1 and 5");
    }

    if (data.assignedAgentId) {
      const agent = await prisma.agent.findUnique({ where: { id: data.assignedAgentId }, select: { id: true } });
      if (!agent) {
        throw new ApiError(400, "BAD_REQUEST", "Assigned agent does not exist");
      }
    }

    if (data.pipelineStageId) {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: data.pipelineStageId }, select: { id: true } });
      if (!stage) {
        throw new ApiError(400, "BAD_REQUEST", "Pipeline stage does not exist");
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        status: toPrismaTaskStatus(data.status ?? "BACKLOG"),
        priority: typeof data.priority === "number" ? data.priority : 1,
        createdByType: "operator",
        createdById: "operator-root",
        assignedAgentId: data.assignedAgentId,
        pipelineStageId: data.pipelineStageId,
      },
      include: {
        assignedAgent: { select: { id: true, name: true } },
        pipelineStage: { select: { id: true, name: true, position: true, pipelineId: true } },
      },
    });

    emitEvent({
      type: "task.created",
      data: task,
    });

    await activityService.log({
      kind: "task",
      action: "task.created",
      summary: `Operator created task "${task.title}"`,
      actor: OPERATOR_ACTOR,
      taskId: task.id,
      agentId: task.assignedAgentId ?? undefined,
      payload: { status: task.status, priority: task.priority },
    });

    return task;
  },

  async update(
    id: string,
    updates: Partial<{ title: string; description: string; status: string; assignedAgentId?: string | null; priority?: number }>,
  ) {
    assertDemoWritable();

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, assignedAgentId: true },
    });

    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Task not found");
    }

    if (typeof updates.priority === "number" && (updates.priority < 1 || updates.priority > 5)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Priority must be between 1 and 5");
    }

    if (typeof updates.assignedAgentId === "string") {
      const agent = await prisma.agent.findUnique({ where: { id: updates.assignedAgentId }, select: { id: true } });
      if (!agent) {
        throw new ApiError(400, "BAD_REQUEST", "Assigned agent does not exist");
      }
    }

    let task;
    try {
      task = await prisma.task.update({
        where: { id },
        data: {
          title: updates.title,
          description: typeof updates.description === "string" ? updates.description : undefined,
          status: updates.status ? toPrismaTaskStatus(updates.status) : undefined,
          assignedAgentId: updates.assignedAgentId === undefined ? undefined : updates.assignedAgentId,
          priority: typeof updates.priority === "number" ? updates.priority : undefined,
        },
        include: { assignedAgent: { select: { id: true, name: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Task not found");
      }
      throw error;
    }

    emitEvent({
      type: "task.updated",
      data: task,
    });

    const activity = buildTaskUpdateActivity({
      previous: {
        status: existing.status,
        assignedAgentId: existing.assignedAgentId,
        title: existing.title,
      },
      current: {
        status: task.status,
        assignedAgentId: task.assignedAgentId ?? null,
        title: task.title,
        id: task.id,
      },
    });

    await activityService.log({
      kind: "task",
      action: activity.eventType,
      summary: activity.summary,
      actor: OPERATOR_ACTOR,
      taskId: task.id,
      agentId: task.assignedAgentId ?? undefined,
      payload: {
        status: task.status,
        ...activity.payload,
      },
    });

    return task;
  },

  async delete(id: string) {
    assertDemoWritable();

    try {
      const task = await prisma.task.delete({ where: { id } });
      emitEvent({
        type: "task.deleted",
        data: { id: task.id },
      });

      await activityService.log({
        kind: "task",
        action: "task.deleted",
        summary: `Operator deleted task "${task.title}"`,
        actor: OPERATOR_ACTOR,
        taskId: task.id,
      });

      return task;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Task not found");
      }
      throw error;
    }
  },

  async archive(id: string) {
    assertDemoWritable();

    const existing = await prisma.task.findUnique({ where: { id }, select: { id: true, title: true, status: true, archivedAt: true } });
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Task not found");
    }
    if (existing.status !== "DONE") {
      throw new ApiError(400, "VALIDATION_ERROR", "Only DONE tasks can be archived");
    }
    if (existing.archivedAt) {
      throw new ApiError(400, "VALIDATION_ERROR", "Task is already archived");
    }

    const archived = await prisma.task.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: { assignedAgent: { select: { id: true, name: true } } },
    });

    emitEvent({ type: "task.archived", data: { id: archived.id, archivedAt: archived.archivedAt } });

    await activityService.log({
      kind: "task",
      action: "task.archived",
      summary: `Operator archived task "${existing.title}"`,
      actor: OPERATOR_ACTOR,
      taskId: existing.id,
      payload: { archivedAt: archived.archivedAt },
    });

    return archived;
  },
};
