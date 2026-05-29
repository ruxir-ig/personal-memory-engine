import {
  Bookmark,
  BookOpen,
  Code2,
  FileText,
  Film,
  Image as ImageIcon,
  KeyRound,
  Link2,
  ListTodo,
  type LucideIcon,
  MapPin,
  MessageSquare,
  Paperclip,
  Play,
  Sparkles,
  StickyNote,
  Users,
} from "lucide-react";
import type { MemoryKind, SpaceAccent } from "@pme/shared";

export const accentVar: Record<SpaceAccent, string> = {
  amber: "--accent",
  link: "--k-link",
  reel: "--k-reel",
  video: "--k-video",
  article: "--k-article",
  credential: "--k-credential",
  code: "--k-code",
  task: "--k-task",
  contact: "--k-contact",
  note: "--k-note",
};

export function accentColor(accent: SpaceAccent) {
  return `var(${accentVar[accent] ?? "--accent"})`;
}

export const kindMeta: Record<MemoryKind, { label: string; icon: LucideIcon; accent: SpaceAccent }> = {
  note: { label: "Note", icon: StickyNote, accent: "note" },
  link: { label: "Link", icon: Link2, accent: "link" },
  reel: { label: "Reel", icon: Play, accent: "reel" },
  video: { label: "Video", icon: Play, accent: "video" },
  article: { label: "Article", icon: BookOpen, accent: "article" },
  post: { label: "Post", icon: MessageSquare, accent: "article" },
  credential: { label: "Key", icon: KeyRound, accent: "credential" },
  code: { label: "Code", icon: Code2, accent: "code" },
  task: { label: "Task", icon: ListTodo, accent: "task" },
  contact: { label: "Contact", icon: Users, accent: "contact" },
  place: { label: "Place", icon: MapPin, accent: "contact" },
  image: { label: "Image", icon: ImageIcon, accent: "note" },
  file: { label: "File", icon: FileText, accent: "note" },
  unknown: { label: "Memory", icon: Sparkles, accent: "note" },
};

const spaceIcons: Record<string, LucideIcon> = {
  play: Play,
  film: Film,
  bookOpen: BookOpen,
  bookmark: Bookmark,
  keyRound: KeyRound,
  code: Code2,
  checkCircle: ListTodo,
  users: Users,
  stickyNote: StickyNote,
  paperclip: Paperclip,
  link: Link2,
  image: ImageIcon,
  mapPin: MapPin,
  sparkles: Sparkles,
};

export function spaceIcon(name?: string): LucideIcon {
  return spaceIcons[name ?? ""] ?? Sparkles;
}

export function kindAccentColor(kind: MemoryKind) {
  return accentColor(kindMeta[kind]?.accent ?? "note");
}
