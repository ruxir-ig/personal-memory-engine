import { CheckCircle2, Clock, Eye, ShieldAlert } from "lucide-react";

const iconByTone = {
  ready: CheckCircle2,
  review: Eye,
  scheduled: Clock,
  private: ShieldAlert,
};

export function StatusPill({
  label,
  tone = "ready",
}: {
  label: string;
  tone?: keyof typeof iconByTone;
}) {
  const Icon = iconByTone[tone];
  return (
    <span className={tone === "review" ? "pill amber" : "pill accent"}>
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}
