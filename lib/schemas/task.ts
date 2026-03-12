import { z } from "zod";

export const AssignedAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string().optional(),
  priority: z.number().nullable().optional(),
  assignedAgent: AssignedAgentSchema.nullable().optional(),
  assignedAgentId: z.string().nullable().optional(),
  ownerAgentId: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  description: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
}).passthrough();

export type Task = z.infer<typeof TaskSchema>;
export type AssignedAgent = z.infer<typeof AssignedAgentSchema>;

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});
