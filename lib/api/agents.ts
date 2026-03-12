import { apiFetch } from "./client";
import { AgentsResponseSchema } from "@/lib/schemas";
import type { Agent } from "@/lib/schemas";
import { shouldUseMockData } from "./mockMode";
import { MOCK_AGENTS } from "@/lib/mock/data";

export async function getAgents(): Promise<Agent[]> {
  if (shouldUseMockData()) {
    return MOCK_AGENTS;
  }

  const raw = await apiFetch<unknown>("/api/agents");
  const parsed = AgentsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[getAgents] schema mismatch", parsed.error.flatten());
    return [];
  }
  return parsed.data.agents;
}
