"use client";

import { useEffect, useState } from "react";
import { readSecretPlaintext } from "@/client/vault/secret-store";
import { useVault } from "@/client/vault-provider";

export function useSecretValue(secretVaultId?: string) {
  const vault = useVault();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(null);
    setError(null);
    if (!secretVaultId || !vault.unlocked) return;
    readSecretPlaintext(secretVaultId)
      .then((plain) => setValue(plain))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not decrypt secret"));
  }, [secretVaultId, vault.unlocked]);

  return { value, error, canReveal: Boolean(secretVaultId && vault.unlocked) };
}
