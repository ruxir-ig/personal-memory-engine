"use client";

import { useMemo, useState } from "react";
import type { Artifact, SummaryRecord } from "@pme/shared";
import { layoutFromSnapshot } from "@/client/memory/canvas";
import { CanvasBoard, type CanvasBundle, type ItemView, type SpaceLite, type TodayEntry } from "@/components/canvas/canvas-board";
import type { ReviewEntry } from "@/components/canvas/review-queue";
import { useCanvasLayout, useDashboardSnapshot, useSpaces } from "@/client/hooks";

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function timeOf(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

const intentLabel: Record<string, string> = {
  create_reminder: "Set a reminder?",
  create_event: "Add this event?",
  update_preference: "Remember this preference?",
  link_to_project: "Link to a project?",
  retention_decision: "Keep the original?",
  needs_review: "Confirm this memory",
};

export function CanvasHome() {
  const [clientNow] = useState(() => new Date().toISOString());
  const snapshot = useDashboardSnapshot();
  const layoutQuery = useCanvasLayout(clientNow);
  const spaces = useSpaces();

  const layout = useMemo(() => {
    if (layoutQuery.data) return layoutQuery.data;
    if (snapshot.data) return layoutFromSnapshot(snapshot.data, clientNow);
    return undefined;
  }, [layoutQuery.data, snapshot.data, clientNow]);

  if (snapshot.isLoading || spaces.isLoading) {
    return <div className="card pad faint">Loading your canvas…</div>;
  }

  if (!snapshot.data || !layout || !spaces.data) {
    return <div className="card pad faint">Could not load canvas.</div>;
  }

  const summaryByArtifact = new Map<string, SummaryRecord>();
  for (const summary of snapshot.data.summaries) {
    if (!summaryByArtifact.has(summary.artifactId)) summaryByArtifact.set(summary.artifactId, summary);
  }
  const itemsById: Record<string, ItemView> = {};
  for (const artifact of snapshot.data.artifacts) {
    itemsById[artifact.id] = { item: artifact, summary: summaryByArtifact.get(artifact.id) };
  }

  const spaceList: SpaceLite[] = spaces.data.map((space) => ({
    id: space.id,
    slug: space.slug,
    title: space.title,
    description: space.description,
    icon: space.icon,
    accent: space.accent,
    itemCount: space.itemCount,
  }));

  const credentials: Artifact[] = snapshot.data.artifacts.filter((artifact) => artifact.kind === "credential");

  const today: TodayEntry[] = [
    ...snapshot.data.reminders
      .filter((reminder) => reminder.status === "scheduled" && isToday(reminder.dueAt))
      .map((reminder) => ({ id: reminder.id, when: timeOf(reminder.dueAt), title: reminder.title, sub: "Reminder", sortAt: reminder.dueAt })),
    ...snapshot.data.events
      .filter((event) => isToday(event.eventAt ?? event.capturedAt))
      .map((event) => ({ id: event.id, when: timeOf(event.eventAt ?? event.capturedAt), title: event.title, sub: event.description, sortAt: event.eventAt ?? event.capturedAt })),
    ...snapshot.data.todos
      .filter((todo) => todo.status === "open" && isToday(todo.dueAt))
      .map((todo) => ({ id: todo.id, when: timeOf(todo.dueAt), title: todo.title, sub: "Todo", sortAt: todo.dueAt })),
  ].sort((a, b) => (a.sortAt ?? "").localeCompare(b.sortAt ?? ""));

  const review: ReviewEntry[] = snapshot.data.intents.map((intent) => ({
    id: intent.id,
    title: (intent.artifactId ? itemsById[intent.artifactId]?.item.title : undefined) ?? intentLabel[intent.intentType] ?? "Review memory",
    detail: intent.proposedActions[0] ?? intentLabel[intent.intentType] ?? "Needs a quick decision",
  }));

  const bundle: CanvasBundle = {
    layout,
    itemsById,
    spaces: spaceList,
    credentials,
    today,
    review,
  };

  return <CanvasBoard bundle={bundle} />;
}
