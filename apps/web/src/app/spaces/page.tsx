import { Library } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { SpaceCard } from "@/components/canvas/space-card";
import { listSpaces } from "@/server/data/repository";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const spaces = await listSpaces();
  return (
    <>
      <PageHeading kicker="Spaces" title="Your spaces" copy="Collections Quipo creates automatically as you dump things. Each new kind of content finds or forms its own home." />
      {spaces.length === 0 ? (
        <EmptyState title="No spaces yet" icon={<Library size={20} />}>
          Drop a link, a key, a reel, or a note in the bar below. Quipo sorts it into a space for you.
        </EmptyState>
      ) : (
        <div className="space-grid">
          {spaces.map((space) => (
            <SpaceCard key={space.id} slug={space.slug} title={space.title} description={space.description} icon={space.icon} accent={space.accent} count={space.itemCount} />
          ))}
        </div>
      )}
    </>
  );
}
