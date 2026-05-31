import { existsSync, mkdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Artifact,
  CanvasLayout,
  Chunk,
  EdgeRecord,
  EntityRecord,
  IntentRecord,
  MemoryKind,
  ModelProviderRecord,
  PreferenceRecord,
  Reminder,
  Space,
  SummaryRecord,
  SyncStatus,
  TimelineEvent,
} from "@pme/shared";

export type StoredProvider = ModelProviderRecord & {
  apiKey: string;
};

export type IngestionRun = {
  id: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  artifactId?: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type FeedbackRecord = {
  id: string;
  targetType: string;
  targetId: string;
  action: string;
  note?: string;
  createdAt: string;
};

export type MemoryData = {
  artifacts: Artifact[];
  spaces: Space[];
  chunks: Chunk[];
  intents: IntentRecord[];
  summaries: SummaryRecord[];
  entities: EntityRecord[];
  edges: EdgeRecord[];
  events: TimelineEvent[];
  reminders: Reminder[];
  preferences: PreferenceRecord[];
  providers: StoredProvider[];
  ingestionRuns: IngestionRun[];
  feedback: FeedbackRecord[];
  canvasLayout?: CanvasLayout;
};

const syncStatuses = new Set<SyncStatus>(["local_processed", "pending_review", "synced_to_canvas"]);
const storeSnapshotKey = "memory_data";
const localSchemaVersion = 1;
let cachedDb: DatabaseSync | undefined;

export function now() {
  return new Date().toISOString();
}

function getDataRoot() {
  const explicit = process.env.PME_DATA_DIR;
  if (explicit) return path.resolve(explicit);
  if (process.cwd().endsWith(path.join("apps", "web"))) {
    return path.resolve(process.cwd(), "../..", "data");
  }
  return path.resolve(process.cwd(), "data");
}

export function getArtifactVaultRoot() {
  return path.join(getDataRoot(), "artifacts");
}

export function databasePath() {
  return process.env.PME_DATABASE_PATH ? path.resolve(process.env.PME_DATABASE_PATH) : path.join(getDataRoot(), "quipu.sqlite");
}

export function storePath() {
  return path.join(getDataRoot(), "dev-store.json");
}

export function emptyData(): MemoryData {
  return {
    artifacts: [],
    spaces: [],
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
}

function kindFromType(type: Artifact["type"]): MemoryKind {
  switch (type) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "file";
    case "pdf":
    case "document":
      return "file";
    case "link":
      return "link";
    case "markdown":
    case "text":
    case "note":
      return "note";
    default:
      return "note";
  }
}

function normalizeData(raw: Partial<MemoryData>): MemoryData {
  const empty = emptyData();
  const data: MemoryData = {
    ...empty,
    ...raw,
    artifacts: raw.artifacts ?? [],
    spaces: raw.spaces ?? [],
    chunks: raw.chunks ?? [],
    summaries: raw.summaries ?? [],
    intents: raw.intents ?? [],
    entities: raw.entities ?? [],
    edges: raw.edges ?? [],
    events: raw.events ?? [],
    reminders: raw.reminders ?? [],
    preferences: raw.preferences ?? [],
    providers: raw.providers ?? [],
    ingestionRuns: raw.ingestionRuns ?? [],
    feedback: raw.feedback ?? [],
    canvasLayout: raw.canvasLayout,
  };

  data.artifacts = data.artifacts.map((artifact) => {
    const legacyStatus = artifact.metadata?.canvasStatus ?? artifact.metadata?.ingestStatus;
    const explicitSyncStatus = syncStatuses.has(artifact.syncStatus) ? artifact.syncStatus : undefined;
    const syncStatus =
      artifact.status === "needs_review" || artifact.retentionDecision === "review"
        ? "pending_review"
        : explicitSyncStatus ?? (legacyStatus === "synced_to_canvas" ? "synced_to_canvas" : "local_processed");
    return {
      ...artifact,
      kind: artifact.kind ?? kindFromType(artifact.type),
      structured: artifact.structured ?? {},
      syncStatus,
      metadata: {
        ...artifact.metadata,
        syncStatus,
      },
    };
  });

  return data;
}

function localDb() {
  if (!cachedDb) {
    mkdirSync(path.dirname(databasePath()), { recursive: true });
    cachedDb = new DatabaseSync(databasePath());
    cachedDb.exec("PRAGMA foreign_keys = ON;");
    cachedDb.exec("PRAGMA journal_mode = WAL;");
    ensureLocalSchema(cachedDb);
  }
  return cachedDb;
}

function ensureLocalSchema(db: DatabaseSync) {
  db.exec(`
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

  const timestamp = now();
  db.prepare(
    `INSERT INTO local_meta (key, value, updated_at)
     VALUES ('schema_version', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(String(localSchemaVersion), timestamp);
}

async function readLegacyJson(): Promise<Partial<MemoryData> | null> {
  if (!existsSync(storePath())) return null;
  try {
    return JSON.parse(await readFile(storePath(), "utf8")) as Partial<MemoryData>;
  } catch {
    return null;
  }
}

function jsonValue(value: unknown) {
  return JSON.stringify(value ?? null);
}

function valueType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function scalarProperties(prefix: string, value: Record<string, unknown> | undefined) {
  if (!value) return [] as Array<[string, unknown]>;
  return Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .map(([key, entry]) => [`${prefix}.${key}`, entry] as [string, unknown]);
}

function adaptiveProperties(artifact: Artifact, summary?: SummaryRecord) {
  return [
    ["type", artifact.type],
    ["kind", artifact.kind],
    ["privacy", artifact.privacy],
    ["status", artifact.status],
    ["syncStatus", artifact.syncStatus],
    ["retentionDecision", artifact.retentionDecision],
    ["spaceId", artifact.spaceId],
    ["mimeType", artifact.mimeType],
    ["summary.title", summary?.title],
    ["summary.tags", summary?.tags],
    ...scalarProperties("structured", artifact.structured),
    ...scalarProperties("metadata", artifact.metadata),
  ].filter(([, value]) => value !== undefined) as Array<[string, unknown]>;
}

function persistDataToLocalDb(data: MemoryData) {
  const db = localDb();
  const timestamp = now();
  const normalized = normalizeData(data);
  const snapshot = jsonValue(normalized);
  db.exec("BEGIN IMMEDIATE;");
  try {
    db.prepare(
      `INSERT INTO store_snapshots (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    ).run(storeSnapshotKey, snapshot, timestamp);

    db.prepare("DELETE FROM memory_properties").run();
    db.prepare("DELETE FROM memory_records").run();

    const insertRecord = db.prepare(`
      INSERT INTO memory_records (
        id,
        record_type,
        kind,
        title,
        source_label,
        space_id,
        captured_at,
        sync_status,
        privacy,
        status,
        retention_decision,
        original_path,
        mime_type,
        sha256,
        size_bytes,
        pinned,
        archived,
        structured_json,
        metadata_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertProperty = db.prepare(`
      INSERT INTO memory_properties (record_id, key, value_json, value_type, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const summaryByArtifact = new Map(normalized.summaries.map((summary) => [summary.artifactId, summary]));

    for (const artifact of normalized.artifacts) {
      insertRecord.run(
        artifact.id,
        artifact.type,
        artifact.kind,
        artifact.title,
        artifact.sourceLabel,
        artifact.spaceId ?? null,
        artifact.capturedAt,
        artifact.syncStatus,
        artifact.privacy,
        artifact.status,
        artifact.retentionDecision,
        artifact.originalPath ?? null,
        artifact.mimeType ?? null,
        artifact.hash ?? null,
        artifact.sizeBytes ?? null,
        artifact.pinned ? 1 : 0,
        artifact.archived ? 1 : 0,
        jsonValue(artifact.structured ?? {}),
        jsonValue(artifact.metadata ?? {}),
        timestamp,
      );

      for (const [key, value] of adaptiveProperties(artifact, summaryByArtifact.get(artifact.id))) {
        insertProperty.run(artifact.id, key, jsonValue(value), valueType(value), timestamp);
      }
    }

    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

async function mirrorLegacySnapshot(data: MemoryData) {
  await mkdir(getDataRoot(), { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function ensureDataStore() {
  await mkdir(getDataRoot(), { recursive: true });
  const row = localDb().prepare("SELECT value_json FROM store_snapshots WHERE key = ?").get(storeSnapshotKey) as
    | { value_json: string }
    | undefined;
  if (row) return;

  const migrated = normalizeData((await readLegacyJson()) ?? emptyData());
  persistDataToLocalDb(migrated);
  await mirrorLegacySnapshot(migrated);
}

export async function readData(): Promise<MemoryData> {
  await ensureDataStore();
  const row = localDb().prepare("SELECT value_json FROM store_snapshots WHERE key = ?").get(storeSnapshotKey) as
    | { value_json: string }
    | undefined;
  return normalizeData(row ? (JSON.parse(row.value_json) as Partial<MemoryData>) : emptyData());
}

export async function writeData(data: MemoryData) {
  const normalized = normalizeData(data);
  persistDataToLocalDb(normalized);
  await mirrorLegacySnapshot(normalized);
}

export function providerForClient(provider: StoredProvider): ModelProviderRecord {
  const { apiKey: _apiKey, ...safeProvider } = provider;
  void _apiKey;
  return safeProvider;
}
