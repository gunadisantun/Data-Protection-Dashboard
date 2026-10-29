"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Copy, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { DSR_REQUEST_TYPES } from "@/lib/dsr-types";

type RequestRow = { id: string; requestNumber: string; subjectReference: string; requestType: string; status: string; submittedAt: string; dueAt: string; departmentId: string | null; };

export function DsrInbox({ initialData }: { initialData: RequestRow[] }) {
  const [rows, setRows] = useState(initialData);
  const [status, setStatus] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ subjectReference: "", requestType: "Access", responseChannel: "Email", subjectMessage: "" });
  const load = async (nextStatus = status) => { const response = await fetch(`/api/dsr${nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : ""}`, { cache: "no-store" }); if (response.ok) setRows((await response.json()).data); };
  async function create() { const response = await fetch("/api/dsr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const payload = await response.json(); if (!response.ok) return setMessage(payload.error ?? "Unable to create request"); setMessage("Request created"); setOpenForm(false); setForm({ subjectReference: "", requestType: "Access", responseChannel: "Email", subjectMessage: "" }); void load(); }
  async function makeLink() { const response = await fetch("/api/dsr/public-link", { method: "POST" }); const payload = await response.json(); if (response.ok) setPublicLink(`${window.location.origin}/dsr/request/${payload.data.token}`); }
  const open = rows.filter((row) => !["Closed", "Rejected"].includes(row.status)).length;
  const [now] = useState(() => Date.now());
  const overdue = rows.filter((row) => !["Closed", "Rejected"].includes(row.status) && new Date(row.dueAt).getTime() < now).length;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Operations</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Data Subject Request Management</h1><p className="mt-1 max-w-2xl text-sm text-slate-600">Manage rights requests with pseudonymous references, identity review, assignments, response drafting, and DPO closure.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void makeLink()}><Copy className="h-4 w-4" />Create public link</Button><Button onClick={() => setOpenForm((value) => !value)}><Plus className="h-4 w-4" />New request</Button></div></div>
    {publicLink ? <Card><CardContent className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between"><span className="break-all text-slate-700">Public intake link: <strong>{publicLink}</strong></span><Button size="sm" variant="secondary" onClick={() => void navigator.clipboard?.writeText(publicLink)}><Copy className="h-4 w-4" />Copy</Button></CardContent></Card> : null}
    {message ? <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{message}</p> : null}
    {openForm ? <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2"><div><Label htmlFor="subjectReference">Pseudonymous reference</Label><Input id="subjectReference" value={form.subjectReference} onChange={(event) => setForm({ ...form, subjectReference: event.target.value })} placeholder="e.g. CUST-2048" /></div><div><Label htmlFor="requestType">Request type</Label><Select id="requestType" value={form.requestType} onChange={(event) => setForm({ ...form, requestType: event.target.value })}>{DSR_REQUEST_TYPES.map((item) => <option key={item}>{item}</option>)}</Select></div><div><Label htmlFor="responseChannel">Response channel</Label><Input id="responseChannel" value={form.responseChannel} onChange={(event) => setForm({ ...form, responseChannel: event.target.value })} /></div><div className="md:col-span-2"><Label htmlFor="subjectMessage">Request description</Label><Textarea id="subjectMessage" value={form.subjectMessage} onChange={(event) => setForm({ ...form, subjectMessage: event.target.value })} /></div><div className="flex gap-2 md:col-span-2"><Button onClick={() => void create()}>Create request</Button><Button variant="ghost" onClick={() => setOpenForm(false)}>Cancel</Button></div></CardContent></Card> : null}
    <div className="grid gap-4 md:grid-cols-4"><Metric label="Open requests" value={open} /><Metric label="New" value={rows.filter((row) => row.status === "New").length} /><Metric label="DPO review" value={rows.filter((row) => row.status === "DPO Review").length} /><Metric label="Overdue" value={overdue} /></div>
    <Card><CardContent className="p-0"><div className="flex items-center justify-between border-b border-slate-100 p-4"><CardTitle>Request inbox</CardTitle><div className="flex gap-2"><Select className="w-48" value={status} onChange={(event) => { setStatus(event.target.value); void load(event.target.value); }}><option value="">All statuses</option>{["New", "Identity Verification", "In Review", "In Progress", "Waiting for Unit", "Waiting for Subject", "Response Ready", "DPO Review", "Responded", "Closed", "Rejected"].map((item) => <option key={item}>{item}</option>)}</Select><Button size="icon" variant="secondary" onClick={() => void load()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-4"><div className="font-semibold text-slate-900">{row.requestNumber}</div><div className="text-xs text-slate-500">{row.subjectReference}</div></td><td className="px-4 py-4">{row.requestType}</td><td className="px-4 py-4"><Badge>{row.status}</Badge></td><td className="px-4 py-4 text-slate-600">{new Date(row.dueAt).toLocaleDateString()}</td><td className="px-4 py-4 text-right"><Link href={`/dsr/${row.id}`}><Button size="sm" variant="ghost">Open <ArrowUpRight className="h-4 w-4" /></Button></Link></td></tr>)}{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No requests in this view.</td></tr> : null}</tbody></table></div></CardContent></Card>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></CardContent></Card>; }
