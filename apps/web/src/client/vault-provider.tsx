"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  isVaultUnlocked,
  lockVault,
  setupVault,
  unlockVault,
  vaultIsConfigured,
} from "@/client/vault/crypto-vault";

type VaultContextValue = {
  configured: boolean;
  unlocked: boolean;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setConfigured(vaultIsConfigured());
    setUnlocked(isVaultUnlocked());
  }, []);

  const setup = useCallback(async (passphrase: string) => {
    await setupVault(passphrase);
    setConfigured(true);
    setUnlocked(true);
  }, []);

  const unlock = useCallback(async (passphrase: string) => {
    await unlockVault(passphrase);
    setUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    lockVault();
    setUnlocked(false);
  }, []);

  const value = useMemo(() => ({ configured, unlocked, setup, unlock, lock }), [configured, unlocked, setup, unlock, lock]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
