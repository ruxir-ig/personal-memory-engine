import Link from "next/link";
import { Download, Inbox } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { formatDateTime } from "@/lib/utils";
import { getArtifactById } from "@/server/data/repository";

export default async function ArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getArtifactById(id);
  if (!record) notFound();

  const sourceText = record.chunks.map((chunk) => chunk.text).join("\n\n");

  return (
    <>
      <PageHeading
        kicker={record.artifact.type}
        title={record.artifact.title}
        copy={`Captured ${formatDateTime(record.artifact.capturedAt)} from ${record.artifact.sourceLabel}.`}
        actions={
          record.artifact.originalPath ? (
            <Link className="button secondary" href={`/api/artifacts/${record.artifact.id}/raw`}>
              <Download size={16} />
              Raw
            </Link>
          ) : undefined
        }
      />

      <div className="grid-dashboard">
        <section className="surface section-pad">
          <div className="page-kicker" style={{ marginBottom: 10 }}>
            Normalized source
          </div>
          <div className="source-viewer">{sourceText || "No extracted source text yet."}</div>
        </section>
        <div className="card-list">
          <section className="surface section-pad">
            <div className="page-kicker" style={{ marginBottom: 10 }}>
              Summary
            </div>
            <h2 className="card-title">{record.summary?.title ?? record.artifact.title}</h2>
            <p className="card-copy">{record.summary?.summary ?? "No summary yet."}</p>
            <div className="pill-row" style={{ marginTop: 12 }}>
              <span className="pill">{record.artifact.retentionDecision.replace("_", " ")}</span>
              <span className="pill">{record.artifact.privacy}</span>
              {record.summary?.tags.map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
          <section className="surface section-pad">
            <div className="card-title-row" style={{ marginBottom: 12 }}>
              <div>
                <div className="page-kicker">Provenance</div>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  Linked actions
                </h2>
              </div>
              <Inbox size={18} />
            </div>
            <div className="card-list">
              {record.intents.map((intent) => (
                <article className="memory-card" key={intent.id}>
                  <h3 className="card-title">{intent.intentType.replaceAll("_", " ")}</h3>
                  <p className="card-copy">
                    {intent.status} · confidence {Math.round(intent.confidence * 100)}%
                  </p>
                </article>
              ))}
              {record.reminders.map((reminder) => (
                <article className="memory-card" key={reminder.id}>
                  <h3 className="card-title">{reminder.title}</h3>
                  <p className="card-copy">{formatDateTime(reminder.dueAt)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
