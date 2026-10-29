import { ConsentRegister } from "@/components/consent-register";
import { requireViewer, toAccessScope } from "@/lib/access";
import { listConsentRecords } from "@/lib/consent-dsr";
export const dynamic = "force-dynamic";
export default async function ConsentPage() { const viewer = await requireViewer(); const rows = await listConsentRecords(toAccessScope(viewer)); return <div className="mx-auto max-w-[1180px]"><ConsentRegister initialData={rows} /></div>; }
