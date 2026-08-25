import { AssessmentTypeDashboard } from "@/components/assessment-type-dashboard";
import { requireViewer, toAccessScope } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function LiaSummaryPage() {
  const viewer = await requireViewer();

  return (
    <AssessmentTypeDashboard
      type="LIA"
      scope={toAccessScope(viewer)}
      canDeleteTasks={viewer.role !== "User"}
    />
  );
}
