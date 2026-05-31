"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Library } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { SpaceCard } from "@/components/canvas/space-card";
import { useSpaces } from "@/client/hooks";
import { SpaceDetailClient } from "./[slug]/space-detail-client";

function SpacesPageContent() {
  const searchParams = useSearchParams();
  const querySlug = searchParams.get("slug");
  const spaces = useSpaces();

  if (querySlug) {
    return <SpaceDetailClient slug={querySlug} />;
  }

  return (
    <>
      <PageHeading
        kicker="Spaces"
        title="Your spaces"
        copy="Collections Quipu creates automatically as you dump things. Each new kind of content finds or forms its own home."
      />
      {spaces.isLoading ? (
        <div className="faint">Loading spaces…</div>
      ) : !spaces.data?.length ? (
        <EmptyState title="No spaces yet" icon={<Library size={20} />}>
          Drop a link, a key, a reel, or a note in the bar below. Quipu sorts it into a space for you.
        </EmptyState>
      ) : (
        <div className="space-grid">
          {spaces.data.map((space) => (
            <SpaceCard
              key={space.id}
              slug={space.slug}
              title={space.title}
              description={space.description}
              icon={space.icon}
              accent={space.accent}
              count={space.itemCount}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function SpacesPage() {
  return (
    <Suspense fallback={<div className="faint">Loading spaces…</div>}>
      <SpacesPageContent />
    </Suspense>
  );
}
