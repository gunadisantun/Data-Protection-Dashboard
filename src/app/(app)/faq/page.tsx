import { FaqKnowledgeCenter } from "@/components/faq-knowledge-center";
import { requireViewer, toAccessScope } from "@/lib/access";
import {
  getFaqKnowledgeCenter,
  getLegalMappingTrackerWithOverrides,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const viewer = await requireViewer();
  const [data, legalMapping] = await Promise.all([
    getFaqKnowledgeCenter(toAccessScope(viewer)),
    getLegalMappingTrackerWithOverrides(),
  ]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <FaqKnowledgeCenter
        viewerRole={viewer.role}
        categories={data.categories}
        legalMapping={legalMapping}
        references={data.references}
        sopDocuments={data.sopDocuments}
      />
    </div>
  );
}
