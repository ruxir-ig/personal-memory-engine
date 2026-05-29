import { randomUUID } from "node:crypto";
import type { Artifact, Space, SummaryRecord } from "@pme/shared";
import type { SpaceSuggestion } from "./classify";
import { type MemoryData, now, readData } from "./store";

export type SpaceWithCount = Space & { itemCount: number };

export function upsertSpaceInData(data: MemoryData, suggestion: SpaceSuggestion): Space {
  const existing = data.spaces.find((space) => space.slug === suggestion.slug);
  if (existing) {
    existing.updatedAt = now();
    return existing;
  }
  const space: Space = {
    id: randomUUID(),
    slug: suggestion.slug,
    title: suggestion.title,
    description: suggestion.description,
    icon: suggestion.icon,
    accent: suggestion.accent,
    createdBy: "ai",
    createdAt: now(),
    updatedAt: now(),
  };
  data.spaces.push(space);
  return space;
}

function countItems(data: MemoryData, spaceId: string) {
  return data.artifacts.filter((artifact) => artifact.spaceId === spaceId && !artifact.archived).length;
}

export async function listSpaces(): Promise<SpaceWithCount[]> {
  const data = await readData();
  return data.spaces
    .map((space) => ({ ...space, itemCount: countItems(data, space.id) }))
    .sort((a, b) => b.itemCount - a.itemCount || a.title.localeCompare(b.title));
}

export async function getSpaceBySlug(
  slug: string,
): Promise<{ space: Space; items: Artifact[]; summaries: SummaryRecord[] } | null> {
  const data = await readData();
  const space = data.spaces.find((candidate) => candidate.slug === slug);
  if (!space) return null;
  const items = data.artifacts
    .filter((artifact) => artifact.spaceId === space.id && !artifact.archived)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const itemIds = new Set(items.map((item) => item.id));
  const summaries = data.summaries.filter((summary) => itemIds.has(summary.artifactId));
  return { space, items, summaries };
}
