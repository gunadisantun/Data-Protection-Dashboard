import { AssessmentTypeDashboard } from "@/components/assessment-type-dashboard";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getCurrentLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function DpiaSummaryPage() {
  const viewer = await requireViewer();
  const locale = await getCurrentLocale();

  return (
    <AssessmentTypeDashboard
      type="DPIA"
      scope={toAccessScope(viewer)}
      canDeleteTasks={viewer.role !== "User"}
      locale={locale}
    />
  );
}
