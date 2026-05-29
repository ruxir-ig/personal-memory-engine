"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Clock3, LayoutGrid, Library, Menu, MessageSquareText, Moon, Search, Settings, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/trpc/client";
import { accentColor, spaceIcon } from "@/lib/registry";
import { Composer } from "@/components/capture/composer";

const navItems = [
  { href: "/", label: "Canvas", icon: LayoutGrid },
  { href: "/spaces", label: "Spaces", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Timeline", icon: Clock3 },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/chat", label: "Ask", icon: MessageSquareText },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const current = (document.documentElement.dataset.theme as "dark" | "light") || "dark";
    setTheme(current);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("quipo-theme", next);
    } catch {
      /* ignore */
    }
  }
  return (
    <button className="icon-btn bare" type="button" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const spaces = trpc.space.list.useQuery(undefined, { staleTime: 30_000 });

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const topSpaces = (spaces.data ?? []).slice(0, 7);

  return (
    <div className="app" data-nav={navOpen ? "open" : "closed"}>
      <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      <aside className="sidebar">
        <Link className="side-brand" href="/">
          <span className="side-brand-mark" aria-hidden="true">
            <Knot />
          </span>
          <span className="side-brand-text">
            <strong>Quipo</strong>
            <span>your second brain</span>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary">
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

        <div className="side-label">Spaces</div>
        <div className="side-spaces">
          {topSpaces.length === 0 ? (
            <span className="side-space" style={{ pointerEvents: "none" }}>
              <span className="dot" />
              <span className="faint">No spaces yet</span>
            </span>
          ) : (
            topSpaces.map((space) => {
              const Icon = spaceIcon(space.icon);
              return (
                <Link key={space.id} className="side-space" href={`/spaces/${space.slug}`} style={{ ["--k" as string]: accentColor(space.accent) }}>
                  <Icon size={14} />
                  <span>{space.title}</span>
                  <small>{space.itemCount}</small>
                </Link>
              );
            })
          )}
        </div>

        <div className="side-foot">
          <div className="row between" style={{ padding: "0 4px" }}>
            <ThemeToggle />
            <span className="faint" style={{ fontSize: 11 }}>
              local-first
            </span>
          </div>
          <Link className="profile" data-active={pathname.startsWith("/settings")} href="/settings">
            <span className="avatar">Q</span>
            <span className="grow">
              <strong>Settings</strong>
              <small>Keys, profile, providers</small>
            </span>
            <Settings size={15} />
          </Link>
        </div>
      </aside>

      <main className="main">
        <div className="mobile-bar">
          <button className="icon-btn" type="button" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
            {navOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="row" style={{ gap: 9 }}>
            <span className="side-brand-mark" style={{ width: 30, height: 30 }} aria-hidden="true">
              <Knot size={16} />
            </span>
            <strong style={{ fontSize: 15, letterSpacing: "-0.03em" }}>Quipo</strong>
          </Link>
        </div>
        <div className="main-inner">{children}</div>
      </main>

      <Composer />
    </div>
  );
}

function Knot({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4c0 5 14 5 14 10a4 4 0 0 1-8 0c0-5 14-5 14-10"
        transform="translate(-3 1)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" />
      <circle cx="16.5" cy="7" r="2.2" fill="currentColor" />
    </svg>
  );
}
