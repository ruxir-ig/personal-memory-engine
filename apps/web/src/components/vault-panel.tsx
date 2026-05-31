"use client";

import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useVault } from "@/client/vault-provider";

export function VaultPanel() {
  const vault = useVault();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: "setup" | "unlock") {
    setError("");
    setBusy(true);
    try {
      if (action === "setup") {
        if (confirm.length < 8) throw new Error("Confirm your vault passphrase.");
        if (passphrase !== confirm) throw new Error("Passphrases do not match.");
        await vault.setup(passphrase);
      } else {
        await vault.unlock(passphrase);
      }
      setPassphrase("");
      setConfirm("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vault action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card pad-lg">
      <div className="section-head">
        <div className="block-title">
          <span className="ic">
            <ShieldCheck size={16} />
          </span>
          Secret vault
        </div>
        {vault.unlocked ? (
          <button className="btn secondary sm" type="button" onClick={vault.lock}>
            <Lock size={14} />
            Lock
          </button>
        ) : null}
      </div>
      <p className="dim" style={{ fontSize: 13, marginBottom: 14, lineHeight: 1.55 }}>
        API keys and credentials are encrypted in your browser with AES-GCM. Your passphrase never leaves this device and is never sent to any model.
      </p>
      {vault.unlocked ? (
        <span className="chip accent">Vault unlocked — you can save and reveal secrets</span>
      ) : (
        <div className="stack">
          <label className="field">
            <span>{vault.configured ? "Passphrase" : "Create vault passphrase"}</span>
            <input className="input" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="At least 8 characters" />
          </label>
          {!vault.configured ? (
            <label className="field">
              <span>Confirm passphrase</span>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
          ) : null}
          {error ? <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span> : null}
          <button
            className="btn"
            type="button"
            disabled={busy || passphrase.length < 8 || (!vault.configured && confirm.length < 8)}
            onClick={() => run(vault.configured ? "unlock" : "setup")}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
            {vault.configured ? "Unlock vault" : "Create vault"}
          </button>
        </div>
      )}
    </section>
  );
}
