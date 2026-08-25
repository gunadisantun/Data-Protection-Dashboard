"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { useI18n } from "@/components/language-provider";

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? t("login.loginFailed"));
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleDemoLogin() {
    setIsStartingDemo(true);
    setError(null);

    const response = await fetch("/api/auth/demo", {
      method: "POST",
    });

    if (!response.ok) {
      setError(t("login.demoFailed"));
      setIsStartingDemo(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="username">{t("login.username")}</Label>
            <div className="relative mt-2">
              <UserCircle2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="masteradmin / user_finance"
                className="pl-9"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">{t("login.password")}</Label>
            <div className="relative mt-2">
              <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-9"
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          {error ? (
            <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("login.signingIn") : t("login.signIn")}
          </Button>
          <button
            type="button"
            className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            onClick={() => void handleDemoLogin()}
            disabled={isStartingDemo}
          >
            {isStartingDemo ? t("login.openingDemo") : t("login.tryDemo")}
          </button>
          <p className="text-center text-xs text-slate-500">
            developed by{" "}
            <a
              href="https://www.linkedin.com/in/santun-gunadi"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 underline-offset-4 transition hover:text-blue-800 hover:underline"
            >
              Santun Gunadi, S.H., LL.M
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
