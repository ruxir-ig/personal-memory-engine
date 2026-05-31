import { openDB, type IDBPDatabase } from "idb";

type VaultDb = {
  blobs: {
    key: string;
    value: {
      hash: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      capturedAt: string;
      bytes: ArrayBuffer;
    };
  };
  derived: {
    key: string;
    value: {
      artifactHash: string;
      kind: string;
      bytes: ArrayBuffer;
      mimeType: string;
      meta?: Record<string, unknown>;
    };
  };
};

const DB_NAME = "quipu-vault";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VaultDb>> | undefined;

function vaultDb() {
  if (!dbPromise) {
    dbPromise = openDB<VaultDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("blobs", { keyPath: "hash" });
        db.createObjectStore("derived", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export function vaultKeyForHash(hash: string) {
  return `vault:${hash}`;
}

export async function putVaultBlob(args: {
  hash: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  bytes: ArrayBuffer;
}) {
  const db = await vaultDb();
  await db.put("blobs", {
    hash: args.hash,
    filename: args.filename,
    mimeType: args.mimeType,
    sizeBytes: args.sizeBytes,
    capturedAt: args.capturedAt,
    bytes: args.bytes,
  });
  return vaultKeyForHash(args.hash);
}

export async function getVaultBlobByKey(vaultKey: string) {
  const hash = vaultKey.startsWith("vault:") ? vaultKey.slice("vault:".length) : vaultKey;
  const db = await vaultDb();
  return db.get("blobs", hash);
}

export async function getVaultBlobByHash(hash: string) {
  const db = await vaultDb();
  return db.get("blobs", hash);
}

export async function putDerivedBlob(args: {
  key: string;
  artifactHash: string;
  kind: string;
  bytes: ArrayBuffer;
  mimeType: string;
  meta?: Record<string, unknown>;
}) {
  const db = await vaultDb();
  await db.put("derived", args);
}

export async function getDerivedBlob(key: string) {
  const db = await vaultDb();
  return db.get("derived", key);
}

export async function clearVault() {
  const db = await vaultDb();
  await db.clear("blobs");
  await db.clear("derived");
}

export function blobUrl(bytes: ArrayBuffer, mimeType: string) {
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}
