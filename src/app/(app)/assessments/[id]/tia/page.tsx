import { notFound } from "next/navigation";
import { TiaWorkspace } from "@/components/tia-workspace";
import { getAssessmentById } from "@/lib/data";
import { buildTiaDraft, mergeSavedTiaDraft } from "@/lib/tia-draft";

export const dynamic = "force-dynamic";

type TiaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TiaPage({ params }: TiaPageProps) {
  const { id } = await params;
  const assessment = await getAssessmentById(id);

  if (!assessment || assessment.taskType !== "TIA") {
    notFound();
  }

  const generatedDraft = buildTiaDraft(assessment);
  const draft = mergeSavedTiaDraft(generatedDraft, assessment.notes);

  return (
    <TiaWorkspace
      assessmentId={assessment.id}
      draft={draft}
      initialStatus={assessment.status}
      resultHref={`/ropa/${assessment.ropaId}/result`}
    />
  );
}
