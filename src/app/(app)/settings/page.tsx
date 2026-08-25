import { ShieldCheck } from "lucide-react";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { requireViewer, toAccessScope } from "@/lib/access";
import {
  getAllModuleColumnSettings,
  getGovernanceSettings,
  listManagedUsers,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await requireViewer();

  const scope = toAccessScope(viewer);
  const [users, governanceSettings, columnSettings] = await Promise.all([
    listManagedUsers(scope),
    viewer.role === "DPO"
      ? getGovernanceSettings(scope)
      : Promise.resolve(null),
    getAllModuleColumnSettings(),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {viewer.role === "MasterAdmin"
            ? "Account Management"
            : viewer.role === "DPO"
              ? "Legal & Account Settings"
              : "My Account Settings"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {viewer.role === "MasterAdmin"
            ? "Kelola akun, role, dan departemen."
            : viewer.role === "DPO"
              ? "Kelola governance contacts dan pengaturan PIC untuk akun DPO."
              : "Atur PIC Name dan PIC Email untuk akun Anda."}
        </p>
      </div>
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Role aktif:{" "}
          {viewer.role === "MasterAdmin"
            ? "Master Admin"
            : viewer.role === "DPO"
              ? "DPO"
              : "User"}
        </div>
      </div>
      <AccountSettingsPanel
        viewerRole={viewer.role}
        initialUsers={users}
        initialGovernanceSettings={{
          controllerProcessorContacts:
            governanceSettings?.controllerProcessorContacts ?? "",
          dpoContact: governanceSettings?.dpoContact ?? "",
        }}
        initialColumnSettings={columnSettings}
      />
    </div>
  );
}
