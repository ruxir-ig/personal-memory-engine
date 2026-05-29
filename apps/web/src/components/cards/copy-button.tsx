"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy", className = "icon-btn sm bare" }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button className={className} type="button" onClick={copy} aria-label={label} title={label}>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
