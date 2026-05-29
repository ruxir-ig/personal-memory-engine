"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoResetButton() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  async function resetDemo() {
    if (!window.confirm("Reset the local demo store and clear imported artifacts?")) return;
    setIsResetting(true);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Demo reset failed");
      router.refresh();
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <button className="btn secondary sm" type="button" onClick={resetDemo} disabled={isResetting}>
      {isResetting ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
      Reset demo
    </button>
  );
}
