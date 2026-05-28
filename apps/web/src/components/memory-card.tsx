import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import type { Artifact, SummaryRecord } from "@pme/shared";
import { formatDateTime } from "@/lib/utils";
import { StatusPill } from "./status-pill";

export function MemoryCard({ artifact, summary }: { artifact: Artifact; summary?: SummaryRecord }) {
  return (
    <article className="memory-card">
      <div className="card-title-row">
        <div>
          <div className="pill-row" style={{ marginBottom: 8 }}>
            <span className="pill">
              <FileText size={13} /> {artifact.type}
            </span>
            <StatusPill label={artifact.status === "failed" ? "Failed" : "Ready"} tone={artifact.status === "failed" ? "review" : "ready"} />
          </div>
          <h2 className="card-title">{artifact.title}</h2>
        </div>
        <Link className="icon-button secondary" href={`/artifact/${artifact.id}`} title="Open artifact">
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="card-copy">{summary?.summary ?? artifact.sourceLabel}</p>
      <div className="pill-row">
        <span className="pill">{formatDateTime(artifact.capturedAt)}</span>
        <span className="pill">{artifact.retentionDecision.replace("_", " ")}</span>
        {summary?.tags.map((tag) => (
          <span className="pill" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
