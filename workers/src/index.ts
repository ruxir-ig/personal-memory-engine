import { readFile } from "node:fs/promises";
import path from "node:path";

function getDataRoot() {
  const explicit = process.env.PME_DATA_DIR;
  if (explicit) return path.resolve(explicit);
  if (process.cwd().endsWith("workers")) {
    return path.resolve(process.cwd(), "..", "data");
  }
  return path.resolve(process.cwd(), "data");
}

async function main() {
  const storePath = path.join(getDataRoot(), "dev-store.json");
  try {
    const raw = await readFile(storePath, "utf8");
    const store = JSON.parse(raw) as { ingestionRuns?: Array<{ status: string; kind: string; artifactId?: string }> };
    const queued = store.ingestionRuns?.filter((run) => run.status === "queued") ?? [];
    console.log(`personal-memory-engine worker v0: ${queued.length} queued ingestion run(s)`);
    for (const run of queued) {
      console.log(`queued ${run.kind}${run.artifactId ? ` for artifact ${run.artifactId}` : ""}`);
    }
  } catch {
    console.log("personal-memory-engine worker v0: no local store yet. Start the web app or capture a memory first.");
  }
}

await main();
