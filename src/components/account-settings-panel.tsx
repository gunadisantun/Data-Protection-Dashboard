"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import {
  configurableModuleValues,
  createCustomColumn,
  getModuleColumnDefinitions,
  moduleCustomColumnInputTypeLabels,
  moduleColumnLabels,
  type ConfigurableModule,
  type ModuleCustomColumnInputType,
  type ModuleColumnSettings,
} from "@/lib/module-columns";
import { cn } from "@/lib/utils";

type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: "MasterAdmin" | "DPO" | "User";
  departmentId: string | null;
  departmentName: string | null;
  picName: string;
  picEmail: string;
  createdAt: string;
};

type GovernanceSettings = {
  controllerProcessorContacts: string;
  dpoContact: string;
};

type AccountSettingsPanelProps = {
  viewerRole: "MasterAdmin" | "DPO" | "User";
  initialUsers: ManagedUser[];
  initialGovernanceSettings: GovernanceSettings;
  initialColumnSettings: Record<ConfigurableModule, ModuleColumnSettings>;
};

type UserDraft = ManagedUser & {
  password: string;
};

const roleOptions = [
  { value: "User", label: "User" },
  { value: "DPO", label: "DPO" },
  { value: "MasterAdmin", label: "Master Admin" },
] as const;

export function AccountSettingsPanel({
  viewerRole,
  initialUsers,
  initialGovernanceSettings,
  initialColumnSettings,
}: AccountSettingsPanelProps) {
  const canManageAll = viewerRole === "MasterAdmin";
  const canEditGovernance = viewerRole === "DPO";
  const [users, setUsers] = useState(initialUsers);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({});
  const [deletingRow, setDeletingRow] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [governance, setGovernance] = useState(initialGovernanceSettings);
  const [governanceSaving, setGovernanceSaving] = useState(false);
  const [governanceMessage, setGovernanceMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [columnSettings, setColumnSettings] = useState(initialColumnSettings);
  const [selectedColumnModule, setSelectedColumnModule] =
    useState<ConfigurableModule>("ropa");
  const [savingColumnModule, setSavingColumnModule] =
    useState<ConfigurableModule | null>(null);
  const [columnMessage, setColumnMessage] = useState("");
  const [newCustomColumn, setNewCustomColumn] = useState({
    label: "",
    description: "",
    inputType: "short_answer" as ModuleCustomColumnInputType,
    optionsText: "",
  });
  const [newUser, setNewUser] = useState({
    username: "",
    fullName: "",
    email: "",
    role: "User" as "MasterAdmin" | "DPO" | "User",
    departmentName: "",
    picName: "",
    picEmail: "",
    password: "",
  });

  function updateDraft(id: string, patch: Partial<UserDraft>) {
    setDrafts((current) => {
      const base = current[id] ?? users.find((user) => user.id === id);
      if (!base) {
        return current;
      }

      return {
        ...current,
        [id]: {
          ...base,
          ...patch,
          password: patch.password ?? (base as UserDraft).password ?? "",
        },
      };
    });
  }

  async function saveGovernance() {
    setGovernanceSaving(true);
    setGovernanceMessage("");
    const response = await fetch("/api/governance-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(governance),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setGovernanceMessage(payload?.error ?? "Gagal menyimpan governance settings.");
      setGovernanceSaving(false);
      return;
    }

    const result = (await response.json()) as { data: GovernanceSettings };
    setGovernance({
      controllerProcessorContacts: result.data.controllerProcessorContacts,
      dpoContact: result.data.dpoContact,
    });
    setGovernanceMessage("Governance settings berhasil disimpan.");
    setGovernanceSaving(false);
  }

  async function saveRow(id: string) {
    const draft = drafts[id];
    if (!draft) {
      return;
    }

    setSavingRow((current) => ({ ...current, [id]: true }));
    setRowError((current) => ({ ...current, [id]: "" }));

    const payload =
      canManageAll
        ? {
            username: draft.username,
            fullName: draft.fullName,
            email: draft.email,
            role: draft.role,
            departmentName: draft.departmentName ?? "",
            picName: draft.picName,
            picEmail: draft.picEmail,
            password: draft.password || undefined,
          }
        : {
            picName: draft.picName,
            picEmail: draft.picEmail,
          };

    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      setRowError((current) => ({
        ...current,
        [id]: errorPayload?.error ?? "Gagal menyimpan user.",
      }));
      setSavingRow((current) => ({ ...current, [id]: false }));
      return;
    }

    const result = (await response.json()) as { data: ManagedUser };
    setUsers((current) => current.map((user) => (user.id === id ? result.data : user)));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSavingRow((current) => ({ ...current, [id]: false }));
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Hapus akun ini?")) {
      return;
    }

    setDeletingRow((current) => ({ ...current, [id]: true }));
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      window.alert(payload?.error ?? "Gagal menghapus akun.");
      setDeletingRow((current) => ({ ...current, [id]: false }));
      return;
    }

    setUsers((current) => current.filter((user) => user.id !== id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDeletingRow((current) => ({ ...current, [id]: false }));
  }

  async function createUser() {
    setIsCreating(true);
    setCreateError("");
    const payload = {
      ...newUser,
      picName: newUser.picName || newUser.fullName,
      picEmail: newUser.picEmail || newUser.email,
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      setCreateError(errorPayload?.error ?? "Gagal menambahkan akun.");
      setIsCreating(false);
      return;
    }

    const result = (await response.json()) as { data: ManagedUser };
    setUsers((current) => [result.data, ...current]);
    setNewUser({
      username: "",
      fullName: "",
      email: "",
      role: "User",
      departmentName: "",
      picName: "",
      picEmail: "",
      password: "",
    });
    setIsCreating(false);
  }

  function toggleColumn(module: ConfigurableModule, key: string, checked: boolean) {
    setColumnMessage("");
    setColumnSettings((current) => {
      const visibleColumns = current[module]?.visibleColumns ?? [];
      const nextColumns = checked
        ? [...visibleColumns, key]
        : visibleColumns.filter((columnKey) => columnKey !== key);

      return {
        ...current,
        [module]: {
          module,
          visibleColumns: nextColumns,
          customColumns: current[module]?.customColumns ?? [],
        },
      };
    });
  }

  function addCustomColumn(module: ConfigurableModule) {
    const label = newCustomColumn.label.trim();
    if (!label) {
      setColumnMessage("Isi nama kolom custom terlebih dahulu.");
      return;
    }

    const selectableOptions = newCustomColumn.optionsText
      .split(/[\n,]/)
      .map((option) => option.trim())
      .filter(Boolean);

    if (newCustomColumn.inputType === "dropdown" && selectableOptions.length === 0) {
      setColumnMessage("Dropdown perlu minimal 1 opsi.");
      return;
    }

    setColumnSettings((current) => {
      const existingDefinitions = getModuleColumnDefinitions(
        module,
        current[module]?.customColumns,
      );
      const column = {
        ...createCustomColumn(
          module,
          label,
          existingDefinitions,
          newCustomColumn.inputType,
          selectableOptions,
        ),
        description:
          newCustomColumn.description.trim() ||
          "Kolom custom yang diatur oleh MasterAdmin.",
      };
      const visibleColumns = current[module]?.visibleColumns ?? [];

      return {
        ...current,
        [module]: {
          module,
          visibleColumns: [...visibleColumns, column.key],
          customColumns: [...(current[module]?.customColumns ?? []), column],
        },
      };
    });
    setNewCustomColumn({
      label: "",
      description: "",
      inputType: "short_answer",
      optionsText: "",
    });
    setColumnMessage("Kolom custom ditambahkan. Klik Simpan Kolom untuk menerapkan.");
  }

  function removeCustomColumn(module: ConfigurableModule, key: string) {
    setColumnSettings((current) => ({
      ...current,
      [module]: {
        module,
        visibleColumns: (current[module]?.visibleColumns ?? []).filter(
          (columnKey) => columnKey !== key,
        ),
        customColumns: (current[module]?.customColumns ?? []).filter(
          (column) => column.key !== key,
        ),
      },
    }));
    setColumnMessage("Kolom custom dihapus. Klik Simpan Kolom untuk menerapkan.");
  }

  async function saveColumnSettings(module: ConfigurableModule) {
    setSavingColumnModule(module);
    setColumnMessage("");

    const response = await fetch("/api/module-columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module,
        visibleColumns: columnSettings[module]?.visibleColumns ?? [],
        customColumns: columnSettings[module]?.customColumns ?? [],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setColumnMessage(payload?.error ?? "Gagal menyimpan pengaturan kolom.");
      setSavingColumnModule(null);
      return;
    }

    const result = (await response.json()) as { data: ModuleColumnSettings };
    setColumnSettings((current) => ({
      ...current,
      [module]: result.data,
    }));
    setColumnMessage(`Kolom ${moduleColumnLabels[module]} berhasil disimpan.`);
    setSavingColumnModule(null);
  }

  return (
    <div className="space-y-6">
      {canEditGovernance ? (
        <Card>
          <CardHeader>
            <CardTitle>Governance Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nama dan Kontak Pengendali/Pengendali Bersama/Prosesor</Label>
              <Textarea
                value={governance.controllerProcessorContacts}
                onChange={(event) =>
                  setGovernance((current) => ({
                    ...current,
                    controllerProcessorContacts: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Kontak Pejabat/Petugas Pelindung Data Pribadi (DPO)</Label>
              <Input
                value={governance.dpoContact}
                onChange={(event) =>
                  setGovernance((current) => ({
                    ...current,
                    dpoContact: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void saveGovernance()} disabled={governanceSaving}>
                {governanceSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </Button>
              {governanceMessage ? (
                <span className="text-sm text-slate-600">{governanceMessage}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canManageAll ? (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Akun</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Username</Label>
              <Input
                value={newUser.username}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, username: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Nama</Label>
              <Input
                value={newUser.fullName}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, fullName: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newUser.email}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    role: event.target.value as "MasterAdmin" | "DPO" | "User",
                  }))
                }
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Departemen</Label>
              <Input
                value={newUser.departmentName}
                placeholder="Contoh: Enterprise Risk Management"
                onChange={(event) =>
                  setNewUser((current) => ({
                    ...current,
                    departmentName: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>PIC Name (opsional)</Label>
              <Input
                value={newUser.picName}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, picName: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>PIC Email (opsional)</Label>
              <Input
                value={newUser.picEmail}
                onChange={(event) =>
                  setNewUser((current) => ({ ...current, picEmail: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button onClick={() => void createUser()} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tambah Akun
              </Button>
              {createError ? <span className="text-sm text-red-600">{createError}</span> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canManageAll ? (
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Kolom Modul</CardTitle>
            <p className="text-sm text-slate-500">
              Atur kolom yang tampil di tabel RoPA, DPIA, TIA, dan LIA. Kolom
              wajib seperti aktivitas dan aksi tetap aktif agar alur kerja tidak
              terputus.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {configurableModuleValues.map((module) => (
                <button
                  key={module}
                  type="button"
                  onClick={() => setSelectedColumnModule(module)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    selectedColumnModule === module
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700",
                  )}
                >
                  {moduleColumnLabels[module]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {getModuleColumnDefinitions(
                selectedColumnModule,
                columnSettings[selectedColumnModule]?.customColumns,
              ).map((column) => {
                const checked =
                  column.locked ||
                  (columnSettings[selectedColumnModule]?.visibleColumns ?? []).includes(
                    column.key,
                  );

                return (
                  <label
                    key={column.key}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4",
                      column.locked ? "bg-slate-50" : "hover:border-blue-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={checked}
                      disabled={column.locked}
                      onChange={(event) =>
                        toggleColumn(
                          selectedColumnModule,
                          column.key,
                          event.target.checked,
                        )
                      }
                    />
                    <span>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-950">
                        {column.label}
                        {column.locked ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            Wajib
                          </span>
                        ) : null}
                        {column.custom ? (
                          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                            Custom
                          </span>
                        ) : null}
                        {column.custom && column.inputType ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                            {moduleCustomColumnInputTypeLabels[column.inputType]}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {column.description}
                      </span>
                      {column.custom &&
                      (column.inputType === "dropdown" ||
                        column.inputType === "checkbox") &&
                      column.options?.length ? (
                        <span className="mt-2 block text-xs text-slate-500">
                          Opsi: {column.options.join(", ")}
                        </span>
                      ) : null}
                      {column.custom ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-bold text-red-600 hover:text-red-700"
                          onClick={(event) => {
                            event.preventDefault();
                            removeCustomColumn(selectedColumnModule, column.key);
                          }}
                        >
                          Hapus kolom custom
                        </button>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
              <div className="text-sm font-bold text-slate-950">
                Tambah Kolom Custom
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Kolom custom akan muncul sebagai kolom tambahan di tabel modul
                yang dipilih. Tipe isian disimpan agar input per record nanti
                mengikuti format yang benar.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Nama Kolom</Label>
                  <Input
                    value={newCustomColumn.label}
                    placeholder="Contoh: Reviewer Legal"
                    onChange={(event) =>
                      setNewCustomColumn((current) => ({
                        ...current,
                        label: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Tipe Isian</Label>
                  <Select
                    value={newCustomColumn.inputType}
                    onChange={(event) =>
                      setNewCustomColumn((current) => ({
                        ...current,
                        inputType: event.target.value as ModuleCustomColumnInputType,
                      }))
                    }
                  >
                    <option value="short_answer">Short Answer</option>
                    <option value="long_answer">Long Answer</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="dropdown">Dropdown</option>
                  </Select>
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input
                    value={newCustomColumn.description}
                    placeholder="Keterangan fungsi kolom"
                    onChange={(event) =>
                      setNewCustomColumn((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
                {newCustomColumn.inputType === "dropdown" ||
                newCustomColumn.inputType === "checkbox" ? (
                  <div>
                    <Label>
                      {newCustomColumn.inputType === "dropdown"
                        ? "Opsi Dropdown"
                        : "Opsi Checkbox"}
                    </Label>
                    <Input
                      value={newCustomColumn.optionsText}
                      placeholder={
                        newCustomColumn.inputType === "dropdown"
                          ? "Contoh: Low, Medium, High"
                          : "Contoh: Privacy Notice, Consent, DPA"
                      }
                      onChange={(event) =>
                        setNewCustomColumn((current) => ({
                          ...current,
                          optionsText: event.target.value,
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {newCustomColumn.inputType === "dropdown"
                        ? "Pisahkan opsi dengan koma atau baris baru."
                        : "Opsional. Kosongkan untuk checkbox Ya/Tidak, atau isi beberapa opsi untuk checklist."}
                    </p>
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addCustomColumn(selectedColumnModule)}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kolom
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void saveColumnSettings(selectedColumnModule)}
                disabled={savingColumnModule === selectedColumnModule}
              >
                {savingColumnModule === selectedColumnModule ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Kolom
              </Button>
              {columnMessage ? (
                <span className="text-sm text-slate-600">{columnMessage}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {canManageAll
              ? "Account Management"
              : viewerRole === "DPO"
                ? "Set PIC Akun DPO"
                : "Set PIC Akun Saya"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className={cn(canManageAll ? "min-w-[1380px]" : "min-w-[900px]")}>
            <THead>
              <tr>
                <TH>Username</TH>
                <TH>Nama</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Departemen</TH>
                <TH>PIC Name</TH>
                <TH>PIC Email</TH>
                {canManageAll ? <TH>Password Baru</TH> : null}
                <TH>Aksi</TH>
              </tr>
            </THead>
            <TBody>
              {users.map((user) => {
                const draft = drafts[user.id] ?? { ...user, password: "" };
                const isDirty = Boolean(drafts[user.id]);

                return (
                  <tr key={user.id}>
                    <TD>
                      {canManageAll ? (
                        <Input
                          value={draft.username}
                          onChange={(event) =>
                            updateDraft(user.id, { username: event.target.value })
                          }
                        />
                      ) : (
                        <span className="font-semibold">{user.username}</span>
                      )}
                    </TD>
                    <TD>
                      {canManageAll ? (
                        <Input
                          value={draft.fullName}
                          onChange={(event) =>
                            updateDraft(user.id, { fullName: event.target.value })
                          }
                        />
                      ) : (
                        user.fullName
                      )}
                    </TD>
                    <TD>
                      {canManageAll ? (
                        <Input
                          value={draft.email}
                          onChange={(event) =>
                            updateDraft(user.id, { email: event.target.value })
                          }
                        />
                      ) : (
                        user.email
                      )}
                    </TD>
                    <TD>
                      {canManageAll ? (
                        <Select
                          value={draft.role}
                          onChange={(event) =>
                            updateDraft(user.id, {
                              role: event.target.value as "MasterAdmin" | "DPO" | "User",
                            })
                          }
                        >
                          {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        user.role
                      )}
                    </TD>
                    <TD>
                      {canManageAll ? (
                        <Input
                          value={draft.departmentName ?? ""}
                          placeholder="Nama departemen"
                          onChange={(event) =>
                            updateDraft(user.id, {
                              departmentName: event.target.value,
                            })
                          }
                        />
                      ) : (
                        user.departmentName || "-"
                      )}
                    </TD>
                    <TD>
                      <Input
                        value={draft.picName}
                        onChange={(event) =>
                          updateDraft(user.id, { picName: event.target.value })
                        }
                      />
                    </TD>
                    <TD>
                      <Input
                        value={draft.picEmail}
                        onChange={(event) =>
                          updateDraft(user.id, { picEmail: event.target.value })
                        }
                      />
                    </TD>
                    {canManageAll ? (
                      <TD>
                        <Input
                          type="password"
                          value={draft.password}
                          placeholder="Kosongkan jika tidak ganti"
                          onChange={(event) =>
                            updateDraft(user.id, { password: event.target.value })
                          }
                        />
                      </TD>
                    ) : null}
                    <TD>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant={isDirty ? "default" : "secondary"}
                          disabled={!isDirty || savingRow[user.id]}
                          onClick={() => void saveRow(user.id)}
                        >
                          {savingRow[user.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Simpan
                        </Button>
                        {canManageAll ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={deletingRow[user.id]}
                            onClick={() => void deleteRow(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </Button>
                        ) : null}
                        {rowError[user.id] ? (
                          <p className="text-xs text-red-600">{rowError[user.id]}</p>
                        ) : null}
                      </div>
                    </TD>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
