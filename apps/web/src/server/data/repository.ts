import { mkdir, rm, writeFile } from "node:fs/promises";
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
  MemoryKind,
  PreferenceInput,
  PreferenceRecord,
  Reminder,
  ReminderInput,
  SearchInput,
  SearchResult,
  SummaryRecord,
  SyncStatus,
  TimelineEvent,
} from "@pme/shared";
import { answerMemoryWithProvider, processMemoryWithProvider, type AiMemoryPacket, type OpenAICompatibleProvider } from "@/server/ai/provider";
import { askMemoryWithAgent } from "@/server/ai/agent";
import { accentForKind, classifyCapture, fileSpaceSuggestion, type SpaceSuggestion } from "./classify";
import { markCanvasStale } from "./canvas";
import { getDefaultAiProvider } from "./providers";
import {
  type MemoryData,
  databasePath,
  emptyData,
  getArtifactVaultRoot,
  now,
  providerForClient,
  readData,
  writeData,
} from "./store";

export { getArtifactVaultRoot } from "./store";
export { listProviders, upsertProvider, deleteProvider } from "./providers";
export { listSpaces, getSpaceBySlug } from "./spaces";
export { getCanvasLayout } from "./canvas";

type CaptureResult = {
  artifact: Artifact;
  chunks: Chunk[];
  intents: IntentRecord[];
  summary: SummaryRecord;
  events: TimelineEvent[];
};

import { upsertSpaceInData } from "./spaces";

/* ----------------------------- helpers ----------------------------- */

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "space"
  );
}

function typeForKind(kind: MemoryKind): ArtifactType {
  if (kind === "video") return "video";
  if (kind === "link" || kind === "reel" || kind === "article" || kind === "post") return "link";
  if (kind === "image") return "image";
  return "note";
}

function summarizeText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) return normalized;
  const sentence = normalized.match(/^.{80,260}?[.!?](\s|$)/)?.[0]?.trim();
  return sentence?.slice(0, 260) ?? `${normalized.slice(0, 220)}...`;
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
    const value = cleaned.slice(i, i + size).trim();
    chunks.push({ id: randomUUID(), artifactId, ordinal: chunks.length, text: value, tokenEstimate: estimateTokens(value), capturedAt });
  }
  return chunks;
}

function extractTags(text: string) {
  const hashTags = Array.from(text.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map((m) => m[1]!.toLowerCase());
  return Array.from(new Set(hashTags)).slice(0, 8);
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
  if (lower.includes("tomorrow")) result.setDate(result.getDate() + 1);

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

  if (result.getTime() <= base.getTime() && !lower.includes("today")) result.setDate(result.getDate() + 1);
  return result.toISOString();
}

function classifyInput(text: string, artifactId?: string, clientNow?: string, timezone?: string): IntentRecord[] {
  const createdAt = now();
  const intents: IntentRecord[] = [
    {
      id: randomUUID(),
      artifactId,
      intentType: "capture_memory",
      confidence: 0.84,
      requiredConfirmation: false,
      extractedFields: {},
      proposedActions: ["Store durable searchable memory with provenance."],
      status: "completed",
      modelOrRuleVersion: "rules-v0",
      createdAt,
    },
  ];

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

  return intents;
}

function createEntitiesFromTags(tags: string[]): EntityRecord[] {
  return tags.map((label) => ({ id: randomUUID(), type: "topic", label: label.toLowerCase(), confidence: 0.8, createdAt: now() }));
}

function createAiIntents(args: { packet: AiMemoryPacket; artifactId: string; capturedAt: string; providerLabel: string; model?: string }): IntentRecord[] {
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
      requiredConfirmation: true,
      extractedFields: {
        title: args.packet.reminderProposal.title,
        dueAt: args.packet.reminderProposal.dueAt,
        timezone: args.packet.reminderProposal.timezone,
        recurrence: args.packet.reminderProposal.recurrence,
      },
      proposedActions: ["Review and schedule this reminder."],
      status: "proposed",
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
      requiredConfirmation: true,
      extractedFields: {
        category: args.packet.preferenceProposal.category,
        key: args.packet.preferenceProposal.key,
        value: args.packet.preferenceProposal.value,
        rationale: args.packet.preferenceProposal.rationale,
      },
      proposedActions: ["Review and save this preference."],
      status: "proposed",
      modelOrRuleVersion,
      createdAt: args.capturedAt,
    });
  }

  return intents;
}

