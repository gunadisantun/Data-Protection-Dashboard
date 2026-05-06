import { NextResponse } from "next/server";
import { resetAndSeedDatabase } from "@/db/init";

export async function POST() {
  resetAndSeedDatabase();

  return NextResponse.json({
    message: "Seed data refreshed.",
  });
}
