import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: todos, error } = await supabase.from("todos").select();

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Supabase Test</h1>
        <p className="mt-3 text-sm text-red-600">{error.message}</p>
        <p className="mt-2 text-sm text-slate-600">
          Buat table <code>todos</code> di Supabase untuk melihat data di sini.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Supabase Todos</h1>
      <ul className="mt-5 list-disc space-y-2 pl-5">
        {todos?.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
      {todos?.length ? null : (
        <p className="mt-5 text-sm text-slate-600">Belum ada todo.</p>
      )}
    </main>
  );
}
