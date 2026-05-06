import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Supabase Test</h1>
        <p className="mt-3 text-sm text-red-600">{error.message}</p>
        <p className="mt-2 text-sm text-slate-600">
          Pastikan schema PrivacyVault sudah dimigrasikan ke Supabase.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Supabase Connected</h1>
      <p className="mt-3 text-sm text-slate-600">
        Tabel <code>departments</code> berhasil dibaca dari Supabase.
      </p>
      <ul className="mt-5 list-disc space-y-2 pl-5">
        {departments?.map((department) => (
          <li key={department.id}>{department.name}</li>
        ))}
      </ul>
      {departments?.length ? null : (
        <p className="mt-5 text-sm text-slate-600">Belum ada department.</p>
      )}
    </main>
  );
}
