import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import type { ArtifactType, ProviderCapability, ProviderKind } from "@pme/shared";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const artifactTypeEnum = pgEnum("artifact_type", [
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

export const intentTypeEnum = pgEnum("intent_type", [
  "capture_memory",
  "summarize",
  "create_reminder",
  "create_event",
  "link_to_project",
  "update_preference",
  "retention_decision",
  "needs_review",
]);

export const reminderStatusEnum = pgEnum("reminder_status", ["draft", "scheduled", "done", "dismissed", "failed"]);
export const preferenceCategoryEnum = pgEnum("preference_category", [
  "ui",
  "capture",
  "ranking",
  "notifications",
  "privacy",
  "providers",
]);
export const providerKindEnum = pgEnum("provider_kind", [
  "openai",
  "openrouter",
  "groq",
  "cerebras",
  "google",
  "anthropic",
  "custom_openai_compatible",
]);
export const edgeTypeEnum = pgEnum("edge_type", [
  "CONTAINS",
  "MENTIONS",
  "RELATED_TO",
  "SAME_AS",
  "HAPPENED_AT",
  "SUPPORTED_BY",
  "NEXT_IN_TIME",
]);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  kind: text("kind").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
    type: artifactTypeEnum("type").$type<ArtifactType>().notNull(),
    title: text("title").notNull(),
    sourceLabel: text("source_label").notNull(),
    originalPath: text("original_path"),
    mimeType: text("mime_type"),
    sha256: text("sha256"),
    sizeBytes: integer("size_bytes"),
    retentionDecision: text("retention_decision").notNull().default("review"),
    privacy: text("privacy").notNull().default("local"),
    status: text("status").notNull().default("processing"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    sourceCreatedAt: timestamp("source_created_at", { withTimezone: true }),
    sourceModifiedAt: timestamp("source_modified_at", { withTimezone: true }),
  },
  (table) => [
    index("artifacts_type_idx").on(table.type),
    index("artifacts_captured_at_idx").on(table.capturedAt),
    index("artifacts_sha256_idx").on(table.sha256),
  ],
);

export const artifactLocations = pgTable(
  "artifact_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    label: text("label").notNull(),
    pointer: jsonb("pointer").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("artifact_locations_artifact_idx").on(table.artifactId)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => artifactLocations.id, { onDelete: "set null" }),
    ordinal: integer("ordinal").notNull(),
    text: text("text").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    searchVector: tsvector("search_vector"),
    embedding: vector("embedding", { dimensions: 1536 }),
    tokenEstimate: integer("token_estimate").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chunks_artifact_idx").on(table.artifactId),
    index("chunks_search_idx").using("gin", table.searchVector),
    index("chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    canonicalKey: text("canonical_key").notNull(),
    confidence: real("confidence").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("entities_type_label_idx").on(table.type, table.label), index("entities_canonical_key_idx").on(table.canonicalKey)],
);

export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    confidence: real("confidence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("entity_aliases_entity_idx").on(table.entityId), index("entity_aliases_alias_idx").on(table.alias)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    sourceCreatedAt: timestamp("source_created_at", { withTimezone: true }),
    sourceModifiedAt: timestamp("source_modified_at", { withTimezone: true }),
    eventAt: timestamp("event_at", { withTimezone: true }),
    confidence: real("confidence").notNull().default(0),
    place: text("place"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("events_event_at_idx").on(table.eventAt), index("events_artifact_idx").on(table.artifactId)],
);

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromType: text("from_type").notNull(),
    fromId: uuid("from_id").notNull(),
    toType: text("to_type").notNull(),
    toId: uuid("to_id").notNull(),
    edgeType: edgeTypeEnum("edge_type").notNull(),
    confidence: real("confidence").notNull().default(0),
    provenanceArtifactId: uuid("provenance_artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("edges_from_idx").on(table.fromType, table.fromId),
    index("edges_to_idx").on(table.toType, table.toId),
    index("edges_type_idx").on(table.edgeType),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    text: text("text").notNull(),
    confidence: real("confidence").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("claims_created_at_idx").on(table.createdAt)],
);

export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const intents = pgTable(
  "intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    intentType: intentTypeEnum("intent_type").notNull(),
    confidence: real("confidence").notNull().default(0),
    requiredConfirmation: boolean("required_confirmation").notNull().default(false),
    extractedFields: jsonb("extracted_fields").$type<Record<string, unknown>>().notNull().default({}),
    proposedActions: jsonb("proposed_actions").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("proposed"),
    modelOrRuleVersion: text("model_or_rule_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("intents_artifact_idx").on(table.artifactId), index("intents_status_idx").on(table.status)],
);

export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    modelOrRuleVersion: text("model_or_rule_version").notNull().default("rules-v0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("summaries_artifact_idx").on(table.artifactId)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    naturalLanguageSource: text("natural_language_source").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    status: reminderStatusEnum("status").notNull().default("draft"),
    recurrence: text("recurrence"),
    place: text("place"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (table) => [index("reminders_due_at_idx").on(table.dueAt), index("reminders_status_idx").on(table.status)],
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: preferenceCategoryEnum("category").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    confirmed: boolean("confirmed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("preferences_category_key_idx").on(table.category, table.key)],
);

export const modelProviders = pgTable(
  "model_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull(),
    kind: providerKindEnum("kind").$type<ProviderKind>().notNull(),
    baseUrl: text("base_url"),
    apiKey: text("api_key").notNull(),
    chatModel: text("chat_model"),
    embeddingModel: text("embedding_model"),
    capabilities: jsonb("capabilities").$type<ProviderCapability[]>().notNull().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("model_providers_kind_idx").on(table.kind), index("model_providers_default_idx").on(table.isDefault)],
);

export const uiLayoutProfiles = pgTable("ui_layout_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  route: text("route").notNull(),
  layoutState: jsonb("layout_state").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artifactId: uuid("artifact_id").references(() => artifacts.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("ingestion_runs_artifact_idx").on(table.artifactId), index("ingestion_runs_status_idx").on(table.status)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("feedback_target_idx").on(table.targetType, table.targetId)],
);

export const artifactsRelations = relations(artifacts, ({ many }) => ({
  chunks: many(chunks),
  summaries: many(summaries),
  intents: many(intents),
  reminders: many(reminders),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  artifact: one(artifacts, {
    fields: [chunks.artifactId],
    references: [artifacts.id],
  }),
}));

export const schemaBootstrapSql = sql`
  CREATE EXTENSION IF NOT EXISTS vector;
`;
