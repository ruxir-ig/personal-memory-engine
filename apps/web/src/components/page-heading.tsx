import type { ReactNode } from "react";

export function PageHeading({
  kicker,
  title,
  copy,
  actions,
}: {
  kicker: string;
  title: string;
  copy?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <div className="kicker">{kicker}</div>
        <h1 className="page-title">{title}</h1>
        {copy ? <p className="page-copy">{copy}</p> : null}
      </div>
      {actions ? <div className="head-actions">{actions}</div> : null}
    </header>
  );
}
