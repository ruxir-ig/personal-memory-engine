# Quipu

Quipu is a local-first personal memory engine prototype. It turns notes, files,
deadlines, and project context into a clean quick-glance Canvas with grounded
memory, automatic reminders, and cited answers.

## Prototype Flow

The hackathon prototype has two primary modes:

- `Canvas`: starts blank and only shows real user-created memory, reminders,
  timeline context, and grounded answers.
- `Ingest`: captures text, an optional source label, and file imports.

The intended demo flow:

1. Start from a blank Canvas.
2. Open Ingest.
3. Capture: `Remind me to submit the hackathon project on Sunday at 6 PM. Also remember that Quipu is my personal memory engine prototype.`
4. Quipu sends the input to a configured OpenAI-compatible chat provider and
   asks for structured JSON.
5. The saved memory appears on Canvas.
6. The reminder is scheduled through the available reminder tool.
7. Ask `What is Quipu?` from Canvas and get an answer with source citation.

If no AI provider is configured, Quipu saves the capture as a raw draft and
shows `AI provider required`. It does not pretend rule-based summaries or
reminders are AI output.

## Architecture Direction

For the hackathon prototype, local ingest and Canvas run in one app. The
intended architecture is local-first ingest syncing structured memory packets
to a hosted or self-hosted Canvas.

Current prototype behavior:

- Local SQLite database at `data/quipu.sqlite` for user data.
- Adaptive memory indexes for evolving captured data such as links, videos,
  summaries, chat references, credentials, and future structured fields.
- JSON snapshot mirror at `data/dev-store.json` for easy export/debugging.
- Raw file vault under `data/artifacts/`.
- OpenAI-compatible chat-completions adapter for memory extraction.
- AI-controlled use of the limited available tools, including reminders,
  events, preference memory, clock, calendar, and optional headless browsing.
- Cited retrieval over captured local chunks.

Planned durable direction:

- Hosted Drizzle/Postgres as the sync source of truth when the app needs a
  server-side Canvas or multi-device use.
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

Quipo is a **100% client-side** static app. Memory, files, SQLite, agent tools, and FFmpeg all run in the browser. Deploy the `apps/web/out` folder to any static host (Cloudflare Pages, Netlify, GitHub Pages, S3, etc.).

```text
pnpm build
# static export lands in apps/web/out
```

Configure optional build-time public env vars (embedded at build) or add providers in Settings (stored locally):

```text
NEXT_PUBLIC_PME_LLM_API_KEY="..."
NEXT_PUBLIC_PME_LLM_BASE_URL="https://api.openai.com/v1"
NEXT_PUBLIC_PME_LLM_MODEL="gpt-4o-mini"
```

For direct `/item/...` and `/spaces/...` links on static hosts, enable SPA fallback (included: `public/_redirects` for Netlify-style hosts).

Optional durable store setup:

```text
pnpm docker:up
pnpm db:migrate
pnpm worker
```

The app does not need Docker for normal local use. It creates the local SQLite
database on first run and migrates an existing `data/dev-store.json` snapshot if
one exists.

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

### Agent tools (lazy discovery)

When you ask a question, the agent sees a short tool catalog only (clock, calendar,
browser). Full tool schemas load only if the model chooses to use a tool.

- `clock` — user's local date/time and timezone (from the browser)
- `calendar` — reminders and timeline events from saved memory
- `browser` — headless Playwright page fetch with HTTP fallback; can open a saved link by `artifactId`
- `ffmpeg` — local video inspection on uploaded vault files: probe metadata, extract frames, extract audio

Install Chromium once for the browser tool:

```text
pnpm exec playwright install chromium
```

Install FFmpeg on the host for uploaded video/screen-recording context:

```text
# Arch/CachyOS example
sudo pacman -S ffmpeg
```

Disable tools in `.env`:

```text
PME_BROWSER_ENABLED=false
PME_FFMPEG_ENABLED=false
```

## Implemented vs Planned

Implemented:

- Canvas and Ingest as the only primary visible modes.
- Blank Canvas with no fake data.
- Text capture with optional source label.
- File import into a local vault.
- OpenAI-compatible AI processing for structured memory packets.
- Automatic reminder and preference actions from AI output.
- Canvas reminder, memory, timeline, and ask sections.
- README, pitch deck, and build-in-public submission draft.

Planned:

- Real desktop app.
- Real hosted sync split.
- Auth/accounts.
- Calendar integration.
- OCR/audio/video extraction.
- Full lifelong learning and graph UI.
- Production secret encryption.
