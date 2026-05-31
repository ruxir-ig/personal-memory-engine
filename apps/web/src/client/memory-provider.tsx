"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ensureMemoryStore } from "@/client/memory/store";

type MemoryRuntimeContextValue = {
  ready: boolean;
  error?: string;
};

const MemoryRuntimeContext = createContext<MemoryRuntimeContextValue>({ ready: false });

export function MemoryRuntimeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    ensureMemoryStore()
      .then(() => setReady(true))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Failed to open local database"));
  }, []);

  if (error) {
    return (
      <div className="card pad" style={{ margin: 24 }}>
        <strong>Could not open local memory store</strong>
        <p className="dim" style={{ marginTop: 8 }}>
          {error}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="card pad" style={{ margin: 24 }}>
        <span className="dim">Opening local SQLite memory…</span>
      </div>
    );
  }

  return <MemoryRuntimeContext.Provider value={{ ready, error }}>{children}</MemoryRuntimeContext.Provider>;
}

export function useMemoryReady() {
  return useContext(MemoryRuntimeContext).ready;
}