function createEventsFromIntents(args: { intents: IntentRecord[]; artifact: Artifact; summary: SummaryRecord; capturedAt: string }) {
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

function createRetentionReviewIntent(args: { artifactId: string; filename: string; artifactType: ArtifactType; capturedAt: string }): IntentRecord {
  return {
    id: randomUUID(),
    artifactId: args.artifactId,
    intentType: "retention_decision",
    confidence: 0.62,
    requiredConfirmation: true,
    extractedFields: { filename: args.filename, artifactType: args.artifactType, retentionDecision: "keep_original" },
    proposedActions: ["Review whether this original file should stay in the evidence vault."],
    status: "proposed",
    modelOrRuleVersion: "rules-v0",
    createdAt: args.capturedAt,
  };
}

function applyCompletedAiActions(args: { data: MemoryData; intents: IntentRecord[]; artifact: Artifact; sourceText: string; capturedAt: string; fallbackTimezone?: string }) {
  for (const intent of args.intents) {
    if (intent.status !== "completed") continue;
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

function deriveSyncStatus(artifact: Artifact, intents: IntentRecord[]): SyncStatus {
  if (intents.some((intent) => intent.status === "proposed")) return "pending_review";
  if (artifact.retentionDecision === "review") return "pending_review";
  if (artifact.metadata.aiStatus === "processed") return "synced_to_canvas";
  return "local_processed";
}

function applySyncStatus(artifact: Artifact, intents: IntentRecord[]) {
  const syncStatus = deriveSyncStatus(artifact, intents);
  artifact.syncStatus = syncStatus;
  if (syncStatus === "pending_review" && artifact.status !== "failed") artifact.status = "needs_review";
  if (syncStatus !== "pending_review" && artifact.status === "needs_review") artifact.status = "ready";
  artifact.metadata = { ...artifact.metadata, syncStatus, canvasStatus: syncStatus };
}

function resolveSpaceSuggestion(classificationSpace: SpaceSuggestion, packet?: AiMemoryPacket | null): SpaceSuggestion {
  if (packet?.space?.title) {
    return {
      slug: slugify(packet.space.title),
      title: packet.space.title.slice(0, 48),
      description: packet.space.description ?? classificationSpace.description,
      icon: packet.space.icon ?? classificationSpace.icon,
      accent: classificationSpace.accent,
    };
  }
  return classificationSpace;
}

function fallbackSummary(kind: MemoryKind, structured: Record<string, unknown>, text: string) {
  const platform = typeof structured.platform === "string" ? structured.platform : "a link";
  switch (kind) {
    case "credential":
      return "Stored on device. Reveal or copy it any time from Keys & secrets.";
    case "reel":
    case "video":
      return `Saved a ${platform} ${kind} to watch later.`;
    case "article":
    case "post":
    case "link":
      return `Saved a ${platform} ${kind} to revisit.`;
    case "code":
      return structured.language ? `Saved a ${structured.language} snippet.` : "Saved a code snippet.";
    default:
      return summarizeText(text);
  }
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

  return { chunk, artifact, summary, score, scoreBreakdown: { semantic, keyword, graph, time, feedback }, matchedTerms };
}

/* ----------------------------- dashboard ----------------------------- */

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const data = await readData();
  const proposedIntents = data.intents.filter((intent) => intent.status === "proposed");
  return {
    artifacts: data.artifacts.filter((a) => !a.archived).slice().sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    spaces: data.spaces,
    summaries: data.summaries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    intents: proposedIntents,
    reminders: data.reminders.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    todoLists: data.todoLists,
    todos: data.todos,
    agentTools: data.agentTools,
    events: data.events.slice().sort((a, b) => (b.eventAt ?? b.capturedAt).localeCompare(a.eventAt ?? a.capturedAt)),
    providers: data.providers.map(providerForClient),
    preferences: data.preferences,
    counts: {
      artifacts: data.artifacts.filter((a) => !a.archived).length,
      chunks: data.chunks.length,
      spaces: data.spaces.length,
      inbox: proposedIntents.length,
      reminders: data.reminders.filter((reminder) => reminder.status === "scheduled").length,
      todos: data.todos.filter((todo) => todo.status === "open").length,
      agentTools: data.agentTools.filter((tool) => tool.enabled).length,
      providers: data.providers.length,
      localProcessed: data.artifacts.filter((artifact) => artifact.syncStatus === "local_processed").length,
      pendingReview: data.artifacts.filter((artifact) => artifact.syncStatus === "pending_review").length + proposedIntents.length,
      syncedToCanvas: data.artifacts.filter((artifact) => artifact.syncStatus === "synced_to_canvas").length,
    },
  };
}

/* ----------------------------- capture ----------------------------- */

export async function captureText(input: CaptureInput): Promise<CaptureResult> {
  const data = await readData();
  const capturedAt = now();
  const classification = classifyCapture(input.text);
  const provider = classification.isSecret ? null : getDefaultAiProvider(data);
  const ruleIntents = classifyInput(input.text, undefined, input.clientNow, input.timezone);

  let packet: AiMemoryPacket | null = null;
  let aiError: string | undefined;
  if (provider) {
    try {
      packet = await processMemoryWithProvider({
        provider,
        text: input.text,
        sourceLabel: input.sourceLabel,
        clientNow: input.clientNow,
        timezone: input.timezone,
      });
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI processing failed";
    }
  }

  const kind: MemoryKind = packet?.kind ?? classification.kind;
  const title = (packet?.title || classification.title || "Untitled memory").slice(0, 120);
  const spaceSuggestion = resolveSpaceSuggestion(classification.space, packet);
  const space = upsertSpaceInData(data, spaceSuggestion);
  const tags = Array.from(new Set([...(packet?.tags ?? []), ...classification.tags, ...extractTags(input.text)])).slice(0, 8);
  const structured = {
    ...classification.structured,
    ...(packet?.structured ?? {}),
  };

  const artifact: Artifact = {
    id: randomUUID(),
    type: typeForKind(kind),
    kind,
    title,
    sourceLabel: input.sourceLabel || "quick capture",
    spaceId: space.id,
    structured,
    capturedAt,
    retentionDecision: "summary_only",
    privacy: classification.isSecret ? "private" : provider ? "provider_allowed" : "local",
    status: "ready",
    syncStatus: "local_processed",
    metadata: {
      inputLength: input.text.length,
      aiStatus: classification.isSecret ? "skipped_private" : packet ? "processed" : provider ? "failed" : "provider_required",
      aiError,
      provider: provider?.label,
      model: provider?.chatModel,
    },
  };

  // Credentials never store the raw value in searchable chunks.
  const chunkSource = classification.isSecret
    ? [classification.title, classification.structured.service, classification.structured.secretLabel, "credential stored on device"].filter(Boolean).join(" ")
    : input.text;
  const chunks = chunkText(artifact.id, chunkSource, capturedAt);

  const summary: SummaryRecord = {
    id: randomUUID(),
    artifactId: artifact.id,
    title,
    summary: packet?.memorySummary ?? fallbackSummary(kind, structured, input.text),
    tags,
    createdAt: capturedAt,
  };

  const intents = packet
    ? createAiIntents({ packet, artifactId: artifact.id, capturedAt, providerLabel: provider!.label, model: provider!.chatModel })
    : ruleIntents.map((intent) => ({ ...intent, artifactId: artifact.id }));
  const entities = createEntitiesFromTags(tags);

  applySyncStatus(artifact, intents);
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
  applyCompletedAiActions({ data, intents, artifact, sourceText: input.text, capturedAt, fallbackTimezone: input.timezone });
  data.chunks.push(...chunks);
  data.summaries.push(summary);
  data.intents.push(...intents);
  data.entities.push(...entities);
  data.edges.push(...edges);
  data.events.push(...events);
  data.ingestionRuns.push({ id: randomUUID(), kind: "capture_input", status: aiError ? "failed" : "succeeded", artifactId: artifact.id, startedAt: capturedAt, finishedAt: now(), error: aiError });
  markCanvasStale(data);
  await writeData(data);
  return { artifact, chunks, intents, summary, events };
}

export async function importFileArtifact(args: { filename: string; mimeType: string; sizeBytes: number; buffer: Buffer }): Promise<CaptureResult> {
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
    JSON.stringify({ filename: args.filename, mimeType: args.mimeType, sizeBytes: args.sizeBytes, sha256: hash, capturedAt }, null, 2),
  );

  const type = detectArtifactType(args.filename, args.mimeType);
  const text = type === "text" || type === "markdown" ? args.buffer.toString("utf8") : "";
  const provider = text ? getDefaultAiProvider(data) : null;
  const title = args.filename.replace(/\.[^.]+$/, "");
  const kind: MemoryKind = type === "image" ? "image" : type === "video" ? "video" : text ? "note" : "file";
  const space = upsertSpaceInData(data, text ? classifyCapture(text).space : fileSpaceSuggestion());

  const artifact: Artifact = {
    id: randomUUID(),
    type,
    kind,
    title,
    sourceLabel: args.filename,
    spaceId: space.id,
    structured: { mediaTitle: title },
    originalPath,
    mimeType: args.mimeType,
    hash,
    sizeBytes: args.sizeBytes,
    capturedAt,
    retentionDecision: type === "text" || type === "markdown" ? "summary_only" : "review",
    privacy: provider ? "provider_allowed" : "local",
    status: "ready",
    syncStatus: "local_processed",
    metadata: { filename: args.filename, aiStatus: text ? (provider ? "processing" : "provider_required") : "not_applicable" },
  };

  const chunkSource = text || `Imported ${type} file "${args.filename}".`;
  const chunks = chunkText(artifact.id, chunkSource, capturedAt);
  let summary: SummaryRecord;
  let intents: IntentRecord[];
  let aiError: string | undefined;

  if (text && provider) {
    try {
      const packet = await processMemoryWithProvider({ provider, text, sourceLabel: args.filename });
      artifact.title = packet.title || title;
      artifact.metadata = { ...artifact.metadata, aiStatus: "processed", provider: provider.label, model: provider.chatModel };
      summary = { id: randomUUID(), artifactId: artifact.id, title: artifact.title, summary: packet.memorySummary, tags: packet.tags, createdAt: capturedAt };
      intents = createAiIntents({ packet, artifactId: artifact.id, capturedAt, providerLabel: provider.label, model: provider.chatModel });
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI processing failed";
      artifact.metadata = { ...artifact.metadata, aiStatus: "failed", aiError };
      summary = { id: randomUUID(), artifactId: artifact.id, title, summary: "Text file saved. AI processing failed.", tags: ["raw-draft"], createdAt: capturedAt };
      intents = classifyInput(text, artifact.id);
    }
  } else {
    summary = {
      id: randomUUID(),
      artifactId: artifact.id,
      title,
      summary: text ? "Text file saved as a raw draft." : `Stored ${type} file in the local vault.`,
      tags: text ? ["raw-draft"] : [type],
      createdAt: capturedAt,
    };
    intents = text ? classifyInput(text, artifact.id) : [createRetentionReviewIntent({ artifactId: artifact.id, filename: args.filename, artifactType: type, capturedAt })];
  }

  applySyncStatus(artifact, intents);
  const events = createEventsFromIntents({ intents, artifact, summary, capturedAt });
  data.artifacts.push(artifact);
  applyCompletedAiActions({ data, intents, artifact, sourceText: chunkSource, capturedAt });
  data.chunks.push(...chunks);
  data.summaries.push(summary);
  data.intents.push(...intents);
  data.events.push(...events);
  data.ingestionRuns.push({ id: randomUUID(), kind: "file_importer", status: aiError ? "failed" : text && provider ? "succeeded" : "queued", artifactId: artifact.id, startedAt: capturedAt, finishedAt: text && provider ? now() : undefined, error: aiError });
  markCanvasStale(data);
  await writeData(data);
  return { artifact, chunks, intents, summary, events };
}

/* ----------------------------- intents / review ----------------------------- */

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

  if (intent.intentType === "retention_decision" || intent.intentType === "needs_review") {
    const artifact = data.artifacts.find((item) => item.id === intent.artifactId);
    if (artifact) {
      artifact.retentionDecision = accepted
        ? String(intent.extractedFields.retentionDecision ?? "keep_original") === "summary_only"
          ? "summary_only"
          : "keep_original"
        : "summary_only";
      intent.status = accepted ? "completed" : "rejected";
    }
  }

  if (intent.artifactId) {
    const artifact = data.artifacts.find((item) => item.id === intent.artifactId);
    if (artifact) applySyncStatus(artifact, data.intents.filter((item) => item.artifactId === intent.artifactId));
  }

  markCanvasStale(data);
  await writeData(data);
  return intent;
}

