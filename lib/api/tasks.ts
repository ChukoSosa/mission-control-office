import { apiFetch } from "./client";
import { TasksResponseSchema, SubtasksResponseSchema, CommentsResponseSchema } from "@/lib/schemas";
import type { Task, Subtask, Comment } from "@/lib/schemas";
import { shouldUseMockData } from "./mockMode";
import { MOCK_TASKS, getMockSubtasks, getMockComments } from "@/lib/mock/data";

export async function getTasks(): Promise<Task[]> {
  if (shouldUseMockData()) {
    return MOCK_TASKS;
  }

  const raw = await apiFetch<unknown>("/api/tasks");
  const parsed = TasksResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[getTasks] schema mismatch", parsed.error.flatten());
    return [];
  }
  return parsed.data.tasks;
}

export async function getTaskSubtasks(taskId: string): Promise<Subtask[]> {
  if (shouldUseMockData()) {
    return getMockSubtasks(taskId);
  }

  const raw = await apiFetch<unknown>(`/api/tasks/${taskId}/subtasks`);
  const parsed = SubtasksResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[getTaskSubtasks] schema mismatch", parsed.error.flatten());
    return [];
  }
  return parsed.data.subtasks;
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  if (shouldUseMockData()) {
    return getMockComments(taskId);
  }

  const raw = await apiFetch<unknown>(`/api/tasks/${taskId}/comments`);
  const parsed = CommentsResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[getTaskComments] schema mismatch", parsed.error.flatten());
    return [];
  }
  return parsed.data.comments;
}
