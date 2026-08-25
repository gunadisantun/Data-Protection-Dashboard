import { notFound } from "next/navigation";
import { DpiaWorkspace } from "@/components/dpia-workspace";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getAssessmentById, listRiskRegisterEntries } from "@/lib/data";
import { buildDpiaDraft, mergeSavedDpiaDraft } from "@/lib/dpia-draft";

export const dynamic = "force-dynamic";

type DpiaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DpiaPage({ params }: DpiaPageProps) {
  const viewer = await requireViewer();
  const scope = toAccessScope(viewer);
  const { id } = await params;
  const assessment = await getAssessmentById(id, scope);

  if (!assessment || assessment.taskType !== "DPIA") {
    notFound();
  }

  const generatedDraft = buildDpiaDraft(assessment);
  const draft = mergeSavedDpiaDraft(generatedDraft, assessment.notes);
  const riskRegisterReferences = await listRiskRegisterEntries(undefined, scope);

  return (
    <DpiaWorkspace
      assessmentId={assessment.id}
      draft={draft}
      initialStatus={assessment.status}
      riskRegisterReferences={riskRegisterReferences}
      resultHref={`/ropa/${assessment.ropaId}/result`}
    />
  );
}
