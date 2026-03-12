import { NextResponse } from "next/server";
import { prisma } from "@/app/api/server/prisma";
import { apiErrorResponse } from "@/app/api/server/api-error";

export async function GET() {
  try {
    const [
      totalAgents,
      activeAgents,
      idleAgents,
      totalTasks,
      tasksInProgress,
      tasksInReview,
      backlogTasks,
      blockedTasks,
      activeRuns,
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { status: { in: ["THINKING", "WORKING"] } } }),
      prisma.agent.count({ where: { status: "IDLE" } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { status: "REVIEW" } }),
      prisma.task.count({ where: { status: "BACKLOG" } }),
      prisma.task.count({ where: { status: "BLOCKED" } }),
      prisma.run.count({ where: { status: "RUNNING" } }),
    ]);

    return NextResponse.json({
      totalAgents,
      activeAgents,
      idleAgents,
      totalTasks,
      tasksInProgress,
      tasksInReview,
      backlogTasks,
      blockedTasks,
      activeRuns,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
