import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

async function ensureDataFile() {
  await mkdir(getDataRoot(), { recursive: true });
  try {
    await readFile(storePath(), "utf8");
  } catch {
    await writeData(emptyData());
  }
}

export async function readData(): Promise<MemoryData> {
  await ensureDataFile();
  return normalizeData(JSON.parse(await readFile(storePath(), "utf8")) as Partial<MemoryData>);
}

export async function writeData(data: MemoryData) {
  await mkdir(getDataRoot(), { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function providerForClient(provider: StoredProvider): ModelProviderRecord {
  const { apiKey: _apiKey, ...safeProvider } = provider;
  void _apiKey;
  return safeProvider;
}
