# Personal Memory Engine

First-draft project for a local-first personal memory engine.

The goal is to turn personal digital traces such as text, screenshots, PDFs,
documents, media files, links, and chat snippets into connected memory graphs,
timelines, hybrid search, reminders, summaries, and cited chat answers.

## Current State

This repository now contains the first working v0 scaffold:

- `apps/web`: Next.js App Router app with dashboard, capture, search, timeline,
  artifact viewer, reminders, chat, settings, tRPC routes, upload/export route
  handlers, and a local JSON fallback store.
- `packages/shared`: shared Zod schemas and domain types.
- `workers`: TypeScript worker entrypoint for ingestion/enrichment follow-up.
- `infra/docker`: local Postgres with pgvector plus Redis.

The v0 app stores local dev data under `data/`, which is intentionally ignored
by Git. Postgres/Drizzle is scaffolded as the durable path; the JSON fallback
keeps the UI usable before local services are running.

## Local Development

```text
pnpm install
pnpm dev
```

Optional durable store setup:

```text
pnpm docker:up
pnpm db:migrate
pnpm worker
```

## Repository Shape

```text
apps/
  web/        Next.js app: UI, API routes, tRPC routers, server actions
workers/     TypeScript background jobs for ingestion and enrichment
packages/
  shared/     Shared schemas, model/provider interfaces, and constants
infra/
  docker/     Local Docker Compose and database setup
docs/         Product, architecture, and decisions
```

## Source Notes

The stack draft was checked against current primary docs on 2026-05-27:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Create T3 App](https://create.t3.gg/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [pgvector](https://github.com/pgvector/pgvector)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/18/textsearch.html)
- [Docling](https://docling-project.github.io/docling/)
- [Kuzu](https://docs.kuzudb.com/)
- [React Flow](https://reactflow.dev/docs/concepts/introduction)
