# Daily Progress Form Draft

Date: 2026-05-26

## Day

Tuesday

If the form is tied to the hackathon schedule instead of the calendar date, use
the hackathon day label expected by the organizers.

## What have you done today?

Today I refined the product direction and created the first project structure
for a personal memory engine.

The idea is a local-first system that converts notes, screenshots, PDFs,
browser history, and chats into searchable knowledge, connected memory graphs,
timelines, reminders, and grounded chat with citations.

Key progress:

- Created the project locally and published it as the GitHub repo
  `personal-memory-engine`.
- Wrote the first product draft and clarified that this is not just an AI
  chatbot, but an evidence-backed personal memory system.
- Designed the first architecture: source connectors, raw artifact vault,
  normalization/OCR, intent router, enrichment workers, Postgres memory store,
  graph/timeline materializers, search API, and dynamic UI.
- Added a privacy-first capture model: automation goes into a review inbox
  instead of silently becoming permanent memory.
- Added dynamic behavior: natural-language input can become a memory, summary,
  reminder, event, or UI preference depending on intent.
- Proposed the first stack: Next.js, FastAPI, Postgres + pgvector, Postgres
  full-text search, Docling, React Flow, and optional Kuzu graph projection
  later.
- Compared the direction against OpenClaw-style systems and decided not to
  rebuild generic agent infrastructure from scratch; instead, the project will
  reuse/integrate useful patterns while keeping the core memory engine
  independent.

## Build in Public Post Draft

Day 1 of building for the #OpenAIHackathon.

I started shaping a personal memory engine: a local-first app that turns notes,
screenshots, PDFs, browser history, and chats into searchable knowledge,
timelines, memory graphs, reminders, and grounded chat with citations.

The biggest design question today was the privacy/product tradeoff:
manual input is tedious, but silent automation is risky. The current direction
is a capture inbox with source-level permissions, so the system can help
collect useful context without quietly indexing everything.

I also added an intent-router concept:
- notes become summaries and searchable knowledge
- dates/times become reminders
- places become location/event memories
- user preferences can adapt the UI
- sensitive actions require confirmation

Stack draft: Next.js, FastAPI, Postgres + pgvector, full-text search, Docling,
React Flow, and possibly Kuzu later for graph projection.

Next step: decide the V0 input path and start building the capture + review
flow.

#OpenAIHackathon

## Build in Public - Post Link

Paste the LinkedIn/X post URL here after publishing the post above.

## Codex Org ID

Paste the organization ID from:

https://platform.openai.com/settings/organization/general

It should include the `org-` prefix.

## Working Document Link

Use one of these after publishing or pushing:

- GitHub repo link
- GitHub file link to this document
- Notion/Google Doc link
- Public LinkedIn/X thread link if that is your working log

## Issues

No major blocker yet.

Current open decisions:

- Whether V0 should be strictly local-only or allow optional hosted model APIs.
- Which input source to build first: notes, screenshots, PDFs, browser history,
  or chat exports.
- Whether the first product should be a local web app or desktop app.
- How much automation should happen automatically versus through a capture
  inbox and user confirmation.
