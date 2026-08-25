import { AiImpactDashboard } from "@/components/ai-impact-dashboard";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getDepartments, listAiImpactAssessments, listRopa } from "@/lib/data";
import { getCurrentLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AiImpactPage({
  searchParams,
}: {
  searchParams?: Promise<{ ropaId?: string }>;
}) {
  const viewer = await requireViewer();
  const locale = await getCurrentLocale();
  const scope = toAccessScope(viewer);
  const params = await searchParams;

  const [assessments, ropaActivities, departments] = await Promise.all([
    listAiImpactAssessments(scope),
    listRopa({}, scope),
    getDepartments(scope),
  ]);

  return (
    <AiImpactDashboard
      assessments={assessments}
      ropaActivities={ropaActivities}
      departments={departments}
      initialRopaId={params?.ropaId ?? ""}
      locale={locale}
      canDelete={viewer.role !== "User"}
    />
  );
}
