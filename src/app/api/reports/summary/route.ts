import { NextResponse } from "next/server";
import { getReportSummary } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: getReportSummary() });
}
