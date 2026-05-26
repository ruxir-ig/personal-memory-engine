# Product Draft v0

## Refined Idea

A personal memory engine should not be a vague "AI second brain". It should be
a private, inspectable evidence system for your digital life.

It ingests personal sources such as chats, screenshots, PDFs, browser history,
and notes, preserves the original evidence, extracts useful structure, and
builds four working surfaces:

1. Searchable knowledge: fast keyword and semantic search across everything.
2. Memory graph: people, projects, topics, documents, conversations, events,
   and claims connected by typed relationships.
3. Timeline: what happened, when it was captured, and when the source says it
   happened.
4. Chat with citations: answers grounded in retrieved memories, with links back
   to the exact artifact, page, message, screenshot region, or note block.

The core promise is: "I can ask my own data where an idea came from, what it is
connected to, and what I was doing around that time."

The product should also be dynamic. The user should be able to drop in natural
information and have the system route it to the right memory behavior:

- notes become stored knowledge plus summaries,
- times and places become events or reminders,
- links and documents become searchable reading memory,
- decisions become timeline entries and graph edges,
- preferences become UI and workflow personalization.

This means the app needs an intent layer between input and storage. The user is
not just uploading files; they are telling the system what kind of memory or
action this information should become.

## Target User

Primary user: a technical person with many personal information sources who
wants local, searchable, cross-source memory without manually maintaining a
knowledge base.

Secondary user later: researchers, students, builders, and operators who need
to reconstruct context from conversations, browser trails, notes, and documents.

## Main Workflows

- "Find everything related to this project from chats, PDFs, browser visits, and
  screenshots."
- "What did I read about this topic last week?"
- "Show me the timeline of how this idea developed."
- "Which people, docs, links, and notes are connected to this decision?"
- "Answer this from my own data and show the exact sources."
- "Why is this memory connected to that memory?"
- "Store these rough notes and give me a clean summary."
- "Remember that I have to submit this on Friday at 6 PM."
- "Save this place for my trip and remind me when I am planning."
- "Use compact cards and timeline-first layout for project memories."

## Dynamic Input Behavior

Every user input should pass through an intent router before being stored. The
router classifies the input into one or more intents, then asks for confirmation
only when the action has side effects.

| Input example | Detected intent | Output |
| --- | --- | --- |
| "Store these notes..." | knowledge capture | saved note, summary, tags, related memories |
| "Remind me at 7 PM..." | reminder | scheduled reminder, timeline event |
| "This happened in Pune last week" | event/place memory | event node, place entity, timeline entry |
| "Save this PDF for my OS exam" | document memory | artifact, chunks, topic/project link |
| "I prefer timeline view" | preference update | UI preference proposal |
| "Make the UI more compact" | UI personalization | saved display density preference |

The system should separate four kinds of output:

1. `Memory`: durable knowledge that should be searchable later.
2. `Summary`: a generated digest of the input.
3. `Action`: reminders, tasks, follow-ups, or review requests.
4. `Preference`: user choices that change future ranking, layouts, or capture
   defaults.

For safety, destructive actions, reminders, cloud processing, and broad
preference changes should be confirmed. Low-risk summaries and draft memories
can be generated immediately.

## Input Sources

| Source | V0 handling | Important metadata |
| --- | --- | --- |
| Chats | Import exported JSON/HTML/Markdown first | speaker, thread, message time, attachments |
| Screenshots | Watch a folder and OCR images | capture time, image hash, OCR boxes, app/window if available |
| PDFs/docs | Convert to structured text and pages | title, page, section, table, figure, file hash |
| Browser history | Read copied browser SQLite DBs read-only | URL, title, visit time, transition type |
| Notes | Import Markdown/Obsidian-style folders | path, frontmatter, backlinks, headings |

## Product Surfaces

### Global Search

Hybrid search combines:

- exact keywords through Postgres full-text search,
- semantic similarity through embeddings,
- metadata filters such as source, date, person, project, and tag,
- graph boosts from nearby related entities and artifacts.

### Memory Graph

The graph is not decorative. It should answer relationship questions.

Core node types:

- `Artifact`: raw source object such as a PDF, screenshot, note, chat export, or
  browser visit.
- `Chunk`: searchable section of an artifact.
- `Entity`: person, organization, project, topic, location, tool, URL, repo.
- `Event`: something that happened at a time.
- `Claim`: a statement extracted from a source with provenance.
- `Collection`: user-curated grouping.

Core edge types:

- `CONTAINS`: artifact contains chunk.
- `MENTIONS`: chunk mentions entity.
- `RELATED_TO`: semantic or user-confirmed relationship.
- `SAME_AS`: deduped entities or URLs.
- `HAPPENED_AT`: event to time.
- `SUPPORTED_BY`: claim to source chunk.
- `NEXT_IN_TIME`: ordered sequence in a thread, browsing session, or document.

Every extracted node and edge needs a confidence score and provenance.

### Timeline

The timeline must separate different time meanings:

- `captured_at`: when the engine saw it.
- `source_created_at`: when the source says it was created.
- `source_modified_at`: when the source changed.
- `event_at`: when an extracted event happened.

This avoids mixing "I imported a 2021 PDF today" with "the PDF describes a
2021 event".

### Chat

Chat should behave like a retrieval interface, not a loose chatbot.

For each answer:

- retrieve memories using hybrid search,
- expand around graph neighbors and timeline context,
- produce a concise answer,
- cite exact chunks/artifacts,
- show uncertainty when evidence is weak,
- let the user save, correct, or reject a generated memory.

### Capture Inbox

Automation should feed an inbox instead of silently creating permanent memory.

The inbox groups candidate captures by source and suggested intent:

- "5 screenshots look like project notes."
- "3 browser pages relate to vector databases."
- "This message contains a possible deadline."
- "This location looks like a saved place."

The user can accept, edit, summarize, schedule, archive, or discard each group.

### Reminders and Tasks

Reminders are first-class outputs, not just chat responses. A reminder stores:

- natural-language source text,
- normalized time and timezone,
- optional place,
- recurrence if present,
- linked memory/artifact,
- notification status,
- confirmation state.

If the requested time is ambiguous, the app should ask a short clarification
instead of guessing.

### Adaptive UI

The UI should adapt at two levels:

1. Content-level adaptation: notes show summary cards, places show map/location
   metadata, deadlines show reminder controls, documents show source viewers,
   and projects show graph/timeline context.
2. User-level adaptation: the app remembers display density, preferred default
   view, hidden surfaces, sort order, theme, and capture defaults.

User preferences should be explicit records, not hidden prompt state. The app
can suggest a preference change, but the user should approve durable changes.

## Non-Goals for V0

- No automatic cloud sync.
- No background scraping of private accounts.
- No writing back into source apps.
- No ungrounded "personality" memory.
- No invisible deletion or mutation of original source evidence.

## V0 MVP

V0 should prove the memory loop end-to-end:

1. Accept free-form text input and classify it as memory, summary, reminder, or
   preference.
2. Import Markdown notes, PDFs, screenshots, and browser history from local files.
3. Store originals and normalized chunks with provenance.
4. Run OCR/document conversion and embeddings.
5. Search across sources with keyword + semantic ranking.
6. Show artifact viewer, graph view, timeline view, capture inbox, and reminders.
7. Chat over retrieved memories with citations.

## Later Phases

- Browser extension for current page capture and active tab context.
- Desktop tray app for screenshot/app metadata capture.
- Entity resolution UI for merging duplicates.
- Periodic memory digest and timeline summaries.
- Local-first encrypted sync between machines.
- Mobile capture inbox.
