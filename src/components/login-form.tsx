"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, ShieldCheck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { useI18n } from "@/components/language-provider";

export function LoginForm({
  showDemo = true,
  isOfflineDesktop = false,
  desktopSetupRequired = false,
}: {
  showDemo?: boolean;
  isOfflineDesktop?: boolean;
  desktopSetupRequired?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupUsername, setSetupUsername] = useState("masteradmin");
  const [setupFullName, setSetupFullName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithCredentials(loginUsername: string, loginPassword: string) {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: loginUsername,
        password: loginPassword,
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signInWithCredentials(username, password);
  }

  async function handleDesktopSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSettingUp(true);
    setError(null);

    const response = await fetch("/api/auth/desktop-setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: setupUsername,
        fullName: setupFullName,
        email: setupEmail,
        password: setupPassword,
        confirmPassword: setupConfirmPassword,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? t("login.desktopSetupFailed"));
      setIsSettingUp(false);
      return;
    }

    setIsSettingUp(false);
    await signInWithCredentials(setupUsername, setupPassword);
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

  if (desktopSetupRequired) {
    return (
      <Card className="mx-auto w-full max-w-md shadow-sm">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("login.desktopSetupTitle")}</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            {t("login.desktopSetupSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleDesktopSetup}>
            <div>
              <Label htmlFor="setup-username">{t("login.username")}</Label>
              <Input
                id="setup-username"
                value={setupUsername}
                onChange={(event) => setSetupUsername(event.target.value)}
                autoComplete="username"
                required
                minLength={3}
              />
            </div>
            <div>
              <Label htmlFor="setup-full-name">{t("login.fullName")}</Label>
              <Input
                id="setup-full-name"
                value={setupFullName}
                onChange={(event) => setSetupFullName(event.target.value)}
                autoComplete="name"
                required
                minLength={3}
              />
            </div>
            <div>
              <Label htmlFor="setup-email">{t("login.email")}</Label>
              <Input
                id="setup-email"
                type="email"
                value={setupEmail}
                onChange={(event) => setSetupEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label htmlFor="setup-password">{t("login.password")}</Label>
              <Input
                id="setup-password"
                type="password"
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="setup-confirm-password">
                {t("login.confirmPassword")}
              </Label>
              <Input
                id="setup-confirm-password"
                type="password"
                value={setupConfirmPassword}
                onChange={(event) => setSetupConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            {error ? (
              <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSettingUp || isSubmitting}>
              {isSettingUp || isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isSettingUp || isSubmitting
                ? t("login.creatingAdmin")
                : t("login.createAdmin")}
            </Button>
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              {t("login.offlineDataNote")}
            </p>
          </form>
        </CardContent>
      </Card>
    );
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
                placeholder={isOfflineDesktop ? "masteradmin" : "masteradmin / user_finance"}
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
          {showDemo ? (
            <button
              type="button"
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
              onClick={() => void handleDemoLogin()}
              disabled={isStartingDemo}
            >
              {isStartingDemo ? t("login.openingDemo") : t("login.tryDemo")}
            </button>
          ) : null}
          {isOfflineDesktop ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              {t("login.offlineDataNote")}
            </p>
          ) : null}
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
