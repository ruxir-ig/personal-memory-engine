import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { preferenceInputSchema } from "@pme/shared";
import type {
  Artifact,
  ArtifactType,
  CaptureInput,
  ChatAnswer,
  Chunk,
  DashboardSnapshot,
  EdgeRecord,
  EntityRecord,
  IntentRecord,
  ModelProviderRecord,
  PreferenceInput,
  PreferenceRecord,
  ProviderInput,
  Reminder,
  ReminderInput,
  SearchInput,
  SearchResult,
  SummaryRecord,
  TimelineEvent,
} from "@pme/shared";
import {
  getEnvProvider,
  processMemoryWithProvider,
  type AiMemoryPacket,
  type OpenAICompatibleProvider,
} from "@/server/ai/openai-compatible";

type StoredProvider = ModelProviderRecord & {
  apiKey: string;
};

type MemoryData = {
  artifacts: Artifact[];
  chunks: Chunk[];
  intents: IntentRecord[];
  summaries: SummaryRecord[];
  entities: EntityRecord[];
  edges: EdgeRecord[];
  events: TimelineEvent[];
  reminders: Reminder[];
  preferences: PreferenceRecord[];
  providers: StoredProvider[];
  ingestionRuns: Array<{
    id: string;
    kind: string;
    status: "queued" | "running" | "succeeded" | "failed";
    artifactId?: string;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
  }>;
  feedback: Array<{
    id: string;
    targetType: string;
    targetId: string;
    action: string;
    note?: string;
    createdAt: string;
  }>;
};

type CaptureResult = {
  artifact: Artifact;
  chunks: Chunk[];
  intents: IntentRecord[];
  summary: SummaryRecord;
  events: TimelineEvent[];
};

