import { notFound } from "next/navigation";
import { AiImpactWorkspace } from "@/components/ai-impact-workspace";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getAiImpactAssessmentById } from "@/lib/data";
import { getCurrentLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AiImpactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const locale = await getCurrentLocale();
  const { id } = await params;
  const assessment = await getAiImpactAssessmentById(id, toAccessScope(viewer));

  if (!assessment) {
    notFound();
  }

  return (
    <AiImpactWorkspace
      assessment={assessment}
      locale={locale}
      canDelete={viewer.role !== "User"}
    />
  );
}
