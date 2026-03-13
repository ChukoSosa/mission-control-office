export function isPublicDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_MISSION_CONTROL_DEMO_MODE === "true";
}

export function getRealtimeRefetchInterval(intervalMs: number): number | false {
  return isPublicDemoMode() ? false : intervalMs;
}