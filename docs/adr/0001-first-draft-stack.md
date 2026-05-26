# ADR 0001: First-Draft Stack

Status: proposed

Date: 2026-05-26

## Context

The product needs to ingest messy local personal data, run document/OCR/model
pipelines, expose search/chat APIs, and provide rich visual exploration for
graphs and timelines.

## Decision

Use a TypeScript web UI, Python ingestion/API stack, and Postgres as the first
system of record.

| Layer | Choice | Reason |
| --- | --- | --- |
| Web UI | Next.js App Router + TypeScript | Strong route structure for dashboard surfaces, React ecosystem for graph/timeline UI |
| UI components | Tailwind CSS + shadcn/ui-style components | Fast, consistent internal tool UI without inventing a design system first |
| Graph UI | React Flow first | Good fit for interactive node/edge exploration in React |
| API | FastAPI + Pydantic | Python-native ML/document stack, type hints, OpenAPI docs, async support |
| Python packages | uv | Fast local package/project management |
| Workers | Python worker process, Redis-backed queue later | Keeps ingestion isolated from request latency |
| Database | Postgres + pgvector + built-in full-text search | One durable store for relational metadata, vectors, and keyword search |
| Graph DB | Postgres edges first; Kuzu projection later | Avoids early multi-database complexity while preserving a graph-native path |
| Documents/OCR | Docling first, OCR backend selectable | Handles PDFs, images, office docs, layout, OCR, and structured exports |
| Raw artifacts | Local filesystem content-addressed vault | Simple, inspectable, avoids stuffing binaries into the database |
| Embeddings | Provider interface: local first, hosted optional | Privacy and cost control |
| LLM extraction/chat | Provider interface: local or hosted | Allows quality/privacy tradeoff per user setting |
| Local infra | Docker Compose for Postgres/Redis | Reproducible development without hiding services |

## Why Not Start With Neo4j or a Separate Vector DB?

The first hard problem is reliable ingestion, provenance, retrieval, and UX.
Starting with separate graph and vector databases adds operational weight before
the data model is proven.

Postgres with `edges`, full-text search, and pgvector is enough to build the
first working system. If graph algorithms or traversal performance become a
real bottleneck, Kuzu can be added as a projected graph store from the same
canonical tables.

## Source Checks

- Next.js App Router docs describe the modern file-system router and Server
  Components: https://nextjs.org/docs/app
- FastAPI docs emphasize Python type hints, automatic docs, and production API
  readiness: https://fastapi.tiangolo.com/
- pgvector supports vector similarity search inside Postgres, with HNSW and
  IVFFlat indexes: https://github.com/pgvector/pgvector
- PostgreSQL has built-in full-text search with `tsvector`/`tsquery` and GIN
  indexes: https://www.postgresql.org/docs/18/textsearch.html
- Docling supports document parsing, OCR, structured exports, and local
  execution: https://docling-project.github.io/docling/
- Kuzu is an embedded graph database with property graph and Cypher support:
  https://docs.kuzudb.com/
- React Flow targets interactive node/edge graph UIs:
  https://reactflow.dev/docs/concepts/introduction

## Consequences

Good:

- Minimal infra for V0.
- Strong Python ecosystem for ingestion and ML work.
- Clear route to graph-native storage later.
- Local-first privacy posture.
- Easy to inspect and debug source evidence.

Tradeoffs:

- Postgres graph traversal is not as ergonomic as Cypher.
- Next.js plus FastAPI means two app runtimes.
- Document/OCR dependencies may be heavy.
- Local models will vary by machine capability.

## Revisit Triggers

- Graph queries become slow or awkward.
- Search quality requires a dedicated search engine.
- User wants always-on desktop capture instead of manual imports.
- Hosted sync becomes a first-class requirement.
- OCR/document processing becomes too slow locally.
