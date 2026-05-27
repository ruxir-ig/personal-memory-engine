import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getArtifactById } from "@/server/data/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const record = await getArtifactById(artifactId);
  if (!record?.artifact.originalPath) {
    return NextResponse.json({ error: "Raw artifact is not available" }, { status: 404 });
  }

  const body = await readFile(record.artifact.originalPath);
  return new Response(body, {
    headers: {
      "content-type": record.artifact.mimeType ?? "application/octet-stream",
      "content-disposition": `inline; filename="${encodeURIComponent(record.artifact.sourceLabel)}"`,
    },
  });
}
