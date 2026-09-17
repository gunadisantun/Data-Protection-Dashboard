import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  FlowError,
  flowMutation,
  getRopaFlow,
  mutateRopaFlow,
} from "@/lib/ropa-flow";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getRopaFlow(toAccessScope(viewer)));
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  const viewer = await getViewerFromRequest(request);
  if (!viewer)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = flowMutation.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid flow data" }, { status: 400 });
  try {
    return NextResponse.json(
      await mutateRopaFlow(parsed.data, toAccessScope(viewer)),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof FlowError
            ? error.message
            : "Unable to save data flow",
      },
      { status: error instanceof FlowError ? error.status : 500 },
    );
  }
}
