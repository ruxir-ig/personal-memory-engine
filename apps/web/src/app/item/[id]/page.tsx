import Link from "next/link";
import { ArrowUpRight, Download, Hash } from "lucide-react";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { SecretCard } from "@/components/cards/secret-card";
import { kindAccentColor, kindMeta } from "@/lib/registry";
import { formatDateTime } from "@/lib/utils";
import { getArtifactById } from "@/server/data/repository";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getArtifactById(id);
  if (!record) notFound();

  const { artifact, space, summary, intents, reminders } = record;
  const meta = kindMeta[artifact.kind] ?? kindMeta.note;
  const s = artifact.structured ?? {};
  const url = str(s.url);
  const sourceText = record.chunks.map((chunk) => chunk.text).join("\n\n");

  const facts: { label: string; value: string; href?: string }[] = [];
  if (url) facts.push({ label: "URL", value: url, href: url });
  if (str(s.host)) facts.push({ label: "Host", value: str(s.host)! });
  if (str(s.platform)) facts.push({ label: "Platform", value: str(s.platform)! });
  if (str(s.author)) facts.push({ label: "Author", value: str(s.author)! });
  if (str(s.language)) facts.push({ label: "Language", value: str(s.language)! });
  if (str(s.service)) facts.push({ label: "Service", value: str(s.service)! });

  return (
    <>
      <PageHeading
        kicker={meta.label}
        title={str(s.mediaTitle) ?? artifact.title}
        copy={`Captured ${formatDateTime(artifact.capturedAt)} from ${artifact.sourceLabel}.`}
        actions={
          <div className="head-actions">
            {url ? (
              <a className="btn secondary sm" href={url} target="_blank" rel="noreferrer">
                <ArrowUpRight size={15} />
                Open original
              </a>
            ) : null}
            {artifact.originalPath ? (
              <Link className="btn secondary sm" href={`/api/artifacts/${artifact.id}/raw`}>
                <Download size={15} />
                Raw file
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="detail-grid">
        <div className="stack">
          {artifact.kind === "credential" ? (
            <section className="card pad">
              <div className="kicker" style={{ marginBottom: 12 }}>
                Stored on device
              </div>
              <SecretCard label={str(s.secretLabel) ?? artifact.title} masked={str(s.secretMasked) ?? "\u2022\u2022\u2022\u2022\u2022\u2022"} value={str(s.secretValue)} service={str(s.service)} />
              <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
                Secrets are never sent to AI providers and are kept out of search text.
              </p>
            </section>
          ) : (
            <section className="card pad">
              <div className="kicker" style={{ marginBottom: 12 }}>
                Source
              </div>
              {sourceText ? <div className="source-text">{sourceText}</div> : <EmptyState title="No extracted text">This memory has no stored body text.</EmptyState>}
            </section>
          )}

          {facts.length > 0 ? (
            <section className="card pad">
              <div className="kicker" style={{ marginBottom: 12 }}>
                Details
              </div>
              <div className="stack sm">
                {facts.map((fact) => (
                  <div className="row between" key={fact.label} style={{ gap: 12 }}>
                    <span className="faint" style={{ fontSize: 12.5 }}>
                      {fact.label}
                    </span>
                    {fact.href ? (
                      <a className="truncate" href={fact.href} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", maxWidth: "70%" }}>
                        {fact.value}
                      </a>
                    ) : (
                      <span className="truncate" style={{ maxWidth: "70%" }}>
                        {fact.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="stack">
          <section className="card pad">
            <div className="chip-row" style={{ marginBottom: 12 }}>
              <span className="chip kind" style={{ ["--k" as string]: kindAccentColor(artifact.kind) } as CSSProperties}>
                {meta.label}
              </span>
              {space ? (
                <Link className="chip" href={`/spaces/${space.slug}`}>
                  {space.title}
                </Link>
              ) : null}
              <span className="chip">{artifact.privacy}</span>
            </div>
            <h2 style={{ fontSize: 17 }}>{summary?.title ?? artifact.title}</h2>
            <p className="dim" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
              {summary?.summary ?? "No summary yet."}
            </p>
            {summary?.tags && summary.tags.length > 0 ? (
              <div className="chip-row" style={{ marginTop: 12 }}>
                {summary.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    <Hash size={11} />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card pad">
            <div className="kicker" style={{ marginBottom: 12 }}>
              Linked actions
            </div>
            {intents.length === 0 && reminders.length === 0 ? (
              <EmptyState title="Nothing linked">Reminders and decisions tied to this memory show up here.</EmptyState>
            ) : (
              <div className="list">
                {reminders.map((reminder) => (
                  <div className="lrow" key={reminder.id}>
                    <span className="when">{formatDateTime(reminder.dueAt).split(",")[0]}</span>
                    <div className="lrow-main">
                      <strong>{reminder.title}</strong>
                      <span>{reminder.status}</span>
                    </div>
                  </div>
                ))}
                {intents.map((intent) => (
                  <div className="lrow" key={intent.id}>
                    <div className="lrow-main">
                      <strong style={{ textTransform: "capitalize" }}>{intent.intentType.replaceAll("_", " ")}</strong>
                      <span>
                        {intent.status} · {Math.round(intent.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
