"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { itemHref } from "@/lib/item-route";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { useTimeline } from "@/client/hooks";

export default function TimelinePage() {
  const events = useTimeline();

  return (
    <>
      <PageHeading kicker="Timeline" title="Everything, in order" copy="A chronological trail of what Quipu extracted from your dumps - kept separate from when you captured it." />
      {events.isLoading ? (
        <div className="faint">Loading timeline…</div>
      ) : !events.data?.length ? (
        <EmptyState title="No events yet" icon={<Clock3 size={20} />}>
          As you capture dated things - deadlines, plans, releases - they line up here.
        </EmptyState>
      ) : (
        <div className="timeline">
          {events.data.map((event) => (
            <div className="tl-row" key={event.id}>
              <div className="tl-time">
                {relativeTime(event.eventAt ?? event.capturedAt)}
                <small>{formatDateTime(event.eventAt ?? event.capturedAt)}</small>
              </div>
              <div className="tl-body">
                <span className="tl-dot" />
                <div className="row top between" style={{ gap: 12 }}>
                  <div className="grow">
                    <strong style={{ fontSize: 14.5 }}>{event.title}</strong>
                    {event.description ? (
                      <p className="dim" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                        {event.description}
                      </p>
                    ) : null}
                    <div className="chip-row" style={{ marginTop: 9 }}>
                      <span className="chip accent">{Math.round(event.confidence * 100)}% sure</span>
                      {event.place ? <span className="chip">{event.place}</span> : null}
                    </div>
                  </div>
                  {event.artifactId ? (
                    <Link className="icon-btn" href={itemHref(event.artifactId)} title="Open source" aria-label="Open source">
                      <ArrowUpRight size={16} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
