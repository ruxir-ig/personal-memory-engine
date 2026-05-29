import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title = "Nothing here yet",
  children,
  actionHref,
  actionLabel,
  icon,
}: {
  title?: string;
  children?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        {icon ?? <Sparkles size={20} />}
      </span>
      <div className="stack sm">
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link className="btn secondary sm" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
