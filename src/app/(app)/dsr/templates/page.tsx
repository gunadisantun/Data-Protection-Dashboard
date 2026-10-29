import { DsrTemplates } from "@/components/dsr-templates";
import { requireViewer, toAccessScope } from "@/lib/access";
import { listDsrTemplates } from "@/lib/consent-dsr";
export const dynamic = "force-dynamic";
export default async function DsrTemplatesPage() { const viewer = await requireViewer(); const rows = await listDsrTemplates(toAccessScope(viewer)); return <div className="mx-auto max-w-[1180px]"><DsrTemplates initialData={rows} /></div>; }
