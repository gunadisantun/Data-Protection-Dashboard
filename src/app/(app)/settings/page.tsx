import { Database, KeyRound, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getDepartments } from "@/lib/data";

export default function SettingsPage() {
  const user = getCurrentUser();
  const departments = getDepartments();

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Development controls and role-aware configuration for the MVP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            Better Auth is mounted at <code>/api/auth/[...all]</code>. The current
            development session is seeded as{" "}
            <strong className="text-slate-950">{user?.fullName}</strong> with role{" "}
            <strong className="text-slate-950">{user?.role}</strong>.
          </p>
          <p>
            Seed users include Admin and PIC roles so access control can be expanded
            without changing the data model.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            SQLite + Drizzle
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Local data is stored at <code>data/privacyvault.sqlite</code>. Use{" "}
          <code>npm run db:seed</code> to refresh the demo data.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Departments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {departments.map((department) => (
              <div
                key={department.id}
                className="rounded border border-slate-100 p-3 text-sm font-semibold"
              >
                {department.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
