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
  Search,
  Settings,
  ShieldCheck,
  Scale,
  UserCircle,
} from "lucide-react";
import type { ReactNode } from "react";
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
        <header className="sticky top-0 z-20 flex h-12 items-center gap-4 border-b border-slate-200 bg-white px-5 shadow-sm">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-bold text-slate-900 md:hidden"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            DPG Dashboard
          </Link>
          <div className="hidden h-8 w-full max-w-[360px] items-center gap-2 rounded border border-slate-200 bg-[#f4f5ff] px-3 text-slate-400 md:flex">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search privacy assets, RoPA or tasks...</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-slate-500">
            <span className="hidden text-xs font-semibold text-slate-500 lg:inline">
              Data Protection Governance Dashboard
            </span>
            <button className="rounded p-2 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <button className="rounded p-2 hover:bg-slate-100" aria-label="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
            <span className="hidden h-6 border-l border-slate-200 sm:block" />
            <Link
              href="/reports"
              className="hidden text-xs font-semibold text-slate-500 hover:text-blue-600 sm:block"
            >
              Audit Log
            </Link>
            <Link href="/ropa/new">
              <Button size="sm">Tambah Aktivitas</Button>
            </Link>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
              <UserCircle className="h-5 w-5" />
            </span>
          </div>
        </header>

        <main className="min-h-[calc(100vh-48px)] px-4 py-7 md:px-7">
          {children}
        </main>
      </div>

      <div className="fixed bottom-4 right-4 md:hidden">
        <Link
          href="/ropa/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
        >
          <ShieldCheck className="h-5 w-5" />
        </Link>
      </div>
    </div>
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
