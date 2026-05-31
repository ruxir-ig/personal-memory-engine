"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useResetDemoMutation } from "@/client/hooks";

export function DemoResetButton() {
  const reset = useResetDemoMutation();

  async function resetDemo() {
    if (!window.confirm("Clear local memories and imported artifacts? Provider settings stay in your settings store.")) return;
    await reset.mutateAsync();
  }

  return (
    <button className="btn secondary sm" type="button" onClick={resetDemo} disabled={reset.isPending}>
      {reset.isPending ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
      Clear local data
    </button>
  );
}
