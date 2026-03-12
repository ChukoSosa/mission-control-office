import { NextRequest, NextResponse } from "next/server";
import { taskService } from "@/app/api/server/task-service";
import { apiErrorResponse } from "@/app/api/server/api-error";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await taskService.getById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const task = await taskService.update(params.id, body);
    return NextResponse.json(task);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await taskService.delete(params.id);
    return NextResponse.json({ message: "Task deleted", id: task.id });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
