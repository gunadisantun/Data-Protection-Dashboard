import { redirect } from "next/navigation";
import { SelfAssessmentWorkspace } from "@/components/self-assessment-workspace";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getDepartments, getSelfAssessmentById } from "@/lib/data";
import type {
  SelfAssessmentActionPlanItem,
  SelfAssessmentAnswers,
} from "@/lib/self-assessment";

export const dynamic = "force-dynamic";

type SelfAssessmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SelfAssessmentDetailPage({
  params,
}: SelfAssessmentDetailPageProps) {
  const viewer = await requireViewer();
  const { id } = await params;
  const scope = toAccessScope(viewer);
  const [assessment, departments] = await Promise.all([
    getSelfAssessmentById(id, scope),
    getDepartments(scope),
  ]);

  if (!assessment) {
    redirect("/self-assessment?unavailable=1");
  }

  return (
    <SelfAssessmentWorkspace
      assessment={{
        id: assessment.id,
        assessmentNumber: assessment.assessmentNumber,
        title: assessment.title,
        departmentId: assessment.departmentId,
        status: assessment.status,
        answers: assessment.answers as SelfAssessmentAnswers,
        actionPlan: assessment.actionPlan as SelfAssessmentActionPlanItem[],
      }}
      departments={departments}
      viewerRole={viewer.role}
      lockDepartment={viewer.role === "User" && !viewer.isDemo}
    />
  );
}
