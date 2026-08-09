"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiCloseLine,
  RiComputerLine,
  RiDashboardLine,
  RiFlaskLine,
  RiGitCommitLine,
  RiHammerLine,
  RiMenuLine,
  RiPulseLine,
  RiPlayCircleLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiTimeLine
} from "@remixicon/react";
import { cn } from "@/shared/utils/cn";

const navigation = [
  { href: "/", label: "Overview", icon: RiDashboardLine },
  { href: "/tests", label: "Tests", icon: RiFlaskLine },
  { href: "/builds", label: "Builds", icon: RiHammerLine },
  { href: "/timeline", label: "Timeline", icon: RiTimeLine },
  { href: "/services", label: "Services", icon: RiPulseLine },
  { href: "/fleet", label: "Fleet", icon: RiComputerLine },
  { href: "/commits", label: "Commits", icon: RiGitCommitLine },
  { href: "/incidents", label: "Incidents", icon: RiShieldCheckLine },
  { href: "/actions", label: "Actions", icon: RiPlayCircleLine }
];

function NavContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-20 items-center border-b border-pulse-border/70 px-5">
        <Link href="/" onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(74,222,128,0.22)]">
            <RiPulseLine aria-hidden="true" className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-mono text-base font-semibold tracking-tight text-white">PulseOps</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Signal to action</span>
          </span>
        </Link>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Operations</p>
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                    active ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/15" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  )}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-pulse-border/70 p-3">
        <Link href="/settings" onClick={onNavigate} className={cn(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
          pathname.startsWith("/settings") ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
        )}>
          <RiSettings3Line aria-hidden="true" className="h-5 w-5" /> Settings
        </Link>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-pulse-bg text-pulse-text">
      <a href="#main-content" className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-emerald-400 px-4 py-2 font-semibold text-slate-950 transition-transform focus:translate-y-0">Skip to main content</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-pulse-border/70 bg-slate-950/95 lg:flex lg:flex-col">
        <NavContent pathname={pathname} />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r border-pulse-border bg-slate-950 shadow-2xl">
            <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 grid h-11 w-11 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              <RiCloseLine aria-hidden="true" className="h-5 w-5" />
            </button>
            <NavContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-pulse-border/70 bg-pulse-bg/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden">
            <RiMenuLine aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">Operational environment</span>
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 font-mono text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" aria-hidden="true" /> DEV2
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto min-w-0 w-full max-w-[1600px] p-4 pb-12 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
