import { openDB } from "idb";
import { encryptString, isVaultUnlocked, serializeEncrypted } from "./crypto-vault";

type SecretRecord = {
  id: string;
  label: string;
  service?: string;
  encrypted: string;
  createdAt: string;
};

const DB_NAME = "quipu-secrets";
const STORE = "secrets";

async function secretsDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "id" });
    },
  });
}

export async function storeSecret(args: { label: string; service?: string; plaintext: string }) {
  if (!isVaultUnlocked()) {
    throw new Error("Unlock your vault before saving secrets.");
  }
  const payload = await encryptString(args.plaintext);
  const record: SecretRecord = {
    id: crypto.randomUUID(),
    label: args.label,
    service: args.service,
    encrypted: serializeEncrypted(payload),
    createdAt: new Date().toISOString(),
  };
  const db = await secretsDb();
  await db.put(STORE, record);
  return record.id;
}

export async function readSecretPlaintext(secretId: string) {
  const db = await secretsDb();
  const record = await db.get(STORE, secretId);
  if (!record) return null;
  const { decryptIfEncrypted } = await import("./crypto-vault");
  return decryptIfEncrypted(record.encrypted);
}

export async function clearAllSecrets() {
  const db = await secretsDb();
  await db.clear(STORE);
}
