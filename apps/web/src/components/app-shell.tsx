"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  CalendarClock,
  Database,
  FileInput,
  Inbox,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { type ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Database },
  { href: "/capture", label: "Capture", icon: FileInput },
  { href: "/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/chat", label: "Chat", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
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
            <strong>Memory Engine</strong>
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
        <div className="surface-plain section-pad" style={{ marginTop: 22 }}>
          <div className="pill-row" style={{ marginBottom: 10 }}>
            <span className="pill accent">
              <Inbox size={13} /> Review-first
            </span>
          </div>
          <p className="card-copy">
            Automation proposes durable memory, reminders, and preferences. The user confirms sensitive or side-effecting
            changes.
          </p>
        </div>
      </aside>
      <main className="main-frame">{children}</main>
    </div>
  );
}
