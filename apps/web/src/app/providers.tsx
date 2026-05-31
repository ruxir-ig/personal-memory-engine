"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { MemoryRuntimeProvider } from "@/client/memory-provider";
import { VaultProvider } from "@/client/vault-provider";
import { makeQueryClient } from "@/trpc/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRuntimeProvider>
        <VaultProvider>{children}</VaultProvider>
      </MemoryRuntimeProvider>
    </QueryClientProvider>
  );
}
