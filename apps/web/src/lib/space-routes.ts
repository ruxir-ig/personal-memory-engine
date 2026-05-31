import { AUTOMATIC_SPACE_SUGGESTIONS } from "@/client/memory/classify";

/** Slugs pre-rendered for static export (`output: export`). */
export const BUILTIN_SPACE_SLUGS = AUTOMATIC_SPACE_SUGGESTIONS.map((space) => space.slug);

const BUILTIN_SLUG_SET = new Set(BUILTIN_SPACE_SLUGS);

export function spaceHref(slug: string): string {
  if (BUILTIN_SLUG_SET.has(slug)) return `/spaces/${slug}`;
  return `/spaces?slug=${encodeURIComponent(slug)}`;
}

export function staticSpaceParams(): Array<{ slug: string }> {
  return BUILTIN_SPACE_SLUGS.map((slug) => ({ slug }));
}
