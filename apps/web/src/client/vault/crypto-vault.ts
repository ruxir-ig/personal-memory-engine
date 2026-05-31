/**
 * Browser vault crypto (Web Crypto API).
 * Passphrase never stored — only salt + encrypted blobs at rest.
 */

const VAULT_SALT_KEY = "quipu.vault.salt";
const PBKDF2_ITERATIONS = 310_000;

let unlockedKey: CryptoKey | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isVaultUnlocked() {
  return unlockedKey !== null;
}

export function lockVault() {
  unlockedKey = null;
}

export function vaultSalt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VAULT_SALT_KEY);
}

export function vaultIsConfigured() {
  return Boolean(vaultSalt());
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const saltBytes = new Uint8Array(salt);
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function setupVault(passphrase: string) {
  if (passphrase.length < 8) throw new Error("Vault passphrase must be at least 8 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(VAULT_SALT_KEY, bytesToBase64(salt));
  unlockedKey = await deriveKey(passphrase, salt);
}

export async function unlockVault(passphrase: string) {
  const saltB64 = vaultSalt();
  if (!saltB64) throw new Error("Vault is not set up yet.");
  unlockedKey = await deriveKey(passphrase, base64ToBytes(saltB64));
  return true;
}

export type EncryptedPayload = {
  v: 1;
  iv: string;
  ciphertext: string;
};

export async function encryptString(plaintext: string): Promise<EncryptedPayload> {
  if (!unlockedKey) throw new Error("Unlock your vault to encrypt secrets.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, unlockedKey, new TextEncoder().encode(plaintext));
  return { v: 1, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

export async function decryptString(payload: EncryptedPayload): Promise<string> {
  if (!unlockedKey) throw new Error("Unlock your vault to reveal secrets.");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    unlockedKey,
    base64ToBytes(payload.ciphertext),
  );
  return new TextDecoder().decode(plain);
}

export function serializeEncrypted(payload: EncryptedPayload) {
  return `enc:v1:${payload.iv}:${payload.ciphertext}`;
}

export function parseEncrypted(value: string): EncryptedPayload | null {
  if (!value.startsWith("enc:v1:")) return null;
  const parts = value.split(":");
  const iv = parts[2];
  const ciphertext = parts.slice(3).join(":");
  if (!iv || !ciphertext) return null;
  return { v: 1, iv, ciphertext };
}

export async function decryptIfEncrypted(value: string) {
  const payload = parseEncrypted(value);
  if (!payload) return value;
  return decryptString(payload);
}
