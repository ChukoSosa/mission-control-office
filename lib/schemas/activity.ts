import { z } from "zod";

export const ActivityItemSchema = z.object({
  id: z.string().optional(),
  summary: z.string().optional(),
  type: z.string().optional(),
  event: z.string().optional(),
  action: z.string().optional(),
  kind: z.string().optional(),
  taskId: z.string().nullable().optional(),
  subtaskId: z.string().nullable().optional(),
  commentId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  actorType: z.string().nullable().optional(),
  actorId: z.string().nullable().optional(),
  actorName: z.string().optional(),
  runId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  timestamp: z.string().optional(),
  updatedAt: z.string().optional(),
  occurredAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

export type ActivityItem = z.infer<typeof ActivityItemSchema>;

export const ActivityResponseSchema = z.object({
  activity: z.array(ActivityItemSchema).optional(),
  items: z.array(ActivityItemSchema).optional(),
  logs: z.array(ActivityItemSchema).optional(),
  events: z.array(ActivityItemSchema).optional(),
}).passthrough();
