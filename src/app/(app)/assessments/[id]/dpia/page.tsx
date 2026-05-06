import { notFound } from "next/navigation";
import { DpiaWorkspace } from "@/components/dpia-workspace";
import { getAssessmentById } from "@/lib/data";
import { buildDpiaDraft, mergeSavedDpiaDraft } from "@/lib/dpia-draft";

export const dynamic = "force-dynamic";

type DpiaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DpiaPage({ params }: DpiaPageProps) {
  const { id } = await params;
  const assessment = await getAssessmentById(id);

  if (!assessment || assessment.taskType !== "DPIA") {
    notFound();
  }

  const generatedDraft = buildDpiaDraft(assessment);
  const draft = mergeSavedDpiaDraft(generatedDraft, assessment.notes);

  return (
    <DpiaWorkspace
      assessmentId={assessment.id}
      draft={draft}
      initialStatus={assessment.status}
      resultHref={`/ropa/${assessment.ropaId}/result`}
    />
  );
}
