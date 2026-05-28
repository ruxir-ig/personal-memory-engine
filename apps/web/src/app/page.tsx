import Link from "next/link";
import { ArrowRight, Bell, Inbox, Layers3, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { CanvasAsk } from "@/components/canvas-ask";
import { MemoryCard } from "@/components/memory-card";
import { PageHeading } from "@/components/page-heading";
import { formatDateTime } from "@/lib/utils";
import { getDashboardSnapshot } from "@/server/data/repository";

export default async function CanvasPage() {
  const snapshot = await getDashboardSnapshot();
  const isBlank =
    snapshot.counts.artifacts === 0 &&
    snapshot.counts.inbox === 0 &&
    snapshot.counts.reminders === 0 &&
    snapshot.events.length === 0;

  return (
    <>
      <PageHeading
        kicker="Canvas"
        title="Quick glance"
        copy="One page for the things that matter now: reminders, pending review, recent memory, and timeline context."
        actions={
          <Link className="button" href="/ingest">
            <Sparkles size={16} />
            Add memory
          </Link>
        }
      />

      {isBlank ? (
        <section className="blank-canvas">
          <div>
            <span className="blank-icon">
              <Layers3 size={24} />
            </span>
            <h2>Your canvas is empty</h2>
            <p>
              Start by adding notes, files, deadlines, or context from Ingest. Nothing fake is shown here.
            </p>
            <Link className="button" href="/ingest">
              Open ingest
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : (
        <div className="canvas-grid">
          <section className="surface section-pad">
            <div className="section-title">
              <Bell size={17} />
              <h2>Reminders</h2>
            </div>
            {snapshot.reminders.length === 0 ? (
              <EmptyState>No reminders yet.</EmptyState>
            ) : (
              <div className="card-list">
                {snapshot.reminders.map((reminder) => (
                  <article className="memory-card" key={reminder.id}>
                    <div className="card-title-row">
                      <div>
                        <h3 className="card-title">{reminder.title}</h3>
                        <p className="card-copy">{formatDateTime(reminder.dueAt)}</p>
                      </div>
                      <span className="pill accent">{reminder.status}</span>
                    </div>
                    <span className="pill">{reminder.timezone}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="surface section-pad">
            <div className="section-title">
              <Inbox size={17} />
              <h2>Review</h2>
            </div>
            {snapshot.intents.length === 0 ? (
              <EmptyState>No proposed actions waiting.</EmptyState>
            ) : (
              <div className="card-list">
                {snapshot.intents.map((intent) => (
                  <article className="memory-card" key={intent.id}>
                    <h3 className="card-title">{intent.intentType.replaceAll("_", " ")}</h3>
                    <p className="card-copy">
                      {Math.round(intent.confidence * 100)}% confidence · {intent.requiredConfirmation ? "needs confirmation" : "low risk"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="surface section-pad">
            <div className="section-title">
              <Layers3 size={17} />
              <h2>Recent memory</h2>
            </div>
            {snapshot.artifacts.length === 0 ? (
              <EmptyState>No memories captured yet.</EmptyState>
            ) : (
              <div className="card-list">
                {snapshot.artifacts.map((artifact) => (
                  <MemoryCard
                    artifact={artifact}
                    key={artifact.id}
                    summary={snapshot.summaries.find((summary) => summary.artifactId === artifact.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="surface section-pad">
            <div className="section-title">
              <ArrowRight size={17} />
              <h2>Timeline</h2>
            </div>
            {snapshot.events.length === 0 ? (
              <EmptyState>No timeline events yet.</EmptyState>
            ) : (
              <div className="timeline">
                {snapshot.events.map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <div className="timeline-time">{formatDateTime(event.eventAt ?? event.capturedAt)}</div>
                    <div>
                      <h3 className="card-title">{event.title}</h3>
                      <p className="card-copy">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <CanvasAsk />
        </div>
      )}
    </>
  );
}
