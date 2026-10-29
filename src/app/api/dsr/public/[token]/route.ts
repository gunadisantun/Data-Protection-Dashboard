import { NextResponse } from "next/server";
import { getPublicDsr, submitDsrPublicRequest } from "@/lib/consent-dsr";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const data = await getPublicDsr(token);
  return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Link expired or not found" }, { status: 404 });
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try { return NextResponse.json({ data: await submitDsrPublicRequest(token, await request.json()) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit request" }, { status: 400 }); }
}
