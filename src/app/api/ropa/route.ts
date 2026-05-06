import { NextResponse } from "next/server";
import { createRopa, listRopa } from "@/lib/data";
import { createRopaSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    data: listRopa({
      department: searchParams.get("department") ?? undefined,
      risk: searchParams.get("risk") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
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

  const result = createRopa(parsed.data);

  return NextResponse.json({
    ...result,
    message: "RoPA activity registered and analyzed.",
  });
}
