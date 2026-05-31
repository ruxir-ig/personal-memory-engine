import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const repoRoot = process.cwd();
const dataRoot = process.env.PME_DATA_DIR
  ? path.resolve(process.env.PME_DATA_DIR)
  : path.join(repoRoot, "data");
const storePath = path.join(dataRoot, "dev-store.json");
const databasePath = process.env.PME_DATABASE_PATH
  ? path.resolve(process.env.PME_DATABASE_PATH)
  : path.join(dataRoot, "quipu.sqlite");
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
await rm(databasePath, { force: true });
await rm(`${databasePath}-shm`, { force: true });
await rm(`${databasePath}-wal`, { force: true });
await writeFile(storePath, `${JSON.stringify(emptyStore, null, 2)}\n`, "utf8");

const db = new DatabaseSync(databasePath);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS local_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS store_snapshots (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memory_records (
    id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    source_label TEXT NOT NULL,
    space_id TEXT,
    captured_at TEXT NOT NULL,
    sync_status TEXT NOT NULL,
    privacy TEXT NOT NULL,
    status TEXT NOT NULL,
    retention_decision TEXT NOT NULL,
    original_path TEXT,
    mime_type TEXT,
    sha256 TEXT,
    size_bytes INTEGER,
    pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    structured_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memory_properties (
    record_id TEXT NOT NULL REFERENCES memory_records(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    value_type TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (record_id, key)
  );
  CREATE INDEX IF NOT EXISTS memory_records_kind_idx ON memory_records(kind);
  CREATE INDEX IF NOT EXISTS memory_records_captured_at_idx ON memory_records(captured_at);
  CREATE INDEX IF NOT EXISTS memory_records_sync_status_idx ON memory_records(sync_status);
  CREATE INDEX IF NOT EXISTS memory_properties_key_idx ON memory_properties(key);
  CREATE INDEX IF NOT EXISTS memory_properties_key_value_idx ON memory_properties(key, value_json);
`);
const resetAt = new Date().toISOString();
db.prepare("INSERT INTO local_meta (key, value, updated_at) VALUES ('schema_version', '1', ?)").run(resetAt);
db.prepare("INSERT INTO store_snapshots (key, value_json, updated_at) VALUES ('memory_data', ?, ?)").run(JSON.stringify(emptyStore), resetAt);
db.close();

console.log(`Reset local database at ${databasePath}`);
