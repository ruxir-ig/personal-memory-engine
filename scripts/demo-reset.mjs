import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const dataRoot = process.env.PME_DATA_DIR
  ? path.resolve(process.env.PME_DATA_DIR)
  : path.join(repoRoot, "data");
const storePath = path.join(dataRoot, "dev-store.json");
const artifactsPath = path.join(dataRoot, "artifacts");

const emptyStore = {
  artifacts: [],
  chunks: [],
  summaries: [],
  intents: [],
  entities: [],
  edges: [],
  events: [],
  reminders: [],
  preferences: [],
  providers: [],
  ingestionRuns: [],
  feedback: [],
};

await mkdir(dataRoot, { recursive: true });
await rm(artifactsPath, { recursive: true, force: true });
await writeFile(storePath, `${JSON.stringify(emptyStore, null, 2)}\n`, "utf8");

console.log(`Reset demo store at ${storePath}`);
