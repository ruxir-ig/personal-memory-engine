import { z } from "zod";

export const artifactTypeSchema = z.enum([
  "note",
  "text",
  "markdown",
  "image",
  "pdf",
  "document",
  "audio",
  "video",
  "chat",
  "link",
  "unknown",
]);

export const memoryKindSchema = z.enum([
  "note",
  "link",
  "reel",
  "video",
  "article",
  "post",
  "credential",
  "code",
  "task",
  "contact",
  "place",
  "image",
  "file",
  "unknown",
]);

export const spaceAccentSchema = z.enum([
  "amber",
  "link",
  "reel",
  "video",
  "article",
  "credential",
  "code",
  "task",
  "contact",
  "note",
]);

export const intentTypeSchema = z.enum([
  "capture_memory",
  "summarize",
  "create_reminder",
  "create_event",
  "link_to_project",
  "update_preference",
  "retention_decision",
  "needs_review",
]);

export const preferenceCategorySchema = z.enum([
  "ui",
  "capture",
  "ranking",
  "notifications",
  "privacy",
  "providers",
]);

export const reminderStatusSchema = z.enum([
  "draft",
  "scheduled",
  "done",
  "dismissed",
  "failed",
]);

export const todoStatusSchema = z.enum(["open", "done", "cancelled"]);
export const todoPrioritySchema = z.enum(["low", "normal", "high"]);

export const syncStatusSchema = z.enum([
  "local_processed",
  "pending_review",
  "synced_to_canvas",
]);

export const providerKindSchema = z.enum([
  "openai",
  "openrouter",
  "groq",
  "cerebras",
  "google",
  "anthropic",
  "custom_openai_compatible",
]);

export const providerCapabilitySchema = z.enum([
  "chat",
  "embedding",
  "vision",
  "transcription",
  "rerank",
]);

export const captureInputSchema = z.object({
  text: z.string().min(1).max(30000),
  sourceLabel: z.string().max(120).optional(),
  shouldSummarize: z.boolean().default(true),
  clientNow: z.string().datetime().optional(),
  timezone: z.string().min(1).max(120).optional(),
});

export const searchInputSchema = z.object({
  query: z.string().trim().default(""),
  artifactTypes: z.array(artifactTypeSchema).default([]),
  limit: z.number().int().min(1).max(50).default(20),
});

export const chatInputSchema = z.object({
  question: z.string().min(1).max(5000),
  clientNow: z.string().datetime().optional(),
  timezone: z.string().min(1).max(120).optional(),
});

export const reminderInputSchema = z.object({
  title: z.string().min(1).max(200),
  dueAt: z.string().datetime(),
  sourceText: z.string().max(5000).optional(),
  artifactId: z.string().optional(),
  timezone: z.string().min(1).max(120).optional(),
});

export const providerInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(80),
  kind: providerKindSchema,
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().min(1).max(300),
  chatModel: z.string().max(120).optional(),
  embeddingModel: z.string().max(120).optional(),
  capabilities: z.array(providerCapabilitySchema).min(1),
  isDefault: z.boolean().default(false),
});

export const preferenceInputSchema = z.object({
  category: preferenceCategorySchema,
  key: z.string().min(1).max(80),
  value: z.unknown(),
  requiresConfirmation: z.boolean().default(false),
});

export type ArtifactType = z.infer<typeof artifactTypeSchema>;
export type MemoryKind = z.infer<typeof memoryKindSchema>;
export type SpaceAccent = z.infer<typeof spaceAccentSchema>;
export type IntentType = z.infer<typeof intentTypeSchema>;
export type PreferenceCategory = z.infer<typeof preferenceCategorySchema>;
export type ReminderStatus = z.infer<typeof reminderStatusSchema>;
export type TodoStatus = z.infer<typeof todoStatusSchema>;
export type TodoPriority = z.infer<typeof todoPrioritySchema>;
export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type ProviderKind = z.infer<typeof providerKindSchema>;
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;
export type CaptureInput = z.infer<typeof captureInputSchema>;
export type SearchInput = z.infer<typeof searchInputSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;
export type ReminderInput = z.infer<typeof reminderInputSchema>;
export type ProviderInput = z.infer<typeof providerInputSchema>;
export type PreferenceInput = z.infer<typeof preferenceInputSchema>;

export type StructuredFields = {
  url?: string;
  host?: string;
  platform?: string;
  mediaTitle?: string;
  author?: string;
  thumbnailUrl?: string;
  language?: string;
  secretLabel?: string;
  secretMasked?: string;
  secretLength?: number;
  secretVaultId?: string;
  secretEncrypted?: boolean;
  service?: string;
  [key: string]: unknown;
};

export type Artifact = {
  id: string;
  type: ArtifactType;
  kind: MemoryKind;
  title: string;
  sourceLabel: string;
  spaceId?: string;
  structured?: StructuredFields;
  pinned?: boolean;
  archived?: boolean;
  originalPath?: string;
  mimeType?: string;
  hash?: string;
  sizeBytes?: number;
  capturedAt: string;
  sourceCreatedAt?: string;
  sourceModifiedAt?: string;
  retentionDecision: "keep_original" | "summary_only" | "review";
  privacy: "local" | "provider_allowed" | "private";
  status: "ready" | "processing" | "needs_review" | "failed";
  syncStatus: SyncStatus;
  metadata: Record<string, unknown>;
};

