import type { Artifact, SummaryRecord } from "@pme/shared";
import { CanvasBoard, type CanvasBundle, type ItemView, type SpaceLite, type TodayEntry } from "@/components/canvas/canvas-board";
import type { ReviewEntry } from "@/components/canvas/review-queue";
import { getCanvasLayout, getDashboardSnapshot, listSpaces } from "@/server/data/repository";

export const dynamic = "force-dynamic";

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

export default async function CanvasPage() {
  const [snapshot, layout, spaces] = await Promise.all([getDashboardSnapshot(), getCanvasLayout(), listSpaces()]);

  const summaryByArtifact = new Map<string, SummaryRecord>();
  for (const summary of snapshot.summaries) {
    if (!summaryByArtifact.has(summary.artifactId)) summaryByArtifact.set(summary.artifactId, summary);
  }
  const itemsById: Record<string, ItemView> = {};
  for (const artifact of snapshot.artifacts) {
    itemsById[artifact.id] = { item: artifact, summary: summaryByArtifact.get(artifact.id) };
  }

  const spaceList: SpaceLite[] = spaces.map((space) => ({
    id: space.id,
    slug: space.slug,
    title: space.title,
    description: space.description,
    icon: space.icon,
    accent: space.accent,
    itemCount: space.itemCount,
  }));

  const credentials: Artifact[] = snapshot.artifacts.filter((artifact) => artifact.kind === "credential");

  const today: TodayEntry[] = [
    ...snapshot.reminders
      .filter((reminder) => reminder.status === "scheduled" && isToday(reminder.dueAt))
      .map((reminder) => ({ id: reminder.id, when: timeOf(reminder.dueAt), title: reminder.title, sub: "Reminder" })),
    ...snapshot.events
      .filter((event) => isToday(event.eventAt ?? event.capturedAt))
      .map((event) => ({ id: event.id, when: timeOf(event.eventAt ?? event.capturedAt), title: event.title, sub: event.description })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  const review: ReviewEntry[] = snapshot.intents.map((intent) => ({
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
    totalItems: snapshot.counts.artifacts,
  };

  return <CanvasBoard bundle={bundle} />;
}
