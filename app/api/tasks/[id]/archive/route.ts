import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/app/api/server/task-service";
import { apiErrorResponse } from "@/app/api/server/api-error";
import { isMissionControlDemoMode, demoReadOnlyResponse } from "@/app/api/server/demo-mode";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (isMissionControlDemoMode()) {
      return demoReadOnlyResponse();
    }

    const { id } = await params;
    const task = await taskService.archive(id);
    return NextResponse.json(task);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
