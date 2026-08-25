import { NextResponse } from "next/server";
import { getViewerFromRequest } from "@/lib/access";
import {
  listPrivacyMapOverrides,
  upsertPrivacyMapOverride,
} from "@/lib/privacy-map-overrides";
import { privacyMapOverridePatchSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listPrivacyMapOverrides();
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role !== "MasterAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = privacyMapOverridePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sourceUrls = parsed.data.patch.sourceUrls;
  const invalidSourceUrl = [
    sourceUrls?.primary,
    sourceUrls?.breach,
    sourceUrls?.transfer,
  ].some((url) => url && !isAllowedPrivacyMapSourceUrl(url));
  if (invalidSourceUrl) {
    return NextResponse.json(
      { error: "Source URL must use http(s) and cannot use a restricted source domain." },
      { status: 400 },
    );
  }

  const data = await upsertPrivacyMapOverride({
    jurisdictionId: parsed.data.jurisdictionId,
    patch: parsed.data.patch,
    userId: viewer.id,
  });

  return NextResponse.json({ data });
}

function isAllowedPrivacyMapSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return !/dla\s*piper|dlapiperdataprotection/i.test(url);
  } catch {
    return false;
  }
}
