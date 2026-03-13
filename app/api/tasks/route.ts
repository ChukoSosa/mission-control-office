import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/app/api/server/task-service";
import { apiErrorResponse } from "@/app/api/server/api-error";
import { isMissionControlDemoMode, demoReadOnlyResponse } from "@/app/api/server/demo-mode";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const assignedAgentId = searchParams.get("assignedAgentId") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const includeArchived = searchParams.get("archived") === "true";

    const { tasks, nextCursor } = await taskService.list({
      status,
      assignedAgentId,
      limit,
      cursor,
      includeArchived,
    });

    return NextResponse.json({ tasks, nextCursor });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isMissionControlDemoMode()) {
      return demoReadOnlyResponse();
    }

    const body = await request.json();
    const { title, description, assignedAgentId, status, priority, pipelineStageId } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const task = await taskService.create({
      title,
      description,
      assignedAgentId,
      status,
      priority,
      pipelineStageId,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
