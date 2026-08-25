import { cache } from "react";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDemoDepartmentId, getDemoUserId } from "@/lib/demo";
import type { AccessScope } from "@/lib/data";

export const demoSessionCookieName = "privacy_bro_demo_session";

type SessionUserShape = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  departmentId?: string | null;
};

type SessionShape = {
  user?: SessionUserShape | null;
};

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: "MasterAdmin" | "DPO" | "User";
  departmentId?: string | null;
  isDemo?: boolean;
  demoSessionId?: string;
};

function normalizeRole(
  role: string | null | undefined,
): "MasterAdmin" | "DPO" | "User" {
  const normalized = role?.trim().toLowerCase();
  if (normalized === "masteradmin" || normalized === "admin") {
    return "MasterAdmin";
  }
  if (normalized === "dpo") {
    return "DPO";
  }
  return "User";
}

function mapSessionToViewer(session: SessionShape | null): Viewer | null {
  const sessionUser = session?.user;

  if (!sessionUser?.id || !sessionUser.email) {
    return null;
  }

  return {
    id: sessionUser.id,
    name: sessionUser.name ?? sessionUser.email,
    email: sessionUser.email,
    role: normalizeRole(sessionUser.role),
    departmentId: sessionUser.departmentId ?? null,
  } satisfies Viewer;
}

export const getViewer = cache(async () => {
  const demoSessionId = (await cookies()).get(demoSessionCookieName)?.value;
  if (demoSessionId) {
    return {
      id: getDemoUserId(demoSessionId),
      name: "Demo User",
      email: `demo-${demoSessionId}@privacybro.local`,
      role: "User",
      departmentId: getDemoDepartmentId(demoSessionId),
      isDemo: true,
      demoSessionId,
    } satisfies Viewer;
  }

  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as SessionShape | null;

  return mapSessionToViewer(session);
});

export async function requireViewer() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  return viewer;
}

export async function getViewerFromRequest(request: Request) {
  const demoSessionId = getCookieFromRequest(request, demoSessionCookieName);
  if (demoSessionId) {
    return {
      id: getDemoUserId(demoSessionId),
      name: "Demo User",
      email: `demo-${demoSessionId}@privacybro.local`,
      role: "User",
      departmentId: getDemoDepartmentId(demoSessionId),
      isDemo: true,
      demoSessionId,
    } satisfies Viewer;
  }

  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as SessionShape | null;

  return mapSessionToViewer(session);
}

export function toAccessScope(viewer: Viewer): AccessScope {
  return {
    role: viewer.role,
    userId: viewer.id,
    departmentId: viewer.departmentId ?? undefined,
    isDemo: viewer.isDemo,
    demoSessionId: viewer.demoSessionId,
  };
}

function getCookieFromRequest(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookiesList = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const cookie = cookiesList.find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function isMasterAdmin(viewer: Pick<Viewer, "role">) {
  return viewer.role === "MasterAdmin";
}

export function isDpo(viewer: Pick<Viewer, "role">) {
  return viewer.role === "DPO";
}

export function isPrivileged(viewer: Pick<Viewer, "role">) {
  return viewer.role === "MasterAdmin" || viewer.role === "DPO";
}
