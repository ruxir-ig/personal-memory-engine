import { NextResponse } from "next/server";
import { importFileArtifact } from "@/server/data/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importFileArtifact({
    filename: file.name || "upload.bin",
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
  });

  return NextResponse.json(result);
}
