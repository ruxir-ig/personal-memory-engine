"use client";

import { useParams } from "next/navigation";
import { Library } from "lucide-react";
import type { SummaryRecord } from "@pme/shared";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { ItemCard } from "@/components/cards/item-card";
import { useSpaceBySlug } from "@/client/hooks";

export function SpaceDetailClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const data = useSpaceBySlug(slug);

  if (data.isLoading) return <div className="faint">Loading space…</div>;
  if (!data.data) return <EmptyState title="Space not found" icon={<Library size={20} />}>This space does not exist in your local memory yet.</EmptyState>;

  const { space, items, summaries } = data.data;
  const summaryByArtifact = new Map<string, SummaryRecord>();
  for (const summary of summaries) {
    if (!summaryByArtifact.has(summary.artifactId)) summaryByArtifact.set(summary.artifactId, summary);
  }

  return (
    <>
      <PageHeading
        kicker={`Space · ${items.length} item${items.length === 1 ? "" : "s"}`}
        title={space.title}
        copy={space.description ?? "Everything Quipo filed into this space."}
      />
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" icon={<Library size={20} />}>
          When a saved note, link, file, or task matches this category, Quipo will place it here automatically.
        </EmptyState>
      ) : (
        <div className="item-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))" }}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} summary={summaryByArtifact.get(item.id)} />
          ))}
        </div>
      )}
    </>
  );
}
