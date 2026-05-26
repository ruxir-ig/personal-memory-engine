# Personal Memory Engine

First-draft project for a local-first personal memory engine.

The goal is to turn personal digital traces such as chats, screenshots, PDFs,
browser history, and notes into connected memory graphs, timelines, hybrid
search, and cited chat answers.

## Current State

This repository currently contains the product and architecture draft only.
No application runtime has been scaffolded yet because the next decision should
come after reviewing the idea and stack.

## Drafts

- [Product Draft](docs/PRODUCT_DRAFT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [First Stack ADR](docs/adr/0001-first-draft-stack.md)
- [Open Questions](docs/OPEN_QUESTIONS.md)

## Proposed Repository Shape

```text
apps/
  web/        Next.js dashboard and exploration UI
  api/        FastAPI service for search, graph, timeline, and chat APIs
workers/     Python ingestion and enrichment workers
packages/
  shared/     Shared schemas, generated API types, and constants
infra/
  docker/     Local Docker Compose and database setup
docs/         Product, architecture, and decisions
```

## Source Notes

The stack draft was checked against current primary docs on 2026-05-26:

- [Next.js App Router](https://nextjs.org/docs/app)
- [FastAPI](https://fastapi.tiangolo.com/)
- [pgvector](https://github.com/pgvector/pgvector)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/18/textsearch.html)
- [Docling](https://docling-project.github.io/docling/)
- [Kuzu](https://docs.kuzudb.com/)
- [React Flow](https://reactflow.dev/docs/concepts/introduction)
