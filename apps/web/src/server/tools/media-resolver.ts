import path from "node:path";
import { readData, getArtifactVaultRoot } from "@/server/data/store";
import type { Artifact } from "@pme/shared";

export type ResolvedVaultFile = {
  artifactId: string;
  title: string;
  path: string;
  mimeType?: string;
  kind: Artifact["kind"];
  type: Artifact["type"];
};

export type ResolvedArtifactUrl = {
  artifactId: string;
  title: string;
  url: string;
  kind: Artifact["kind"];
  type: Artifact["type"];
};

function vaultPath(filePath: string) {
  const resolved = path.resolve(filePath);
  const vaultRoot = path.resolve(getArtifactVaultRoot());
  if (!resolved.startsWith(vaultRoot + path.sep) && resolved !== vaultRoot) {
    throw new Error("Artifact path is outside the local vault.");
  }
  return resolved;
}

export async function findArtifact(artifactId: string) {
  const data = await readData();
  return data.artifacts.find((artifact) => artifact.id === artifactId) ?? null;
}

export async function resolveVaultFile(artifactId: string): Promise<ResolvedVaultFile | null> {
  const artifact = await findArtifact(artifactId);
  if (!artifact?.originalPath) return null;
  return {
    artifactId: artifact.id,
    title: artifact.title,
    path: vaultPath(artifact.originalPath),
    mimeType: artifact.mimeType,
    kind: artifact.kind,
    type: artifact.type,
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

export function derivedDirFor(filePath: string) {
  const dir = path.join(path.dirname(filePath), "derived");
  return vaultPath(dir);
}
