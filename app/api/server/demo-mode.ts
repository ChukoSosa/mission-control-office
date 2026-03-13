import { NextResponse } from "next/server";
import { ApiError } from "@/app/api/server/api-error";
import { getEnv } from "@/app/api/server/env";

const READ_ONLY_MESSAGE = "The public live demo is read-only.";

export function isMissionControlDemoMode(): boolean {
  return getEnv().MISSION_CONTROL_DEMO_MODE;
}

export function assertDemoWritable(): void {
  if (isMissionControlDemoMode()) {
    throw new ApiError(403, "BAD_REQUEST", READ_ONLY_MESSAGE);
  }
}

export function demoReadOnlyResponse() {
  return NextResponse.json({ error: READ_ONLY_MESSAGE }, { status: 403 });
}