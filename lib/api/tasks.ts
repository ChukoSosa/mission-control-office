import { apiFetch } from "./client";
import { TasksResponseSchema, SubtasksResponseSchema, CommentsResponseSchema, CommentSchema } from "@/lib/schemas";
import type { Task, Subtask, Comment } from "@/lib/schemas";
import { shouldUseMockData } from "./mockMode";
import { MOCK_TASKS, getMockSubtasks, getMockComments } from "@/lib/mock/data";

export interface CreateTaskCommentInput {
  body: string;
  authorType?: "agent" | "human" | "system";
  authorId?: string | null;
  requiresResponse?: boolean;
  status?: string;
  inReplyToId?: string | null;
}

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

export async function addTaskComment(taskId: string, input: CreateTaskCommentInput): Promise<Comment> {
  const cleanBody = input.body.trim();
  if (!cleanBody) {
    throw new Error("Comment body is required");
  }

  if (shouldUseMockData()) {
    const now = new Date().toISOString();
    return {
      id: `mock-comment-${Date.now()}`,
      taskId,
      authorType: input.authorType ?? "human",
      authorId: input.authorId ?? null,
      body: cleanBody,
      requiresResponse: input.requiresResponse ?? false,
      status: input.status ?? "open",
      inReplyToId: input.inReplyToId ?? null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };
  }

  const raw = await apiFetch<unknown>(`/api/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: cleanBody,
      authorType: input.authorType ?? "human",
      authorId: input.authorId ?? null,
      requiresResponse: input.requiresResponse ?? false,
      status: input.status ?? "open",
      inReplyToId: input.inReplyToId ?? null,
    }),
  });

  const parsed = CommentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Failed to parse created comment response");
  }

  return parsed.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiFetch<unknown>(`/api/tasks/${taskId}`, { method: "DELETE" });
}
