import initSqlJs, { type Database } from "sql.js";
import { openDB } from "idb";
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
const IDB_NAME = "quipu-sqlite";
const IDB_STORE = "database";
const IDB_KEY = "main";

let sqlPromise: ReturnType<typeof initSqlJs> | undefined;
let dbPromise: Promise<Database> | undefined;
let writeChain: Promise<void> = Promise.resolve();

export function now() {
  return new Date().toISOString();
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

async function sqlModule() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
  }
  return sqlPromise;
}

function ensureSchema(db: Database) {
  db.run(`
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
  `);
  db.run(
    `INSERT INTO local_meta (key, value, updated_at)
     VALUES ('schema_version', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [String(localSchemaVersion), now()],
  );
}

async function idb() {
  return openDB(IDB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(IDB_STORE);
    },
  });
}

async function persistDb(db: Database) {
  const exported = db.export();
  const storage = await idb();
  await storage.put(IDB_STORE, exported, IDB_KEY);
}

async function openDatabase() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await sqlModule();
      const storage = await idb();
      const saved = await storage.get(IDB_STORE, IDB_KEY);
      const db = saved ? new SQL.Database(new Uint8Array(saved as ArrayBuffer)) : new SQL.Database();
      ensureSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

function jsonValue(value: unknown) {
  return JSON.stringify(value ?? null);
}

function readSnapshot(db: Database) {
  const stmt = db.prepare("SELECT value_json FROM store_snapshots WHERE key = ?");
  stmt.bind([storeSnapshotKey]);
  if (!stmt.step()) {
    stmt.free();
    return emptyData();
  }
  const value = String(stmt.get()[0]);
  stmt.free();
  return normalizeData(JSON.parse(value) as Partial<MemoryData>);
}

export async function ensureMemoryStore() {
  await openDatabase();
}

export async function readData(): Promise<MemoryData> {
  const db = await openDatabase();
  return readSnapshot(db);
}

export async function writeData(data: MemoryData) {
  writeChain = writeChain.then(async () => {
    const db = await openDatabase();
    const normalized = normalizeData(data);
    const timestamp = now();
    db.run(
      `INSERT INTO store_snapshots (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      [storeSnapshotKey, jsonValue(normalized), timestamp],
    );
    await persistDb(db);
  });
  await writeChain;
}

export async function resetMemoryStore() {
  const db = await openDatabase();
  db.run("DELETE FROM store_snapshots");
  await persistDb(db);
  dbPromise = undefined;
  writeChain = Promise.resolve();
  await openDatabase();
}

export function providerForClient(provider: StoredProvider): ModelProviderRecord {
  const { apiKey: _apiKey, ...safeProvider } = provider;
  void _apiKey;
  return safeProvider;
}

export function getArtifactVaultRoot() {
  return "vault";
}

export function databasePath() {
  return "browser:quipu-sqlite";
}

export function storePath() {
  return "browser:memory-data";
}
