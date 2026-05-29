import Link from "next/link";
import type { CSSProperties } from "react";
import type { SpaceAccent } from "@pme/shared";
import { accentColor, spaceIcon } from "@/lib/registry";

export function SpaceCard({
  slug,
  title,
  description,
  icon,
  accent,
  count,
}: {
  slug: string;
  title: string;
  description?: string;
  icon: string;
  accent: SpaceAccent;
  count: number;
}) {
  const Icon = spaceIcon(icon);
  return (
    <Link className="space-tile" href={`/spaces/${slug}`} style={{ ["--k" as string]: accentColor(accent) } as CSSProperties}>
      <span className="ic">
        <Icon size={20} />
      </span>
      <div className="stack sm" style={{ gap: 4 }}>
        <h3>{title}</h3>
        {description ? <p className="clamp-2">{description}</p> : null}
      </div>
      <span className="count">
        {count} item{count === 1 ? "" : "s"}
      </span>
    </Link>
  );
}
