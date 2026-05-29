"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

export type ReviewEntry = { id: string; title: string; detail: string };

export function ReviewQueue({ entries }: { entries: ReviewEntry[] }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const confirm = trpc.memory.confirmIntent.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.dashboard.snapshot.invalidate(), utils.canvas.layout.invalidate(), utils.inbox.list.invalidate(), utils.reminder.list.invalidate()]);
      router.refresh();
    },
  });

  if (entries.length === 0) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <Check size={20} />
        </span>
        <strong>All caught up</strong>
      </div>
    );
  }

  return (
    <div className="list">
      {entries.map((entry) => {
        const pending = confirm.isPending && confirm.variables?.intentId === entry.id;
        return (
          <div className="review" key={entry.id}>
            <span className="ic">
              <Sparkles size={16} />
            </span>
            <div className="grow">
              <strong style={{ fontSize: 13.5, fontWeight: 560, display: "block" }} className="clamp-2">
                {entry.title}
              </strong>
              <span className="faint" style={{ fontSize: 12 }}>
                {entry.detail}
              </span>
            </div>
            <div className="review-actions">
              <button
                className="icon-btn sm"
                type="button"
                aria-label="Accept"
                disabled={pending}
                onClick={() => confirm.mutate({ intentId: entry.id, accepted: true })}
              >
                <Check size={15} />
              </button>
              <button
                className="icon-btn sm danger"
                type="button"
                aria-label="Dismiss"
                disabled={pending}
                onClick={() => confirm.mutate({ intentId: entry.id, accepted: false })}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