/* ----------------------------- item actions ----------------------------- */

export async function setItemFlags(input: { id: string; pinned?: boolean; archived?: boolean }) {
  const data = await readData();
  const artifact = data.artifacts.find((item) => item.id === input.id);
  if (!artifact) throw new Error("Item not found");
  if (typeof input.pinned === "boolean") artifact.pinned = input.pinned;
  if (typeof input.archived === "boolean") artifact.archived = input.archived;
  markCanvasStale(data);
  await writeData(data);
  return artifact;
}

/* ----------------------------- search / retrieval ----------------------------- */

export async function querySearch(input: SearchInput): Promise<SearchResult[]> {
  const data = await readData();
  const allowedTypes = new Set(input.artifactTypes);
  return data.chunks
    .map((chunk) => {
      const artifact = data.artifacts.find((item) => item.id === chunk.artifactId);
      if (!artifact || artifact.archived) return null;
      if (allowedTypes.size > 0 && !allowedTypes.has(artifact.type)) return null;
      const summary = data.summaries.find((item) => item.artifactId === artifact.id);
      return scoreChunk(input, chunk, artifact, summary);
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit);
}

export async function getArtifactById(id: string) {
  const data = await readData();
  const artifact = data.artifacts.find((item) => item.id === id);
  if (!artifact) return null;
  return {
    artifact,
    space: data.spaces.find((space) => space.id === artifact.spaceId) ?? null,
    chunks: data.chunks.filter((chunk) => chunk.artifactId === id),
    summary: data.summaries.find((summary) => summary.artifactId === id),
    intents: data.intents.filter((intent) => intent.artifactId === id),
    reminders: data.reminders.filter((reminder) => reminder.artifactId === id),
  };
}

export async function listTimeline() {
  const data = await readData();
  return data.events.slice().sort((a, b) => (b.eventAt ?? b.capturedAt).localeCompare(a.eventAt ?? a.capturedAt));
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
  markCanvasStale(data);
  await writeData(data);
  return reminder;
}

export async function resetDemoStore() {
  const existing = await readData();
  const cleaned = emptyData();
  cleaned.providers = existing.providers;
  await rm(getArtifactVaultRoot(), { recursive: true, force: true });
  await writeData(cleaned);
  return { ok: true, databasePath: databasePath(), resetAt: now(), providersPreserved: cleaned.providers.length };
}

/* ----------------------------- preferences ----------------------------- */

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
    markCanvasStale(data);
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
  markCanvasStale(data);
  await writeData(data);
  return preference;
}

