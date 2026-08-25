import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createRopa, listRopa } from "@/lib/data";
import { createRopaSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = toAccessScope(viewer);

  return NextResponse.json({
    data: await listRopa({
      department: searchParams.get("department") ?? undefined,
      risk: searchParams.get("risk") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }, scope),
  });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRopaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid RoPA payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const scope = toAccessScope(viewer);

  if (
    viewer.role === "User" &&
    !viewer.isDemo &&
    scope.departmentId &&
    parsed.data.departmentId !== scope.departmentId
  ) {
    return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
  }

  const payload = {
    ...parsed.data,
    userId: viewer.id,
    departmentId:
      viewer.role === "User" && !viewer.isDemo && scope.departmentId
        ? scope.departmentId
        : parsed.data.departmentId,
  };

  let result: Awaited<ReturnType<typeof createRopa>>;

  try {
    result = await createRopa(payload, scope);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden department scope")) {
      return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
    }
    if (
      error instanceof Error &&
      error.message.includes("Governance contacts are not configured")
    ) {
      return NextResponse.json(
        {
          error:
            "Kontak Pengendali/Prosesor dan DPO belum diatur. Silakan minta DPO atau Master Admin melengkapi di Settings.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Gagal membuat aktivitas RoPA." }, { status: 500 });
  }

  return NextResponse.json({
    ...result,
    message: "RoPA activity registered and analyzed.",
  });
}
