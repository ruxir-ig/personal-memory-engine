"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  Clock3,
  Code2,
  KeyRound,
  Library,
  Play,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { Artifact, CanvasBlock, CanvasBlockType, CanvasLayout, SpaceAccent, SummaryRecord } from "@pme/shared";
import { kindMeta } from "@/lib/registry";
import { relativeTime } from "@/lib/utils";
import { ItemCard } from "@/components/cards/item-card";
import { SecretCard } from "@/components/cards/secret-card";
import { ReviewQueue, type ReviewEntry } from "./review-queue";
import { SpaceCard } from "./space-card";

export type ItemView = { item: Artifact; summary?: SummaryRecord };
export type SpaceLite = { id: string; slug: string; title: string; description?: string; icon: string; accent: SpaceAccent; itemCount: number };
export type TodayEntry = { id: string; when: string; title: string; sub?: string };

export type CanvasBundle = {
  layout: CanvasLayout;
  itemsById: Record<string, ItemView>;
  spaces: SpaceLite[];
  credentials: Artifact[];
  today: TodayEntry[];
  review: ReviewEntry[];
};

const blockIcon: Record<CanvasBlockType, LucideIcon> = {
  spotlight: Star,
  spaces: Library,
  reel_strip: Play,
  vault: KeyRound,
  today: CalendarClock,
  recent: Clock3,
  reading: BookOpen,
  code_shelf: Code2,
  review: Sparkles,
  ask: Sparkles,
};

const colsForSpan: Record<string, number> = { "2": 1, "3": 1, "4": 2, "6": 3 };

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function BlockShell({ block, action, children }: { block: CanvasBlock; action?: ReactNode; children: ReactNode }) {
  const Icon = blockIcon[block.type] ?? Sparkles;
  return (
    <section className={`block span-${block.span}`}>
      <div className="block-head">
        <div className="block-title">
          <span className="ic">
            <Icon size={15} />
          </span>
          {block.title}
        </div>
        {action ?? (block.subtitle ? <span className="block-action">{block.subtitle}</span> : null)}
      </div>
      {children}
    </section>
  );
}

