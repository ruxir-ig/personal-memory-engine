import { notFound } from "next/navigation";
import type { SummaryRecord } from "@pme/shared";
import { PageHeading } from "@/components/page-heading";
import { ItemCard } from "@/components/cards/item-card";
import { getSpaceBySlug } from "@/server/data/repository";

export const dynamic = "force-dynamic";

export default async function SpaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSpaceBySlug(slug);
  if (!data) notFound();

  const { space, items, summaries } = data;
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
      <div className="item-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))" }}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} summary={summaryByArtifact.get(item.id)} />
        ))}
      </div>
    </>
  );
}
