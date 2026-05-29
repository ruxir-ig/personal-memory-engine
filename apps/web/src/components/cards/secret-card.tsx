"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "./copy-button";

export function SecretCard({
  label,
  masked,
  value,
  service,
}: {
  label: string;
  masked: string;
  value?: string;
  service?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="secret">
      <span className="lock" aria-hidden="true">
        <KeyRound size={16} />
      </span>
      <div className="secret-info">
        <strong>{label}</strong>
        <span className="secret-val">{revealed && value ? value : masked}</span>
      </div>
      <div className="row" style={{ gap: 4 }}>
        {service ? <span className="chip" style={{ marginRight: 4 }}>{service}</span> : null}
        {value ? (
          <button className="icon-btn sm bare" type="button" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? "Hide" : "Reveal"}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        ) : null}
        {value ? <CopyButton value={value} label="Copy key" /> : null}
      </div>
    </div>
  );
}
