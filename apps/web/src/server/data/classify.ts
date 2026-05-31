import type { MemoryKind, SpaceAccent, StructuredFields } from "@pme/shared";

export type SpaceSuggestion = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  accent: SpaceAccent;
};

export type Classification = {
  kind: MemoryKind;
  title: string;
  tags: string[];
  structured: StructuredFields;
  space: SpaceSuggestion;
  isSecret: boolean;
};

const SPACES: Record<string, SpaceSuggestion> = {
  watch: { slug: "watch-later", title: "Watch later", description: "Reels and videos you saved to watch.", icon: "play", accent: "reel" },
  reading: { slug: "reading-list", title: "Reading list", description: "Articles, posts, and long reads.", icon: "bookOpen", accent: "article" },
  bookmarks: { slug: "bookmarks", title: "Bookmarks", description: "Links and pages worth keeping.", icon: "bookmark", accent: "link" },
  secrets: { slug: "keys-secrets", title: "Keys & secrets", description: "API keys and credentials, kept on-device.", icon: "keyRound", accent: "credential" },
  snippets: { slug: "snippets", title: "Snippets", description: "Code you want to find again.", icon: "code", accent: "code" },
  todo: { slug: "to-do", title: "To do", description: "Things with a deadline or follow-up.", icon: "checkCircle", accent: "task" },
  people: { slug: "people", title: "People", description: "Contacts and who relates to what.", icon: "users", accent: "contact" },
  notes: { slug: "notes", title: "Notes", description: "Loose thoughts and quick captures.", icon: "stickyNote", accent: "note" },
  files: { slug: "files", title: "Files", description: "Imported images and documents.", icon: "paperclip", accent: "note" },
};

export const AUTOMATIC_SPACE_SUGGESTIONS: SpaceSuggestion[] = Object.values(SPACES);

const SECRET_PREFIXES = [
  "sk-",
  "sk_",
  "pk-",
  "pk_",
  "rk_",
  "ghp_",
  "gho_",
  "github_pat_",
  "xox",
  "akia",
  "aiza",
  "fe_oa_",
  "hf_",
  "glpat-",
  "ya29.",
];

const SECRET_LABEL_RE =
  /\b(api[\s_-]?key|secret[\s_-]?key|client[\s_-]?secret|access[\s_-]?token|auth[\s_-]?token|bearer|token|secret|password|passwd|pwd|api[\s_-]?token|key\s*\d*)\b\s*[:=]\s*([^\s]{6,})/i;

export function extractFirstUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  return match?.[0]?.replace(/[.,)]+$/, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

export function maskSecret(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return `${v.slice(0, 2)}${"\u2022".repeat(Math.max(2, v.length - 2))}`;
  return `${v.slice(0, 4)}${"\u2022".repeat(Math.min(18, v.length - 8))}${v.slice(-4)}`;
}

function looksLikeSecretToken(token: string): boolean {
  const t = token.trim();
  if (t.length < 18 || t.length > 200) return false;
  if (/\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return false;
  const lower = t.toLowerCase();
  if (SECRET_PREFIXES.some((p) => lower.startsWith(p))) return true;
  const hasUpper = /[A-Z]/.test(t);
  const hasLower = /[a-z]/.test(t);
  const hasDigit = /\d/.test(t);
  const restricted = /^[A-Za-z0-9._\-]+$/.test(t);
  return restricted && hasDigit && (hasUpper || (hasLower && t.length >= 28));
}

function detectSecret(text: string): { value: string; label?: string } | undefined {
  const labelled = text.match(SECRET_LABEL_RE);
  if (labelled?.[2] && looksLikeSecretToken(labelled[2])) {
    return { value: labelled[2], label: labelled[1]?.trim() };
  }
  for (const raw of text.split(/\s+/)) {
    if (looksLikeSecretToken(raw)) return { value: raw };
  }
  return undefined;
}

function detectCode(text: string): { language?: string } | undefined {
  const fenced = text.match(/```([a-zA-Z0-9+#]*)?\n?([\s\S]*?)```/);
  if (fenced) return { language: fenced[1] || undefined };
  const lines = text.split(/\r?\n/);
  const codey = lines.filter((l) => /[;{}]\s*$|^\s*(const|let|var|function|def|class|import|export|public|private|fn|func|#include)\b/.test(l));
  if (lines.length >= 3 && codey.length / lines.length > 0.5) return {};
  return undefined;
}

function platformFor(url: string): { kind: MemoryKind; platform: string } {
  const host = hostOf(url).toLowerCase();
  const lower = url.toLowerCase();
  if (host.includes("instagram.com")) return { kind: lower.includes("/reel") ? "reel" : "post", platform: "Instagram" };
  if (host.includes("youtube.com") || host.includes("youtu.be")) return { kind: lower.includes("/shorts/") ? "reel" : "video", platform: "YouTube" };
  if (host.includes("tiktok.com")) return { kind: "reel", platform: "TikTok" };
  if (host.includes("substack.com")) return { kind: "article", platform: "Substack" };
  if (host.includes("medium.com")) return { kind: "article", platform: "Medium" };
  if (host.includes("x.com") || host.includes("twitter.com")) return { kind: "post", platform: "X" };
  if (host.includes("reddit.com")) return { kind: "post", platform: "Reddit" };
  if (host.includes("github.com")) return { kind: "link", platform: "GitHub" };
  if (host.includes("vimeo.com")) return { kind: "video", platform: "Vimeo" };
  if (host.includes("spotify.com")) return { kind: "link", platform: "Spotify" };
  return { kind: "link", platform: host };
}

function titleCase(value: string) {
  return value
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveLinkTitle(url: string, platform: string, kind: MemoryKind): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const meaningful = segments.reverse().find((s) => s.length > 2 && !/^(reel|reels|p|shorts|status|watch|video|posts|home)$/i.test(s) && !/^[0-9a-z]{8,}$/i.test(s));
    if (meaningful) return `${titleCase(decodeURIComponent(meaningful)).slice(0, 80)}`;
  } catch {
    /* noop */
  }
  const noun = kind === "reel" ? "reel" : kind === "video" ? "video" : kind === "article" ? "article" : kind === "post" ? "post" : "link";
  return `${platform} ${noun}`;
}

function firstLine(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean) ?? "Untitled"
  );
}