function now() {
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

const storePath = () => path.join(getDataRoot(), "dev-store.json");

async function ensureDataFile() {
  await mkdir(getDataRoot(), { recursive: true });
  try {
    await readFile(storePath(), "utf8");
  } catch {
    await writeData(emptyData());
  }
}

async function readData(): Promise<MemoryData> {
  await ensureDataFile();
  return JSON.parse(await readFile(storePath(), "utf8")) as MemoryData;
}

async function writeData(data: MemoryData) {
  await mkdir(getDataRoot(), { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function emptyData(): MemoryData {
  return {
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
}

function titleFromText(text: string) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "Untitled memory";
  return firstLine.replace(/^#+\s*/, "").slice(0, 90);
}

function summarizeText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) return normalized;
  const sentence = normalized.match(/^.{80,260}?[.!?](\s|$)/)?.[0]?.trim();
  return sentence?.slice(0, 260) ?? `${normalized.slice(0, 220)}...`;
}

function getDefaultAiProvider(data: MemoryData): OpenAICompatibleProvider | null {
  const stored =
    data.providers.find((provider) => provider.isDefault && provider.capabilities.includes("chat")) ??
    data.providers.find((provider) => provider.capabilities.includes("chat"));
  if (stored) {
    return {
      label: stored.label,
      kind: stored.kind,
      baseUrl: stored.baseUrl,
      apiKey: stored.apiKey,
      chatModel: stored.chatModel,
      capabilities: stored.capabilities,
    };
  }
  return getEnvProvider();
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function chunkText(artifactId: string, text: string, capturedAt: string): Chunk[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const size = 1400;
  const chunks: Chunk[] = [];
  for (let i = 0; i < cleaned.length; i += size) {
    const chunkTextValue = cleaned.slice(i, i + size).trim();
    chunks.push({
      id: randomUUID(),
      artifactId,
      ordinal: chunks.length,
      text: chunkTextValue,
      tokenEstimate: estimateTokens(chunkTextValue),
      capturedAt,
    });
  }
  return chunks;
}

function extractTags(text: string) {
  const hashTags = Array.from(text.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map((match) => match[1]!.toLowerCase());
  const knownTerms = ["postgres", "pgvector", "trpc", "drizzle", "next.js", "reminder", "timeline", "search", "memory", "privacy"];
  const lower = text.toLowerCase();
  const matched = knownTerms.filter((term) => lower.includes(term));
  return Array.from(new Set([...hashTags, ...matched])).slice(0, 8);
}

function detectArtifactType(filename: string, mimeType: string): ArtifactType {
  const name = filename.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (mimeType.startsWith("text/") || name.endsWith(".txt")) return "text";
  if (/\.(doc|docx|odt|rtf)$/i.test(name)) return "document";
  return "unknown";
}

function extractDueDate(text: string, baseIso?: string): string | undefined {
  const lower = text.toLowerCase();
  if (!/(remind|remember|deadline|due|follow up|follow-up)/i.test(text)) return undefined;
  const base = baseIso ? new Date(baseIso) : new Date();
  const result = new Date(base);
  if (lower.includes("tomorrow")) {
    result.setDate(result.getDate() + 1);
  }

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = weekdays.findIndex((day) => lower.includes(day));
  if (weekday >= 0) {
    const diff = (weekday + 7 - result.getDay()) % 7 || 7;
    result.setDate(result.getDate() + diff);
  }

  const isoDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    result.setFullYear(year!, month! - 1, day);
  }

  const timeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2] ?? 0);
    const meridiem = timeMatch[3];
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    result.setHours(hour, minute, 0, 0);
  } else {
    result.setHours(9, 0, 0, 0);
  }

  if (result.getTime() <= base.getTime() && !lower.includes("today")) {
    result.setDate(result.getDate() + 1);
  }
  return result.toISOString();
}

function classifyInput(text: string, artifactId?: string, clientNow?: string, timezone?: string): IntentRecord[] {
  const lower = text.toLowerCase();
  const createdAt = now();
  const intents: IntentRecord[] = [
    {
      id: randomUUID(),
      artifactId,
      intentType: "capture_memory",
      confidence: 0.84,
      requiredConfirmation: false,
      extractedFields: { title: titleFromText(text) },
      proposedActions: ["Store durable searchable memory with provenance."],
      status: "completed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    },
  ];

  if (/(summarize|summary|tl;dr|digest)/i.test(text)) {
    intents.push({
      id: randomUUID(),
      artifactId,
      intentType: "summarize",
      confidence: 0.86,
      requiredConfirmation: false,
      extractedFields: { requestedFormat: "short" },
      proposedActions: ["Create a source-linked summary."],
      status: "completed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    });
  }

  const dueAt = extractDueDate(text, clientNow);
  if (dueAt) {
    intents.push({
      id: randomUUID(),
      artifactId,
      intentType: "create_reminder",
      confidence: 0.9,
      requiredConfirmation: true,
      extractedFields: { dueAt, timezone },
      proposedActions: ["Create a browser-notification reminder after confirmation."],
      status: "proposed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    });
  }

  if (/(prefer|make the ui|compact|default view|theme|layout)/i.test(text)) {
    intents.push({
      id: randomUUID(),
      artifactId,
      intentType: "update_preference",
      confidence: 0.78,
      requiredConfirmation: true,
      extractedFields: { category: "ui", suggestion: text.slice(0, 240) },
      proposedActions: ["Save a UI preference after confirmation."],
      status: "proposed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    });
  }

  if (/(happened|visited|met|decided|launched|submitted|last week|yesterday|today)/i.test(lower)) {
    intents.push({
      id: randomUUID(),
      artifactId,
      intentType: "create_event",
      confidence: 0.7,
      requiredConfirmation: false,
      extractedFields: { eventText: text.slice(0, 280) },
      proposedActions: ["Add timeline context linked to this memory."],
      status: "completed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    });
  }

  return intents;
}

function createEntitiesForText(text: string): EntityRecord[] {
  const tags = extractTags(text);
  return tags.map((label) => ({
    id: randomUUID(),
    type: label.includes(".") || label.includes("/") ? "url" : "topic",
    label,
    confidence: 0.78,
    createdAt: now(),
  }));
}

function createEntitiesFromPacket(packet: AiMemoryPacket): EntityRecord[] {
  return packet.tags.map((label) => ({
    id: randomUUID(),
    type: "topic",
    label: label.toLowerCase(),
    confidence: 0.82,
    createdAt: now(),
  }));
}

function createAiIntents(args: {
  packet: AiMemoryPacket;
  artifactId: string;
  capturedAt: string;
  providerLabel: string;
  model?: string;
}): IntentRecord[] {
  const modelOrRuleVersion = `llm:${args.providerLabel}${args.model ? `/${args.model}` : ""}`;
  const intents: IntentRecord[] = [
    {
      id: randomUUID(),
      artifactId: args.artifactId,
      intentType: "capture_memory",
      confidence: 0.9,
      requiredConfirmation: false,
      extractedFields: { title: args.packet.title },
      proposedActions: ["Store searchable memory with source provenance."],
      status: "completed",
      modelOrRuleVersion,
      createdAt: args.capturedAt,
    },
  ];

  if (args.packet.reminderProposal) {
    intents.push({
      id: randomUUID(),
      artifactId: args.artifactId,
      intentType: "create_reminder",
      confidence: args.packet.reminderProposal.confidence,
      requiredConfirmation: false,
      extractedFields: {
        title: args.packet.reminderProposal.title,
        dueAt: args.packet.reminderProposal.dueAt,
        timezone: args.packet.reminderProposal.timezone,
        recurrence: args.packet.reminderProposal.recurrence,
      },
      proposedActions: ["Created reminder with the available reminder tool."],
      status: "completed",
      modelOrRuleVersion,
      createdAt: args.capturedAt,
    });
  }

  if (args.packet.eventProposal) {
    intents.push({
      id: randomUUID(),
      artifactId: args.artifactId,
      intentType: "create_event",
      confidence: args.packet.eventProposal.confidence,
      requiredConfirmation: false,
      extractedFields: {
        title: args.packet.eventProposal.title,
        description: args.packet.eventProposal.description,
        eventAt: args.packet.eventProposal.eventAt,
        place: args.packet.eventProposal.place,
      },
      proposedActions: ["Add timeline context linked to this memory."],
      status: "completed",
      modelOrRuleVersion,
      createdAt: args.capturedAt,
    });
  }

  if (args.packet.preferenceProposal) {
    intents.push({
      id: randomUUID(),
      artifactId: args.artifactId,
      intentType: "update_preference",
      confidence: args.packet.preferenceProposal.confidence,
      requiredConfirmation: false,
      extractedFields: {
        category: args.packet.preferenceProposal.category,
        key: args.packet.preferenceProposal.key,
        value: args.packet.preferenceProposal.value,
        rationale: args.packet.preferenceProposal.rationale,
      },
      proposedActions: ["Saved preference with the available memory tool."],
      status: "completed",
      modelOrRuleVersion,
      createdAt: args.capturedAt,
    });
  }

  return intents;
}

function createEventsFromIntents(args: {
  intents: IntentRecord[];
  artifact: Artifact;
  summary: SummaryRecord;
  capturedAt: string;
}) {
  return args.intents
    .filter((intent) => intent.intentType === "create_event")
    .map<TimelineEvent>((intent) => ({
      id: randomUUID(),
      artifactId: args.artifact.id,
      title: String(intent.extractedFields.title ?? args.artifact.title),
      description: String(intent.extractedFields.description ?? args.summary.summary),
      capturedAt: args.capturedAt,
      eventAt: typeof intent.extractedFields.eventAt === "string" ? intent.extractedFields.eventAt : args.capturedAt,
      confidence: intent.confidence,
      place: typeof intent.extractedFields.place === "string" ? intent.extractedFields.place : undefined,
    }));
}

function applyCompletedAiActions(args: {
  data: MemoryData;
  intents: IntentRecord[];
  artifact: Artifact;
  sourceText: string;
  capturedAt: string;
  fallbackTimezone?: string;
}) {
  for (const intent of args.intents) {
    if (intent.intentType === "create_reminder") {
      args.data.reminders.push({
        id: randomUUID(),
        title: String(intent.extractedFields.title ?? args.artifact.title),
        naturalLanguageSource: args.sourceText,
        dueAt: String(intent.extractedFields.dueAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()),
        timezone: String(intent.extractedFields.timezone ?? args.fallbackTimezone ?? "UTC"),
        status: "scheduled",
        artifactId: args.artifact.id,
        createdAt: args.capturedAt,
        confirmedAt: args.capturedAt,
        recurrence: typeof intent.extractedFields.recurrence === "string" ? intent.extractedFields.recurrence : undefined,
      });
    }

    if (intent.intentType === "update_preference") {
      const category = preferenceInputSchema.shape.category.safeParse(intent.extractedFields.category);
      args.data.preferences.push({
        id: randomUUID(),
        category: category.success ? category.data : "ui",
        key: String(intent.extractedFields.key ?? "assistantProposal"),
        value: intent.extractedFields.value ?? intent.extractedFields,
        confirmed: true,
        createdAt: args.capturedAt,
        updatedAt: args.capturedAt,
      });
    }
  }
}

function providerForClient(provider: StoredProvider): ModelProviderRecord {
  const { apiKey: _apiKey, ...safeProvider } = provider;
  return safeProvider;
}

function scoreChunk(input: SearchInput, chunk: Chunk, artifact: Artifact, summary?: SummaryRecord): SearchResult | null {
  const query = input.query.trim().toLowerCase();
  const text = `${artifact.title} ${artifact.sourceLabel} ${chunk.text} ${summary?.tags.join(" ") ?? ""}`.toLowerCase();
  const terms = query.split(/\s+/).filter((term) => term.length > 1);
  const matchedTerms = terms.filter((term) => text.includes(term));
  if (terms.length > 0 && matchedTerms.length === 0) return null;

  const keyword = terms.length ? matchedTerms.length / terms.length : 0.25;
  const semantic = terms.length ? Math.min(1, matchedTerms.length / Math.max(2, terms.length) + 0.2) : 0.35;
  const graph = summary?.tags.some((tag) => terms.includes(tag.toLowerCase())) ? 0.8 : 0.25;
  const ageMs = Date.now() - new Date(chunk.capturedAt).getTime();
  const time = Math.max(0.15, 1 - ageMs / (1000 * 60 * 60 * 24 * 90));
  const feedback = 0.5;
  const score = 0.4 * semantic + 0.3 * keyword + 0.15 * graph + 0.1 * time + 0.05 * feedback;

  return {
    chunk,
    artifact,
    summary,
    score,
    scoreBreakdown: { semantic, keyword, graph, time, feedback },
    matchedTerms,
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const data = await readData();
  return {
    artifacts: data.artifacts.slice().sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 8),
    summaries: data.summaries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    intents: data.intents.filter((intent) => intent.status === "proposed").slice(0, 8),
    reminders: data.reminders.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 8),
    events: data.events.slice().sort((a, b) => (b.eventAt ?? b.capturedAt).localeCompare(a.eventAt ?? a.capturedAt)).slice(0, 8),
    providers: data.providers.map(providerForClient),
    preferences: data.preferences,
    counts: {
      artifacts: data.artifacts.length,
      chunks: data.chunks.length,
      inbox: data.intents.filter((intent) => intent.status === "proposed").length,
      reminders: data.reminders.filter((reminder) => reminder.status === "scheduled").length,
      providers: data.providers.length,
    },
  };
}

export async function captureText(input: CaptureInput): Promise<CaptureResult> {
  const data = await readData();
  const capturedAt = now();
  const provider = getDefaultAiProvider(data);
  const artifact: Artifact = {
    id: randomUUID(),
    type: "note",
    title: titleFromText(input.text),
    sourceLabel: input.sourceLabel || "capture box",
    capturedAt,
    retentionDecision: "summary_only",
    privacy: provider ? "provider_allowed" : "local",
    status: provider ? "processing" : "ready",
    metadata: {
      inputLength: input.text.length,
      ingestStatus: "captured",
      canvasStatus: "synced_to_canvas",
      aiStatus: provider ? "processing" : "provider_required",
    },
  };
  const chunks = chunkText(artifact.id, input.text, capturedAt);
  let summary: SummaryRecord;
  let intents: IntentRecord[];
  let entities: EntityRecord[];
  let aiError: string | undefined;

  if (!provider) {
    summary = {
      id: randomUUID(),
      artifactId: artifact.id,
      title: artifact.title,
      summary: "Raw draft saved. AI provider required for summaries, reminders, events, and preference proposals.",
      tags: ["raw-draft", "ai-provider-required"],
      createdAt: capturedAt,
    };
    intents = [];
    entities = [];
  } else {
    try {
      const packet = await processMemoryWithProvider({
        provider,
        text: input.text,
        sourceLabel: input.sourceLabel,
        clientNow: input.clientNow,
        timezone: input.timezone,
      });
      artifact.title = packet.title || artifact.title;
      artifact.status = "ready";
      artifact.metadata = {
        ...artifact.metadata,
        ingestStatus: "synced_to_canvas",
        aiStatus: "processed",
        provider: provider.label,
        model: provider.chatModel,
      };
      summary = {
        id: randomUUID(),
        artifactId: artifact.id,
        title: artifact.title,
        summary: input.shouldSummarize ? packet.memorySummary : "Summary skipped for this capture.",
        tags: packet.tags,
        createdAt: capturedAt,
      };
      intents = createAiIntents({
        packet,
        artifactId: artifact.id,
        capturedAt,
        providerLabel: provider.label,
        model: provider.chatModel,
      });
      entities = createEntitiesFromPacket(packet);
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI processing failed";
      artifact.status = "ready";
      artifact.metadata = {
        ...artifact.metadata,
        ingestStatus: "synced_to_canvas",
        aiStatus: "failed",
        aiError,
        provider: provider.label,
        model: provider.chatModel,
      };
      summary = {
        id: randomUUID(),
        artifactId: artifact.id,
        title: artifact.title,
        summary: "Raw draft saved. AI processing failed, so no generated summary or reminder was created.",
        tags: ["raw-draft", "ai-processing-failed"],
        createdAt: capturedAt,
      };
      intents = [];
      entities = [];
    }
  }

  const edges = entities.flatMap((entity) =>
    chunks.map<EdgeRecord>((chunk) => ({
      id: randomUUID(),
      fromType: "chunk",
      fromId: chunk.id,
      toType: "entity",
      toId: entity.id,
      edgeType: "MENTIONS",
      confidence: entity.confidence,
      provenanceArtifactId: artifact.id,
      createdAt: capturedAt,
    })),
  );
  const events = createEventsFromIntents({ intents, artifact, summary, capturedAt });

  data.artifacts.push(artifact);
  applyCompletedAiActions({
    data,
    intents,
    artifact,
    sourceText: input.text,
    capturedAt,
    fallbackTimezone: input.timezone,
  });
  data.chunks.push(...chunks);
  data.summaries.push(summary);
  data.intents.push(...intents);
  data.entities.push(...entities);
  data.edges.push(...edges);
  data.events.push(...events);
  data.ingestionRuns.push({
    id: randomUUID(),
    kind: "capture_input",
    status: aiError ? "failed" : "succeeded",
    artifactId: artifact.id,
    startedAt: capturedAt,
    finishedAt: now(),
    error: aiError,
  });
  await writeData(data);
  return { artifact, chunks, intents, summary, events };
}

export async function importFileArtifact(args: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}): Promise<CaptureResult> {
  const data = await readData();
  const hash = createHash("sha256").update(args.buffer).digest("hex");
  const capturedAt = now();
  const extension = path.extname(args.filename) || ".bin";
  const artifactDir = path.join(getArtifactVaultRoot(), hash.slice(0, 2), hash);
  const originalPath = path.join(artifactDir, `original${extension}`);
  await mkdir(artifactDir, { recursive: true });
  await writeFile(originalPath, args.buffer);
  await writeFile(
    path.join(artifactDir, "metadata.json"),
    JSON.stringify(
      {
        filename: args.filename,
        mimeType: args.mimeType,
        sizeBytes: args.sizeBytes,
        sha256: hash,
        capturedAt,
      },
      null,
      2,
    ),
  );

  const type = detectArtifactType(args.filename, args.mimeType);
  const text = type === "text" || type === "markdown" ? args.buffer.toString("utf8") : "";
  const provider = text ? getDefaultAiProvider(data) : null;
  const title = args.filename.replace(/\.[^.]+$/, "");
  const artifact: Artifact = {
    id: randomUUID(),
    type,
    title,
    sourceLabel: args.filename,
    originalPath,
    mimeType: args.mimeType,
    hash,
    sizeBytes: args.sizeBytes,
    capturedAt,
    retentionDecision: type === "text" || type === "markdown" ? "summary_only" : "review",
    privacy: provider ? "provider_allowed" : "local",
    status: text && provider ? "processing" : "ready",
    metadata: {
      filename: args.filename,
      ingestStatus: "captured",
      canvasStatus: "synced_to_canvas",
      aiStatus: text ? (provider ? "processing" : "provider_required") : "not_applicable",
    },
  };

  const chunkSource =
    text ||
    `Imported ${type} file "${args.filename}". Extraction is queued for a configured provider with the right capability.`;
  const chunks = chunkText(artifact.id, chunkSource, capturedAt);
  let summary: SummaryRecord;
  let intents: IntentRecord[];
  let events: TimelineEvent[] = [];
  let aiError: string | undefined;

  if (text && provider) {
    try {
      const packet = await processMemoryWithProvider({
        provider,
        text,
        sourceLabel: args.filename,
      });
      artifact.title = packet.title || title;
      artifact.status = "ready";
      artifact.metadata = {
        ...artifact.metadata,
        ingestStatus: "synced_to_canvas",
        aiStatus: "processed",
        provider: provider.label,
        model: provider.chatModel,
      };
      summary = {
        id: randomUUID(),
        artifactId: artifact.id,
        title: artifact.title,
        summary: packet.memorySummary,
        tags: packet.tags,
        createdAt: capturedAt,
      };
      intents = createAiIntents({
        packet,
        artifactId: artifact.id,
        capturedAt,
        providerLabel: provider.label,
        model: provider.chatModel,
      });
      events = createEventsFromIntents({ intents, artifact, summary, capturedAt });
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI processing failed";
      artifact.status = "ready";
      artifact.metadata = { ...artifact.metadata, aiStatus: "failed", aiError };
      summary = {
        id: randomUUID(),
        artifactId: artifact.id,
        title,
        summary: "Text file saved. AI processing failed, so no generated summary or reminder was created.",
        tags: ["raw-draft", "ai-processing-failed"],
        createdAt: capturedAt,
      };
      intents = [];
    }
  } else {
    summary = {
      id: randomUUID(),
      artifactId: artifact.id,
      title,
      summary: text
        ? "Text file saved as a raw draft. AI provider required for summaries, reminders, events, and preference proposals."
        : `Raw ${type} file stored in the local vault. Configure a capable provider when you want extraction or enrichment.`,
      tags: text ? ["raw-draft", "ai-provider-required"] : [type, "needs-review"],
      createdAt: capturedAt,
    };
    intents = [];
  }

  data.artifacts.push(artifact);
  applyCompletedAiActions({
    data,
    intents,
    artifact,
    sourceText: chunkSource,
    capturedAt,
  });
  data.chunks.push(...chunks);
  data.summaries.push(summary);
  data.intents.push(...intents);
  data.events.push(...events);
  data.ingestionRuns.push({
    id: randomUUID(),
    kind: "file_importer",
    status: aiError ? "failed" : text && provider ? "succeeded" : "queued",
    artifactId: artifact.id,
    startedAt: capturedAt,
    finishedAt: text && provider ? now() : undefined,
    error: aiError,
  });
  await writeData(data);
  return { artifact, chunks, intents, summary, events };
}

export async function listInbox() {
  const data = await readData();
  return data.intents.filter((intent) => intent.status === "proposed");
}

export async function confirmIntent(intentId: string, accepted: boolean) {
  const data = await readData();
  const intent = data.intents.find((item) => item.id === intentId);
  if (!intent) throw new Error("Intent not found");
  intent.status = accepted ? "accepted" : "rejected";

  if (accepted && intent.intentType === "create_reminder") {
    const artifact = data.artifacts.find((item) => item.id === intent.artifactId);
    const sourceText = data.chunks.find((chunk) => chunk.artifactId === intent.artifactId)?.text ?? artifact?.title ?? "";
    data.reminders.push({
      id: randomUUID(),
      title: String(intent.extractedFields.title ?? artifact?.title ?? "Memory reminder"),
      naturalLanguageSource: sourceText,
      dueAt: String(intent.extractedFields.dueAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()),
      timezone: String(intent.extractedFields.timezone ?? "UTC"),
      status: "scheduled",
      artifactId: intent.artifactId,
      createdAt: now(),
      confirmedAt: now(),
    });
    intent.status = "completed";
  }

  if (accepted && intent.intentType === "update_preference") {
    const category = preferenceInputSchema.shape.category.safeParse(intent.extractedFields.category);
    data.preferences.push({
      id: randomUUID(),
      category: category.success ? category.data : "ui",
      key: String(intent.extractedFields.key ?? "assistantProposal"),
      value: intent.extractedFields.value ?? intent.extractedFields.suggestion ?? intent.extractedFields,
      confirmed: true,
      createdAt: now(),
      updatedAt: now(),
    });
    intent.status = "completed";
  }

  await writeData(data);
  return intent;
}

export async function querySearch(input: SearchInput): Promise<SearchResult[]> {
  const data = await readData();
  const allowedTypes = new Set(input.artifactTypes);
  const results = data.chunks
    .map((chunk) => {
      const artifact = data.artifacts.find((item) => item.id === chunk.artifactId);
      if (!artifact) return null;
      if (allowedTypes.size > 0 && !allowedTypes.has(artifact.type)) return null;
      const summary = data.summaries.find((item) => item.artifactId === artifact.id);
      return scoreChunk(input, chunk, artifact, summary);
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit);
  return results;
}

export async function getArtifactById(id: string) {
  const data = await readData();
  const artifact = data.artifacts.find((item) => item.id === id);
  if (!artifact) return null;
  return {
    artifact,
    chunks: data.chunks.filter((chunk) => chunk.artifactId === id),
    summary: data.summaries.find((summary) => summary.artifactId === id),
    intents: data.intents.filter((intent) => intent.artifactId === id),
    reminders: data.reminders.filter((reminder) => reminder.artifactId === id),
  };
}

export async function listTimeline() {
  const data = await readData();
  return data.events
    .slice()
    .sort((a, b) => (b.eventAt ?? b.capturedAt).localeCompare(a.eventAt ?? a.capturedAt));
}

export async function listReminders() {
  const data = await readData();
  return data.reminders.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function createReminder(input: ReminderInput) {
  const data = await readData();
  const reminder: Reminder = {
    id: randomUUID(),
    title: input.title,
    naturalLanguageSource: input.sourceText ?? input.title,
    dueAt: input.dueAt,
    timezone: input.timezone ?? "UTC",
    status: "scheduled",
    artifactId: input.artifactId,
    createdAt: now(),
    confirmedAt: now(),
  };
  data.reminders.push(reminder);
  await writeData(data);
  return reminder;
}

export async function listProviders(): Promise<ModelProviderRecord[]> {
  const data = await readData();
  return data.providers.map(providerForClient);
}

export async function upsertProvider(input: ProviderInput): Promise<ModelProviderRecord> {
  const data = await readData();
  const existing = input.id ? data.providers.find((provider) => provider.id === input.id) : undefined;
  if (input.isDefault) {
    data.providers.forEach((provider) => {
      provider.isDefault = false;
    });
  }
  const apiKeyPreview = input.apiKey.length > 8 ? `${input.apiKey.slice(0, 4)}...${input.apiKey.slice(-4)}` : "stored";
  if (existing) {
    existing.label = input.label;
    existing.kind = input.kind;
    existing.baseUrl = input.baseUrl || undefined;
    existing.apiKey = input.apiKey;
    existing.apiKeyPreview = apiKeyPreview;
    existing.apiKeyStored = true;
    existing.chatModel = input.chatModel;
    existing.embeddingModel = input.embeddingModel;
    existing.capabilities = input.capabilities;
    existing.isDefault = input.isDefault;
    existing.updatedAt = now();
    await writeData(data);
    return providerForClient(existing);
  }
  const provider: StoredProvider = {
    id: randomUUID(),
    label: input.label,
    kind: input.kind,
    baseUrl: input.baseUrl || undefined,
    apiKey: input.apiKey,
    apiKeyPreview,
    apiKeyStored: true,
    chatModel: input.chatModel,
    embeddingModel: input.embeddingModel,
    capabilities: input.capabilities,
    isDefault: input.isDefault || data.providers.length === 0,
    createdAt: now(),
    updatedAt: now(),
  };
  data.providers.push(provider);
  await writeData(data);
  return providerForClient(provider);
}

export async function deleteProvider(providerId: string): Promise<{ id: string }> {
  const data = await readData();
  const removedProvider = data.providers.find((provider) => provider.id === providerId);
  data.providers = data.providers.filter((provider) => provider.id !== providerId);
  if (removedProvider?.isDefault && data.providers.length > 0 && !data.providers.some((provider) => provider.isDefault)) {
    data.providers[0]!.isDefault = true;
    data.providers[0]!.updatedAt = now();
  }
  await writeData(data);
  return { id: providerId };
}

export async function listPreferences() {
  const data = await readData();
  return data.preferences;
}

export async function updatePreference(input: PreferenceInput) {
  const data = await readData();
  const existing = data.preferences.find((preference) => preference.category === input.category && preference.key === input.key);
  if (existing) {
    existing.value = input.value;
    existing.confirmed = !input.requiresConfirmation;
    existing.updatedAt = now();
    await writeData(data);
    return existing;
  }
  const preference: PreferenceRecord = {
    id: randomUUID(),
    category: input.category,
    key: input.key,
    value: input.value,
    confirmed: !input.requiresConfirmation,
    createdAt: now(),
    updatedAt: now(),
  };
  data.preferences.push(preference);
  await writeData(data);
  return preference;
}

export async function askMemory(input: { question: string }): Promise<ChatAnswer> {
  const results = await querySearch({ query: input.question, artifactTypes: [], limit: 5 });
  if (results.length === 0) {
    return {
      answer:
        "I could not find grounded evidence for that in your local memory store yet. Capture a note or import a source, then ask again.",
      citations: [],
      uncertainty: "No matching chunks were retrieved.",
    };
  }
  const top = results.slice(0, 3);
  const terms = input.question
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ""))
    .filter((term) => term.length > 2 && !["what", "who", "where", "when", "why", "how", "the", "is"].includes(term));
  const answerParts = top.map((result) => {
    const sentences = result.chunk.text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const groundedSentence = sentences.find((sentence) => terms.some((term) => sentence.toLowerCase().includes(term)));
    return groundedSentence ?? result.summary?.summary ?? result.chunk.text.slice(0, 260);
  });
  return {
    answer: answerParts.join(" "),
    citations: top.map((result) => ({
      artifactId: result.artifact.id,
      chunkId: result.chunk.id,
      title: result.artifact.title,
      quote: result.chunk.text.slice(0, 260),
    })),
    uncertainty:
      top[0]!.score < 0.45
        ? "Weak retrieval confidence. Treat this as a lead, not a final answer."
        : "Grounded in retrieved chunks from the local store.",
  };
}

export async function listRuns() {
  const data = await readData();
  return data.ingestionRuns.slice().reverse();
}

export async function exportAllData() {
  return readData();
}
