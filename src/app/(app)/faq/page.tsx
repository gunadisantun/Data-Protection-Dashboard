import { FaqKnowledgeCenter } from "@/components/faq-knowledge-center";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getFaqKnowledgeCenter } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const viewer = await requireViewer();
  const data = await getFaqKnowledgeCenter(toAccessScope(viewer));

  return (
    <div className="mx-auto max-w-[1180px]">
      <FaqKnowledgeCenter
        viewerRole={viewer.role}
        categories={data.categories}
        references={data.references}
        sopDocuments={data.sopDocuments}
      />
    </div>
  );
}
