import Link from "next/link";
import { ArrowRight, Bell, MessageSquareText, Search } from "lucide-react";
import { CaptureComposer } from "@/components/capture-composer";
import { EmptyState } from "@/components/empty-state";
import { InboxPanel } from "@/components/inbox-panel";
import { MemoryCard } from "@/components/memory-card";
import { MetricTile } from "@/components/metric-tile";
import { PageHeading } from "@/components/page-heading";
import { formatDateTime } from "@/lib/utils";
import { getDashboardSnapshot } from "@/server/data/repository";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <>
      <PageHeading
        kicker="First v0"
        title="Capture, review, search, and ask your own evidence"
        copy="A local-first memory workspace with durable provenance, proposed actions, timeline context, reminders, provider settings, and cited retrieval."
        actions={
          <>
            <Link className="button secondary" href="/search">
              <Search size={16} />
              Search
            </Link>
            <Link className="button" href="/chat">
              <MessageSquareText size={16} />
              Ask
            </Link>
          </>
        }
      />

      <section className="metric-row" aria-label="Memory statistics">
        <MetricTile label="Artifacts" value={snapshot.counts.artifacts} />
        <MetricTile label="Chunks" value={snapshot.counts.chunks} />
        <MetricTile label="Inbox" value={snapshot.counts.inbox} />
        <MetricTile label="Scheduled" value={snapshot.counts.reminders} />
        <MetricTile label="Providers" value={snapshot.counts.providers} />
      </section>

      <div className="grid-dashboard">
        <div className="card-list">
          <CaptureComposer />
          <section className="surface section-pad">
            <div className="card-title-row" style={{ marginBottom: 14 }}>
              <div>
                <div className="page-kicker">Recent memory</div>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  Source-backed artifacts
                </h2>
              </div>
              <Link className="button secondary" href="/search">
                View all
                <ArrowRight size={16} />
              </Link>
            </div>
            {snapshot.artifacts.length === 0 ? (
              <EmptyState>Capture a note or import a file to create the first memory.</EmptyState>
            ) : (
              <div className="card-list">
                {snapshot.artifacts.slice(0, 4).map((artifact) => (
                  <MemoryCard
                    artifact={artifact}
                    key={artifact.id}
                    summary={snapshot.summaries.find((summary) => summary.artifactId === artifact.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="card-list">
          <InboxPanel />
          <section className="surface section-pad">
            <div className="card-title-row" style={{ marginBottom: 14 }}>
              <div>
                <div className="page-kicker">Timeline</div>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  Time-aware context
                </h2>
              </div>
              <Link className="icon-button secondary" href="/timeline" title="Open timeline">
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="timeline">
              {snapshot.events.length === 0 ? (
                <EmptyState>No timeline events have been extracted yet.</EmptyState>
              ) : (
                snapshot.events.slice(0, 4).map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <div className="timeline-time">{formatDateTime(event.eventAt ?? event.capturedAt)}</div>
                    <div>
                      <h3 className="card-title">{event.title}</h3>
                      <p className="card-copy">{event.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="surface section-pad">
            <div className="card-title-row" style={{ marginBottom: 14 }}>
              <div>
                <div className="page-kicker">Reminders</div>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  Scheduled follow-ups
                </h2>
              </div>
              <Bell size={18} />
            </div>
            {snapshot.reminders.length === 0 ? (
              <EmptyState>Accept a reminder proposal or create one manually.</EmptyState>
            ) : (
              <div className="card-list">
                {snapshot.reminders.slice(0, 3).map((reminder) => (
                  <article className="memory-card" key={reminder.id}>
                    <h3 className="card-title">{reminder.title}</h3>
                    <p className="card-copy">{formatDateTime(reminder.dueAt)}</p>
                    <span className="pill accent">{reminder.status}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
