import { createHash, randomUUID } from "node:crypto";
import type { Artifact, CanvasBlock, CanvasLayout, PreferenceRecord } from "@pme/shared";
import { generateCanvasWithProvider, type CanvasState } from "@/server/ai/provider";
import { getDefaultAiProvider } from "./providers";
import { type MemoryData, now, readData, writeData } from "./store";

const LAYOUT_TTL_MS = 30 * 60 * 1000;

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function partOfDay(iso?: string): "morning" | "afternoon" | "evening" | "night" {
  const hour = iso ? new Date(iso).getHours() : new Date().getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function displayNameFrom(preferences: PreferenceRecord[]): string {
  const value = preferences.find((p) => p.category === "ui" && p.key === "displayName")?.value;
  return typeof value === "string" && value.trim() ? value.trim() : "there";
}

const READING_KINDS = new Set<Artifact["kind"]>(["article", "post", "link"]);
const WATCH_KINDS = new Set<Artifact["kind"]>(["reel", "video"]);

function activeItems(data: MemoryData) {
  return data.artifacts.filter((a) => !a.archived).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

function layoutPreferences(preferences: PreferenceRecord[]) {
  return preferences
    .filter((p) => p.confirmed && ["ui", "ranking", "capture"].includes(p.category))
    .map((p) => ({ category: p.category, key: p.key, value: p.value }))
    .slice(0, 16);
}

export function buildCanvasState(data: MemoryData, clientNow?: string): CanvasState {
  const items = activeItems(data);
  const spaceTitle = (spaceId?: string) => data.spaces.find((s) => s.id === spaceId)?.title;
  const proposed = data.intents.filter((i) => i.status === "proposed");
  const todayCount =
    data.reminders.filter((r) => r.status === "scheduled" && isToday(r.dueAt)).length +
    data.events.filter((e) => isToday(e.eventAt ?? e.capturedAt)).length;

  return {
    displayName: displayNameFrom(data.preferences),
    localTime: clientNow ?? now(),
    partOfDay: partOfDay(clientNow),
    counts: {
      items: items.length,
      spaces: data.spaces.length,
      reminders: data.reminders.filter((r) => r.status === "scheduled").length,
      pendingReview: proposed.length + data.artifacts.filter((a) => a.syncStatus === "pending_review").length,
    },
    spaces: data.spaces.map((space) => ({
      id: space.id,
      slug: space.slug,
      title: space.title,
      accent: space.accent,
      count: items.filter((i) => i.spaceId === space.id).length,
    })),
    recentItems: items.slice(0, 8).map((i) => ({ id: i.id, kind: i.kind, title: i.title, spaceTitle: spaceTitle(i.spaceId) })),
    preferences: layoutPreferences(data.preferences),
    reelIds: items.filter((i) => WATCH_KINDS.has(i.kind)).slice(0, 10).map((i) => i.id),
    readingIds: items.filter((i) => READING_KINDS.has(i.kind)).slice(0, 8).map((i) => i.id),
    codeIds: items.filter((i) => i.kind === "code").slice(0, 6).map((i) => i.id),
    vaultCount: items.filter((i) => i.kind === "credential").length,
    todayCount,
  };
}

function canvasStateSignature(state: CanvasState) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        partOfDay: state.partOfDay,
        counts: state.counts,
        spaces: state.spaces,
        recentItems: state.recentItems,
        preferences: state.preferences,
        reelIds: state.reelIds,
        readingIds: state.readingIds,
        codeIds: state.codeIds,
        vaultCount: state.vaultCount,
        todayCount: state.todayCount,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

function timeMs(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function finalizeLayout(layout: CanvasLayout, state: CanvasState, clientNow?: string): CanvasLayout {
  return {
    ...layout,
    stateSignature: canvasStateSignature(state),
    expiresAt: new Date(timeMs(clientNow) + LAYOUT_TTL_MS).toISOString(),
  };
}

function layoutIsFresh(layout: CanvasLayout, state: CanvasState, clientNow?: string) {
  if (layout.stateSignature !== canvasStateSignature(state)) return false;
  const expiresAt = layout.expiresAt ? Date.parse(layout.expiresAt) : NaN;
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > timeMs(clientNow);
}

function block(partial: {
  id?: string;
  type: CanvasBlock["type"];
  title: string;
  subtitle?: string;
  note?: string;
  span?: CanvasBlock["span"];
  itemIds?: string[];
  spaceIds?: string[];
  suggestions?: string[];
}): CanvasBlock {
  return {
    id: partial.id ?? randomUUID().slice(0, 8),
    subtitle: partial.subtitle,
    note: partial.note,
    span: partial.span ?? "3",
    itemIds: partial.itemIds ?? [],
    spaceIds: partial.spaceIds ?? [],
    suggestions: partial.suggestions ?? [],
    type: partial.type,
    title: partial.title,
  };
}

export function buildRulesLayout(state: CanvasState): CanvasLayout {
  const blocks: CanvasBlock[] = [];
  const tod = state.partOfDay;

  if (state.todayCount > 0) {
    blocks.push(block({ type: "today", title: "Due today", span: state.counts.pendingReview > 0 ? "3" : "6" }));
  }
  if (state.counts.pendingReview > 0) {
    blocks.push(block({ type: "review", title: "Worth a look", subtitle: "Quick confirmations", span: state.todayCount > 0 ? "3" : "6" }));
  }

  if (state.reelIds.length > 0) {
    const watchTitle = tod === "evening" || tod === "night" ? "Wind-down watch list" : "Saved to watch";
    blocks.push(block({ type: "reel_strip", title: watchTitle, subtitle: `${state.reelIds.length} saved`, span: "6", itemIds: state.reelIds }));
  }

  if (state.spaces.length > 0) {
    blocks.push(block({ type: "spaces", title: "Your spaces", subtitle: "Auto-organized collections", span: "6", spaceIds: state.spaces.map((s) => s.id) }));
  }

  if (state.readingIds.length > 0) {
    blocks.push(block({ type: "reading", title: "Reading list", span: state.codeIds.length > 0 ? "3" : "4", itemIds: state.readingIds }));
  }
  if (state.codeIds.length > 0) {
    blocks.push(block({ type: "code_shelf", title: "Snippets", span: "3", itemIds: state.codeIds }));
  }
  if (state.vaultCount > 0) {
    blocks.push(block({ type: "vault", title: "Keys & secrets", subtitle: `${state.vaultCount} on device`, span: state.readingIds.length || state.codeIds.length ? "2" : "3" }));
  }

  if (state.recentItems.length > 0) {
    blocks.push(block({ type: "recent", title: "Just dumped", span: "4", itemIds: state.recentItems.map((i) => i.id) }));
  }

  const name = state.displayName;
  return {
    generatedAt: now(),
    generatedBy: "rules",
    greetingTitle: `Good ${tod}, ${name}`,
    greetingSubtitle:
      state.counts.items === 0
        ? "Your canvas is empty. Drop a link, a note, a key, or a file below and Quipu organizes it for you."
        : `${state.counts.items} memories across ${state.counts.spaces} spaces${state.todayCount ? ` - ${state.todayCount} due today` : ""}.`,
    blocks,
  };
}

const NEEDS_ITEMS = new Set<CanvasBlock["type"]>(["reel_strip", "recent", "reading", "code_shelf"]);

function sanitizeLayout(layout: CanvasLayout, data: MemoryData): CanvasLayout {
  const itemIds = new Set(data.artifacts.filter((a) => !a.archived).map((a) => a.id));
  const spaceIds = new Set(data.spaces.map((s) => s.id));
  const blocks = layout.blocks
    .map((b) => ({
      ...b,
      itemIds: b.itemIds.filter((id) => itemIds.has(id)),
      spaceIds: b.spaceIds.filter((id) => spaceIds.has(id)),
    }))
    .filter((b) => {
      if (NEEDS_ITEMS.has(b.type) && b.itemIds.length === 0) return false;
      if (b.type === "spaces" && b.spaceIds.length === 0) return false;
      return true;
    });
  return { ...layout, blocks };
}

export function markCanvasStale(data: MemoryData) {
  data.canvasLayout = undefined;
}

async function produceLayout(data: MemoryData, clientNow?: string, state = buildCanvasState(data, clientNow)): Promise<CanvasLayout> {
  const provider = getDefaultAiProvider(data);
  if (provider && state.counts.items > 0) {
    try {
      const aiLayout = sanitizeLayout(await generateCanvasWithProvider({ provider, state }), data);
      if (aiLayout.blocks.length >= 2) return finalizeLayout(aiLayout, state, clientNow);
    } catch {
      /* fall back to rules */
    }
  }
  return finalizeLayout(buildRulesLayout(state), state, clientNow);
}

export async function getCanvasLayout(clientNow?: string): Promise<CanvasLayout> {
  const data = await readData();
  const state = buildCanvasState(data, clientNow);
  if (data.canvasLayout) {
    const sanitized = sanitizeLayout(data.canvasLayout, data);
    if (sanitized.blocks.length > 0 && layoutIsFresh(sanitized, state, clientNow)) return sanitized;
  }
  const layout = await produceLayout(data, clientNow, state);
  data.canvasLayout = layout;
  await writeData(data);
  return layout;
}
