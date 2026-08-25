import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { deleteTask, updateTask } from "@/lib/data";
import { updateTaskSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid task update",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const task = await updateTask(id, parsed.data, toAccessScope(viewer));

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: task });
}

export async function DELETE(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role === "User") {
    return NextResponse.json(
      { error: "User tidak dapat menghapus task DPIA/TIA/LIA." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const deleted = await deleteTask(id, toAccessScope(viewer));

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
