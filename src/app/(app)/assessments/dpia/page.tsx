import { AssessmentTypeDashboard } from "@/components/assessment-type-dashboard";
import { requireViewer, toAccessScope } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function DpiaSummaryPage() {
  const viewer = await requireViewer();

  return (
    <AssessmentTypeDashboard
      type="DPIA"
      scope={toAccessScope(viewer)}
      canDeleteTasks={viewer.role !== "User"}
    />
  );
}
