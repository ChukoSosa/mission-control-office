import { NextRequest, NextResponse } from "next/server";
import { agentService } from "@/app/api/server/agent-service";
import { apiErrorResponse } from "@/app/api/server/api-error";
import { isMissionControlDemoMode, demoReadOnlyResponse } from "@/app/api/server/demo-mode";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (isMissionControlDemoMode()) {
      return demoReadOnlyResponse();
    }

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (!avatarUrl) {
      return NextResponse.json({ error: "avatarUrl is required" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 8000) : undefined;
    const variant = typeof body.variant === "string" ? body.variant.slice(0, 64) : undefined;
    const traits = isObject(body.traits) ? body.traits : undefined;

    const agent = await agentService.updateAvatar(id, {
      avatarUrl,
      prompt,
      variant,
      traits,
    });

    return NextResponse.json({
      agentId: agent.id,
      avatarUrl: agent.avatar,
      updatedAt: agent.updatedAt,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
