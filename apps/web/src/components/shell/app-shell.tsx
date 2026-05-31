"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Clock3,
  LayoutGrid,
  Library,
  ListTodo,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import type { SpaceAccent } from "@pme/shared";
import { useSpaces } from "@/client/hooks";
import { accentColor, spaceIcon } from "@/lib/registry";
import { spaceHref } from "@/lib/space-routes";
import { Composer } from "@/components/capture/composer";

const navItems = [
  { href: "/", label: "Canvas", icon: LayoutGrid },
  { href: "/search", label: "Search", icon: Search },
  { href: "/timeline", label: "Timeline", icon: Clock3 },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/lists", label: "Lists", icon: ListTodo },
  { href: "/chat", label: "Ask", icon: MessageSquareText },
];

function SpacesNav({
  spaces,
}: {
  spaces: Array<{ id: string; slug: string; title: string; icon: string; accent: SpaceAccent; itemCount: number }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const querySlug = searchParams.get("slug");
  const onSpaces = pathname === "/spaces" || pathname.startsWith("/spaces/");
  const activeSlug = pathname.startsWith("/spaces/") ? pathname.split("/")[2] : querySlug;
  const [open, setOpen] = useState(onSpaces);

  useEffect(() => {
    if (onSpaces) setOpen(true);
  }, [onSpaces]);

  return (
    <div className="nav-group" data-open={open}>
      <div className="nav-link-row">
        <Link className="nav-link" data-active={onSpaces && pathname === "/spaces" && !querySlug} href="/spaces">
          <Library size={17} aria-hidden="true" />
          <span>Spaces</span>
        </Link>
        <button
          type="button"
          className="nav-chevron"
          aria-label={open ? "Collapse spaces" : "Expand spaces"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="nav-submenu">
          {spaces.length === 0 ? (
            <span className="nav-sub-link faint" style={{ pointerEvents: "none" }}>
              No spaces yet
            </span>
          ) : (
            spaces.map((space) => {
              const Icon = spaceIcon(space.icon);
              const active = activeSlug === space.slug;
              return (
                <Link
                  key={space.id}
                  className="nav-sub-link"
                  data-active={active}
                  href={spaceHref(space.slug)}
                  style={{ ["--k" as string]: accentColor(space.accent) }}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{space.title}</span>
                  <small className="tnum">{space.itemCount}</small>
                </Link>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const spaces = useSpaces();
  const spaceList = spaces.data ?? [];

  return (
    <nav className="nav" aria-label="Primary">
      <Link className="nav-link" data-active={pathname === "/"} href="/">
        <LayoutGrid size={17} aria-hidden="true" />
        <span>Canvas</span>
      </Link>

      <Suspense fallback={null}>
        <SpacesNav spaces={spaceList} />
      </Suspense>

      {navItems.slice(1).map((item) => {
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
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="app" data-nav={navOpen ? "open" : "closed"}>
      <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      <aside className="sidebar">
        <Link className="side-brand" href="/">
          <span className="side-brand-mark" aria-hidden="true">
            <Knot />
          </span>
          <span className="side-brand-text">
            <strong>Quipu</strong>
            <span>your second brain</span>
          </span>
        </Link>

        <Suspense fallback={null}>
          <SidebarNav />
        </Suspense>

        <div className="side-foot">
          <Link className="profile" data-active={pathname.startsWith("/settings")} href="/settings">
            <span className="avatar">Q</span>
            <span className="grow">
              <strong>Settings</strong>
              <small>Theme, profile, keys</small>
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
            <strong style={{ fontSize: 15, letterSpacing: "-0.03em" }}>Quipu</strong>
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
