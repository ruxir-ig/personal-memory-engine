"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Blocks, FileInput, Settings, Sparkles } from "lucide-react";
import { type ReactNode } from "react";
import { ClientClock } from "./client-clock";

const navItems = [
  { href: "/", label: "Canvas", icon: Blocks },
  { href: "/ingest", label: "Ingest", icon: FileInput },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand-block" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={19} />
          </span>
          <span className="brand-title">
            <strong>Quipu</strong>
            <span>Local v0 workspace</span>
          </span>
        </Link>
        <nav className="nav-group" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} className="nav-link" data-active={active} href={item.href}>
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <ClientClock />
        <Link className="profile-link" data-active={pathname.startsWith("/settings")} href="/settings">
          <Settings size={17} aria-hidden="true" />
          <span>
            <strong>Profile</strong>
            <small>Keys and preferences</small>
          </span>
        </Link>
      </aside>
      <main className="main-frame">{children}</main>
    </div>
  );
}
