import { requireViewer, toAccessScope } from "@/lib/access";
import { getCurrentUser, getDepartments, getGovernanceSettings } from "@/lib/data";
import { RopaWizard } from "@/components/ropa-wizard";

export const dynamic = "force-dynamic";

export default async function NewRopaPage() {
  const viewer = await requireViewer();
  const scope = toAccessScope(viewer);
  const [departments, governanceSettings, currentUser] = await Promise.all([
    getDepartments(scope),
    getGovernanceSettings(scope),
    getCurrentUser(scope),
  ]);
  const lockedDepartmentId =
    viewer.isDemo
      ? departments[0]?.name ?? "Unit ABC"
      : viewer.role === "User"
      ? viewer.departmentId ?? departments[0]?.id ?? ""
      : "";

  return (
    <RopaWizard
      departments={departments}
      defaultDepartmentId={lockedDepartmentId}
      lockDepartment={viewer.role === "User" && !viewer.isDemo}
      allowFreeDepartment={Boolean(viewer.isDemo)}
      governanceSettings={governanceSettings}
      activePicName={currentUser?.picName ?? currentUser?.fullName ?? ""}
    />
  );
}
