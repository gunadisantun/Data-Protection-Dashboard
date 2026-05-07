"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileText,
  FileWarning,
  Grid2X2,
  Globe2,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Scale,
  X,
  UserCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
  { href: "/ropa", label: "RoPA Registry", icon: FileText },
  { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
  {
    href: "/assessments/dpia",
    label: "DPIA",
    icon: FileWarning,
    assessmentType: "dpia",
    inset: true,
  },
  {
    href: "/assessments/tia",
    label: "TIA",
    icon: Globe2,
    assessmentType: "tia",
    inset: true,
  },
  {
    href: "/assessments/lia",
    label: "LIA",
    icon: Scale,
    assessmentType: "lia",
    inset: true,
  },
  { href: "/tasks", label: "Task Board", icon: ClipboardCheck },
  { href: "/reports", label: "Executive Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const mobilePrimaryNavItems = [
  navItems[0],
  navItems[1],
  navItems[6],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[214px] bg-[color:var(--pv-navy)] text-slate-300 md:flex md:flex-col">
        <Link href="/dashboard" className="flex h-16 items-center gap-2 px-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-sm ring-1 ring-white/15">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="pv-display block text-[15px] leading-4 text-white">
              Data Protection
            </span>
            <span className="block text-[11px] font-semibold leading-4 text-slate-300">
              Governance Dashboard
            </span>
          </span>
        </Link>

        <nav className="mt-4 flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const active = isActiveNavItem(pathname, item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded px-3 text-sm font-semibold transition",
                  "inset" in item &&
                    item.inset &&
                    "ml-3 h-9 border-l border-slate-700 pl-4 text-xs",
                  active
                    ? "bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 px-3 pb-4 text-sm font-semibold text-slate-400">
          <button className="flex h-9 w-full items-center gap-3 rounded px-2 hover:bg-slate-800 hover:text-white">
            <HelpCircle className="h-4 w-4" />
            Support
          </button>
          <button className="flex h-9 w-full items-center gap-3 rounded px-2 hover:bg-slate-800 hover:text-white">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:pl-[214px]">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-3 shadow-sm md:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900 md:hidden"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="truncate">DPG Dashboard</span>
          </Link>
          <div className="hidden h-8 w-full max-w-[360px] items-center gap-2 rounded border border-slate-200 bg-[#f4f5ff] px-3 text-slate-400 md:flex">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search privacy assets, RoPA or tasks...</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-slate-500">
            <span className="hidden text-xs font-semibold text-slate-500 lg:inline">
              Data Protection Governance Dashboard
            </span>
            <button
              className="hidden rounded p-2 hover:bg-slate-100 sm:block"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              className="hidden rounded p-2 hover:bg-slate-100 sm:block"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <span className="hidden h-6 border-l border-slate-200 sm:block" />
            <Link
              href="/reports"
              className="hidden text-xs font-semibold text-slate-500 hover:text-blue-600 sm:block"
            >
              Audit Log
            </Link>
            <Link href="/ropa/new" className="hidden sm:block">
              <Button size="sm">Tambah Aktivitas</Button>
            </Link>
            <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white sm:flex">
              <UserCircle className="h-5 w-5" />
            </span>
          </div>
        </header>

        <main className="min-h-[calc(100vh-48px)] px-4 pb-28 pt-7 md:px-7 md:pb-7">
          {children}
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col bg-[color:var(--pv-navy)] text-slate-300 shadow-2xl">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-white/10 px-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileNavOpen(false)}
                className="flex min-w-0 items-center gap-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-sm ring-1 ring-white/15">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="pv-display block text-[15px] leading-4 text-white">
                    Data Protection
                  </span>
                  <span className="block text-[11px] font-semibold leading-4 text-slate-300">
                    Governance Dashboard
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => (
                <MobileDrawerLink
                  key={item.href}
                  item={item}
                  active={isActiveNavItem(pathname, item)}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              ))}
            </nav>

            <div className="space-y-1 border-t border-white/10 px-3 py-4 text-sm font-semibold text-slate-400">
              <button className="flex h-10 w-full items-center gap-3 rounded px-3 hover:bg-slate-800 hover:text-white">
                <HelpCircle className="h-4 w-4" />
                Support
              </button>
              <button className="flex h-10 w-full items-center gap-3 rounded px-3 hover:bg-slate-800 hover:text-white">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimaryNavItems.map((item) => (
            <MobileBottomLink
              key={item.href}
              item={item}
              active={isActiveNavItem(pathname, item)}
            />
          ))}
          <MobileBottomAction
            href="/ropa/new"
            label="Tambah"
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
            <span className="truncate">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function MobileDrawerLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-11 items-center gap-3 rounded px-3 text-sm font-semibold transition",
        "inset" in item && item.inset && "ml-4 h-10 border-l border-slate-700 pl-4 text-xs",
        active
          ? "bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-sm"
          : "text-slate-400 hover:bg-slate-800 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function MobileBottomLink({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  return (
    <MobileBottomAction
      href={item.href}
      label={item.label}
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
  icon: (typeof navItems)[number]["icon"];
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

function isActiveNavItem(
  pathname: string,
  item: (typeof navItems)[number],
) {
  if ("assessmentType" in item) {
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
