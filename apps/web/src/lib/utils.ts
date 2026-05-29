import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDateTime(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: value > 9999 ? "compact" : "standard",
  }).format(value);
}

export function truncateMiddle(value: string, max = 90) {
  if (value.length <= max) return value;
  const half = Math.floor((max - 3) / 2);
  return `${value.slice(0, half)}...${value.slice(-half)}`;
}

export function relativeTime(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  if (abs < 7 * day) return `${Math.round(abs / day)}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

/** Deterministic hue (0-360) from an arbitrary string - used for media cover gradients. */
export function hueFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 360;
  return hash;
}
