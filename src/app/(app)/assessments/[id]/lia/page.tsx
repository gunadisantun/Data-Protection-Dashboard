import { notFound } from "next/navigation";
import { LiaWorkspace } from "@/components/lia-workspace";
import { getAssessmentById } from "@/lib/data";
import { buildLiaDraft, mergeSavedLiaDraft } from "@/lib/lia-draft";

export const dynamic = "force-dynamic";

type LiaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiaPage({ params }: LiaPageProps) {
  const { id } = await params;
  const assessment = await getAssessmentById(id);

  if (!assessment || assessment.taskType !== "LIA") {
    notFound();
  }

  const generatedDraft = buildLiaDraft(assessment);
  const draft = mergeSavedLiaDraft(generatedDraft, assessment.notes);

  return (
    <LiaWorkspace
      assessmentId={assessment.id}
      draft={draft}
      initialStatus={assessment.status}
      resultHref={`/ropa/${assessment.ropaId}/result`}
    />
  );
}