/** Deterministic, on-device classification. Runs before (and as fallback for) the AI pass. */
export function classifyCapture(text: string): Classification {
  const trimmed = text.trim();

  const secret = detectSecret(trimmed);
  if (secret) {
    const url = extractFirstUrl(trimmed);
    const service = url ? hostOf(url) : undefined;
    const label = secret.label && !/^token|secret|key$/i.test(secret.label) ? titleCase(secret.label) : service ? titleCase(service.split(".")[0] ?? service) : "Credential";
    return {
      kind: "credential",
      title: service ? `${titleCase(service.split(".")[0] ?? service)} key` : label,
      tags: ["secret", ...(service ? [service.split(".")[0] ?? service] : [])],
      structured: {
        secretLabel: label,
        secretMasked: maskSecret(secret.value),
        secretLength: secret.value.length,
        service,
        url,
      },
      space: SPACES.secrets!,
      isSecret: true,
    };
  }

  const url = extractFirstUrl(trimmed);
  if (url) {
    const { kind, platform } = platformFor(url);
    const space = kind === "reel" || kind === "video" ? SPACES.watch! : kind === "article" || kind === "post" ? SPACES.reading! : SPACES.bookmarks!;
    return {
      kind,
      title: deriveLinkTitle(url, platform, kind),
      tags: [platform.toLowerCase()],
      structured: { url, host: hostOf(url), platform },
      space,
      isSecret: false,
    };
  }

  const code = detectCode(trimmed);
  if (code) {
    return {
      kind: "code",
      title: firstLine(trimmed.replace(/```[a-z]*\n?/i, "")).slice(0, 70) || "Code snippet",
      tags: ["code", ...(code.language ? [code.language] : [])],
      structured: { language: code.language },
      space: SPACES.snippets!,
      isSecret: false,
    };
  }

  if (/\b(remind|deadline|due|todo|to-do|follow up|follow-up|submit|by (mon|tue|wed|thu|fri|sat|sun)|tomorrow)\b/i.test(trimmed)) {
    return {
      kind: "task",
      title: firstLine(trimmed).replace(/^#+\s*/, "").slice(0, 80),
      tags: ["task"],
      structured: {},
      space: SPACES.todo!,
      isSecret: false,
    };
  }

  return {
    kind: "note",
    title: firstLine(trimmed).replace(/^#+\s*/, "").slice(0, 90),
    tags: [],
    structured: {},
    space: SPACES.notes!,
    isSecret: false,
  };
}

export function fileSpaceSuggestion(): SpaceSuggestion {
  return SPACES.files!;
}

export function accentForKind(kind: MemoryKind): SpaceAccent {
  switch (kind) {
    case "reel":
      return "reel";
    case "video":
      return "video";
    case "article":
    case "post":
      return "article";
    case "link":
      return "link";
    case "credential":
      return "credential";
    case "code":
      return "code";
    case "task":
      return "task";
    case "contact":
      return "contact";
    default:
      return "note";
  }
}