export function CanvasBoard({ bundle }: { bundle: CanvasBundle }) {
  const router = useRouter();
  const { layout, itemsById, spaces, credentials, today, review } = bundle;
  const spaceById = new Map(spaces.map((space) => [space.id, space]));
  const itemsFor = (ids: string[]) => ids.map((id) => itemsById[id]).filter((view): view is ItemView => Boolean(view));

  const [greetLead, greetName] = (layout.greetingTitle ?? "Your canvas").split(/,\s(.+)/);

  useEffect(() => {
    if (!layout.expiresAt) return;
    const expiresAt = Date.parse(layout.expiresAt);
    if (!Number.isFinite(expiresAt)) return;
    const timeout = window.setTimeout(() => router.refresh(), Math.max(60_000, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [layout.expiresAt, router]);

  function renderBlock(block: CanvasBlock): ReactNode {
    switch (block.type) {
      case "spaces": {
        const list = block.spaceIds.map((id) => spaceById.get(id)).filter((space): space is SpaceLite => Boolean(space));
        if (list.length === 0) return null;
        return (
          <BlockShell
            key={block.id}
            block={block}
            action={
              <Link className="block-action" href="/spaces">
                All spaces
              </Link>
            }
          >
            <div className="space-grid">
              {list.map((space) => (
                <SpaceCard key={space.id} slug={space.slug} title={space.title} description={space.description} icon={space.icon} accent={space.accent} count={space.itemCount} />
              ))}
            </div>
          </BlockShell>
        );
      }
      case "reel_strip": {
        const list = itemsFor(block.itemIds);
        if (list.length === 0) return null;
        return (
          <BlockShell key={block.id} block={block}>
            <div className="reel-row">
              {list.map((view) => (
                <ItemCard key={view.item.id} item={view.item} summary={view.summary} />
              ))}
            </div>
          </BlockShell>
        );
      }
      case "vault": {
        const list = (credentials.length > 0 ? credentials : itemsFor(block.itemIds).map((view) => view.item)).slice(0, 6);
        if (list.length === 0) return null;
        return (
          <BlockShell key={block.id} block={block}>
            <div className="vault">
              {list.map((item) => {
                const s = item.structured ?? {};
                return <SecretCard key={item.id} label={str(s.secretLabel) ?? item.title} masked={str(s.secretMasked) ?? "\u2022\u2022\u2022\u2022\u2022\u2022"} secretVaultId={str(s.secretVaultId)} service={str(s.service)} />;
              })}
            </div>
          </BlockShell>
        );
      }
      case "today": {
        if (today.length === 0) return null;
        return (
          <BlockShell key={block.id} block={block}>
            <div className="list">
              {today.map((entry) => (
                <div className="lrow" key={entry.id}>
                  <span className="when">{entry.when}</span>
                  <div className="lrow-main">
                    <strong className="clamp-2">{entry.title}</strong>
                    {entry.sub ? <span>{entry.sub}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </BlockShell>
        );
      }
      case "review": {
        if (review.length === 0) return null;
        return (
          <BlockShell key={block.id} block={block}>
            <ReviewQueue entries={review} />
          </BlockShell>
        );
      }
      case "ask": {
        return null;
      }
      case "spotlight": {
        const view = itemsFor(block.itemIds)[0];
        if (!view) return null;
        const meta = kindMeta[view.item.kind] ?? kindMeta.note;
        const url = str(view.item.structured?.url);
        return (
          <section className={`block span-${block.span}`} key={block.id}>
            <article className="spotlight">
              <div>
                <span className="eyebrow">{block.subtitle ?? meta.label}</span>
                <h2>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      {view.item.title}
                    </a>
                  ) : (
                    <Link href={`/item/${view.item.id}`}>{view.item.title}</Link>
                  )}
                </h2>
                {view.summary?.summary ? <p className="clamp-3">{view.summary.summary}</p> : null}
              </div>
              <div className="chip-row">
                <span className="chip kind" style={{ ["--k" as string]: `var(--k-${meta.accent === "amber" ? "note" : meta.accent})` } as CSSProperties}>
                  {meta.label}
                </span>
                <span className="faint" style={{ fontSize: 12 }}>
                  {relativeTime(view.item.capturedAt)}
                </span>
                <Link className="btn secondary sm" href={`/item/${view.item.id}`} style={{ marginLeft: "auto" }}>
                  Open
                </Link>
              </div>
            </article>
          </section>
        );
      }
      case "recent":
      case "reading":
      case "code_shelf":
      default: {
        const list = itemsFor(block.itemIds);
        if (list.length === 0) return null;
        const cols = colsForSpan[block.span] ?? 1;
        return (
          <BlockShell key={block.id} block={block}>
            <div className="item-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {list.map((view) => (
                <ItemCard key={view.item.id} item={view.item} summary={view.summary} />
              ))}
            </div>
          </BlockShell>
        );
      }
    }
  }

  return (
    <div>
      <div className="canvas-head">
        <div className="greeting">
          <h1>
            {greetLead}
            {greetName ? (
              <>
                , <span className="accent">{greetName}</span>
              </>
            ) : null}
          </h1>
          {layout.greetingSubtitle ? <p>{layout.greetingSubtitle}</p> : null}
        </div>
        <div className="head-actions">
          <span className="chip" title={layout.model ? `Model: ${layout.model}` : undefined}>
            <Sparkles size={12} />
            {layout.generatedBy === "ai" ? "AI canvas" : "Smart canvas"}
          </span>
        </div>
      </div>

      <div className="board">{layout.blocks.map((block) => renderBlock(block))}</div>
    </div>
  );
}
