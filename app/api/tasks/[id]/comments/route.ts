import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/api/server/prisma";
import { apiErrorResponse } from "@/app/api/server/api-error";

function clampLimit(value: string | null, fallback = 50) {
  const n = value ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(n, 200));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const limit = clampLimit(request.nextUrl.searchParams.get("limit"), 50);

    const comments = await prisma.taskComment.findMany({
      where: { taskId: params.id },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const openCount = comments.filter((comment: (typeof comments)[number]) => {
      return !comment.resolvedAt && (comment.status ?? "open") !== "resolved";
    }).length;

    return NextResponse.json({
      comments,
      nextCursor: null,
      openCount,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await request.json();

    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "task not found" }, { status: 404 });
    }

    const normalizedAuthorType =
      typeof payload?.authorType === "string" ? payload.authorType.toLowerCase() : "human";
    const authorType = ["agent", "human", "system"].includes(normalizedAuthorType)
      ? normalizedAuthorType
      : "human";

    const comment = await prisma.taskComment.create({
      data: {
        taskId: params.id,
        authorType,
        authorId: typeof payload?.authorId === "string" ? payload.authorId : null,
        body,
        requiresResponse: Boolean(payload?.requiresResponse),
        status: typeof payload?.status === "string" && payload.status.trim()
          ? payload.status.trim()
          : "open",
        inReplyToId: typeof payload?.inReplyToId === "string" ? payload.inReplyToId : null,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
