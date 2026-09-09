import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { isDesktopSetupRequired } from "@/db/init";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getAppVersion } from "@/lib/app-version";
import { getCurrentUser } from "@/lib/data";
import { isOfflineRuntime } from "@/lib/offline-runtime";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const isOfflineDesktop = isOfflineRuntime();
  if (isOfflineDesktop && (await isDesktopSetupRequired())) {
    redirect("/login");
  }

  const viewer = await requireViewer();
  const scope = toAccessScope(viewer);
  const user = await getCurrentUser(scope);

  return (
    <AppShell
      viewer={{
        name: user?.fullName ?? viewer.name,
        role: viewer.role,
        departmentName: viewer.isDemo
          ? user?.department?.name ?? "Unit ABC"
          : user?.department?.name ?? null,
        isDemo: viewer.isDemo,
        isOfflineDesktop,
        appVersion: getAppVersion(),
      }}
    >
      {children}
    </AppShell>
  );
}
