import type { AgentStatus as PrismaAgentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";
import { activityService } from "./activity-service";
import { ApiError } from "./api-error";
import { assertDemoWritable } from "./demo-mode";

function toPrismaStatus(status?: string) {
  return status as unknown as PrismaAgentStatus | undefined;
}

export const agentService = {
  async list() {
    return prisma.agent.findMany({ orderBy: { name: "asc" } });
  },

  async getById(id: string) {
    return prisma.agent.findUnique({ where: { id } });
  },

  async heartbeat(agentId: string, payload: { status?: string; statusMessage?: string }) {
    assertDemoWritable();

    let agent;
    try {
      agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: toPrismaStatus(payload.status),
          statusMessage: payload.statusMessage,
          heartbeatAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Agent not found");
      }
      throw error;
    }

    emitEvent({
      type: "agent.status",
      data: {
        id: agent.id,
        status: agent.status,
        statusMessage: agent.statusMessage ?? undefined,
        currentTaskId: agent.currentTaskId ?? undefined,
        heartbeatAt: (agent.heartbeatAt ?? new Date()).toISOString(),
      },
    });

    await activityService.log({
      kind: "agent",
      action: "agent.status",
      summary: `${agent.name}: ${agent.statusMessage ?? agent.status}`,
      actor: {
        type: "agent",
        id: agent.id,
        name: agent.name,
      },
      agentId: agent.id,
      payload: { statusMessage: agent.statusMessage, status: agent.status },
    });

    return agent;
  },

  async updateAvatar(
    agentId: string,
    payload: { avatarUrl: string; prompt?: string; variant?: string; traits?: Record<string, unknown> },
  ) {
    assertDemoWritable();

    const avatarUrl = payload.avatarUrl.trim();
    if (!avatarUrl) {
      throw new ApiError(400, "BAD_REQUEST", "avatarUrl is required");
    }

    let agent;
    try {
      agent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          avatar: avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(404, "NOT_FOUND", "Agent not found");
      }
      throw error;
    }

    emitEvent({
      type: "agent.avatar",
      data: {
        id: agent.id,
        avatarUrl,
      },
    });

    await activityService.log({
      kind: "agent",
      action: "agent.avatar.updated",
      summary: `${agent.name} avatar updated`,
      actor: {
        type: "human",
        id: "operator",
        name: "Operator",
      },
      agentId: agent.id,
      payload: {
        variant: payload.variant ?? "pixel-random",
        prompt: payload.prompt ?? null,
        traits: payload.traits ?? null,
      },
    });

    return agent;
  },
};
