"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { emptyBreachReportAnswers } from "@/lib/breach-report-fields";
import type { BreachReportProfileAnswers } from "@/lib/breach-report-profile";

type Department = {
  id: string;
  name: string;
};

export function BreachReportCreateForm({
  departments,
  defaultDepartmentId,
  lockDepartment,
  profileDefaults,
}: {
  departments: Department[];
  defaultDepartmentId?: string | null;
  lockDepartment: boolean;
  profileDefaults: BreachReportProfileAnswers;
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function createReport() {
    setError("");
    setIsCreating(true);

    const response = await fetch("/api/breach-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Draft Laporan Kegagalan PDP",
        departmentId,
        answers: {
          ...emptyBreachReportAnswers(),
          ...profileDefaults,
          systemName: profileDefaults.systemName || "Draft Laporan Kegagalan PDP",
        },
      }),
    });

    setIsCreating(false);

    if (!response.ok) {
      setError("Gagal membuat laporan. Pastikan departemen sudah diisi.");
      return;
    }

    const payload = (await response.json()) as { data?: { id: string } };

    if (payload.data?.id) {
      router.push(`/breach-reports/${payload.data.id}`);
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <Label help="Pilih unit yang membuat atau bertanggung jawab atas laporan insiden ini.">
          Departemen
        </Label>
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
      <Button onClick={() => void createReport()} disabled={isCreating}>
        <Plus className="h-4 w-4" />
        Buat Laporan
      </Button>
      {error ? (
        <p className="text-sm font-semibold text-red-600 md:col-span-2">{error}</p>
      ) : null}
    </div>
  );
}
