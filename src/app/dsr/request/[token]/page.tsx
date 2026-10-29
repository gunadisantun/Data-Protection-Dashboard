import { DsrPublicForm } from "@/components/dsr-public-form";
export default async function PublicDsrRequestPage({ params }: { params: Promise<{ token: string }> }) { return <main className="min-h-screen bg-slate-50 px-4 py-12"><div className="mx-auto max-w-xl"><DsrPublicForm token={(await params).token} /></div></main>; }
