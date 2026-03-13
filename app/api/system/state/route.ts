import { NextResponse } from "next/server";
import { prisma } from "@/app/api/server/prisma";
import { getMissionSystemState, markMissionSystemReady } from "@/lib/mission/systemState";
import { MISSION_CONTROL_ONBOARDING_TASK_TITLE } from "@/lib/mission/bootstrapTask";
import { isMissionControlDemoMode } from "@/app/api/server/demo-mode";

export async function GET() {
  if (isMissionControlDemoMode()) {
    markMissionSystemReady();
    return NextResponse.json({
      state: getMissionSystemState(),
      generatedAt: new Date().toISOString(),
    });
  }

  // Determine system state based on database (more reliable than in-memory state)
  const bootstrapTaskExists = await prisma.task.findFirst({
    where: { title: MISSION_CONTROL_ONBOARDING_TASK_TITLE },
    select: { id: true },
  });

  // If bootstrap task exists, system is READY
  if (bootstrapTaskExists) {
    markMissionSystemReady();
  }

  const state = getMissionSystemState();

  return NextResponse.json({
    state,
    generatedAt: new Date().toISOString(),
  });
}
