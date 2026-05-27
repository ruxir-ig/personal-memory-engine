import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { formatDateTime } from "@/lib/utils";
import { listTimeline } from "@/server/data/repository";

export default async function TimelinePage() {
  const events = await listTimeline();

  return (
    <>
      <PageHeading
        kicker="Timeline"
        title="Separate capture time from event time"
        copy="V0 stores captured_at, source-created, source-modified, and event_at separately so old imported sources do not look like new events."
      />
      <section className="surface section-pad">
        {events.length === 0 ? (
          <EmptyState>No extracted events yet.</EmptyState>
        ) : (
          <div className="timeline">
            {events.map((event) => (
              <div className="timeline-item" key={event.id}>
                <div className="timeline-time">
                  <strong>{formatDateTime(event.eventAt ?? event.capturedAt)}</strong>
                  <br />
                  captured {formatDateTime(event.capturedAt)}
                </div>
                <article>
                  <div className="card-title-row">
                    <div>
                      <h2 className="card-title">{event.title}</h2>
                      <p className="card-copy">{event.description}</p>
                    </div>
                    {event.artifactId ? (
                      <Link className="icon-button secondary" href={`/artifact/${event.artifactId}`} title="Open source">
                        <ArrowUpRight size={16} />
                      </Link>
                    ) : null}
                  </div>
                  <div className="pill-row" style={{ marginTop: 10 }}>
                    <span className="pill accent">confidence {Math.round(event.confidence * 100)}%</span>
                    {event.place ? <span className="pill">{event.place}</span> : null}
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
