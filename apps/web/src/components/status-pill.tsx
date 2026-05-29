import { CheckCircle2, Clock, Eye, HardDrive, ShieldAlert, UploadCloud } from "lucide-react";
import type { SyncStatus } from "@pme/shared";

const iconByTone = {
  ready: CheckCircle2,
  review: Eye,
  scheduled: Clock,
  private: ShieldAlert,
};

export function StatusPill({ label, tone = "ready" }: { label: string; tone?: keyof typeof iconByTone }) {
  const Icon = iconByTone[tone];
  return (
    <span className={tone === "review" ? "chip warn" : "chip accent"}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

const syncStatusMeta: Record<SyncStatus, { label: string; tone: "ready" | "review"; icon: typeof CheckCircle2 }> = {
  local_processed: { label: "On device", tone: "ready", icon: HardDrive },
  pending_review: { label: "Needs review", tone: "review", icon: Eye },
  synced_to_canvas: { label: "Organized", tone: "ready", icon: UploadCloud },
};

export function SyncStatusPill({ status }: { status: SyncStatus }) {
  const meta = syncStatusMeta[status];
  const Icon = meta.icon;
  return (
    <span className={meta.tone === "review" ? "chip warn" : "chip accent"}>
      <Icon size={12} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
