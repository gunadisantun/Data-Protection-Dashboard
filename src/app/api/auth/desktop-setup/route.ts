import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDesktopMasterAdmin,
  isDesktopSetupRequired,
} from "@/db/init";
import { isOfflineRuntime } from "@/lib/offline-runtime";

export const runtime = "nodejs";

const setupSchema = z
  .object({
    username: z.string().trim().min(3).max(40),
    fullName: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
  });

export async function GET() {
  if (!isOfflineRuntime()) {
    return NextResponse.json({ required: false });
  }

  const required = await isDesktopSetupRequired();
  return NextResponse.json({ required });
}

export async function POST(request: Request) {
  if (!isOfflineRuntime()) {
    return NextResponse.json(
      { error: "Desktop setup is only available in offline desktop mode." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Setup data is invalid." },
      { status: 400 },
    );
  }

  if (!(await isDesktopSetupRequired())) {
    return NextResponse.json(
      { error: "Desktop setup has already been completed." },
      { status: 409 },
    );
  }

  const created = await createDesktopMasterAdmin(parsed.data);
  if (!created) {
    return NextResponse.json(
      { error: "Desktop setup could not be completed." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, username: created.username });
}