/* ----------------------------- ask ----------------------------- */

function buildExtractiveAnswer(question: string, results: SearchResult[]): ChatAnswer {
  const top = results.slice(0, 3);
  const terms = question
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ""))
    .filter((term) => term.length > 2 && !["what", "who", "where", "when", "why", "how", "the", "is"].includes(term));
  const answerParts = top.map((result) => {
    const sentences = result.chunk.text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
    const groundedSentence = sentences.find((sentence) => terms.some((term) => sentence.toLowerCase().includes(term)));
    return groundedSentence ?? result.summary?.summary ?? result.chunk.text.slice(0, 260);
  });
  return {
    answer: answerParts.join(" "),
    citations: top.map((result) => ({ artifactId: result.artifact.id, chunkId: result.chunk.id, title: result.artifact.title, quote: result.chunk.text.slice(0, 260) })),
    uncertainty: top[0]!.score < 0.45 ? "Weak retrieval confidence. Treat this as a lead, not a final answer." : "Grounded in retrieved memories.",
  };
}

export async function askMemory(input: { question: string; clientNow?: string; timezone?: string }): Promise<ChatAnswer> {
  const results = await querySearch({ query: input.question, artifactTypes: [], limit: 6 });
  const provider = getDefaultAiProvider(await readData());

  if (results.length === 0 && !provider) {
    return {
      answer: "I could not find grounded evidence for that in your memory yet. Dump a note, link, or file, then ask again.",
      citations: [],
      uncertainty: "No matching memories were retrieved.",
    };
  }

  if (provider) {
    try {
      const candidates = results.map((result) => ({
        chunkId: result.chunk.id,
        artifactId: result.artifact.id,
        title: result.artifact.title,
        source: result.artifact.sourceLabel || undefined,
        text: result.chunk.text,
        artifactKind: result.artifact.kind,
        artifactType: result.artifact.type,
      }));

      const ai = await askMemoryWithAgent({
        provider,
        question: input.question,
        candidates,
        timezone: input.timezone ?? "UTC",
        clientNow: input.clientNow,
      });

      if (ai.answer) {
        const byChunk = new Map(candidates.map((candidate) => [candidate.chunkId, candidate]));
        const used = [...new Set(ai.citedChunkIds)]
          .map((id) => byChunk.get(id))
          .filter((candidate): candidate is (typeof candidates)[number] => Boolean(candidate));
        const grounded = (used.length > 0 ? used : candidates.slice(0, 3)).slice(0, 4);
        const toolSummaries = ai.toolResults
          .filter((result) => ai.toolsUsed.includes(result.toolId))
          .map((result) => ({ id: result.toolId, summary: result.summary }));

        return {
          answer: ai.answer,
          citations: grounded.map((candidate) => ({
            artifactId: candidate.artifactId,
            chunkId: candidate.chunkId,
            title: candidate.title,
            quote: candidate.text.slice(0, 260),
          })),
          uncertainty: ai.uncertainty ?? (toolSummaries.length > 0 ? "Answer uses saved memory plus tool results." : "Grounded in retrieved memories."),
          toolsUsed: toolSummaries.length > 0 ? toolSummaries : undefined,
        };
      }
    } catch {
      /* fall back below */
    }
  }

  if (results.length === 0) {
    return {
      answer: "I could not find grounded evidence for that in your memory yet. Dump a note, link, or file, then ask again.",
      citations: [],
      uncertainty: "No matching memories were retrieved.",
    };
  }

  return buildExtractiveAnswer(input.question, results);
}

export async function listRuns() {
  const data = await readData();
  return data.ingestionRuns.slice().reverse();
}

export async function exportAllData() {
  return readData();
}
