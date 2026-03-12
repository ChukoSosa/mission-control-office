import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/app/api/server/activity-service";
import { apiErrorResponse } from "@/app/api/server/api-error";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const cursor = searchParams.get("cursor") || undefined;
    const taskId = searchParams.get("taskId") || undefined;
    const agentId = searchParams.get("agentId") || undefined;

    const { events, nextCursor } = await activityService.list({
      limit,
      cursor,
      taskId,
      agentId,
    });

    return NextResponse.json({ activities: events, nextCursor });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
