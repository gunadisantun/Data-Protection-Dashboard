import { NextResponse } from "next/server";
import { resetAndSeedDatabase } from "@/db/init";

export async function POST() {
  await resetAndSeedDatabase();

  return NextResponse.json({
    message: "Seed data refreshed.",
  });
}
