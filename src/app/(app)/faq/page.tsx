import { FaqKnowledgeCenter } from "@/components/faq-knowledge-center";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getFaqKnowledgeCenter } from "@/lib/data";
import { getLegalMappingTrackerData } from "@/lib/legal-mapping";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const viewer = await requireViewer();
  const [data, legalMapping] = await Promise.all([
    getFaqKnowledgeCenter(toAccessScope(viewer)),
    getLegalMappingTrackerData(),
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
