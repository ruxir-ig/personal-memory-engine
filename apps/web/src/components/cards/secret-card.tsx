"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { useSecretValue } from "@/client/vault/use-secret-value";
import { CopyButton } from "./copy-button";

export function SecretCard({
  label,
  masked,
  secretVaultId,
  service,
}: {
  label: string;
  masked: string;
  secretVaultId?: string;
  service?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const secret = useSecretValue(secretVaultId);
  const display = revealed && secret.value ? secret.value : masked;

  return (
    <div className="secret">
      <span className="lock" aria-hidden="true">
        <KeyRound size={16} />
      </span>
      <div className="secret-info">
        <strong>{label}</strong>
        <span className="secret-val">{display}</span>
        {secret.error ? <span className="faint" style={{ fontSize: 11 }}>{secret.error}</span> : null}
        {!secret.canReveal && secretVaultId ? (
          <span className="faint" style={{ fontSize: 11 }}>Unlock vault in Settings to reveal</span>
        ) : null}
      </div>
      <div className="row" style={{ gap: 4 }}>
        {service ? <span className="chip" style={{ marginRight: 4 }}>{service}</span> : null}
        {secret.canReveal ? (
          <button className="icon-btn sm bare" type="button" onClick={() => setRevealed((v) => !v)} aria-label={revealed ? "Hide" : "Reveal"}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        ) : null}
        {secret.canReveal && secret.value ? <CopyButton value={secret.value} label="Copy key" /> : null}
      </div>
    </div>
  );
}
