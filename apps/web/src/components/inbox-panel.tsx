"use client";

import { Check, Loader2, X } from "lucide-react";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

export function InboxPanel() {
  const utils = trpc.useUtils();
  const inbox = trpc.inbox.list.useQuery();
  const confirm = trpc.memory.confirmIntent.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.inbox.list.invalidate(),
        utils.dashboard.snapshot.invalidate(),
        utils.reminder.list.invalidate(),
        utils.preference.list.invalidate(),
      ]);
    },
  });

  if (inbox.isLoading) {
    return (
      <section className="surface section-pad">
        <span className="pill">
          <Loader2 size={13} /> Loading inbox
        </span>
      </section>
    );
  }

  const items = inbox.data ?? [];

  return (
    <section className="surface section-pad">
      <div className="card-title-row" style={{ marginBottom: 14 }}>
        <div>
          <div className="page-kicker">Capture inbox</div>
          <h2 className="card-title" style={{ fontSize: 20 }}>
            Proposed actions
          </h2>
        </div>
        <span className="pill amber">{items.length} pending</span>
      </div>
      {items.length === 0 ? (
        <EmptyState>No proposed actions are waiting for review.</EmptyState>
      ) : (
        <div className="card-list">
          {items.map((intent) => (
            <article className="memory-card" key={intent.id}>
              <div className="card-title-row">
                <div>
                  <h3 className="card-title">{intent.intentType.replaceAll("_", " ")}</h3>
                  <p className="card-copy">
                    Confidence {Math.round(intent.confidence * 100)}% · {intent.modelOrRuleVersion}
                  </p>
                </div>
                <span className="pill">{intent.requiredConfirmation ? "confirmation required" : "low risk"}</span>
              </div>
              <div className="pill-row">
                {intent.proposedActions.map((action) => (
                  <span className="pill" key={action}>
                    {action}
                  </span>
                ))}
              </div>
              <pre className="source-viewer" style={{ margin: 0 }}>
                {JSON.stringify(intent.extractedFields, null, 2)}
              </pre>
              <div className="toolbar">
                <button
                  className="button"
                  type="button"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate({ intentId: intent.id, accepted: true })}
                >
                  <Check size={16} />
                  Accept
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate({ intentId: intent.id, accepted: false })}
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
