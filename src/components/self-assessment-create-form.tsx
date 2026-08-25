"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, RotateCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, defaultFieldHelp } from "@/components/ui/form";

type Department = {
  id: string;
  name: string;
};

export function SelfAssessmentCreateForm({
  departments,
  defaultDepartmentId,
  lockDepartment,
}: {
  departments: Department[];
  defaultDepartmentId?: string | null;
  lockDepartment: boolean;
}) {
  const router = useRouter();
  const [title] = useState("Self Assessment Kepatuhan PDP");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function createAssessment() {
    setError("");
    setIsCreating(true);

    const response = await fetch("/api/self-assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, departmentId }),
    });

    setIsCreating(false);

    if (!response.ok) {
      setError("Gagal membuka self assessment. Pastikan departemen sudah dipilih.");
      return;
    }

    const payload = (await response.json()) as { data?: { id: string } };
    if (payload.data?.id) {
      router.push(`/self-assessment/${payload.data.id}`);
    }
  }

  return (
    <div className="grid gap-4 rounded-lg border border-[color:var(--pv-border)] bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
          One assessment per unit
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Buka atau mulai self assessment aktif
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Self assessment tidak dibuat berulang. Jika unit sudah memiliki assessment,
          tombol ini akan membuka assessment yang sama untuk diperbarui berkala.
        </p>
      </div>
      <div className="space-y-2">
        <Label help={defaultFieldHelp("Departemen")}>Departemen</Label>
        {lockDepartment ? (
          <Input
            value={
              departments.find((department) => department.id === departmentId)?.name ??
              departmentId
            }
            disabled
          />
        ) : (
          <Select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Pilih departemen</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Button onClick={() => void createAssessment()} disabled={isCreating}>
        {isCreating ? <RotateCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Buka Assessment
      </Button>
      {error ? (
        <p className="text-sm font-semibold text-red-600 lg:col-span-2">{error}</p>
      ) : null}
    </div>
  );
}
