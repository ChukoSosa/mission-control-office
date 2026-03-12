import { apiFetch } from "./client";
import { ActivityItemSchema, ActivityResponseSchema } from "@/lib/schemas";
import type { ActivityItem } from "@/lib/schemas";
import { shouldUseMockData } from "./mockMode";
import { MOCK_ACTIVITY } from "@/lib/mock/data";

export interface ActivityParams {
  taskId?: string;
  agentId?: string;
  runId?: string;
  limit?: number;
}

export async function getActivity(params: ActivityParams = {}): Promise<ActivityItem[]> {
  if (shouldUseMockData()) {
    let items = MOCK_ACTIVITY;
    if (params.taskId) {
      items = items.filter((item) => item.taskId === params.taskId);
    }
    if (params.agentId) {
      items = items.filter((item) => item.agentId === params.agentId);
    }
    if (params.runId) {
      items = items.filter((item) => item.runId === params.runId);
    }
    if (params.limit && params.limit > 0) {
      items = items.slice(0, params.limit);
    }
    return items;
  }

  const qs = new URLSearchParams();
  if (params.taskId) qs.set("taskId", params.taskId);
  if (params.agentId) qs.set("agentId", params.agentId);
  if (params.runId) qs.set("runId", params.runId);
  if (params.limit) qs.set("limit", String(params.limit));

  const query = qs.size > 0 ? `?${qs.toString()}` : "";
  const raw = await apiFetch<unknown>(`/api/activity${query}`);

  if (Array.isArray(raw)) {
    return raw
      .map((item) => ActivityItemSchema.safeParse(item))
      .filter((p): p is { success: true; data: ActivityItem } => p.success)
      .map((p) => p.data);
  }

  const parsed = ActivityResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[getActivity] schema mismatch", parsed.error.flatten());
    return [];
  }

  const data = parsed.data;
  return data.activity ?? data.items ?? data.logs ?? data.events ?? [];
}
