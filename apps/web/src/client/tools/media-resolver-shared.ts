import type { Artifact } from "@pme/shared";
import { readData } from "@/client/memory/store";
import { getVaultBlobByKey } from "@/client/memory/vault";

export type ResolvedVaultFile = {
  artifactId: string;
  title: string;
  vaultKey: string;
  mimeType?: string;
  kind: Artifact["kind"];
  type: Artifact["type"];
  bytes: ArrayBuffer;
};

export type ResolvedArtifactUrl = {
  artifactId: string;
  title: string;
  url: string;
  kind: Artifact["kind"];
  type: Artifact["type"];
};

export async function findArtifact(artifactId: string) {
  const data = await readData();
  return data.artifacts.find((artifact) => artifact.id === artifactId) ?? null;
}

export async function resolveVaultFile(artifactId: string): Promise<ResolvedVaultFile | null> {
  const artifact = await findArtifact(artifactId);
  if (!artifact?.originalPath) return null;
  const blob = await getVaultBlobByKey(artifact.originalPath);
  if (!blob) return null;
  return {
    artifactId: artifact.id,
    title: artifact.title,
    vaultKey: artifact.originalPath,
    mimeType: artifact.mimeType,
    kind: artifact.kind,
    type: artifact.type,
    bytes: blob.bytes,
  };
}

export async function resolveArtifactUrl(artifactId: string): Promise<ResolvedArtifactUrl | null> {
  const artifact = await findArtifact(artifactId);
  if (!artifact) return null;
  const url = typeof artifact.structured?.url === "string" ? artifact.structured.url : undefined;
  if (!url) return null;
  return {
    artifactId: artifact.id,
    title: artifact.title,
    url,
    kind: artifact.kind,
    type: artifact.type,
  };
}

export function isVideoLike(media: Pick<ResolvedVaultFile, "type" | "kind" | "mimeType">) {
  if (media.type === "video" || media.kind === "video" || media.kind === "reel") return true;
  return Boolean(media.mimeType?.startsWith("video/"));
}
