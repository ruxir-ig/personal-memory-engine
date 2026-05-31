export function randomUUID() {
  return crypto.randomUUID();
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array) {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", view.slice());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createHashLikeSync(data: Uint8Array) {
  let pending = Promise.resolve("");
  pending = sha256Hex(data);
  return {
    update(value: Uint8Array) {
      pending = sha256Hex(value);
      return this;
    },
    async digest(encoding: "hex") {
      if (encoding !== "hex") throw new Error("Only hex supported");
      return pending;
    },
  };
}
