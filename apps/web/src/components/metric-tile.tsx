import { compactNumber } from "@/lib/utils";

export function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{compactNumber(value)}</strong>
    </div>
  );
}
