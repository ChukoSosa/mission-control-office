import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/app/api/server/agent-service";
import { apiErrorResponse } from "@/app/api/server/api-error";

export async function GET() {
  try {
    const agents = await agentService.list();
    return NextResponse.json({ agents });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, status, statusMessage } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const agent = await agentService.heartbeat(agentId, { status, statusMessage });
    return NextResponse.json(agent);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
