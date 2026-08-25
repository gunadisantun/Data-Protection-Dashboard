"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  CircleAlert,
  FileText,
  FileWarning,
  Globe2,
  Grid2X2,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Scale,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Grid2X2;
  inset?: boolean;
  assessmentType?: "dpia" | "tia" | "lia";
};

type BreachAlert = {
  total: number;
  submitted: number;
  draft: number;
  latestTitle: string;
  latestReportNumber: string;
};

export type AppShellViewer = {
  name: string;
  role: "MasterAdmin" | "DPO" | "User";
  departmentName?: string | null;
  isDemo?: boolean;
  breachAlert?: BreachAlert | null;
};

const masterAdminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
  { href: "/ropa", label: "RoPA Registry", icon: FileText },
  {
    href: "/assessments/dpia",
    label: "DPIA",
    icon: FileWarning,
    assessmentType: "dpia",
  },
  {
    href: "/assessments/tia",
    label: "TIA",
    icon: Globe2,
    assessmentType: "tia",
  },
  {
    href: "/assessments/lia",
    label: "LIA",
    icon: Scale,
    assessmentType: "lia",
  },
];

const dpoNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
  { href: "/ropa", label: "RoPA Registry", icon: FileText },
  {
    href: "/assessments/dpia",
    label: "DPIA",
    icon: FileWarning,
    assessmentType: "dpia",
  },
  {
    href: "/assessments/tia",
    label: "TIA",
    icon: Globe2,
    assessmentType: "tia",
  },
  {
    href: "/assessments/lia",
    label: "LIA",
    icon: Scale,
    assessmentType: "lia",
  },
  { href: "/reports", label: "Summary", icon: Scale },
];

const userNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
  { href: "/ropa", label: "RoPA Registry", icon: FileText },
  {
    href: "/assessments/dpia",
    label: "DPIA",
    icon: FileWarning,
    assessmentType: "dpia",
  },
  {
    href: "/assessments/tia",
    label: "TIA",
    icon: Globe2,
    assessmentType: "tia",
  },
  {
    href: "/assessments/lia",
    label: "LIA",
    icon: Scale,
    assessmentType: "lia",
  },
];

const faqNavItem: NavItem = {
  href: "/faq",
  label: "FAQ",
  icon: HelpCircle,
};

const globalPrivacyNavItem: NavItem = {
  href: "/dashboard/privacy-map",
  label: "Global Privacy",
  icon: Globe2,
};

const selfAssessmentNavItem: NavItem = {
  href: "/self-assessment",
  label: "Self Assessment",
  icon: ClipboardCheck,
};

const breachReportNavItem: NavItem = {
  href: "/breach-reports",
  label: "PDP Failure Report",
  icon: FileWarning,
};

