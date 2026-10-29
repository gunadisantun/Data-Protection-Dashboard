import { DsrInbox } from "@/components/dsr-inbox";
import { requireViewer, toAccessScope } from "@/lib/access";
import { listDsrRequests } from "@/lib/consent-dsr";

export const dynamic = "force-dynamic";
export default async function DsrPage() {
  const viewer = await requireViewer();
  const rows = await listDsrRequests(toAccessScope(viewer));
  return <div className="mx-auto max-w-[1180px]"><DsrInbox initialData={rows} /></div>;
}
