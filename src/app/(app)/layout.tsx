import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getCurrentUser } from "@/lib/data";

export default async function ProductLayout({ children }: { children: ReactNode }) {
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
      }}
    >
      {children}
    </AppShell>
  );
}
