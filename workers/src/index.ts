import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
  const databasePath = process.env.PME_DATABASE_PATH ? path.resolve(process.env.PME_DATABASE_PATH) : path.join(getDataRoot(), "quipu.sqlite");
  try {
    const raw = existsSync(databasePath)
      ? readSnapshotFromDatabase(databasePath)
      : await readFile(storePath, "utf8");
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

function readSnapshotFromDatabase(databasePath: string) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  const row = db.prepare("SELECT value_json FROM store_snapshots WHERE key = 'memory_data'").get() as
    | { value_json: string }
    | undefined;
  db.close();
  if (!row) throw new Error("No local database snapshot found.");
  return row.value_json;
}

await main();