export type Space = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  icon: string;
  accent: SpaceAccent;
  createdBy: "ai" | "user" | "system";
  createdAt: string;
  updatedAt: string;
};

export type Chunk = {
  id: string;
  artifactId: string;
  ordinal: number;
  text: string;
  headingPath?: string[];
  location?: string;
  tokenEstimate: number;
  capturedAt: string;
};

export type IntentRecord = {
  id: string;
  artifactId?: string;
  intentType: IntentType;
  confidence: number;
  requiredConfirmation: boolean;
  extractedFields: Record<string, unknown>;
  proposedActions: string[];
  status: "proposed" | "accepted" | "rejected" | "completed";
  modelOrRuleVersion: string;
  createdAt: string;
};

export type SummaryRecord = {
  id: string;
  artifactId: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
};

export type EntityRecord = {
  id: string;
  type: "person" | "organization" | "project" | "topic" | "location" | "tool" | "url" | "repo";
  label: string;
  confidence: number;
  createdAt: string;
};

export type EdgeRecord = {
  id: string;
  fromType: "artifact" | "chunk" | "entity" | "event" | "claim" | "collection";
  fromId: string;
  toType: "artifact" | "chunk" | "entity" | "event" | "claim" | "collection";
  toId: string;
  edgeType:
    | "CONTAINS"
    | "MENTIONS"
    | "RELATED_TO"
    | "SAME_AS"
    | "HAPPENED_AT"
    | "SUPPORTED_BY"
    | "NEXT_IN_TIME";
  confidence: number;
  provenanceArtifactId?: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  artifactId?: string;
  title: string;
  description?: string;
  capturedAt: string;
  sourceCreatedAt?: string;
  sourceModifiedAt?: string;
  eventAt?: string;
  confidence: number;
  place?: string;
};

export type Reminder = {
  id: string;
  title: string;
  naturalLanguageSource: string;
  dueAt: string;
  timezone: string;
  status: z.infer<typeof reminderStatusSchema>;
  artifactId?: string;
  createdAt: string;
  confirmedAt?: string;
  notifiedAt?: string;
  agentProcessedAt?: string;
  agentNotificationTitle?: string;
  agentNotificationBody?: string;
  agentUiSummary?: string;
  agentError?: string;
  recurrence?: string;
  place?: string;
};

export type TodoList = {
  id: string;
  title: string;
  description?: string;
  color?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodoItem = {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type AgentToolRecord = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  whenToUse: string;
  instructions: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PreferenceRecord = {
  id: string;
  category: PreferenceCategory;
  key: string;
  value: unknown;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ModelProviderRecord = {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl?: string;
  apiKeyPreview: string;
  apiKeyStored: boolean;
  chatModel?: string;
  embeddingModel?: string;
  capabilities: ProviderCapability[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SearchResult = {
  chunk: Chunk;
  artifact: Artifact;
  summary?: SummaryRecord;
  score: number;
  scoreBreakdown: {
    semantic: number;
    keyword: number;
    graph: number;
    time: number;
    feedback: number;
  };
  matchedTerms: string[];
};

export type ChatAnswer = {
  answer: string;
  citations: Array<{
    artifactId: string;
    chunkId: string;
    title: string;
    quote: string;
  }>;
  uncertainty: string;
  toolsUsed?: Array<{
    id: string;
    summary: string;
  }>;
};

export type DashboardSnapshot = {
  artifacts: Artifact[];
  spaces: Space[];
  summaries: SummaryRecord[];
  intents: IntentRecord[];
  reminders: Reminder[];
  todoLists: TodoList[];
  todos: TodoItem[];
  agentTools: AgentToolRecord[];
  events: TimelineEvent[];
  providers: ModelProviderRecord[];
  preferences: PreferenceRecord[];
  counts: {
    artifacts: number;
    chunks: number;
    spaces: number;
    inbox: number;
    reminders: number;
    todos: number;
    agentTools: number;
    providers: number;
    localProcessed: number;
    pendingReview: number;
    syncedToCanvas: number;
  };
};

/* ---- Adaptive canvas layout (AI- or rule-generated) ---- */

export const canvasBlockTypeSchema = z.enum([
  "spotlight",
  "spaces",
  "reel_strip",
  "vault",
  "today",
  "recent",
  "reading",
  "code_shelf",
  "review",
  "ask",
]);

export type CanvasBlockType = z.infer<typeof canvasBlockTypeSchema>;

export const canvasBlockSchema = z.object({
  id: z.string(),
  type: canvasBlockTypeSchema,
  title: z.string().min(1).max(80),
  subtitle: z.string().max(160).optional(),
  span: z.enum(["2", "3", "4", "6"]).default("3"),
  itemIds: z.array(z.string()).max(20).default([]),
  spaceIds: z.array(z.string()).max(12).default([]),
  suggestions: z.array(z.string().max(120)).max(5).default([]),
  note: z.string().max(280).optional(),
});

export type CanvasBlock = z.infer<typeof canvasBlockSchema>;

export const canvasLayoutSchema = z.object({
  generatedAt: z.string(),
  generatedBy: z.enum(["ai", "rules"]),
  model: z.string().optional(),
  stateSignature: z.string().max(80).optional(),
  expiresAt: z.string().optional(),
  greetingTitle: z.string().max(120).optional(),
  greetingSubtitle: z.string().max(220).optional(),
  blocks: z.array(canvasBlockSchema).max(14),
});

export type CanvasLayout = z.infer<typeof canvasLayoutSchema>;
