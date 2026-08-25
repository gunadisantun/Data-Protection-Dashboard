import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getViewer } from "@/lib/access";
import { getCurrentLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const viewer = await getViewer();
  const locale = await getCurrentLocale();

  if (viewer) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--background)] px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-950">
            Privacy Bro
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {translate(locale, "login.subtitle")}
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
