import { notFound } from "next/navigation";
import { DsrDetail } from "@/components/dsr-detail";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getDsrRequest } from "@/lib/consent-dsr";
export const dynamic = "force-dynamic";
export default async function DsrDetailPage({ params }: { params: Promise<{ id: string }> }) { const viewer = await requireViewer(); const data = await getDsrRequest((await params).id, toAccessScope(viewer)); if (!data) notFound(); return <div className="mx-auto max-w-[1180px]"><DsrDetail initial={data} /></div>; }