export function AppShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: AppShellViewer;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDemoDisclaimer, setShowDemoDisclaimer] = useState(Boolean(viewer.isDemo));
  const [breachAlert, setBreachAlert] = useState<BreachAlert | null>(
    viewer.breachAlert ?? null,
  );
  const [showBreachAlert, setShowBreachAlert] = useState(
    Boolean(
      viewer.role === "DPO" &&
        viewer.breachAlert?.total &&
        !pathname.startsWith("/breach-reports"),
    ),
  );
  const navItems =
    viewer.role === "MasterAdmin"
      ? masterAdminNavItems
      : viewer.role === "DPO"
        ? dpoNavItems
        : userNavItems;
  const mobilePrimaryNavItems = useMemo(() => navItems.slice(0, 3), [navItems]);
  const viewerInitials = useMemo(() => initialsFromName(viewer.name), [viewer.name]);
  const settingsNavItem = useMemo<NavItem>(() => ({
    href: "/settings",
    label:
      viewer.role === "MasterAdmin"
        ? t("nav.accountManagement")
        : t("nav.picSetting"),
    icon: Settings,
  }), [t, viewer.role]);

  useEffect(() => {
    if (viewer.role !== "DPO" || pathname.startsWith("/breach-reports")) {
      return;
    }

    let cancelled = false;

    async function loadBreachAlert() {
      const response = await fetch("/api/breach-reports", {
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        data?: Array<{
          reportNumber?: string | null;
          title?: string | null;
          status?: string | null;
          updatedAt?: string | null;
        }>;
      } | null;
      const unresolved = (payload?.data ?? []).filter(
        (report) => report.status !== "Finalized",
      );

      if (cancelled) {
        return;
      }

      if (unresolved.length === 0) {
        setBreachAlert(null);
        return;
      }

      const latest = unresolved[0];
      setBreachAlert({
        total: unresolved.length,
        submitted: unresolved.filter((report) => report.status === "Submitted").length,
        draft: unresolved.filter((report) => report.status === "Draft").length,
        latestTitle: latest?.title ?? "Laporan kegagalan PDP",
        latestReportNumber: latest?.reportNumber ?? "",
      });
      setShowBreachAlert(true);
    }

    void loadBreachAlert();

    return () => {
      cancelled = true;
    };
  }, [pathname, viewer.role]);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
    }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-slate-950">
      {showDemoDisclaimer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              {t("shell.demoVersion")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {t("shell.demoDisclaimerTitle")}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>{t("shell.demoDisclaimer1")}</p>
              <p>{t("shell.demoDisclaimer2")}</p>
              <p>{t("shell.demoDisclaimer3")}</p>
            </div>
            <Button
              className="mt-6 w-full"
              onClick={() => setShowDemoDisclaimer(false)}
            >
              {t("shell.understand")}
            </Button>
          </div>
        </div>
      ) : null}
      {showBreachAlert && breachAlert && !pathname.startsWith("/breach-reports") ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden border border-red-100 bg-white shadow-2xl">
            <div className="bg-[linear-gradient(135deg,#dc2626,#f97316)] px-6 py-5 text-white">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/25">
                  <CircleAlert className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-100">
                    {t("shell.urgentIncident")}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold leading-tight">
                    {t("shell.breachAlertTitle")}
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm leading-6 text-slate-700">
                {t("shell.breachAlertBody")}{" "}
                <span className="font-bold text-slate-950">
                  ({breachAlert.total})
                </span>{" "}
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <BreachAlertStat label={t("shell.unfinished")} value={breachAlert.total} />
                <BreachAlertStat label={t("shell.waitingDpo")} value={breachAlert.submitted} />
                <BreachAlertStat label={t("shell.draft")} value={breachAlert.draft} />
              </div>

              <div className="border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">
                  {t("shell.latestReport")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {breachAlert.latestReportNumber
                    ? `${breachAlert.latestReportNumber} - `
                    : ""}
                  {breachAlert.latestTitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowBreachAlert(false)}
                >
                  {t("common.temporaryClose")}
                </Button>
                <Link href="/breach-reports" onClick={() => setShowBreachAlert(false)}>
                  <Button className="w-full sm:w-auto">
                    <FileWarning className="h-4 w-4" />
                    {t("shell.reviewNow")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] border-r border-white/10 bg-[linear-gradient(180deg,#111827,#172033)] text-slate-300 shadow-[8px_0_32px_rgba(15,23,42,0.12)] md:flex md:flex-col">
        <Link href="/dashboard" className="flex h-[72px] items-center gap-3 px-4 py-4">
          <Image
            src="/assets/privacy-bro-logo.png"
            alt="Privacy Bro"
            width={36}
            height={36}
            className="h-10 w-10 object-contain"
          />
          <span className="min-w-0">
            <span className="pv-display block text-base leading-5 text-white">
              Privacy Bro
            </span>
            <span className="block text-[11px] font-semibold leading-4 text-slate-400">
              {t("shell.tagline")}
            </span>
          </span>
        </Link>

        <nav className="mt-2 flex-1 space-y-1.5 px-3">
          {navItems.map((item) => {
            const active = isActiveNavItem(pathname, item);
            const Icon = item.icon;
            const label = translateNavItemLabel(item, t);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-all duration-200",
                  item.inset && "ml-3 h-9 border-l border-slate-700 pl-4 text-xs",
                  active
                    ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur"
                    : "text-slate-400 hover:bg-white/[0.08] hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    active ? "bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white" : "bg-white/6",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1.5 px-3 pb-4 text-sm font-semibold text-slate-400">
          <SidebarPlainUtilityLink
            item={{ ...globalPrivacyNavItem, label: t("nav.globalPrivacy") }}
            active={isActiveNavItem(pathname, globalPrivacyNavItem)}
          />
          <SidebarPlainUtilityLink
            item={{ ...selfAssessmentNavItem, label: t("nav.selfAssessment") }}
            active={isActiveNavItem(pathname, selfAssessmentNavItem)}
          />
          <SidebarUtilityLink
            item={{ ...breachReportNavItem, label: t("nav.breachReports") }}
            active={isActiveNavItem(pathname, breachReportNavItem)}
            eyebrow={t("shell.incidentEyebrow")}
          />
          <button
            className="flex h-10 w-full items-center gap-3 rounded-2xl px-3 hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? t("common.loggingOut") : t("common.logout")}
          </button>
        </div>
      </aside>

      <div className="md:pl-[228px]">
        <header className="sticky top-0 z-20 flex h-[60px] items-center gap-3 border-b border-white/70 bg-white/75 px-3 shadow-[0_1px_0_rgba(148,163,184,0.18)] backdrop-blur-xl md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t("shell.openNavigation")}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900 md:hidden"
          >
            <Image
              src="/assets/privacy-bro-logo.png"
              alt="Privacy Bro"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="truncate">Privacy Bro</span>
          </Link>
          <div className="hidden h-10 w-full max-w-[420px] items-center gap-2 rounded-full border border-[color:var(--pv-border)] bg-slate-100/70 px-4 text-slate-500 md:flex">
            <Search className="h-4 w-4" />
            <span className="text-sm">{t("shell.searchPlaceholder")}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-slate-500 sm:gap-3">
            <LanguageSwitcher compact />
            <span className="hidden text-xs font-semibold text-slate-500 lg:inline">
              Privacy Bro
            </span>
            <button
              className="hidden h-10 w-10 rounded-full p-2 hover:bg-slate-100 sm:grid sm:place-items-center"
              aria-label={t("shell.notifications")}
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href={faqNavItem.href}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full p-2 hover:bg-slate-100",
                isActiveNavItem(pathname, faqNavItem)
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500",
              )}
              aria-label="FAQ"
            >
              <HelpCircle className="h-4 w-4" />
            </Link>
            {viewer.role === "DPO" ? (
              <>
                <span className="hidden h-6 border-l border-slate-200 sm:block" />
                <Link
                  href="/reports"
                  className="hidden text-xs font-semibold text-slate-500 hover:text-blue-600 sm:block"
                >
                  {t("shell.auditLog")}
                </Link>
              </>
            ) : null}
            <Link href="/ropa/new" className="hidden sm:block">
              <Button size="sm">{t("shell.addActivity")}</Button>
            </Link>
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-slate-100"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label={t("shell.openProfileMenu")}
                aria-expanded={profileMenuOpen}
              >
                <span className="hidden max-w-40 text-right text-xs leading-4 sm:block">
                  <span className="block truncate font-semibold text-slate-700">
                    {viewer.name}
                  </span>
                  <span className="block truncate text-slate-400">
                    {viewer.departmentName ?? t("common.allDepartments")}
                  </span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                  {viewerInitials}
                </span>
              </button>

              {profileMenuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="px-3 py-3">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {viewer.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {viewer.role} - {viewer.departmentName ?? t("common.allDepartments")}
                    </p>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <ProfileMenuLink
                    item={settingsNavItem}
                    active={isActiveNavItem(pathname, settingsNavItem)}
                    onNavigate={() => setProfileMenuOpen(false)}
                  />
                  <button
                    className="mt-1 flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 disabled:opacity-60"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? t("common.loggingOut") : t("common.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-60px)] px-4 pb-28 pt-7 md:px-8 md:pb-8">
          {children}
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label={t("shell.closeNavigation")}
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col rounded-r-[28px] bg-[linear-gradient(180deg,#111827,#172033)] text-slate-300 shadow-2xl">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-white/10 px-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
                className="flex min-w-0 items-center gap-2"
              >
                <Image
                  src="/assets/privacy-bro-logo.png"
                  alt="Privacy Bro"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
                <span className="min-w-0">
                  <span className="pv-display block text-[15px] leading-4 text-white">
                    Privacy Bro
                  </span>
                  <span className="block text-[11px] font-semibold leading-4 text-slate-300">
                    {t("shell.tagline")}
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setMobileNavOpen(false)}
                aria-label={t("shell.closeNavigation")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <div className="px-1 pb-3">
                <LanguageSwitcher />
              </div>
              {navItems.map((item) => (
                <MobileDrawerLink
                  key={item.href}
                  item={item}
                  active={isActiveNavItem(pathname, item)}
                  onNavigate={() => setMobileNavOpen(false)}
                  label={translateNavItemLabel(item, t)}
                />
              ))}
            </nav>

            <div className="space-y-1 border-t border-white/10 px-3 py-4 text-sm font-semibold text-slate-400">
              <MobileDrawerLink
                item={globalPrivacyNavItem}
                active={isActiveNavItem(pathname, globalPrivacyNavItem)}
                onNavigate={() => setMobileNavOpen(false)}
                label={t("nav.globalPrivacy")}
              />
              <MobileDrawerLink
                item={selfAssessmentNavItem}
                active={isActiveNavItem(pathname, selfAssessmentNavItem)}
                onNavigate={() => setMobileNavOpen(false)}
                label={t("nav.selfAssessment")}
              />
              <MobileBreachReportLink
                active={isActiveNavItem(pathname, breachReportNavItem)}
                onNavigate={() => setMobileNavOpen(false)}
                label={t("nav.breachReports")}
              />
              <button
                className="flex h-10 w-full items-center gap-3 rounded px-3 hover:bg-slate-800 hover:text-white disabled:opacity-60"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? t("common.loggingOut") : t("common.logout")}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[24px] border border-white/80 bg-white/86 px-2 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNavItems.map((item) => (
            <MobileBottomLink
              key={item.href}
              item={item}
              active={isActiveNavItem(pathname, item)}
              label={translateNavItemLabel(item, t)}
            />
          ))}
          <MobileBottomAction
            href="/ropa/new"
            label={t("shell.addActivity")}
            icon={Plus}
            active={pathname === "/ropa/new"}
          />
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold",
              mobileNavOpen
                ? "bg-blue-50 text-blue-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="truncate">{t("common.menu")}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function BreachAlertStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function ProfileMenuLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "mt-2 flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function SidebarPlainUtilityLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-2xl px-3 transition-all duration-200",
        active
          ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-slate-400 hover:bg-white/[0.08] hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarUtilityLink({
  item,
  active,
  eyebrow,
}: {
  item: NavItem;
  active: boolean;
  eyebrow: string;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 transition-all duration-200",
        active
          ? "border-cyan-300/50 bg-[linear-gradient(135deg,rgba(37,99,235,0.92),rgba(6,182,212,0.82))] text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)]"
          : "border-cyan-300/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.2),rgba(6,182,212,0.14))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-cyan-200/55 hover:bg-[linear-gradient(135deg,rgba(37,99,235,0.36),rgba(6,182,212,0.24))] hover:text-white",
      )}
    >
      <span className="absolute right-0 top-0 h-14 w-14 rounded-bl-[28px] bg-white/10 blur-[1px]" />
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/14 text-white ring-1 ring-white/15">
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative leading-4">
        <span className="block text-[12px] font-bold uppercase tracking-[0.08em] text-cyan-100/90">
          {eyebrow}
        </span>
        <span className="block text-sm font-bold text-white">{item.label}</span>
      </span>
    </Link>
  );
}

function MobileDrawerLink({
  item,
  active,
  onNavigate,
  label,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  label?: string;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 items-center gap-3 rounded px-3 text-sm font-semibold transition",
        item.inset && "ml-4 h-10 border-l border-slate-700 pl-4 text-xs",
        active
          ? "bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label ?? item.label}</span>
    </Link>
  );
}

function MobileBreachReportLink({
  active,
  onNavigate,
  label,
}: {
  active: boolean;
  onNavigate: () => void;
  label: string;
}) {
  return (
    <Link
      href={breachReportNavItem.href}
      onClick={onNavigate}
      className={cn(
        "relative flex min-h-12 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 text-sm font-bold transition",
        active
          ? "border-cyan-300/55 bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-lg"
          : "border-cyan-300/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.22),rgba(6,182,212,0.14))] text-cyan-50 hover:border-cyan-200/55 hover:text-white",
      )}
    >
      <span className="absolute right-0 top-0 h-14 w-14 rounded-bl-[28px] bg-white/10" />
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/14 text-white ring-1 ring-white/15">
        <FileWarning className="h-4 w-4" />
      </span>
      <span className="relative min-w-0 leading-4">
        <span className="block text-[11px] uppercase tracking-[0.08em] text-cyan-100/90">
          PDP
        </span>
        <span className="block truncate">{label}</span>
      </span>
    </Link>
  );
}

function MobileBottomLink({
  item,
  active,
  label,
}: {
  item: NavItem;
  active: boolean;
  label?: string;
}) {
  return (
    <MobileBottomAction
      href={item.href}
      label={label ?? item.label}
      icon={item.icon}
      active={active}
    />
  );
}

function MobileBottomAction({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: NavItem["icon"];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function isActiveNavItem(pathname: string, item: NavItem) {
  if (item.assessmentType) {
    return (
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      pathname.endsWith(`/${item.assessmentType}`)
    );
  }

  if (item.href === "/dashboard") {
    return pathname === item.href;
  }

  if (item.href === "/assessments") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function translateNavItemLabel(
  item: NavItem,
  t: (key: TranslationKey) => string,
) {
  if (item.href === "/dashboard") {
    return t("nav.dashboard");
  }
  if (item.href === "/ropa") {
    return t("nav.ropaRegistry");
  }
  if (item.href === "/assessments/dpia") {
    return t("nav.dpia");
  }
  if (item.href === "/assessments/tia") {
    return t("nav.tia");
  }
  if (item.href === "/assessments/lia") {
    return t("nav.lia");
  }
  if (item.href === "/reports") {
    return t("nav.summary");
  }
  if (item.href === "/faq") {
    return t("nav.faq");
  }
  return item.label;
}

function initialsFromName(name: string) {
  const segments = name
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!segments.length) {
    return "U";
  }

  return segments.map((segment) => segment.charAt(0).toUpperCase()).join("");
}
