CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('note', 'text', 'markdown', 'image', 'pdf', 'document', 'audio', 'video', 'chat', 'link', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."edge_type" AS ENUM('CONTAINS', 'MENTIONS', 'RELATED_TO', 'SAME_AS', 'HAPPENED_AT', 'SUPPORTED_BY', 'NEXT_IN_TIME');--> statement-breakpoint
CREATE TYPE "public"."intent_type" AS ENUM('capture_memory', 'summarize', 'create_reminder', 'create_event', 'link_to_project', 'update_preference', 'retention_decision', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."preference_category" AS ENUM('ui', 'capture', 'ranking', 'notifications', 'privacy', 'providers');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('openai', 'openrouter', 'groq', 'cerebras', 'google', 'anthropic', 'custom_openai_compatible');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('draft', 'scheduled', 'done', 'dismissed', 'failed');--> statement-breakpoint
CREATE TABLE "artifact_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"pointer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"type" "artifact_type" NOT NULL,
	"title" text NOT NULL,
	"source_label" text NOT NULL,
	"original_path" text,
	"mime_type" text,
	"sha256" text,
	"size_bytes" integer,
	"retention_decision" text DEFAULT 'review' NOT NULL,
	"privacy" text DEFAULT 'local' NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_created_at" timestamp with time zone,
	"source_modified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"location_id" uuid,
	"ordinal" integer NOT NULL,
	"text" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_vector" "tsvector",
	"embedding" vector(1536),
	"token_estimate" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_type" text NOT NULL,
	"from_id" uuid NOT NULL,
	"to_type" text NOT NULL,
	"to_id" uuid NOT NULL,
	"edge_type" "edge_type" NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"provenance_artifact_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"canonical_key" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_created_at" timestamp with time zone,
	"source_modified_at" timestamp with time zone,
	"event_at" timestamp with time zone,
	"confidence" real DEFAULT 0 NOT NULL,
	"place" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid,
	"intent_type" "intent_type" NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"required_confirmation" boolean DEFAULT false NOT NULL,
	"extracted_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"model_or_rule_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"kind" "provider_kind" NOT NULL,
	"base_url" text,
	"api_key" text NOT NULL,
	"chat_model" text,
	"embedding_model" text,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "preference_category" NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid,
	"title" text NOT NULL,
	"natural_language_source" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"status" "reminder_status" DEFAULT 'draft' NOT NULL,
	"recurrence" text,
	"place" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_or_rule_version" text DEFAULT 'rules-v0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ui_layout_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"route" text NOT NULL,
	"layout_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_locations" ADD CONSTRAINT "artifact_locations_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_location_id_artifact_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."artifact_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_provenance_artifact_id_artifacts_id_fk" FOREIGN KEY ("provenance_artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intents" ADD CONSTRAINT "intents_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_locations_artifact_idx" ON "artifact_locations" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifacts_type_idx" ON "artifacts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "artifacts_captured_at_idx" ON "artifacts" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "artifacts_sha256_idx" ON "artifacts" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "chunks_artifact_idx" ON "chunks" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "chunks_search_idx" ON "chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "claims_created_at_idx" ON "claims" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "edges_from_idx" ON "edges" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "edges_to_idx" ON "edges" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE INDEX "edges_type_idx" ON "edges" USING btree ("edge_type");--> statement-breakpoint
CREATE INDEX "entities_type_label_idx" ON "entities" USING btree ("type","label");--> statement-breakpoint
CREATE INDEX "entities_canonical_key_idx" ON "entities" USING btree ("canonical_key");--> statement-breakpoint
CREATE INDEX "entity_aliases_entity_idx" ON "entity_aliases" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "entity_aliases_alias_idx" ON "entity_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "events_event_at_idx" ON "events" USING btree ("event_at");--> statement-breakpoint
CREATE INDEX "events_artifact_idx" ON "events" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "feedback_target_idx" ON "feedback" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_artifact_idx" ON "ingestion_runs" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "ingestion_runs_status_idx" ON "ingestion_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intents_artifact_idx" ON "intents" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "intents_status_idx" ON "intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "model_providers_kind_idx" ON "model_providers" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "model_providers_default_idx" ON "model_providers" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "preferences_category_key_idx" ON "preferences" USING btree ("category","key");--> statement-breakpoint
CREATE INDEX "reminders_due_at_idx" ON "reminders" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "reminders_status_idx" ON "reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "summaries_artifact_idx" ON "summaries" USING btree ("artifact_id");
