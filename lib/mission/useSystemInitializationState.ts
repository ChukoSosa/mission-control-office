"use client";

import { useQuery } from "@tanstack/react-query";
import type { MissionSystemState } from "@/lib/mission/systemState";

interface SystemStateResponse {
  state: MissionSystemState;
  generatedAt: string;
}

async function getSystemState(): Promise<SystemStateResponse> {
  const response = await fetch("/api/system/state", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to fetch system state (${response.status})`);
  }

  return response.json() as Promise<SystemStateResponse>;
}

export function useSystemInitializationState(refetchInterval = 3000) {
  const query = useQuery({
    queryKey: ["system-state"],
    queryFn: getSystemState,
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    systemState: query.data?.state,
    generatedAt: query.data?.generatedAt,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
