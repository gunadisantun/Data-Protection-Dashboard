import { NextResponse } from "next/server";
import { listTasks } from "@/lib/data";
import type { AssessmentStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AssessmentStatus | null;

  return NextResponse.json({
    data: listTasks(status ? [status] : undefined),
  });
}
