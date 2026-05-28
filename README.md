# Quipu

Quipu is a local-first personal memory engine prototype. It turns notes, files,
deadlines, and project context into a clean quick-glance Canvas with grounded
memory, reminder review, and cited answers.

## Prototype Flow

The hackathon prototype has two primary modes:

- `Canvas`: starts blank and only shows real user-created memory, reminders,
  review items, and timeline context.
- `Ingest`: captures text, an optional source label, and file imports.

The intended demo flow:

1. Start from a blank Canvas.
2. Open Ingest.
3. Capture: `Remind me to submit the hackathon project on Sunday at 6 PM. Also remember that Quipu is my personal memory engine prototype.`
4. Quipu sends the input to a configured OpenAI-compatible chat provider and
   asks for structured JSON.
5. The saved memory appears on Canvas.
6. A reminder proposal appears for review.
7. Accept the reminder.
8. Ask `What is Quipu?` from Canvas and get an answer with source citation.

If no AI provider is configured, Quipu saves the capture as a raw draft and
shows `AI provider required`. It does not pretend rule-based summaries or
reminders are AI output.

## Architecture Direction

For the hackathon prototype, local ingest and Canvas run in one app. The
intended architecture is local-first ingest syncing structured memory packets
to a hosted or self-hosted Canvas.

Current prototype behavior:

- Local JSON store under `data/` for fast development.
- Raw file vault under `data/artifacts/`.
- OpenAI-compatible chat-completions adapter for memory extraction.
- Review inbox for side-effectful proposals such as reminders and preferences.
- Cited retrieval over captured local chunks.

Planned durable direction:

- Drizzle/Postgres as the source of truth.
- pgvector for semantic retrieval.
- Worker-driven ingestion and enrichment.
- Hosted or self-hosted Canvas split after the prototype.
- Encrypted provider credentials before hosted or multi-user use.

## Tech Stack

- Next.js App Router
- TypeScript
- pnpm
- tRPC
- Zod
- Drizzle/Postgres plus pgvector direction
- OpenAI-compatible LLM provider path

Supported provider shapes today:

- OpenAI
- OpenRouter
- Groq
- Cerebras
- Custom OpenAI-compatible base URL

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

Configure one chat provider in `.env` or through the local provider store:

```text
PME_LLM_API_KEY="..."
PME_LLM_BASE_URL="https://api.openai.com/v1"
PME_LLM_MODEL="gpt-4o-mini"
```

Provider-specific environment variables are also supported:

```text
OPENAI_API_KEY="..."
OPENROUTER_API_KEY="..."
GROQ_API_KEY="..."
CEREBRAS_API_KEY="..."
```

## Implemented vs Planned

Implemented:

- Canvas and Ingest as the only primary visible modes.
- Blank Canvas with no fake data.
- Text capture with optional source label.
- File import into a local vault.
- OpenAI-compatible AI processing for structured memory packets.
- Reminder and preference proposals with accept/reject review.
- Canvas reminder, review, memory, timeline, and ask sections.
- README, pitch deck, and build-in-public submission draft.

Planned:

- Real desktop app.
- Real hosted sync split.
- Auth/accounts.
- Calendar integration.
- OCR/audio/video extraction.
- Full lifelong learning and graph UI.
- Production secret encryption.
